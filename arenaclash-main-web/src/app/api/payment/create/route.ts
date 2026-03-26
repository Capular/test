import { NextResponse } from 'next/server';
import { createOrder } from '@/lib/zapupi';
import { db } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { amount, userId, remark, orderId, customerMobile } = body;

        console.log("Creating order for:", userId, amount);

        if (!amount || !userId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Get origin for dynamic redirect URL
        const origin = request.headers.get('origin') || "https://arenaclash.gg";
        // 1. Create Order via ZapUPI
        // Use provided orderId or generate a unique one
        const uniqueOrderId = orderId || `${Date.now()}${Math.floor(Math.random() * 1000)}`;
        // Always generate a random mobile number on the server to prevent ZapUPI from dropping 
        // duplicate test transactions with the same mobile.
        const randomMobile = `9${Math.floor(100000000 + Math.random() * 900000000)}`;

        const orderData = await createOrder({
            amount: String(amount),
            orderId: uniqueOrderId,
            customerMobile: randomMobile,
            remark: remark || "Wallet Topup",
            redirectUrl: `${origin}/payment/processing/${uniqueOrderId}?status=check` 
        });

        // 3. Extract the direct UPI intent and tracking data from ZapUPI's JSON response!
        // ZapUPI natively returns this in their payload, no HTML scraping needed.
        let upiIntent = null;
        if (orderData.payment_data) {
            upiIntent = decodeURIComponent(orderData.payment_data);
        } else if (orderData.data?.payment_data) {
            upiIntent = decodeURIComponent(orderData.data.payment_data);
        }

        const autoCheckUrlValue = orderData.auto_check_every_2_sec || orderData.data?.auto_check_every_2_sec;
        if (autoCheckUrlValue) {
            orderData.autoCheckUrl = autoCheckUrlValue;
        }

        const paymentUrl = orderData.payment_url || orderData.data?.payment_url;

        // If JSON doesn't contain payment_data (which happens often), we MUST scrape the HTML
        if (!upiIntent && paymentUrl) {
            try {
                console.log("Empty payment_data in JSON. Fetching HTML to scrape UPI Intent from:", paymentUrl);
                const htmlResponse = await fetch(paymentUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.5',
                        'Connection': 'keep-alive',
                        'Upgrade-Insecure-Requests': '1'
                    }
                });
                
                if (!htmlResponse.ok) {
                    console.error(`ZapUPI HTML Fetch Failed: ${htmlResponse.status} ${htmlResponse.statusText}`);
                }
                
                const htmlText = await htmlResponse.text();

                // Advanced Regex to find the UPI Intent, safely handling spaces like `pn=ANU PAID SCRIM`
                const regexes = [
                    /payment_data['"]\s*[:=]\s*['"]([^'"]+)/,
                    /['"`](upi:\/\/pay\?[^'"`]+)['"`]/,
                    /data-intent=['"]([^'"]+)/,
                    /intent['"]?\s*:\s*['"]([^'"]+upi:\/\/[^'"]+)/,
                    /upiString\s*=\s*['"]([^'"]+)/,
                    // Targeted regexes that allow spaces to handle names like "ANU PAID SCRIM"
                    /(upi:\/\/pay\?pa=[^&"'\s<>]+&pn=[^&"'\s<> ]+(?: [^&"'\s<> ]+)*&am=[^&"'\s<>]+&tr=[^&"'\s<>]+)/,
                    /(upi:\/\/pay\?[^"'\s<]+(?: [^"'\s<]+)*)/
                ];

                for (const rx of regexes) {
                    const match = htmlText.match(rx);
                    if (match && match[1]) {
                        // Sometimes the match is URL encoded, sometimes it is purely raw
                        try {
                            // Try to decode first in case it's like payment_data=upi%3A...
                            let decoded = decodeURIComponent(match[1]);
                            
                            // Reverting to case-sensitive because TR and TID are case-sensitive.
                            // We will only lowercase the "PN" (Payee Name) if it exists, to satisfy "make it lowercase".
                            if (decoded.startsWith("upi://")) {
                                upiIntent = decoded.replace(/pn=([^&]*)/, (m, p1) => `pn=${p1.toLowerCase()}`);
                            } else {
                                upiIntent = match[1];
                            }
                        } catch (e) {
                            upiIntent = match[1];
                        }
                        
                        console.log("Successfully extracted upiIntent via regex:", upiIntent);
                        break;
                    }
                }
                
                // Also optionally grab the autoCheckUrl if it's missing in JSON
                if (!orderData.autoCheckUrl) {
                    // Look for fetch('.../auto-check-ID')
                    const autoCheckMatch = htmlText.match(/fetch\(['"]([^'"]*auto-check-[^'"]+)['"]/);
                    if (autoCheckMatch && autoCheckMatch[1]) {
                        orderData.autoCheckUrl = autoCheckMatch[1];
                        console.log("Extracted autoCheckUrl via regex:", orderData.autoCheckUrl);
                    }
                }
            } catch (err) {
                console.warn("Failed to scrape upiIntent from payment_url HTML", err);
            }
        }

        orderData.upiIntent = upiIntent;
        orderData.orderId = uniqueOrderId; // Crucial for Android tracking

        // 2. Insert Pending Transaction into Firestore
        // This is now at the end to ensure we have upiIntent and autoCheckUrl
        if (db) {
            await db.collection("transactions").add({
                userId: userId,
                amount: Number(amount),
                type: "deposit",
                status: "pending",
                gatewayOrderId: uniqueOrderId,
                upiIntent: upiIntent || null,
                autoCheckUrl: orderData.autoCheckUrl || null,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                description: "Wallet Recharge",
                paymentMethod: "ZapUPI"
            });
            console.log("Pending transaction created for orderId:", uniqueOrderId);
        }

        return NextResponse.json(orderData);

    } catch (error: any) {
        console.error("Create Order Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
