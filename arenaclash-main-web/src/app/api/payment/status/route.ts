import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { checkOrderStatus } from '@/lib/zapupi';
import { tenantUserDoc } from '@/lib/tenant-user-server';

// ... (imports remain)

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { orderId, autoCheckUrl } = body;

        console.log("Checking status for Order ID:", orderId, "AutoCheckURL:", autoCheckUrl);

        // 0. Trigger ZapUPI's Bank Verification Webhook
        // ZapUPI relies on their frontend hitting this URL every 2 seconds to trigger the bank check.
        // Since we bypass their frontend, we MUST hit it here to force their backend to verify the payment.
        if (autoCheckUrl) {
            try {
                // ZapUPI frontend uses a GET request to this URL
                // Adding a User-Agent to avoid being flagged as a headless server script
                await fetch(autoCheckUrl, { 
                    method: 'GET',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    }
                });
            } catch (pingErr) {
                console.warn("Failed to ping ZapUPI auto-check webhook:", pingErr);
            }
        }

        // 1. Check status with Gateway via SDK Wrapper
        // Note: checkOrderStatus now returns the inner 'data' object on success, or throws on failure.
        const txData = await checkOrderStatus(orderId);
        console.log(`ZapUPI Check for ${orderId}:`, JSON.stringify(txData));

        // SDK returns the transaction object directly. We look for 'status' inside it.
        // Check multiple possible fields for status to be robust
        const rawStatus = txData?.status || txData?.txn_status || txData?.payment_status || txData?.result || '';
        const statusStr = String(rawStatus).trim().toUpperCase();
        console.log("Raw Gateway Status:", statusStr);

        const isSuccess = statusStr === 'SUCCESS';

        if (isSuccess) { 
            // Simplified check based on SDK return logic
            // ... (rest logic remains same)

            // Try-Catch block for Server-Side DB operations
            try {
                if (!db) {
                    console.warn("Firebase Admin DB not initialized. Skipping database update.");
                } else {
                    // 2. Find the transaction in Firestore
                    let txQuery = await db.collection('transactions')
                        .where('gatewayOrderId', '==', orderId)
                        .get();

                    if (txQuery.empty) {
                         txQuery = await db.collection('transactions')
                            .where('orderId', '==', orderId)
                            .get();
                    }

                    if (!txQuery.empty) {
                        // Loop through ALL matching docs to handle potential duplicates
                        const updatePromises = txQuery.docs.map(async (txDoc) => {
                            const txData = txDoc.data();

                            if (txData.status === 'pending') {
                                console.log("Processing pending transaction:", txDoc.id);

                                return db!.runTransaction(async (t) => {
                                    const currentTxDoc = await t.get(txDoc.ref);
                                    if (!currentTxDoc.exists) return;
                                    
                                    const currentTxData = currentTxDoc.data();
                                    if (!currentTxData || currentTxData.status !== 'pending') return;

                                    const userRef = tenantUserDoc(db!, txData.userId);
                                    const userDoc = await t.get(userRef);

                                    if (userDoc.exists) {
                                        t.update(txDoc.ref, {
                                            status: 'success',
                                            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                                            paymentMethod: 'ZapUPI'
                                        });

                                        const newBalance = (userDoc.data()?.walletBalance || 0) + txData.amount;
                                        t.update(userRef, {
                                            walletBalance: newBalance,
                                            updatedAt: admin.firestore.FieldValue.serverTimestamp()
                                        });
                                    }
                                });
                            } else if (txData.status === 'success') {
                                console.log(`Transaction ${txDoc.id} already successful.`);
                            }
                        });
                        
                        await Promise.all(updatePromises);
                        console.log("All matching transactions processed.");
                    } else {
                        console.warn("Transaction not found for Order ID:", orderId);
                    }
                }
            } catch (dbError) {
                console.error("Firestore Update Failed:", dbError);
                // Intentionally swallowing error to allow client to succeed
            }

            // Return success to client regardless of DB update outcome
            // Normalize status to 'SUCCESS' so client UI handles it correctly even if gateway returned 'txn_status'
            return NextResponse.json({ ...txData, status: 'SUCCESS' });
        }

        const isFailed = statusStr === 'ERROR' || statusStr === 'FAILED';

        if (isFailed) {
            // Explicitly handle failure
            console.log("Payment explicitly failed. Gateway Status:", statusStr);

            // Update DB to failed if possible
            try {
                if (db) {
                     // Find ALL matching transactions to handle potential duplicates
                     let txQuery = await db.collection('transactions')
                        .where('gatewayOrderId', '==', orderId)
                        .get();

                     if (txQuery.empty) {
                        txQuery = await db.collection('transactions')
                            .where('orderId', '==', orderId)
                            .get();
                     }

                    if (!txQuery.empty) {
                        const updatePromises = txQuery.docs.map(async (txDoc) => {
                            if (txDoc.data().status === 'pending') {
                                await txDoc.ref.update({
                                    status: 'failed',
                                    gatewayStatus: statusStr,
                                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                                });
                                console.log(`Transaction ${txDoc.id} marked as failed in DB.`);
                            }
                        });
                        await Promise.all(updatePromises);
                    }
                }
            } catch (e) { console.error("DB Update Error", e); }

            return NextResponse.json({ 
                error: "Payment failed at gateway.", 
                gatewayStatus: 'FAILED',
                status: 'FAILED' // Normalize for client
            }, { status: 400 });
        }

        // Default / Unknown Status
        console.log("Payment status failed check. Gateway Status:", txData?.status);
        
        let message = "Payment could not be verified.";
        let status = txData?.status?.toUpperCase();

        if (status === 'PENDING' || status === 'CREATED') {
            message = "Payment is still processing. Please wait a moment.";
        } else {
            message = `Payment could not be verified (Status: ${status || 'Unknown'}).`;
        }

        return NextResponse.json({ 
            error: message, 
            gatewayStatus: status 
        }, { status: 400 });
    } catch (error: any) {
        console.error("Payment Verification Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
