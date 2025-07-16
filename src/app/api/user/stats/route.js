import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { connectToMongoDB } from '../../../../lib/mongoose';
import User from '../../../../models/User';
import Conversion from '../../../../models/Conversion';

export async function GET(request) {
  try {
    // DEVELOPMENT MODE: Skip authentication and return mock data
    await connectToMongoDB();

    // Get recent conversions (no user filtering in dev mode)
    const conversions = await Conversion.find({})
      .sort({ createdAt: -1 })
      .limit(20);

    return NextResponse.json({
      user: {
        name: 'Development User',
        email: 'dev@example.com',
        image: null,
        isSubscribed: true, // Always subscribed in dev mode
        subscriptionStatus: 'active',
        subscriptionEndDate: null,
      },
      usage: {
        today: 0,
        thisMonth: 0,
        total: conversions.length,
        remainingToday: 'Unlimited', // No limits in dev mode
      },
      conversions: conversions.map(conv => ({
        id: conv._id,
        originalFileName: conv.originalFileName,
        fileSize: conv.fileSize,
        pagesProcessed: conv.pagesProcessed,
        processingTime: conv.processingTime,
        status: conv.status,
        createdAt: conv.createdAt,
      })),
    });
  } catch (error) {
    console.error('User stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}