import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { processTournamentJoin } from "@/lib/matchmaking";
import { tenantUserDoc } from "@/lib/tenant-user-server";

export async function POST(req: NextRequest) {
    if (!db) {
        return NextResponse.json({ error: "Database not initialized" }, { status: 500 });
    }
    const firestore = db;

    try {
        // We expect stats to be passed here to secure the distribution
        // Or we assume stats were already saved to subcollection and we just finalize?
        // In StatsEntry.tsx, the user was writing stats AND updating wallet in one batch.
        // To be secure, this API should receive the stats, valid them, save them, AND distribute prizes.

        const { tournamentId, stats, userId } = await req.json();

        if (!tournamentId || !stats || !Array.isArray(stats)) {
            return NextResponse.json({ error: "Invalid data" }, { status: 400 });
        }

        const tournamentRef = firestore.collection("tournaments").doc(tournamentId);
        const tournamentSnap = await tournamentRef.get();

        if (!tournamentSnap.exists) {
            return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
        }

        const tournament = tournamentSnap.data()!;

        // Validate State
        if (tournament.status !== 'calculating' && tournament.status !== 'in_progress') {
            if (tournament.status === 'completed') {
                return NextResponse.json({ success: true, message: "Already completed" });
            }
            // We allow force complete from in_progress if needed, but usually it goes via calculating
        }

        // Run Transaction for Atomicity
        await firestore.runTransaction(async (t) => {
            // 1. Update Tournament Status
            t.update(tournamentRef, {
                status: 'completed',
                completedAt: Timestamp.now(),
                completedBy: userId
            });

            // 2. Process Winners & wallets
            for (const stat of stats) {
                // stat: { odId, kills, placement, earnings }
                if (stat.earnings > 0) {
                    const userRef = tenantUserDoc(firestore, stat.odId);

                    // Credit Wallet
                    t.update(userRef, {
                        walletBalance: FieldValue.increment(stat.earnings)
                    });

                    // Transaction Record
                    const txRef = firestore.collection("transactions").doc();
                    t.set(txRef, {
                        userId: stat.odId,
                        amount: stat.earnings,
                        type: 'prize',
                        description: `Prize from ${tournament.title}: #${stat.placement} with ${stat.kills} kills`,
                        status: 'success',
                        timestamp: Timestamp.now(),
                        tournamentId: tournamentId
                    });
                }

                // Update Participant Stats (History)
                const participantRef = tournamentRef.collection("participants").doc(stat.odId);
                // Note: The participant might not exist in 'participants' subcollection if we only used 'players' before?
                // The existing code used "participants" subcollection in StatsEntry.tsx check `doc(db, "tournaments", tournament.id, "participants", stat.odId)`
                // We should ensure we write to the correct place.
                // If it doesn't exist, set it (merge).

                // We'll use set with merge just in case
                t.set(participantRef, {
                    kills: stat.kills,
                    placement: stat.placement,
                    earnings: stat.earnings,
                    resultSubmittedAt: Timestamp.now()
                }, { merge: true });
            }
            // 3. Archive Room History (completed_rooms)
            // We need to fetch all players to archive them.
            // Try 'players' first (primary from join), then 'participants' (legacy/stats)
            const playersRef = tournamentRef.collection("players");
            const playersSnap = await playersRef.get();

            let participantsData: any[] = [];

            if (!playersSnap.empty) {
                participantsData = playersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            } else {
                // Fallback to participants
                const partsRef = tournamentRef.collection("participants");
                const partsSnap = await partsRef.get();
                participantsData = partsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            }

            // Merge stats into participantsData
            const finalParticipants = participantsData.map(p => {
                const stat = stats.find(s => s.odId === p.userId || s.odId === p.id);
                if (stat) {
                    return { ...p, ...stat };
                }
                return p;
            });

            const historyDocRef = firestore.collection("completed_rooms").doc(tournamentId);
            t.set(historyDocRef, {
                ...tournament,
                status: 'completed',
                completedAt: Timestamp.now(),
                completedBy: userId,
                participants: finalParticipants, // Archive all player data
                finalStats: stats
            });
        });

        // Note: We can't do complex async queries inside this transaction easily if we want to be performant
        // So we do it after.


        // =================================================================
        // POST-TRANSACTION: Process Queue
        // =================================================================
        // Now that the match is "completed", these users are "free" (if they were playing in it),
        // AND we can move queued users into new rooms.

        // Fetch queue again (outside transaction)
        if (tournament.templateId) {
            const queueSnap = await firestore.collection("queued_registrations")
                .where("templateId", "==", tournament.templateId)
                .orderBy("createdAt", "asc")
                .limit(50) // Larger batch
                .get();

            for (const doc of queueSnap.docs) {
                const data = doc.data();
                try {
                    // Attempt to join
                    await processTournamentJoin({
                        userId: data.userId,
                        templateId: data.templateId,
                        userName: data.userName,
                        userAvatar: data.userAvatar,
                        ingameName: data.ingameName,
                        skipBalanceCheck: true // They already paid when queuing
                    });

                    // Delete from queue if successful
                    await firestore.collection("queued_registrations").doc(doc.id).delete();
                } catch (err) {
                    console.error(`Failed to process queued user ${data.userId}:`, err);
                    // Decide: leave in queue? delete? 
                    // If error is non-transient, maybe delete? 
                    // For now, keep in queue or maybe retry later.
                }
            }
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Complete Match Error:", error);
        return NextResponse.json({ error: error.message || "Failed to complete match" }, { status: 500 });
    }
}
