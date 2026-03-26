import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { tenantUserDoc } from '@/lib/tenant-user-server';

const TOKEN_KEY = "65152fcfe4b3eaa9deb750d8710b953b";
const SECRET_KEY = "43530d9881bb470f78a1f9563d6510b3";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { orderId } = body;

        console.log("Checking status for Order ID:", orderId);

        // 1. Check status with Gateway
        const payload = new URLSearchParams();
        payload.append('token_key', TOKEN_KEY);
        payload.append('secret_key', SECRET_KEY);
        payload.append('order_id', orderId);

        const response = await fetch("https://zapupi.com/api/order-status", {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: payload
        });

        const data = await response.json();
        console.log(`ZapUPI Check for ${orderId}:`, JSON.stringify(data));

        // STRICT CHECK: ZapUPI returns { status: 200, result: { status: "SUCCESS" } } structure sometimes
        // We must check inner result or status carefully.
        const isSuccess = data.status === 'success' || (data.result && data.result.status === 'SUCCESS');

        if (response.ok && isSuccess) {

            // Try-Catch block for Server-Side DB operations
            try {
                if (!adminDb) {
                    console.warn("Firebase Admin DB not initialized. Skipping database update.");
                } else {
                    // 2. Find the transaction in Firestore
                    let txQuery = await adminDb.collection('transactions')
                        .where('gatewayOrderId', '==', orderId)
                        .limit(1)
                        .get();

                    // Fallback: Check 'orderId' if gatewayOrderId not found (for older txs)
                    if (txQuery.empty) {
                        console.log("Not found by gatewayOrderId, checking orderId...");
                        txQuery = await adminDb.collection('transactions')
                            .where('orderId', '==', orderId)
                            .limit(1)
                            .get();
                    }

                    if (!txQuery.empty) {
                        const txDoc = txQuery.docs[0];
                        const txData = txDoc.data();

                        // 3. Process if still pending
                        if (txData.status === 'pending') {
                            console.log("Processing pending transaction:", txDoc.id);

                            // Run transaction to ensure atomicity
                            await adminDb.runTransaction(async (t) => {
                                // Re-read inside transaction for safety
                                const currentTxDoc = await t.get(txDoc.ref);
                                const currentTxData = currentTxDoc.data();

                                if (!currentTxData || currentTxData.status !== 'pending') {
                                    return;
                                }

                                const userRef = tenantUserDoc(adminDb!, txData.userId); 
                                
                                const userDoc = await t.get(userRef);

                                if (userDoc.exists) {
                                    // Update Transaction Status
                                    t.update(txDoc.ref, {
                                        status: 'success',
                                        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                                        paymentMethod: 'ZapUPI'
                                    });

                                    // Update User Balance
                                    const newBalance = (userDoc.data()?.walletBalance || 0) + txData.amount;
                                    t.update(userRef, {
                                        walletBalance: newBalance,
                                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                                    });
                                }
                            });

                            console.log("Transaction processed successfully. Balance updated.");
                        } else if (txData.status === 'success') {
                            console.log("Transaction already successful.");
                        }
                    } else {
                        console.warn("Transaction not found for Order ID:", orderId);
                    }
                }
            } catch (dbError) {
                console.error("Firestore Update Failed:", dbError);
                // Intentionally swallowing error to allow client to succeed
            }

            // Return success to client regardless of DB update outcome
            return NextResponse.json(data);

        } else {
            console.log("Payment status failed/pending from gateway for:", orderId);
            return NextResponse.json({ error: data.message || "Payment not successful" }, { status: 400 });
        }
    } catch (error: any) {
        console.error("Payment Verification Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
