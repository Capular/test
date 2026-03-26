async function createOrder(
    tokenKey: string,
    secretKey: string,
    amount: string,
    orderId: string,
    customerMobile: string,
    redirectUrl: string,
    remark: string
  ): Promise<any> {
    const payload = new URLSearchParams();
    payload.append('token_key', tokenKey);
    payload.append('secret_key', secretKey);
    payload.append('amount', amount);
    payload.append('order_id', orderId);
    payload.append('custumer_mobile', customerMobile);
    payload.append('redirect_url', redirectUrl);
    payload.append('remark', remark);
  
    try {
      const response = await fetch('https://zapupi.com/api/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: payload,
      });
  
      const data = await response.json();
  
      if (response.ok && data.status === 'success') {
        return data;
      } else {
        throw new Error(data.message || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }
  
  // Usage
  createOrder(
    '0292e3c8b5ae1a4afc40182c51954533',
    'c5b9f4d315e6acce8a5d6493ff2edb40',
    '1',
    '1234',
    '1234567890',
    'https://zapupi.com/success',
    'TEST'
  )
    .then((order) => console.log('Order created:', order))
    .catch((error) => console.error('Order creation failed:', error));
  