import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-02-25.clover',
  ...(process.env.STRIPE_ACCOUNT_ID ? { stripeAccount: process.env.STRIPE_ACCOUNT_ID } : {}),
});
