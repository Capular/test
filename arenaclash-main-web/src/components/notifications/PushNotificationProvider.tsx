"use client";

import { useEffect } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
import { app, db } from "@/lib/firebase";
import { updateDoc, arrayUnion } from "firebase/firestore";
import { toast } from "sonner";
import { tenantUserRef } from "@/lib/tenant-user-client";

// Constant VAPID key retrieved from Firebase Console
const VAPID_KEY = "BKz3abG9k_PboB4f_Mr09pyU3yIuyHXI2fzoq6YjQraBgVoq1Aptceu2VP1U3Y-igmeHhXtzcRdHCbLYG2WxH3s";

export function PushNotificationProvider() {
    const { user } = useAuth();

    useEffect(() => {
        const setupNotifications = async () => {
            if (!user) return; // Only prompt/sync for logged-in users

            try {
                const supported = await isSupported();
                if (!supported) {
                    console.log("Firebase Messaging is not supported in this browser.");
                    return;
                }

                const messaging = getMessaging(app);

                // Check permission
                const permission = await Notification.requestPermission();
                if (permission !== "granted") {
                    console.log("Notification permission not granted.");
                    return;
                }

                // Get Web FCM Token
                console.log("Fetching FCM token for Web...");
                const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });

                if (currentToken) {
                    // Sync to Firestore
                    const userRef = tenantUserRef(db, user.uid);
                    await updateDoc(userRef, {
                        fcmTokens: arrayUnion(currentToken)
                    });
                    console.log("Web FCM Token Synced!");
                } else {
                    console.log("No registration token available. Request permission to generate one.");
                }

                // Handle Foreground Messages
                onMessage(messaging, (payload) => {
                    console.log("Message received in foreground:", payload);
                    if (payload.notification) {
                        toast.message("New Notification", {
                            description: payload.notification.title + " - " + payload.notification.body,
                            duration: 5000,
                        });
                    }
                });

            } catch (err) {
                console.error("Failed to setup push notifications:", err);
            }
        };

        setupNotifications();
    }, [user]);

    // This is a headless component that just handles the logic
    return null;
}
