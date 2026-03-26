import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminMessaging } from "@/lib/firebase-admin";
import { tenantUserDoc } from "@/lib/tenant-user-server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, body: messageBody, imageUrl, targetType, targetUserId } = body;

    // 1. Validate payload
    if (!title || !messageBody || !targetType) {
      return NextResponse.json(
        { error: "Missing required fields (title, body, targetType)." },
        { status: 400 }
      );
    }

    if (targetType === "specific" && !targetUserId) {
      return NextResponse.json(
        { error: "Target User ID is required for specific targeting." },
        { status: 400 }
      );
    }

    // 2. Construct the FCM Message Base
    const messagePayload: any = {
      notification: {
        title,
        body: messageBody,
        ...(imageUrl && { imageUrl }),
      },
      // Android specific styling can be customized here if needed later
      android: {
        notification: {
          sound: "default",
        },
      },
      // WebPush specific config
      webpush: {
        notification: {
          icon: "/icon.png", 
        }
      }
    };

    let pushResponse;

    // 3. Dispatch based on Target Type
    if (targetType === "all") {
      // Send to the global topic
      pushResponse = await adminMessaging!.send({
        ...messagePayload,
        topic: "all_users",
      });
    } else if (targetType === "specific") {
      // Fetch user's tokens from Firestore
      const userRef = tenantUserDoc(adminDb!, targetUserId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        return NextResponse.json(
          { error: "Target user not found in database." },
          { status: 404 }
        );
      }

      const userData = userDoc.data();
      const fcmTokens = userData?.fcmTokens;

      if (!fcmTokens || !Array.isArray(fcmTokens) || fcmTokens.length === 0) {
         return NextResponse.json(
           { error: "Target user does not have any registered devices (fcmTokens)." },
           { status: 400 }
         );
      }

      // Send multicast to all the user's tokens
      pushResponse = await adminMessaging!.sendEachForMulticast({
        ...messagePayload,
        tokens: fcmTokens,
      });
      // Optionally clean up unregistered/failed tokens here based on pushResponse.responses
    }

    // 4. Log the notification payload to Firestore
    const notificationLog = {
      title,
      body: messageBody,
      imageUrl: imageUrl || null,
      targetType,
      targetUserId: targetUserId || null,
      sentAt: new Date().toISOString(),
      providerResponse: pushResponse,
    };

    const docRef = await adminDb!.collection("notifications").add(notificationLog);

    return NextResponse.json({ 
      success: true, 
      message: "Notification dispatched successfully.",
      logId: docRef.id,
      pushResponse 
    });

  } catch (error: any) {
    console.error("Error sending notification:", error);
    return NextResponse.json(
      { error: "Failed to send notification.", details: error.message },
      { status: 500 }
    );
  }
}
