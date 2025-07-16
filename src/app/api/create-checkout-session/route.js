import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';
import { getStripe, SUBSCRIPTION_PLANS } from '../../../lib/stripe';

export async function POST(request) {
  try {
    // DEVELOPMENT MODE: Skip authentication and return mock response
    const { planId } = await request.json();
    
    if (!planId || !SUBSCRIPTION_PLANS[planId]) {
      return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 });
    }

    // DEVELOPMENT: Return mock session ID instead of creating actual Stripe session
    return NextResponse.json({
      sessionId: 'dev_mock_session_' + Date.now(),
      message: 'Development mode - Stripe checkout disabled'
    });
  } catch (error) {
    console.error('Checkout session error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}