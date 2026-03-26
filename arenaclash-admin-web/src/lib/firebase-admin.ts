import * as admin from 'firebase-admin';

let adminDb: admin.firestore.Firestore | null = null;
let adminAuth: admin.auth.Auth | null = null;
let adminMessaging: admin.messaging.Messaging | null = null;

try {
    if (!admin.apps.length) {
        // 1. Check for explicit environment variables
        const projectId = process.env.FIREBASE_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;

        if (projectId && clientEmail && privateKeyRaw) {
            // Handle private key newlines (literal \n or actual newlines)
            const privateKey = privateKeyRaw.replace(/\\n/g, '\n');

            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId,
                    clientEmail,
                    privateKey,
                }),
            });
            console.log("Firebase Admin: Initialized with explicit credentials.");
        } else {
            // 2. Debugging: Log what is missing (only on server logs)
            const missing = [];
            if (!projectId) missing.push("FIREBASE_PROJECT_ID");
            if (!clientEmail) missing.push("FIREBASE_CLIENT_EMAIL");
            if (!privateKeyRaw) missing.push("FIREBASE_PRIVATE_KEY");

            console.warn(`Firebase Admin: Missing environment variables: ${missing.join(", ")}`);

            // 3. Fallback to ADC - ONLY if not in Vercel/Production or explicitly desired
            // Using ADC without credentials causes "Unable to detect Project Id" errors lazily.
            // Better to fail init here or leave db as null so we fail gracefully.

            // Attempt generic init
            try {
                if (process.env.NODE_ENV === 'development') {
                    admin.initializeApp();
                    console.log("Firebase Admin: Initialized with ADC (Development).");
                } else {
                    console.warn("Firebase Admin: Skipping ADC in production. DB will be null.");
                }
            } catch (err) {
                console.warn("Firebase Admin: ADC Init failed.", err);
            }
        }
    }

    // Only attempts to get these if initialization was successful or app exists
    if (admin.apps.length) {
        adminDb = admin.firestore();
        adminAuth = admin.auth();
        adminMessaging = admin.messaging();
    }
} catch (error) {
    console.error("Firebase Admin Initialization Error:", error);
}

export { adminDb, adminAuth, adminMessaging };
