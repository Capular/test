const http = require('http');

// Create a simple HTTP server
const server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/webhook') {
        let body = '';

        // Collect the data sent in the request body
        req.on('data', chunk => {
            body += chunk.toString(); // Convert buffer to string
        });

        // Process the request once all data is received
        req.on('end', () => {
            try {
                // Parse the JSON data from the body
                const data = JSON.parse(body);

                // Extract values from the webhook payload
                const customerMobile = data.custumer_mobile;
                const utr = data.utr;
                const remark = data.remark;
                const txnId = data.txn_id;
                const createdAt = data.create_at;
                const orderId = data.order_id;
                const status = data.status;
                const amount = data.amount;

                // Log the received data
                console.log('Received Webhook Data:');
                console.log('Customer Mobile:', customerMobile);
                console.log('UTR:', utr);
                console.log('Remark:', remark);
                console.log('Transaction ID:', txnId);
                console.log('Created At:', createdAt);
                console.log('Order ID:', orderId);
                console.log('Status:', status);
                console.log('Amount:', amount);

                // Respond based on the status field
                if (status === 'Success') {
                    // Send a success response to acknowledge the webhook
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Webhook received successfully' }));
                } else {
                    // Handle failure cases
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Invalid status received' }));
                }
            } catch (error) {
                console.error('Error processing webhook:', error);
                // Send an error response if there was an issue with parsing the JSON
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Invalid JSON payload' }));
            }
        });
    } else {
        // Handle invalid routes
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Not Found' }));
    }
});

// Start the server on port 8080
server.listen(8080, () => {
    console.log('Webhook server is listening on port 8080');
});
