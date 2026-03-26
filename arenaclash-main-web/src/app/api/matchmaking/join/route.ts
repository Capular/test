// Edge runtime removed due to node:process dependency in firebase-admin
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { processTournamentJoin } from "@/lib/matchmaking";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { tenantUserDoc } from "@/lib/tenant-user-server";

export async function POST(req: NextRequest) {
    if (!db) {
        return NextResponse.json({ error: "Database not initialized" }, { status: 500 });
    }
    const firestore = db;

    let body;
    try {
        body = await req.json();
    } catch (e) {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { userId, templateId, userName, userAvatar, ingameName, teamSlotId } = body;

    try {
        if (!userId || !templateId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Optimized Flow: Try to Join Immediately
        // The processTournamentJoin function now checks for "Busy" status internally in parallel with other checks.
        // If busy, it throws an error with code 'USER_BUSY'.
        const result = await processTournamentJoin({
            userId,
            templateId,
            userName,
            userAvatar,
            ingameName,
            skipBalanceCheck: false,
            teamSlotId
        });

        return NextResponse.json({ success: true, ...result });

    } catch (error: any) {
        // Handle User Busy Case -> Queue Them
        if (error.code === 'USER_BUSY' || error.message === "User is already active in a match") {
            try {
                // 1. Check if already queued?
                const queueCheck = await firestore.collection("queued_registrations")
                    .where("userId", "==", userId)
                    .where("templateId", "==", templateId)
                    .limit(1)
                    .get();

                if (!queueCheck.empty) {
                    return NextResponse.json({ error: "You are already queued for the next match." }, { status: 409 });
                }

                // Get Template for Entry Fee info
                const templateSnap = await firestore.collection("templates").doc(templateId).get();
                const template = templateSnap.data();
                const entryFee = template?.entryFee || 0;

                // Run Transaction to Queue + Pay
                await firestore.runTransaction(async (t) => {
                    if (entryFee > 0) {
                        const userRef = tenantUserDoc(firestore, userId);
                        const userSnap = await t.get(userRef);
                        const currentBalance = userSnap.data()?.walletBalance || 0;

                        if (currentBalance < entryFee) {
                            throw new Error("Insufficient balance to queue");
                        }

                        t.update(userRef, { walletBalance: FieldValue.increment(-entryFee) });

                        const txRef = firestore.collection("transactions").doc();
                        t.set(txRef, {
                            userId,
                            type: 'entry',
                            amount: entryFee,
                            timestamp: Timestamp.now(),
                            description: `Queue Entry: ${template?.name || "Tournament"}`,
                            status: 'success',
                            tournamentId: "queued"
                        });
                    }

                    const queueRef = firestore.collection("queued_registrations").doc();
                    t.set(queueRef, {
                        userId,
                        templateId,
                        userName: userName || "Unknown",
                        userAvatar: userAvatar || "",
                        ingameName: ingameName || "",
                        entryFee,
                        teamSlotId: teamSlotId || null,
                        createdAt: Timestamp.now(),
                        status: 'queued'
                    });
                });

                return NextResponse.json({
                    success: true,
                    queued: true,
                    message: "You are active in another match. You have been queued for the next available match."
                });

            } catch (innerError: any) {
                console.error("Queue Logic Error:", innerError);
                return NextResponse.json({ error: innerError.message || "Failed to queue" }, { status: 500 });
            }
        }
        console.error("Matchmaking Error:", error);
        return NextResponse.json({ error: error.message || "Matchmaking failed" }, { status: 500 });
    }
}
