import { db } from "@/lib/firebase-admin";
import { FieldValue, Timestamp, DocumentReference } from "firebase-admin/firestore";
import { tenantUserDoc } from "@/lib/tenant-user-server";

interface JoinOptions {
    userId: string;
    templateId: string;
    userName: string;
    userAvatar: string;
    ingameName: string;
    skipBalanceCheck?: boolean; // For queued users who already paid or if we handle payment separately
    teamSlotId?: string; // Optional specific slot
}

export async function processTournamentJoin(options: JoinOptions) {
    if (!db) throw new Error("Database not initialized");
    const firestore = db;

    const { userId, templateId, userName, userAvatar, ingameName, skipBalanceCheck, teamSlotId } = options;

    // 1. Get Template
    const templateRef = firestore.collection("templates").doc(templateId);
    const templateSnap = await templateRef.get();

    if (!templateSnap.exists) throw new Error("Template not found");
    const template = templateSnap.data()!;

    if (!template.isActive) throw new Error("Template is not active");

    // 2. Transaction
    return await firestore.runTransaction(async (transaction) => {
        // Prepare Parallel Reads
        const reads: Promise<any>[] = [];

        // A. Balance Check Read
        const entryFee = template.entryFee || 0;
        let userRef;
        if (entryFee > 0 && !skipBalanceCheck) {
            userRef = tenantUserDoc(firestore, userId);
            reads.push(transaction.get(userRef));
        } else {
            reads.push(Promise.resolve(null)); // Placeholder
        }

        // B. Find Room Read
        const openRoomsQuery = firestore.collection("tournaments")
            .where("templateId", "==", templateId)
            .where("status", "==", "open")
            .orderBy("createdAt", "asc")
            .limit(1);
        reads.push(transaction.get(openRoomsQuery));

        // C. Busy Check Read (Optimization: Check inside transaction to parallelize)
        const busyQuery = firestore.collection("tournaments")
            .where("templateId", "==", templateId)
            .where("status", "in", ['open', 'upcoming', 'live', 'ongoing', 'in_progress', 'locked', 'started', 'ready'])
            .where("participantIds", "array-contains", userId)
            .limit(1); // We only need to know if ONE exists
        reads.push(transaction.get(busyQuery));

        // EXECUTE PARALLEL READS
        const [userSnap, openRoomsSnap, busySnap] = await Promise.all(reads);

        // --- CHECK RESULTS ---

        // 1. Busy Check Result
        if (!busySnap.empty) {
            const error = new Error("User is already active in a match");
            (error as any).code = "USER_BUSY";
            throw error;
        }

        // 2. Balance Check Result
        if (userRef && userSnap) {
            if (!userSnap.exists) throw new Error("User record not found");
            const currentBalance = userSnap.data()?.walletBalance || 0;
            if (currentBalance < entryFee) throw new Error("Insufficient wallet balance");
        }

        // D. Prepare Creation Data (if needed)
        let gameNumericId = "";
        let nextSequence = 1;
        let counterRef = null;

        if (openRoomsSnap.empty) {
            if (template.autoCreateRooms) {
                if (!template.gameId) throw new Error("Configuration Error: Missing Game ID");

                const gameRef = firestore.collection("games").doc(template.gameId);
                const gameSnap = await transaction.get(gameRef);
                if (!gameSnap.exists) throw new Error("Game not found");

                gameNumericId = gameSnap.data()!.numericId;
                if (!gameNumericId) throw new Error("Invalid Game ID configuration");

                counterRef = firestore.collection("counters").doc(`game_${gameNumericId}`);
                const counterSnap = await transaction.get(counterRef);
                if (counterSnap.exists) {
                    nextSequence = (counterSnap.data()?.count || 0) + 1;
                }
            } else {
                throw new Error("No open rooms available");
            }
        }

        // E. Execution
        let finalRoomId;
        let finalScheduledTime;
        let createdNew = false;
        let tournamentRef;

        // Determine if we should create new or join existing
        let shouldCreateNew = openRoomsSnap.empty;
        let roomToJoin = openRoomsSnap.empty ? null : openRoomsSnap.docs[0];

        if (roomToJoin) {
            const tData = roomToJoin.data();
            if (tData.currentPlayers >= template.maxPlayersPerRoom) {
                // READ ONLY HERE: Check if we need to switch to new room
                shouldCreateNew = true;

                // Perform READs for new room creation if we haven't already
                if (template.autoCreateRooms) {
                    if (!counterRef) {
                        if (!template.gameId) throw new Error("Configuration Error: Missing Game ID");
                        const gameRef = firestore.collection("games").doc(template.gameId);
                        const gameSnap = await transaction.get(gameRef); // Allowed: No writes yet
                        if (gameSnap.exists) {
                            gameNumericId = gameSnap.data()!.numericId;
                            counterRef = firestore.collection("counters").doc(`game_${gameNumericId}`);
                            const counterSnap = await transaction.get(counterRef);
                            if (counterSnap.exists) {
                                nextSequence = (counterSnap.data()?.count || 0) + 1;
                            }
                        }
                    }
                } else {
                    throw new Error("Current room is full and auto-create is disabled");
                }
            }
        }

        // --- PRE-CALCULATE WRITES (READS for Team Slot) ---
        // We need to know which room we are targeting to read the correct team slot
        let targetTournamentRef = null;
        if (shouldCreateNew) {
            // We can predict the ID for the new room
            // Note: This relies on nextSequence being correct from the READ above
            const paddedSequence = nextSequence.toString().padStart(7, '0');
            const newRoomId = `${gameNumericId}${paddedSequence}`;
            targetTournamentRef = firestore.collection("tournaments").doc(newRoomId);
        } else {
            targetTournamentRef = roomToJoin!.ref;
        }

        let teamRef = null;
        let teamData = { players: [] as any[], locked: false };

        if (teamSlotId) {
            teamRef = targetTournamentRef.collection("teams").doc(teamSlotId);
            // CRITICAL: This READ must happen here, before ANY writes below
            // For a new room, this doc won't exist -> empty default is fine
            // For existing room, we read it.
            const teamSnap = await transaction.get(teamRef as DocumentReference);
            if (teamSnap.exists) {
                teamData = teamSnap.data() as any;
            }

            // VALIDATION (READ-based)
            const maxPerTeam = template.playersPerTeam || 4;
            if (teamData.players.length >= maxPerTeam) {
                throw new Error(`Team Slot ${teamSlotId} is full.`);
            }
        }

        // --- START OF WRITES ---

        // 1. Deduct Balance (Moved here to be safe)
        if (entryFee > 0 && !skipBalanceCheck && userRef) {
            transaction.update(userRef, {
                walletBalance: FieldValue.increment(-entryFee)
            });

            const txRef = firestore.collection("transactions").doc();
            transaction.set(txRef, {
                userId,
                type: 'entry',
                amount: entryFee,
                timestamp: Timestamp.now(),
                description: `Entry: ${template.name}`,
                status: 'success',
                tournamentId: null
            });
        }

        // 2. Update Old Room (if we switched)
        if (roomToJoin && shouldCreateNew) {
            // We switched because it was full. Lock it.
            transaction.update(roomToJoin.ref, { status: "locked" });
        }

        if (!shouldCreateNew && roomToJoin) {
            // Join Existing
            const roomDoc = roomToJoin;
            tournamentRef = roomDoc.ref;
            const tData = roomDoc.data();
            finalRoomId = roomDoc.id;

            // Reschedule logic
            const now = Timestamp.now();
            let scheduledTime = tData.scheduledStartTime;
            if (scheduledTime && now.toMillis() > scheduledTime.toMillis()) {
                const intervalMillis = (template.rescheduleInterval || 30) * 60 * 1000;
                scheduledTime = Timestamp.fromMillis(scheduledTime.toMillis() + intervalMillis);
                transaction.update(tournamentRef, {
                    scheduledStartTime: scheduledTime,
                    rescheduleCount: FieldValue.increment(1)
                });
            }
            finalScheduledTime = scheduledTime;

            transaction.update(tournamentRef, {
                currentPlayers: FieldValue.increment(1),
                status: (tData.currentPlayers + 1 >= template.maxPlayersPerRoom) ? "locked" : "open",
                participantIds: FieldValue.arrayUnion(userId) // Add to simple list
            });

        } else {
            // Create New
            createdNew = true;
            const thresholdMillis = (template.startTimeThreshold || 30) * 60 * 1000;
            finalScheduledTime = Timestamp.fromMillis(Date.now() + thresholdMillis);

            transaction.set(counterRef!, { count: nextSequence }, { merge: true });

            const paddedSequence = nextSequence.toString().padStart(7, '0');
            finalRoomId = `${gameNumericId}${paddedSequence}`;
            tournamentRef = firestore.collection("tournaments").doc(finalRoomId);

            transaction.set(tournamentRef, {
                templateId,
                gameId: template.gameId,
                game: template.gameName,
                title: `${template.name} #${finalRoomId}`,
                map: template.gamemode || "Bermuda",
                type: template.format,
                matchType: template.type,
                entryFee: entryFee,
                prizePool: 0,
                perKill: 0,
                maxPlayers: template.maxPlayersPerRoom,
                currentPlayers: 1,
                status: "open",
                createdAt: Timestamp.now(),
                scheduledStartTime: finalScheduledTime,
                roomId: finalRoomId,
                playersPerTeam: template.playersPerTeam || 1,
                teamsPerRoom: template.teamsPerRoom || 100,
                totalRounds: template.totalRounds || 1,
                participantIds: [userId] // Initialize list
            });
        }

        // Add Player to Subcollection (Source of Truth for Roster)
        const playerRef = tournamentRef.collection("players").doc(userId);
        transaction.set(playerRef, {
            userId,
            userName: userName || "Unknown",
            userAvatar: userAvatar || "",
            ingameName: ingameName || "",
            joinedAt: Timestamp.now()
        });

        // E. Handle Team Slot Logic
        // We already performed the READ and Validation above. Now we just add the player and Write.
        if (teamSlotId && teamRef) {
            // Add player to slot data object (in memory)
            teamData.players.push({
                userId,
                userName: userName || "Unknown",
                userAvatar: userAvatar || "",
                ingameName: ingameName || "",
                joinedAt: Timestamp.now()
            });
            // WRITE
            transaction.set(teamRef, teamData, { merge: true });
        }

        return {
            roomId: finalRoomId,
            scheduledStartTime: finalScheduledTime,
            createdNew
        };
    });
}
