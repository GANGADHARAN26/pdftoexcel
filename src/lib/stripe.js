import { loadStripe } from '@stripe/stripe-js';
import Stripe from 'stripe';

// Client-side Stripe
export const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

// Server-side Stripe
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

export const SUBSCRIPTION_PLANS = {
  basic: {
    name: 'Basic Plan',
    price: 9.99,
    priceId: 'price_basic_monthly', // Replace with actual Stripe price ID
    features: [
      'Unlimited PDF conversions',
      'Priority processing',
      'Email support',
      'Download history',
    ],
  },
  pro: {
    name: 'Pro Plan',
    price: 19.99,
    priceId: 'price_pro_monthly', // Replace with actual Stripe price ID
    features: [
      'Everything in Basic',
      'Bulk processing',
      'API access',
      'Advanced analytics',
      'Priority support',
    ],
  },
};