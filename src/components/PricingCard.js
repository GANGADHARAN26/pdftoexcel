'use client';

import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import { stripePromise } from '../lib/stripe';

export default function PricingCard({ 
  plan, 
  planId, 
  isPopular = false,
  isCurrentPlan = false 
}) {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubscribe = async () => {
    if (!session) {
      toast.error('Please sign in to subscribe');
      return;
    }

    setIsLoading(true);

    try {
      // Create checkout session
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ planId }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { sessionId } = await response.json();

      // Redirect to Stripe Checkout
      const stripe = await stripePromise;
      const { error } = await stripe.redirectToCheckout({
        sessionId,
      });

      if (error) {
        throw new Error(error.message);
      }
    } catch (error) {
      console.error('Subscription error:', error);
      toast.error(error.message || 'Failed to start subscription');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`relative bg-white rounded-lg border-2 p-6 ${
      isPopular ? 'border-blue-500 shadow-lg' : 'border-gray-200'
    }`}>
      {isPopular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <span className="bg-blue-500 text-white text-xs font-medium px-3 py-1 rounded-full">
            Most Popular
          </span>
        </div>
      )}

      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          {plan.name}
        </h3>
        <div className="text-3xl font-bold text-gray-900">
          ${plan.price}
          <span className="text-base font-normal text-gray-500">/month</span>
        </div>
      </div>

      <ul className="space-y-3 mb-6">
        {plan.features.map((feature, index) => (
          <li key={index} className="flex items-center space-x-3">
            <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
            <span className="text-gray-700">{feature}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={handleSubscribe}
        disabled={isLoading || isCurrentPlan}
        className={`w-full py-3 px-4 rounded-md font-medium transition-colors flex items-center justify-center space-x-2 ${
          isCurrentPlan
            ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
            : isPopular
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-gray-900 text-white hover:bg-gray-800'
        }`}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Processing...</span>
          </>
        ) : isCurrentPlan ? (
          <span>Current Plan</span>
        ) : (
          <span>Choose Plan</span>
        )}
      </button>

      {isCurrentPlan && (
        <p className="text-center text-sm text-gray-500 mt-2">
          You're currently on this plan
        </p>
      )}
    </div>
  );
}