// Edge runtime removed due to node:process dependency in firebase-admin

import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { tenantUserDoc } from '@/lib/tenant-user-server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { userId, amount, upiId, accountHolderName, bankName, accountNumber, ifscCode, method } = body;

        if (!userId || !amount || amount <= 0) {
            return NextResponse.json({ error: "Invalid request parameters" }, { status: 400 });
        }

        if (!db) {
            return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
        }

        // Run as a transaction to ensure atomicity
        await db.runTransaction(async (t) => {
            const userRef = tenantUserDoc(db!, userId);
            const userDoc = await t.get(userRef);

            if (!userDoc.exists) {
                throw new Error("User not found");
            }

            const userData = userDoc.data();
            const currentBalance = userData?.walletBalance || 0;

            // Calculate Winnings (Logic: Lifetime Prizes - Lifetime Withdrawals)
            // Note: This relies on aggregate stats being correct or querying all txns.
            // For now, we will query all 'prize' and 'withdrawal' transactions for this user within the transaction to be safe, 
            // OR if we trust a 'winningsBalance' field if it existed.
            // Since we don't have a 'winningsBalance' field, we must calculate it or rely on client side (unsafe).
            // BETTER APPROACH: Let's query the transactions summary efficiently or just use currentBalance as the cap, 
            // but enforcing "winnings only" requires knowing the total winnings.
            
            // Let's first check balance.
            if (currentBalance < amount) {
                throw new Error("Insufficient wallet balance");
            }

            // ENFORCE WINNINGS LOGIC:
            // We need to know how much "winnable" money they have.
            // Simple formula: Winnings = Total Prizes Won. 
            // Withdrawable = Total Prizes - Total Completed Withdrawals.
            // We need to fetch this. To avoid massive reads, we should probably have aggregated this.
            // For this MVP, we will do a query.
            
            const txQuery = await db!.collection('transactions')
                .where('userId', '==', userId)
                .where('status', 'in', ['success', 'completed', 'pending']) // Pending withdrawals count against limit? Yes.
                .get();

            let totalPrizes = 0;
            let totalWithdrawals = 0;

            txQuery.forEach(doc => {
                const data = doc.data();
                if (data.type === 'prize') {
                    totalPrizes += (data.amount || 0);
                } else if (data.type === 'withdrawal') {
                    totalWithdrawals += (data.amount || 0);
                }
            });

            const availableWinnings = Math.max(0, totalPrizes - totalWithdrawals);

            if (amount > availableWinnings) {
                throw new Error(`Insufficient winnings. Available to withdraw: ₹${availableWinnings}`);
            }

            // If we are here, everything is good.
            // 1. Deduct Balance
            const newBalance = currentBalance - amount;
            t.update(userRef, {
                walletBalance: newBalance,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            // 2. Create Transaction
            const newTxRef = db!.collection('transactions').doc();
            t.set(newTxRef, {
                userId,
                amount: Number(amount),
                type: 'withdrawal',
                status: 'pending',
                method: method || 'upi', // 'upi' or 'bank'
                upiId: upiId || null,
                accountHolderName: accountHolderName || null,
                bankDetails: method === 'bank' ? {
                    accountHolderName,
                    bankName,
                    accountNumber,
                    ifscCode
                } : null,
                description: "Withdrawal Request",
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                timestamp: admin.firestore.FieldValue.serverTimestamp() // redundant but safe
            });
        });

        return NextResponse.json({ success: true, message: "Withdrawal request submitted successfully" });

    } catch (error: any) {
        console.error("Withdrawal Error:", error);
        return NextResponse.json({ error: error.message || "Withdrawal failed" }, { status: 400 });
    }
}
