// Edge runtime removed due to node:process dependency in firebase-admin
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { processTournamentJoin } from "@/lib/matchmaking";

export async function POST(req: NextRequest) {
    if (!db) {
        return NextResponse.json({ error: "Database not initialized" }, { status: 500 });
    }

    let body;
    try {
        body = await req.json();
    } catch (e) {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { userId, templateId, teamSlotId } = body;

    if (!userId || !templateId) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    try {
        // 1. Verify they actually have a valid queue pass
        const queueSnap = await db.collection("queued_registrations")
            .where("userId", "==", userId)
            .where("templateId", "==", templateId)
            .limit(1)
            .get();

        if (queueSnap.empty) {
            return NextResponse.json({ error: "No queue registration found." }, { status: 404 });
        }

        const queueData = queueSnap.docs[0].data();

        // 2. Consume the pass and join the active or next match
        const result = await processTournamentJoin({
            userId,
            templateId,
            userName: queueData.userName,
            userAvatar: queueData.userAvatar,
            ingameName: queueData.ingameName,
            skipBalanceCheck: true, // IMPORTANT: They already paid when they queued
            teamSlotId: teamSlotId || queueData.teamSlotId || undefined
        });

        // 3. Delete the queue entry
        await db.collection("queued_registrations").doc(queueSnap.docs[0].id).delete();

        return NextResponse.json({ success: true, ...result });

    } catch (error: any) {
        console.error("Consume Queue Error:", error);
        return NextResponse.json({ error: error.message || "Failed to consume queue" }, { status: 500 });
    }
}
