import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { connectToMongoDB } from "../../../lib/mongoose";
import User from "../../../models/User";
import Conversion from "../../../models/Conversion";
import EnhancedPDFProcessor from "../../../lib/enhanced-pdf-processor";
import { generateSessionId, isToday, isCurrentMonth } from "../../../lib/utils";

export async function POST(request) {
  try {
    // DEVELOPMENT MODE: Skip all authentication and restrictions
    const formData = await request.formData();
    const file = formData.get("file");
    const sessionId = formData.get("sessionId") || generateSessionId();

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Check file type
    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Only PDF files are allowed" },
        { status: 400 }
      );
    }

    // DEVELOPMENT: Increased file size limit to 50MB for testing
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File too large" }, { status: 400 });
    }

    await connectToMongoDB();

    // DEVELOPMENT: Skip usage limit checks

    // Process the PDF
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const processor = new EnhancedPDFProcessor();
    const result = await processor.processPDF(fileBuffer, file.name);

    // Record the conversion
    const conversionData = {
      userId: null, // DEVELOPMENT: No user tracking
      sessionId,
      originalFileName: file.name,
      fileSize: file.size,
      pagesProcessed: result.pagesProcessed || 1,
      processingTime: result.processingTime,
      status: result.success ? "success" : "failed",
      errorMessage: result.error || null,
      ipAddress: request.ip || "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
    };

    await Conversion.create(conversionData);

    // DEVELOPMENT: Skip user usage tracking

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // Generate filename
    const fileName = processor.generateFileName(file.name);

    // Return the Excel file
    return new NextResponse(result.excelBuffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
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
