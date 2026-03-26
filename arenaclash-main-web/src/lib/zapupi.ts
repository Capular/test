export const ZAPUPI_CONFIG = {
    tokenKey: process.env.ZAPUPI_TOKEN_KEY || "",
    secretKey: process.env.ZAPUPI_SECRET_KEY || "",
    baseUrl: "https://zapupi.com/api"
};

export interface CreateOrderParams {
    amount: string;
    orderId: string;
    customerMobile: string;
    redirectUrl: string;
    remark: string;
}

export async function createOrder(params: CreateOrderParams): Promise<any> {
    const payload = new URLSearchParams();
    payload.append('token_key', ZAPUPI_CONFIG.tokenKey);
    payload.append('secret_key', ZAPUPI_CONFIG.secretKey);
    payload.append('amount', params.amount);
    payload.append('order_id', params.orderId);
    payload.append('custumer_mobile', params.customerMobile); // Note: SDK uses 'custumer_mobile' typo as per provided file
    payload.append('redirect_url', params.redirectUrl);
    payload.append('remark', params.remark);

    try {
        const response = await fetch(`${ZAPUPI_CONFIG.baseUrl}/create-order`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: payload,
        });

        const data = await response.json();
        return data; // Return full data object as per SDK
    } catch (error) {
        console.error('ZapUPI Create Order Error:', error);
        throw error;
    }
}

export async function checkOrderStatus(orderId: string): Promise<any> {
    const payload = new URLSearchParams();
    payload.append('token_key', ZAPUPI_CONFIG.tokenKey);
    payload.append('secret_key', ZAPUPI_CONFIG.secretKey);
    payload.append('order_id', orderId);

    try {
        const response = await fetch(`${ZAPUPI_CONFIG.baseUrl}/order-status`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: payload,
        });

        const data = await response.json();

        // SDK Logic: Return the data directly. Let the calling function decide what constitutes success/failure
        // because keys might differ (txn_status vs status etc.)
        return data.data || data;
    } catch (error) {
        console.error('ZapUPI Check Status Error:', error);
        throw error;
    }
}
