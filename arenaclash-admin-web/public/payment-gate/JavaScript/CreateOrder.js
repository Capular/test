class CreateOrderAPI {

    async createOrder(tokenKey, secretKey, amount, orderId, customerMobile, redirectUrl, remark) {
        const payload = new URLSearchParams();
        payload.append('token_key', tokenKey);
        payload.append('secret_key', secretKey);
        payload.append('amount', amount);
        payload.append('order_id', orderId);
        payload.append('customer_mobile', customerMobile);  // Fixed typo here
        payload.append('redirect_url', redirectUrl);
        payload.append('remark', remark);

        try {
            const response = await fetch("https://zapupi.com/api/create-order", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: payload
            });

            const data = await response.json();

            // Check both response status and API status field
            if (response.ok && data.status === 'success') {
                return data;
            } else {
                // Log the response for better debugging
                console.error('API response:', data);
                throw new Error(data.message || 'Unknown error occurred while creating order');
            }
        } catch (error) {
            console.error('Error creating order:', error);
            throw error;
        }
    }
}

// Usage
const api = new CreateOrderAPI();
api.createOrder(
    '0292e3c8b5ae1a4afc40182c51954533', 
    'c5b9f4d315e6acce8a5d6493ff2edb40', 
    '1', 
    '1234', 
    '1234567890', 
    'https://zapupi.com/success', 
    'TEST'
)
    .then(order => console.log('Order created:', order))
    .catch(error => console.error('Order creation failed:', error));
