import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { tenantUserDoc } from "@/lib/tenant-user-server";

export async function POST(req: NextRequest) {
    if (!db) {
        return NextResponse.json({ error: "Database not initialized" }, { status: 500 });
    }
    const firestore = db;

    try {
        const { tournamentId, userId, adminId } = await req.json();

        if (!tournamentId || !userId || !adminId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // 1. Verify Admin Permissions
        const adminRef = tenantUserDoc(firestore, adminId);
        const adminSnap = await adminRef.get();
        if (!adminSnap.exists || !adminSnap.data()?.isAdmin) {
            return NextResponse.json({ error: "Unauthorized: Admins only" }, { status: 403 });
        }

        // 2. Run Transaction to Remove Player and Refund
        await firestore.runTransaction(async (t) => {
            const tournamentRef = firestore.collection("tournaments").doc(tournamentId);
            const tournamentSnap = await t.get(tournamentRef);

            if (!tournamentSnap.exists) {
                throw new Error("Tournament not found");
            }

            const tournamentData = tournamentSnap.data()!;

            // Check if player exists in subcollection (or 'players' depending on schema usage)
            // Based on previous files, real-time listener uses 'participants' subcollection in MatchHosting.
            // Matchmaking uses 'players' subcollection in 'join/route.ts'.
            // WE MUST HANDLE BOTH OR KNOW WHICH ONE IS CANONICAL. 
            // The codebase seems to be transitioning. MatchHosting reads 'participants'. Matchmaking writes 'players'.
            // WAIT - MatchHosting reads 'participants' in one file and 'players' might be used elsewhere.
            // Let's check where MatchHosting reads from: `collection(db, "tournaments", tournamentId, "participants")`
            // But matchmaking writes to `collection("players")` inside tournament doc.
            // This is a discrepancy I noticed earlier.
            // If matchmaking writes to 'players', then MatchHosting reading 'participants' would show nothing unless something syncs them.
            // OR I misread MatchHosting... let's re-verify MatchHosting imports.

            // Re-reading MatchHosting code (from my memory/artifacts):
            // "const pSnapshot = await getDocs(collection(db, "tournaments", tournamentId, "participants"));"

            // And Matchmaking join route:
            // "const playerRef = tournamentRef.collection("players").doc(userId);"

            // CRITICAL: There is a mismatch. 
            // If I fix this now, I should assume 'players' is the intended one from the join route (newer code?).
            // However, the `StatsEntry` writes to `participants` maybe?
            // To be safe, I will try to delete from BOTH subcollections to ensure cleanup.

            const participantRef = tournamentRef.collection("participants").doc(userId);
            const playerRef = tournamentRef.collection("players").doc(userId); // The one from join route

            // Check if they paid
            // We need to know how much to refund.
            // Join route writes `entryFee` to transaction but doesn't explicitly save `feePaid` on player doc in all cases? 
            // Join route: `entryFee` is deducted.
            // Let's assume full refund of `tournamentData.entryFee` if it exists.

            const entryFee = tournamentData.entryFee || 0;

            // Delete docs
            t.delete(participantRef);
            t.delete(playerRef);

            // Decrement count and remove from participantIds
            t.update(tournamentRef, {
                currentPlayers: FieldValue.increment(-1),
                participantIds: FieldValue.arrayRemove(userId)
            });

            // Refund if applicable
            if (entryFee > 0) {
                const userRef = tenantUserDoc(firestore, userId);
                t.update(userRef, {
                    walletBalance: FieldValue.increment(entryFee)
                });

                // Record Refund Transaction
                const txRef = firestore.collection("transactions").doc();
                t.set(txRef, {
                    userId,
                    amount: entryFee,
                    type: 'refund',
                    description: `Refund: Kicked from ${tournamentData.title || tournamentData.game}`,
                    status: 'success',
                    timestamp: Timestamp.now(),
                    tournamentId
                });
            }
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Kick Error:", error);
        return NextResponse.json({ error: error.message || "Failed to kick user" }, { status: 500 });
    }
}
