const ZAPUPI_CONFIG = { tokenKey: '65152fcfe4b3eaa9deb750d8710b953b', secretKey: '43530d9881bb470f78a1f9563d6510b3', baseUrl: 'https://zapupi.com/api' };

async function testFlow() {
    const payload = new URLSearchParams();
    payload.append('token_key', ZAPUPI_CONFIG.tokenKey);
    payload.append('secret_key', ZAPUPI_CONFIG.secretKey);
    payload.append('amount', '10');
    
    // Create Random Order using App logic (Timestamp + Random)
    const testOrderId = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
    payload.append('order_id', testOrderId);
    payload.append('custumer_mobile', '9999999999');
    payload.append('redirect_url', 'http://localhost:3000');
    payload.append('remark', 'testing API flow');

    console.log('Creating Order:', testOrderId);
    const createRes = await fetch(`${ZAPUPI_CONFIG.baseUrl}/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: payload
    });
    
    const createData = await createRes.json();
    console.log('--- Create Response ---');
    console.log(JSON.stringify(createData, null, 2));

    const autoCheckUrl = createData.auto_check_every_2_sec || createData.data?.auto_check_every_2_sec;
    if (autoCheckUrl) {
        console.log('--- Found Auto Check URL, pinging... ---', autoCheckUrl);
        await fetch(autoCheckUrl);
    }
    
    console.log('--- Checking Status ---');
    const statPayload = new URLSearchParams();
    statPayload.append('token_key', ZAPUPI_CONFIG.tokenKey);
    statPayload.append('secret_key', ZAPUPI_CONFIG.secretKey);
    statPayload.append('order_id', testOrderId);

    const statRes = await fetch(`${ZAPUPI_CONFIG.baseUrl}/order-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: statPayload
    });

    const statData = await statRes.json();
    console.log('--- Status Response ---');
    console.log(JSON.stringify(statData, null, 2));
}

testFlow().catch(console.error);
