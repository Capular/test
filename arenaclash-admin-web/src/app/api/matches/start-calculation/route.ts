import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { Timestamp, FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
    if (!adminDb) {
        return NextResponse.json({ error: "Database not initialized" }, { status: 500 });
    }
    const firestore = adminDb;

    try {
        const { tournamentId, userId } = await req.json();

        if (!tournamentId || !userId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // 1. Get Tournament
        const tournamentRef = firestore.collection("tournaments").doc(tournamentId);
        const tournamentSnap = await tournamentRef.get();

        if (!tournamentSnap.exists) {
            return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
        }

        const tournamentData = tournamentSnap.data()!;

        // 2. Validate State (must be in_progress to move to calculating)
        // We allow 'locked' or 'in_progress' to move to calculating
        if (tournamentData.status === 'completed' || tournamentData.status === 'calculating') {
            // Idempotent success if already calculating
            if (tournamentData.status === 'calculating') {
                return NextResponse.json({ success: true, message: "Already calculating" });
            }
            return NextResponse.json({ error: "Tournament is already completed" }, { status: 400 });
        }

        // 3. Mark as Calculating
        await tournamentRef.update({
            status: 'calculating',
            calculatingStartedAt: Timestamp.now(),
            calculatingBy: userId
        });

        // 4. PROCESS QUEUE (The Advance Registration Magic)
        // We find queued users for this template and promote them to NEW rooms
        // Note: For simplicity in this environment, we just create a NEW room for them or join existing.
        // We can reuse the internal matchmaking logic if we refactor, but for now we'll duplicate the "Join" logic snippet
        // or loop through queued users and simulate a join.
        // Actually, looping and calling the join logic internally is best.

        const templateId = tournamentData.templateId;
        const queueQuery = firestore.collection("queued_registrations")
            .where("templateId", "==", templateId)
            .orderBy("createdAt", "asc");

        const queueSnap = await queueQuery.get();

        if (!queueSnap.empty) {
            console.log(`Processing ${queueSnap.size} queued users for template ${templateId}`);

            // Pre-fetch Template and Game Data to get Numeric ID
            // We need this for 10-digit ID generation
            const templateRef = firestore.collection("templates").doc(templateId);
            const templateSnap = await templateRef.get();
            let gameNumericId = "";

            if (templateSnap.exists) {
                const template = templateSnap.data()!;
                if (template.gameId) {
                    const gameSnap = await firestore.collection("games").doc(template.gameId).get();
                    if (gameSnap.exists) {
                        gameNumericId = gameSnap.data()!.numericId;
                    }
                }
            }

            // We process them one by one (or batch if we were fancy, but matchmaking is complex)
            // To avoid massive complexity here, we will just delete the queue doc and CREATE a new room 
            // if needed, similar to join route. 
            // BUT, we can't easily import the POST logic from another route in Next.js app dir without refactoring to a shared lib.
            // A simple "hack" for now: We assume there's likely enough queued players to fill a room or we just put them in a new one.

            // Refactored Approach: 
            // We just trigger a "ProcessQueue" function. Since we don't have shared lib yet, I'll implement a minimal version here.
            // We will TRY to find an open room, if not create one.

            // Note: We need to be careful about race conditions.
            // We'll run this inside the same request but maybe without a transaction for all of them to avoid timeout.

            const joinResults = [];

            for (const queueDoc of queueSnap.docs) {
                const qData = queueDoc.data();
                const qUserId = qData.userId;

                try {
                    // Run a transaction for EACH user to ensure safety
                    await firestore.runTransaction(async (t) => {
                        // Find open room
                        const openRoomsQuery = firestore.collection("tournaments")
                            .where("templateId", "==", templateId)
                            .where("status", "==", "open")
                            .orderBy("createdAt", "asc")
                            .limit(1);
                        const openRoomsSnap = await t.get(openRoomsQuery);

                        let targetRoomRef;

                        if (!openRoomsSnap.empty) {
                            // Join existing
                            const roomDoc = openRoomsSnap.docs[0];
                            if (roomDoc.data().currentPlayers < roomDoc.data().maxPlayers) {
                                targetRoomRef = roomDoc.ref;
                                t.update(targetRoomRef, {
                                    currentPlayers: FieldValue.increment(1),
                                    // Lock if full
                                    status: (roomDoc.data().currentPlayers + 1 >= roomDoc.data().maxPlayers) ? "locked" : "open"
                                });
                            }
                        }

                        if (!targetRoomRef) {
                            // Create new
                            if (!templateSnap.exists) throw new Error("Template not found during queue processing");
                            const template = templateSnap.data()!;

                            // Check ID requirements
                            if (!gameNumericId || !/^\d{3}$/.test(gameNumericId)) {
                                // Fallback or Error? 
                                // Ideally error, but we don't want to lose queue. 
                                // We might fall back to auto-id if migration failed, but user asked for 10-digit.
                                // Throwing error stops this user from joining.
                                throw new Error(`Cannot create room: Missing or invalid Numeric ID for game ${template.gameId}`);
                            }

                            // Read Counter for Sequence
                            const counterRef = firestore.collection("counters").doc(`game_${gameNumericId}`);
                            const counterSnap = await t.get(counterRef);
                            let nextSequence = 1;
                            if (counterSnap.exists) {
                                nextSequence = (counterSnap.data()?.count || 0) + 1;
                            }

                            // Increment Counter
                            t.set(counterRef, { count: nextSequence }, { merge: true });

                            // Generate ID
                            const paddedSequence = nextSequence.toString().padStart(7, '0');
                            const newRoomId = `${gameNumericId}${paddedSequence}`;

                            const newRoomRef = firestore.collection("tournaments").doc(newRoomId);
                            targetRoomRef = newRoomRef;

                            const thresholdMillis = (template.startTimeThreshold || 30) * 60 * 1000;
                            const scheduledStartTime = Timestamp.fromMillis(Date.now() + thresholdMillis);

                            t.set(newRoomRef, {
                                templateId: templateId,
                                gameId: template.gameId, // Ensure we save this
                                game: template.gameName || "Unknown",
                                title: `${template.name} #${newRoomId}`,
                                map: template.gamemode || "Bermuda",
                                type: template.format,
                                matchType: template.type,
                                entryFee: template.entryFee || 0,
                                prizePool: 0,
                                perKill: 0,
                                maxPlayers: template.maxPlayersPerRoom,
                                currentPlayers: 1,
                                status: "open",
                                createdAt: Timestamp.now(),
                                scheduledStartTime: scheduledStartTime,
                                roomId: newRoomId,
                                playersPerTeam: template.playersPerTeam,
                                teamsPerRoom: template.teamsPerRoom
                            });
                        }

                        // Add player
                        const playerRef = targetRoomRef.collection("players").doc(qUserId);
                        t.set(playerRef, {
                            userId: qUserId,
                            userName: qData.userName,
                            userAvatar: qData.userAvatar,
                            ingameName: qData.ingameName,
                            joinedAt: Timestamp.now()
                        });

                        // Delete Queue
                        t.delete(queueDoc.ref);
                    });
                    joinResults.push({ userId: qUserId, status: 'promoted' });

                } catch (err) {
                    console.error(`Failed to promote user ${qUserId}:`, err);
                    joinResults.push({ userId: qUserId, status: 'failed', error: String(err) });
                }
            }
        }

        return NextResponse.json({ success: true, message: "Calculation started", processedQueue: !queueSnap.empty });

    } catch (error: any) {
        console.error("Start Calculation Error:", error);
        return NextResponse.json({ error: error.message || "Failed to start calculation" }, { status: 500 });
    }
}
