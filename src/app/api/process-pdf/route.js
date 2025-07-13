import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';
import { connectToMongoDB } from '../../../lib/mongoose';
import User from '../../../models/User';
import Conversion from '../../../models/Conversion';
import { EnhancedPDFProcessor } from '../../../lib/enhanced-pdf-processor';
import { generateSessionId, isToday, isCurrentMonth } from '../../../lib/utils';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    const formData = await request.formData();
    const file = formData.get('file');
    const sessionId = formData.get('sessionId') || generateSessionId();
    const previewOnly = formData.get('previewOnly') === 'true';

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 });
    }

    // Validate file size (10MB limit)
    const maxSize = parseInt(process.env.UPLOAD_MAX_SIZE) || 10485760;
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: `File too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB` 
      }, { status: 400 });
    }

    await connectToMongoDB();

    // Check usage limits
    const canProcess = await checkUsageLimit(session, sessionId);
    if (!canProcess.allowed) {
      return NextResponse.json({ error: canProcess.message }, { status: 429 });
    }

    // Process the PDF
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const processor = new EnhancedPDFProcessor();
    const result = await processor.processPDF(fileBuffer, file.name);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // If preview only, return preview data
    if (previewOnly) {
      return NextResponse.json({
        success: true,
        preview: result.previewData,
        metadata: result.metadata,
        bankType: result.bankType,
        processingTime: result.processingTime
      });
    }

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
      bankType: result.bankType,
      transactionCount: result.metadata.transactionCount || 0,
      accountNumber: result.metadata.accountNumber || null,
      accountHolder: result.metadata.accountHolder || null,
      statementPeriod: result.metadata.statementPeriod || null,
      openingBalance: result.metadata.openingBalance || 0,
      closingBalance: result.metadata.closingBalance || 0,
      extractionQuality: result.jsonData?.transactions?.length > 0 ? 'high' : 'medium',
      hasPreview: false
    };

    await Conversion.create(conversionData);

    // Update user usage stats
    if (session?.user?.id) {
      await updateUserUsage(session.user.id);
    }

    // Generate filename
    const fileName = processor.generateFileName(file.name);

    // Return the Excel file with metadata
    return new NextResponse(result.excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'X-Bank-Type': result.bankType,
        'X-Transaction-Count': result.metadata.transactionCount.toString(),
        'X-Processing-Time': result.processingTime.toString()
      },
    });

  } catch (error) {
    console.error('Enhanced PDF processing error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: process.env.NODE_ENV === 'development' ? error.message : undefined 
    }, { status: 500 });
  }
}

// Get processing status
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    await connectToMongoDB();

    const recentConversions = await Conversion.find({
      $or: [
        { sessionId },
        { userId: session?.user?.id }
      ]
    })
    .sort({ createdAt: -1 })
    .limit(10)
    .select('originalFileName status createdAt processingTime bankType transactionCount');

    return NextResponse.json({
      success: true,
      recentConversions
    });

  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function checkUsageLimit(session, sessionId) {
  // NOTE: Temporarily disabled for testing purposes.
  // This will allow unrestricted access.
  return { allowed: true };
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