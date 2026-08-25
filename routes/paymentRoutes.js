import express from 'express';
import { Safepay } from '@sfpy/node-sdk';
import { Order } from '../models/Order.js';

const router = express.Router();

let safepay;
const getSafepayClient = () => {
  if (!safepay) {
    safepay = new Safepay({
      environment: process.env.SAFEPAY_ENVIRONMENT || 'sandbox',
      apiKey: process.env.SAFEPAY_API_KEY,
      v1Secret: process.env.SAFEPAY_V1_SECRET,
      webhookSecret: process.env.SAFEPAY_WEBHOOK_SECRET,
    });
  }
  return safepay;
};

// Advance payment (50%) checkout creation endpoint
router.post('/create-payment', async (req, res) => {
  try {
    const { orderId, totalAmount } = req.body;

    let amount = totalAmount;

    // Retrieve order total from database if not provided directly
    if (orderId && !amount) {
      let order = null;
      if (typeof orderId === 'string' && orderId.match(/^[0-9a-fA-F]{24}$/)) {
        order = await Order.findById(orderId);
      }
      if (!order) {
        order = await Order.findOne({ orderId });
      }
      if (order) {
        amount = order.totalPrice;
      }
    }

    if (!amount || isNaN(amount)) {
      return res.status(400).json({ error: 'Valid totalAmount or orderId is required' });
    }

    // 50% advance amount in paisas (smallest unit for PKR)
    const advanceAmount = Math.round(amount * 0.5 * 100);

    const client = getSafepayClient();

    // Step 1: Create payment token
    const { token } = await client.payments.create({
      amount: advanceAmount,
      currency: 'PKR',
    });

    const clientUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:5173';

    // Step 2: Generate checkout link
    const checkoutUrl = client.checkout.create({
      token,
      orderId: orderId || `ORD-${Date.now()}`,
      cancelUrl: `${clientUrl}/payment-cancel`,
      redirectUrl: `${clientUrl}/payment-success`,
      source: 'custom',
      webhooks: true,
    });

    res.json({ checkoutUrl, token });
  } catch (error) {
    console.error('Payment creation failed:', error);
    res.status(500).json({ error: error.message || 'Payment creation failed' });
  }
});

// Webhook — actual payment confirmation from Safepay
router.post('/webhook/safepay', async (req, res) => {
  try {
    const client = getSafepayClient();
    const isValid = client.verify.signature(req);

    if (!isValid) {
      console.warn('Safepay webhook signature invalid');
      return res.status(400).send('Invalid signature');
    }

    let event;
    if (Buffer.isBuffer(req.body)) {
      event = JSON.parse(req.body.toString('utf8'));
    } else if (typeof req.body === 'string') {
      event = JSON.parse(req.body);
    } else {
      event = req.body;
    }

    if (event && event.type === 'payment.success') {
      console.log('Payment confirmed via Safepay webhook:', event.data);

      const orderId = event.data?.orderId;
      if (orderId) {
        let order = null;
        if (typeof orderId === 'string' && orderId.match(/^[0-9a-fA-F]{24}$/)) {
          order = await Order.findById(orderId);
        }
        if (!order) {
          order = await Order.findOne({ orderId });
        }

        if (order) {
          order.isPaid = true;
          order.paidAt = new Date();
          order.status = 'processing';
          order.paymentResult = {
            id: event.data.token || event.data.tracker || `SAFEPAY_${Date.now()}`,
            status: 'COMPLETED',
            updateTime: new Date().toISOString(),
          };
          await order.save();
          console.log(`Order ${orderId} successfully updated to paid via Safepay.`);
        }
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Safepay webhook handler error:', error);
    res.status(500).send('Webhook handler error');
  }
});

export default router;
