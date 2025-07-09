import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';
import { connectToMongoDB } from '../../../lib/mongoose';
import User from '../../../models/User';
import Conversion from '../../../models/Conversion';
import PDFProcessor from '../../../lib/pdf-processor';
import { generateSessionId, isToday, isCurrentMonth } from '../../../lib/utils';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    const formData = await request.formData();
    const file = formData.get('file');
    const sessionId = formData.get('sessionId') || generateSessionId();

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Check file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 });
    }

    // Check file size (10MB limit)
    const maxSize = parseInt(process.env.UPLOAD_MAX_SIZE) || 10485760;
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large' }, { status: 400 });
    }

    await connectToMongoDB();

    // Check usage limits
    const canProcess = await checkUsageLimit(session, sessionId);
    if (!canProcess.allowed) {
      return NextResponse.json({ error: canProcess.message }, { status: 429 });
    }

    // Process the PDF
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const processor = new PDFProcessor();
    const result = await processor.processPDF(fileBuffer, file.name);

    // Record the conversion
    const conversionData = {
      userId: session?.user?.id || null,
      sessionId,
      originalFileName: file.name,
      fileSize: file.size,
      pagesProcessed: result.pagesProcessed || 1,
      processingTime: result.processingTime,
      status: result.success ? 'success' : 'failed',
      errorMessage: result.error || null,
      ipAddress: request.ip || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    };

    await Conversion.create(conversionData);

    // Update user usage stats
    if (session?.user?.id) {
      await updateUserUsage(session.user.id);
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // Generate filename
    const fileName = processor.generateFileName(file.name);

    // Return the Excel file
    return new NextResponse(result.excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function checkUsageLimit(session, sessionId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (session?.user?.id) {
    // Check registered user limits
    const user = await User.findById(session.user.id);
    
    if (user.isSubscribed && user.subscriptionStatus === 'active') {
      return { allowed: true }; // Unlimited for subscribers
    }

    // Check daily usage for registered users
    if (user.usageStats.today.date && isToday(user.usageStats.today.date)) {
      if (user.usageStats.today.count >= parseInt(process.env.REGISTERED_PAGES_PER_DAY)) {
        return { 
          allowed: false, 
          message: 'Daily limit reached. Please upgrade to continue.' 
        };
      }
    }

    return { allowed: true };
  } else {
    // Check anonymous user limits
    const conversionsToday = await Conversion.countDocuments({
      sessionId,
      userId: null,
      createdAt: { $gte: today },
    });

    if (conversionsToday >= parseInt(process.env.FREE_PAGES_PER_DAY)) {
      return { 
        allowed: false, 
        message: 'Daily limit reached. Please register for more conversions.' 
      };
    }

    return { allowed: true };
  }
}

async function updateUserUsage(userId) {
  const user = await User.findById(userId);
  const today = new Date();
  
  // Update today's usage
  if (isToday(user.usageStats.today.date)) {
    user.usageStats.today.count += 1;
  } else {
    user.usageStats.today.count = 1;
    user.usageStats.today.date = today;
  }

  // Update monthly usage
  if (isCurrentMonth(user.usageStats.thisMonth.month, user.usageStats.thisMonth.year)) {
    user.usageStats.thisMonth.count += 1;
  } else {
    user.usageStats.thisMonth.count = 1;
    user.usageStats.thisMonth.month = today.getMonth();
    user.usageStats.thisMonth.year = today.getFullYear();
  }

  // Update total usage
  user.usageStats.total += 1;

  await user.save();
}