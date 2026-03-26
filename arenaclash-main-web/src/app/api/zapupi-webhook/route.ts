import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { tenantUserDoc } from '@/lib/tenant-user-server';

export async function POST(request: Request) {
    try {
        let body: any;
        const contentType = request.headers.get("content-type") || "";

        if (contentType.includes("application/x-www-form-urlencoded")) {
            const text = await request.text();
            const params = new URLSearchParams(text);
            body = Object.fromEntries(params);
        } else {
            body = await request.json();
        }

        console.log("🔥 ZAPUPI WEBHOOK RECEIVED:", JSON.stringify(body));

        // ZapUPI usually sends order_id or client_txn_id and status
        const orderId = body.order_id || body.client_txn_id || body.orderId;
        const rawStatus = body.status || body.txn_status || body.payment_status || body.result || '';
        const statusStr = String(rawStatus).trim().toUpperCase();

        if (!orderId) {
            return NextResponse.json({ error: "Missing orderId in webhook" }, { status: 400 });
        }

        const isSuccess = statusStr === 'SUCCESS' || statusStr === 'COMPLETED';
        const isFailed = statusStr === 'FAILED' || statusStr === 'ERROR';

        if (!db) {
            console.error("Firebase Admin DB not initialized in webhook.");
            return NextResponse.json({ error: "DB Error" }, { status: 500 });
        }

        // Only process definitive statuses
        if (isSuccess || isFailed) {
            const finalStatus = isSuccess ? 'success' : 'failed';
            
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
                    const txData = txDoc.data();

                    if (txData.status === 'pending') {
                        console.log(`Webhook processing pending tx: ${txDoc.id} -> ${finalStatus}`);

                        return db!.runTransaction(async (t) => {
                            const currentTxDoc = await t.get(txDoc.ref);
                            if (!currentTxDoc.exists) return;
                            
                            const currentTxData = currentTxDoc.data();
                            if (!currentTxData || currentTxData.status !== 'pending') return;

                            const userRef = tenantUserDoc(db!, txData.userId);
                            const userDoc = await t.get(userRef);

                            if (userDoc.exists) {
                                t.update(txDoc.ref, {
                                    status: finalStatus,
                                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                                    paymentMethod: 'ZapUPI Webhook'
                                });

                                // ONLY add balance if it's a deposit AND it was successful
                                if (isSuccess && (txData.type === 'deposit' || txData.type === 'top_up')) {
                                    const newBalance = (userDoc.data()?.walletBalance || 0) + txData.amount;
                                    t.update(userRef, {
                                        walletBalance: newBalance,
                                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                                    });
                                    console.log(`Webhook credited user ${txData.userId} with ${txData.amount}`);
                                }
                            }
                        });
                    } else {
                        console.log(`Webhook ignored tx ${txDoc.id} as it is already ${txData.status}`);
                    }
                });
                
                await Promise.all(updatePromises);
            } else {
                console.warn("Webhook received for unknown Order ID:", orderId);
            }
        }

        // Always return 200 OK so ZapUPI knows we received it
        return NextResponse.json({ status: "ok", received: true });

    } catch (error) {
        console.error("ZapUPI Webhook Processing Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
