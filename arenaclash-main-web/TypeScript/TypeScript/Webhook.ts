// npm install express body-parser

import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';

const app = express();
const port = 3000;

app.use(bodyParser.json());

app.post('/webhook', (req: Request, res: Response) => {
  const data = req.body;

  const customerMobile = data.custumer_mobile;
  const utr = data.utr;
  const remark = data.remark;
  const txnId = data.txn_id;
  const createdAt = data.create_at;
  const orderId = data.order_id;
  const status = data.status;
  const amount = data.amount;

  console.log('Received Webhook Data:');
  console.log(`Customer Mobile: ${customerMobile}`);
  console.log(`UTR: ${utr}`);
  console.log(`Remark: ${remark}`);
  console.log(`Transaction ID: ${txnId}`);
  console.log(`Created At: ${createdAt}`);
  console.log(`Order ID: ${orderId}`);
  console.log(`Status: ${status}`);
  console.log(`Amount: ${amount}`);

  if (status === 'Success') {
    res.status(200).json({ message: 'Webhook received successfully' });
  } else {
    res.status(400).json({ message: 'Invalid status received' });
  }
});

app.listen(port, () => {
  console.log(`Webhook server running on port ${port}`);
});

// To start the server, run `node webhook.js`
// The webhook will listen on http://localhost:3000/webhook
