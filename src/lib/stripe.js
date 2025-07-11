import { loadStripe } from '@stripe/stripe-js';

// Client-side Stripe
let stripePromise;
if (process.env.NODE_ENV !== 'production' || process.env.STRIPE_PUBLISHABLE_KEY) {
  stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY);
}

export { stripePromise };

// Server-side Stripe (only import on server)
export const getStripe = async () => {
  if (typeof window === 'undefined') {
    const Stripe = (await import('stripe')).default;
    return new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });
  }
  return null;
};

export const SUBSCRIPTION_PLANS = {
  basic: {
    name: 'Basic Plan',
    price: 9.99,
    priceId: 'price_1234567890', // Replace with actual Stripe price ID
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
    priceId: 'price_0987654321', // Replace with actual Stripe price ID
    features: [
      'Everything in Basic',
      'Bulk processing',
      'API access',
      'Advanced analytics',
      'Priority support',
    ],
  },
};