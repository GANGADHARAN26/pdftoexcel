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
    // DEVELOPMENT MODE: Skip all authentication and restrictions
    const formData = await request.formData();
    const file = formData.get('file');
    const sessionId = formData.get('sessionId') || generateSessionId();
    const previewOnly = formData.get('previewOnly') === 'true';

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 });
    }

    // DEVELOPMENT: Increased file size limit to 50MB for testing
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return NextResponse.json({
        error: `File too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB`
      }, { status: 400 });
    }

    await connectToMongoDB();

    // DEVELOPMENT: Skip usage limit checks

    const fileBuffer = new Uint8Array(await file.arrayBuffer());
    const processor = new EnhancedPDFProcessor();
    const result = await processor.processPDF(fileBuffer, file.name);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    if (previewOnly) {
      return NextResponse.json({
        success: true,
        preview: result.previewData,
        processingTime: result.processingTime
      });
    }

    const conversionData = {
      userId: null, // DEVELOPMENT: No user tracking
      sessionId,
      originalFileName: file.name,
      fileSize: file.size,
      pagesProcessed: result.pagesProcessed || 1,
      processingTime: result.processingTime,
      status: result.success ? 'success' : 'failed',
      errorMessage: result.error || null,
      ipAddress: request.ip || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      extractionQuality: 'high', // Enhanced extraction with all data
      metadata: {
        totalTextItems: result.metadata?.totalTextItems || 0,
        totalTables: result.metadata?.totalTables || 0,
        totalImages: result.metadata?.totalImages || 0,
        hasImages: result.metadata?.processingDetails?.hasImages || false,
        hasTables: result.metadata?.processingDetails?.hasTables || false,
        extractionType: 'comprehensive_multi_worksheet'
      }
    };

    await Conversion.create(conversionData);

    // DEVELOPMENT: Skip user usage tracking

    const fileName = processor.generateFileName(file.name);

    return new NextResponse(result.excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'X-Processing-Time': result.processingTime.toString()
      },
    });

  } catch (error) {
    console.error('PDF processing error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: process.env.NODE_ENV === 'development' ? error.message : undefined 
    }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    // DEVELOPMENT MODE: Skip authentication
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    await connectToMongoDB();

    const recentConversions = await Conversion.find({
      sessionId // DEVELOPMENT: Only check sessionId, no user filtering
    })
    .sort({ createdAt: -1 })
    .limit(10)
    .select('originalFileName status createdAt processingTime');

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
  // DEVELOPMENT MODE: Always allow processing
  return { allowed: true };
}

async function updateUserUsage(userId) {
  // DEVELOPMENT MODE: Skip user usage tracking
  return;
}