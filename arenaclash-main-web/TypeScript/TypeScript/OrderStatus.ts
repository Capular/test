async function checkOrderStatus(
    tokenKey: string,
    secretKey: string,
    orderId: string
  ): Promise<any> {
    const payload = new URLSearchParams();
    payload.append('token_key', tokenKey);
    payload.append('secret_key', secretKey);
    payload.append('order_id', orderId);
  
    try {
      const response = await fetch('https://zapupi.com/api/order-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: payload,
      });
  
      const data = await response.json();
  
      if (response.ok && data.status === 'success') {
        return data.data;
      } else {
        throw new Error(data.message || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('Error checking order status:', error);
      throw error;
    }
  }
  
  // Usage
  checkOrderStatus(
    '0292e3c8b5ae1a4afc40182c51954533',
    'c5b9f4d315e6acce8a5d6493ff2edb40',
    '1234'
  )
    .then((status) => console.log('Order status:', status))
    .catch((error) => console.error('Error checking order status:', error));
  