import { NextResponse } from 'next/server';
import { getStripe } from '../../../../lib/stripe';
import { connectToMongoDB } from '../../../../lib/mongoose';
import User from '../../../../models/User';

export async function POST(request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  let event;

  try {
    const stripe = await getStripe();
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    await connectToMongoDB();

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object);
        break;
      
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object);
        break;
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

async function handleCheckoutSessionCompleted(session) {
  const stripe = await getStripe();
  const userId = session.metadata.userId;
  const subscription = await stripe.subscriptions.retrieve(session.subscription);
  
  await User.findByIdAndUpdate(userId, {
    isSubscribed: true,
    subscriptionId: subscription.id,
    subscriptionStatus: subscription.status,
    subscriptionEndDate: new Date(subscription.current_period_end * 1000),
  });
}

async function handleInvoicePaymentSucceeded(invoice) {
  const stripe = await getStripe();
  const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
  const customer = await stripe.customers.retrieve(subscription.customer);
  
  const user = await User.findOne({ email: customer.email });
  if (user) {
    await User.findByIdAndUpdate(user._id, {
      isSubscribed: true,
      subscriptionStatus: subscription.status,
      subscriptionEndDate: new Date(subscription.current_period_end * 1000),
    });
  }
}

async function handleSubscriptionUpdated(subscription) {
  const stripe = await getStripe();
  const customer = await stripe.customers.retrieve(subscription.customer);
  const user = await User.findOne({ email: customer.email });
  
  if (user) {
    await User.findByIdAndUpdate(user._id, {
      subscriptionStatus: subscription.status,
      subscriptionEndDate: new Date(subscription.current_period_end * 1000),
    });
  }
}

async function handleSubscriptionDeleted(subscription) {
  const stripe = await getStripe();
  const customer = await stripe.customers.retrieve(subscription.customer);
  const user = await User.findOne({ email: customer.email });
  
  if (user) {
    await User.findByIdAndUpdate(user._id, {
      isSubscribed: false,
      subscriptionStatus: 'canceled',
      subscriptionEndDate: null,
    });
  }
}