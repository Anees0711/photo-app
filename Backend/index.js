const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const Stripe = require('stripe');

const stripe = Stripe('sk_test_YOUR_STRIPE_SECRET_KEY'); // Replace with your Stripe secret key

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.post('/create-payment-intent', async (req, res) => {
  const { amount } = req.body;
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd', // use 'usd' for testing
      payment_method_types: ['card'],
    });
    res.send({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.log(error);
    res.status(500).send({ error: 'Payment failed' });
  }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
