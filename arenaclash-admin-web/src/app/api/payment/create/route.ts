import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const TOKEN_KEY = "65152fcfe4b3eaa9deb750d8710b953b";
const SECRET_KEY = "43530d9881bb470f78a1f9563d6510b3";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { amount, orderId, customerMobile } = body;

        const payload = new URLSearchParams();
        payload.append('token_key', TOKEN_KEY);
        payload.append('secret_key', SECRET_KEY);
        payload.append('amount', amount);
        payload.append('order_id', orderId);
        payload.append('customer_mobile', customerMobile || "9999999999");
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        payload.append('redirect_url', `${appUrl}/payment/processing/${orderId}?status=check`);
        payload.append('remark', 'Wallet Topup');

        const response = await fetch("https://zapupi.com/api/create-order", {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: payload
        });

        const data = await response.json();
        console.log("ZapUPI Request:", Object.fromEntries(payload));
        console.log("ZapUPI Response:", data);

        if (response.ok && data.status === 'success') {
            return NextResponse.json(data);
        } else {
            return NextResponse.json({ error: data.message || "Gateway Error", fullError: data }, { status: 400 });
        }
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
