class OrderStatusAPI {

    async checkOrderStatus(tokenKey, secretKey, orderId) {
        const payload = new URLSearchParams();
        payload.append('token_key', tokenKey);
        payload.append('secret_key', secretKey);
        payload.append('order_id', orderId);

        try {
            const response = await fetch("https://zapupi.com/api/order-status", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: payload
            });

            const data = await response.json();

            // Check both response status and API status field
            if (response.ok && data.status === 'success') {
                return data.data;  // Returning the 'data' field from the response
            } else {
                // Log the response for better debugging
                console.error('API response:', data);
                throw new Error(data.message || 'Unknown error occurred while checking order status');
            }
        } catch (error) {
            console.error('Error checking order status:', error);
            throw error;
        }
    }
}

// Usage
const api = new OrderStatusAPI();
api.checkOrderStatus(
    '0292e3c8b5ae1a4afc40182c51954533', 
    'c5b9f4d315e6acce8a5d6493ff2edb40', 
    '1234'
)
    .then(status => console.log('Order status:', status))
    .catch(error => console.error('Order status check failed:', error));
