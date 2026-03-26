const ZAPUPI_CONFIG = {
    tokenKey: "65152fcfe4b3eaa9deb750d8710b953b",
    secretKey: "43530d9881bb470f78a1f9563d6510b3",
    baseUrl: "https://zapupi.com/api"
};

async function run() {
    try {
        const payload = new URLSearchParams();
        payload.append('token_key', ZAPUPI_CONFIG.tokenKey);
        payload.append('secret_key', ZAPUPI_CONFIG.secretKey);
        payload.append('amount', '10');
        payload.append('order_id', `${Date.now()}${Math.floor(Math.random() * 1000)}`);
        payload.append('custumer_mobile', '9999999999');
        payload.append('redirect_url', 'http://localhost:3000/test');
        payload.append('remark', 'test script');

        console.log("Creating ZapUPI test order...");
        const response = await fetch(`${ZAPUPI_CONFIG.baseUrl}/create-order`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: payload,
        });

        const data = await response.json();
        console.log("Create Order Response:", data);
        
        const paymentUrl = data.result?.payment_url || data.payment_url || data.data?.payment_url;
        
        if (paymentUrl) {
            console.log("Fetching HTML from", paymentUrl);
            const htmlRes = await fetch(paymentUrl);
            const html = await htmlRes.text();
            require('fs').writeFileSync('zapupi_debug.html', html);
            console.log("Saved to zapupi_debug.html");
        } else {
            console.log("No payment URL found.");
        }
    } catch(e) {
        console.error(e);
    }
}

run();
