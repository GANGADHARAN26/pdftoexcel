import { NextResponse } from 'next/server';
import { AdvancedPDFProcessor } from '../../../lib/advanced-pdf-processor';

export async function POST(request) {
  const startTime = Date.now();
  let processor;
  
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const sessionId = formData.get('sessionId');
    const previewOnly = formData.get('previewOnly') === 'true';
    const processingMethod = formData.get('processingMethod') || 'auto';
    const documentType = formData.get('documentType') || 'general';

    if (!file || !sessionId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Only PDF files are supported' },
        { status: 400 }
      );
    }

    // Development mode: Increased file size limit
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size too large. Maximum 50MB allowed.' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // Initialize processor
    processor = new AdvancedPDFProcessor();

    // Process PDF based on method
    let result;
    if (processingMethod === 'text') {
      // Force text extraction
      result = await processor.tryTextExtraction(fileBuffer, file.name);
      if (result.success) {
        result = await processor.processTextBasedPDF(result.pdfDocument, file.name);
      }
    } else if (processingMethod === 'ocr') {
      // Force OCR processing
      result = await processor.processImageBasedPDF(fileBuffer, file.name);
    } else {
      // Auto-detect method
      result = await processor.processPDF(fileBuffer, file.name);
    }

    const processingTime = Date.now() - startTime;

    if (!result.success) {
      console.error('Processing failed:', result.error);
      return NextResponse.json(
        { 
          error: result.error || 'Processing failed',
          requiresManualExtraction: result.requiresManualExtraction || false,
          processingTime
        },
        { status: 500 }
      );
    }

    // If preview only, return preview data
    if (previewOnly) {
      return NextResponse.json({
        success: true,
        previewData: result.previewData,
        processingTime: result.processingTime,
        processingMethod: result.processingMethod,
        documentType: result.documentType,
        metadata: result.metadata,
        preview: result.previewData // For backward compatibility
      });
    }

    // Return Excel file
    const filename = `${file.name.replace('.pdf', '')}_${result.documentType}_${result.processingMethod}.xlsx`;
    
    const response = new NextResponse(result.excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Processing-Time': result.processingTime.toString(),
        'X-Processing-Method': result.processingMethod,
        'X-Document-Type': result.documentType,
        'X-Pages-Processed': result.pagesProcessed.toString()
      }
    });

    return response;

  } catch (error) {
    console.error('API Error:', error);
    
    const processingTime = Date.now() - startTime;
    
    // Check if it's an OCR-related error
    if (error.message.includes('OCR') || error.message.includes('tesseract') || error.message.includes('pdf2pic')) {
      return NextResponse.json(
        { 
          error: 'OCR processing failed. The document may be too complex or corrupted.',
          requiresManualExtraction: true,
          processingTime,
          suggestion: 'Try using manual extraction mode for this document.'
        },
        { status: 500 }
      );
    }
    
    // Check if it's a PDF parsing error
    if (error.message.includes('PDF') || error.message.includes('pdf.js')) {
      return NextResponse.json(
        { 
          error: 'PDF parsing failed. The document may be corrupted or encrypted.',
          requiresManualExtraction: true,
          processingTime,
          suggestion: 'Try using manual extraction mode or ensure the PDF is not password protected.'
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'An unexpected error occurred during processing.',
        requiresManualExtraction: true,
        processingTime,
        suggestion: 'Please try again or use manual extraction mode.'
      },
      { status: 500 }
    );
  } finally {
    // Cleanup
    if (processor) {
      try {
        await processor.cleanup();
      } catch (cleanupError) {
        console.error('Cleanup error:', cleanupError);
      }
    }
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Advanced PDF Processing API',
    version: '1.0.0',
    features: [
      'Text-based PDF extraction',
      'OCR for image-based PDFs',
      'Financial document recognition',
      'Manual extraction support',
      'Auto-detection of processing method'
    ],
    supportedDocumentTypes: [
      'general',
      'bankStatement',
      'financialReport',
      'invoice',
      'investment'
    ],
    processingMethods: [
      'auto',
      'text',
      'ocr',
      'manual'
    ]
  });
}