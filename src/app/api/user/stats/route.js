import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { connectToMongoDB } from '../../../../lib/mongoose';
import User from '../../../../models/User';
import Conversion from '../../../../models/Conversion';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    await connectToMongoDB();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get conversion history
    const conversions = await Conversion.find({ userId: session.user.id })
      .sort({ createdAt: -1 })
      .limit(20);

    // Calculate usage limits
    const freeLimit = parseInt(process.env.REGISTERED_PAGES_PER_DAY) || 5;
    const todayUsage = user.usageStats.today.count || 0;
    const remainingToday = user.isSubscribed ? 'Unlimited' : Math.max(0, freeLimit - todayUsage);

    return NextResponse.json({
      user: {
        name: user.name,
        email: user.email,
        image: user.image,
        isSubscribed: user.isSubscribed,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionEndDate: user.subscriptionEndDate,
      },
      usage: {
        today: todayUsage,
        thisMonth: user.usageStats.thisMonth.count || 0,
        total: user.usageStats.total || 0,
        remainingToday,
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