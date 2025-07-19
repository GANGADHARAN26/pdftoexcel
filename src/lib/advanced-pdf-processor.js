import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createWorker } from 'tesseract.js';
import { fromPath } from 'pdf2pic';
import { pdfToPng } from 'pdf-to-png-converter';
import sharp from 'sharp';
import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';
import { createCanvas } from 'canvas';

if (typeof window === 'undefined') {
  const workerPath = path.join(process.cwd(), 'public', 'pdf.worker.mjs');
  pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;
} else {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.mjs`;
}

export class AdvancedPDFProcessor {
  constructor() {
    this.ensureUploadDir();
    this.debugMode = process.env.NODE_ENV === 'development';
    this.ocrWorker = null;
    this.financialPatterns = this.initializeFinancialPatterns();
    this.processStartTime = Date.now();
  }

  logMemoryUsage(context = '') {
    if (this.debugMode) {
      const memUsage = process.memoryUsage();
      console.log(`Memory Usage ${context}:`, {
        rss: `${Math.round(memUsage.rss / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`,
        external: `${Math.round(memUsage.external / 1024 / 1024)} MB`
      });
    }
  }

  ensureUploadDir() {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  }

  initializeFinancialPatterns() {
    return {
      bankStatement: {
        patterns: [
          /balance/i,
          /account.*number/i,
          /routing.*number/i,
          /transaction/i,
          /deposit/i,
          /withdrawal/i,
          /beginning.*balance/i,
          /ending.*balance/i,
          /statement.*period/i
        ],
        tableHeaders: ['Date', 'Description', 'Amount', 'Balance']
      },
      financialReport: {
        patterns: [
          /assets/i,
          /liabilities/i,
          /equity/i,
          /revenue/i,
          /expenses/i,
          /net.*income/i,
          /cash.*flow/i,
          /balance.*sheet/i
        ],
        tableHeaders: ['Item', 'Current', 'Previous', 'Change']
      },
      invoice: {
        patterns: [
          /invoice/i,
          /bill.*to/i,
          /ship.*to/i,
          /invoice.*number/i,
          /due.*date/i,
          /amount.*due/i,
          /subtotal/i,
          /tax/i,
          /total/i
        ],
        tableHeaders: ['Description', 'Quantity', 'Rate', 'Amount']
      },
      investment: {
        patterns: [
          /portfolio/i,
          /holdings/i,
          /shares/i,
          /dividend/i,
          /yield/i,
          /market.*value/i,
          /cost.*basis/i,
          /gain.*loss/i
        ],
        tableHeaders: ['Security', 'Shares', 'Price', 'Market Value']
      }
    };
  }

  async initializeOCR() {
    // Always create a fresh worker to avoid EOF errors
    if (this.ocrWorker) {
      try {
        await this.ocrWorker.terminate();
      } catch (error) {
        console.warn('Error terminating existing OCR worker:', error);
      }
      this.ocrWorker = null;
    }

    try {
      if (this.debugMode) {
        console.log('Initializing fresh OCR worker...');
      }
      
      // Create OCR worker with proper configuration for server-side execution
      this.ocrWorker = await createWorker({
        logger: this.debugMode ? m => console.log(m) : undefined,
        errorHandler: (error) => {
          console.error('OCR Worker Error:', error);
        }
      });
      
      await this.ocrWorker.load();
      await this.ocrWorker.loadLanguage('eng');
      await this.ocrWorker.initialize('eng');
      await this.ocrWorker.setParameters({
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,()-/$%: ',
        tessedit_pageseg_mode: '3', // PSM_AUTO - better for tables/mixed content
        preserve_interword_spaces: '1'
      });
      
      console.log('Tesseract.js OCR worker initialized successfully.');
    } catch (error) {
      console.error('OCR initialization failed:', error);
      this.ocrWorker = null;
      throw new Error(`OCR initialization failed: ${error.message}. Please try manual extraction.`);
    }
    
    return this.ocrWorker;
  }

  async validatePDF(fileBuffer) {
    try {
      // Basic PDF validation
      if (!fileBuffer || fileBuffer.length === 0) {
        throw new Error('Empty file buffer');
      }
      
      // Check PDF header
      const header = fileBuffer.slice(0, 5).toString();
      if (!header.startsWith('%PDF-')) {
        throw new Error('Invalid PDF header');
      }
      
      // Try to load with PDF.js for validation
      const pdfData = fileBuffer instanceof Buffer ? new Uint8Array(fileBuffer) : fileBuffer;
      const pdf = await pdfjsLib.getDocument({
        data: pdfData,
        verbosity: 0
      }).promise;
      
      const numPages = pdf.numPages;
      if (numPages === 0) {
        throw new Error('PDF has no pages');
      }
      
      console.log(`PDF validation successful: ${numPages} pages`);
      return { valid: true, numPages };
      
    } catch (error) {
      console.error('PDF validation failed:', error);
      return { valid: false, error: error.message };
    }
  }

  async processPDF(fileBuffer, originalFileName) {
    const startTime = Date.now();
    let processingMethod = 'unknown';
    
    try {
      // Validate PDF first
      const validation = await this.validatePDF(fileBuffer);
      if (!validation.valid) {
        throw new Error(`Invalid PDF file: ${validation.error}`);
      }
      
      // First, try standard PDF text extraction
      const textResult = await this.tryTextExtraction(fileBuffer, originalFileName);
      
      if (textResult.success && textResult.textContent.length > 100) {
        processingMethod = 'text-extraction';
        const result = await this.processTextBasedPDF(textResult.pdfDocument, originalFileName);
        result.processingMethod = processingMethod;
        return result;
      }
      
      // If text extraction fails or yields minimal content, try OCR
      console.log('Text extraction yielded minimal content, attempting OCR...');
      processingMethod = 'ocr-extraction';
      const ocrResult = await this.processImageBasedPDF(fileBuffer, originalFileName);
      ocrResult.processingMethod = processingMethod;
      return ocrResult;
      
    } catch (error) {
      console.error('PDF processing error:', error);
      return {
        success: false,
        error: error.message,
        processingTime: Date.now() - startTime,
        processingMethod,
        requiresManualExtraction: true
      };
    }
  }

  async tryTextExtraction(fileBuffer, originalFileName) {
    try {
      // Convert Buffer to Uint8Array if needed
      const pdfData = fileBuffer instanceof Buffer ? new Uint8Array(fileBuffer) : fileBuffer;
      
      const pdf = await pdfjsLib.getDocument({
        data: pdfData,
        useSystemFonts: true,
        disableFontFace: false,
        verbosity: 0
      }).promise;
      
      let allText = '';
      const numPages = pdf.numPages;
      
      for (let pageNum = 1; pageNum <= Math.min(numPages, 3); pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        allText += pageText + ' ';
      }
      
      return {
        success: true,
        pdfDocument: pdf,
        textContent: allText.trim(),
        numPages
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async processTextBasedPDF(pdfDocument, originalFileName) {
    const startTime = Date.now();
    const numPages = pdfDocument.numPages;
    let allPageData = [];
    let totalTextItems = 0;
    let totalImages = 0;
    let totalTables = 0;
    let documentType = 'general';

    console.log(`Processing ${numPages} pages from ${originalFileName} (Text-based)`);

    // Process each page
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const pageData = await this.extractCompletePageData(page, pageNum);
      allPageData.push(pageData);
      
      totalTextItems += pageData.textItems.length;
      totalImages += pageData.images.length;
      totalTables += pageData.tables.length;
    }

    // Detect document type
    documentType = this.detectDocumentType(allPageData);

    // Create enhanced Excel file
    const excelBuffer = await this.createFinancialExcelFile(allPageData, originalFileName, documentType);
    const processingTime = Date.now() - startTime;

    // Create detailed preview
    const previewData = this.generateFinancialPreview(allPageData, documentType);

    return {
      success: true,
      excelBuffer,
      processingTime,
      pagesProcessed: numPages,
      originalFileName,
      documentType,
      previewData,
      processingMethod: 'text-extraction',
      metadata: {
        totalTextItems,
        totalImages,
        totalTables,
        documentType,
        extractionQuality: 'comprehensive'
      }
    };
  }

  async convertPDFToImages(fileBuffer, originalFileName) {
    const tempDir = path.join(process.cwd(), 'temp');
    const timestamp = Date.now();
    const sanitizedFileName = originalFileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    let tempFilePath = null;
    let pageImages = [];

    try {
      // Method 1: Try pdf-to-png-converter (no external dependencies)
      console.log('Attempting PDF to image conversion using pdf-to-png-converter...');
      try {
        const pngPages = await pdfToPng(fileBuffer, {
          outputFolder: tempDir,
          outputFileMask: `page_${timestamp}`,
          viewportScale: 2.0,
          pagesToProcess: -1, // All pages
          strictPagesToProcess: false,
          verbosityLevel: 0
        });

        pageImages = pngPages.map((page, index) => ({
          name: `page_${timestamp}.${index + 1}.png`,
          path: page.path,
          page: index + 1
        }));

        if (pageImages.length > 0) {
          console.log(`Successfully converted ${pageImages.length} pages using pdf-to-png-converter`);
          return pageImages;
        }
      } catch (pngConverterError) {
        console.warn('pdf-to-png-converter failed:', pngConverterError.message);
      }

      // Method 2: Try PDF.js with Canvas (fallback)
      console.log('Attempting PDF to image conversion using PDF.js with Canvas...');
      try {
        pageImages = await this.convertPDFWithCanvas(fileBuffer, tempDir, timestamp);
        if (pageImages.length > 0) {
          console.log(`Successfully converted ${pageImages.length} pages using PDF.js + Canvas`);
          return pageImages;
        }
      } catch (canvasError) {
        console.warn('PDF.js + Canvas conversion failed:', canvasError.message);
      }

      // Method 3: Try pdf2pic as last resort
      console.log('Attempting PDF to image conversion using pdf2pic...');
      tempFilePath = path.join(tempDir, `${timestamp}_${sanitizedFileName}`);
      
      try {
        fs.writeFileSync(tempFilePath, fileBuffer);
        console.log(`Temporary PDF file created: ${tempFilePath}`);
      } catch (writeError) {
        throw new Error(`Failed to write temporary PDF file: ${writeError.message}`);
      }
      
      const convert = fromPath(tempFilePath, {
        density: 300,
        saveFilename: `page_${timestamp}`,
        savePath: tempDir,
        format: 'png',
        width: 2480,
        height: 3508
      });
      
      try {
        pageImages = await convert.bulk(-1);
        console.log(`Converted ${pageImages?.length || 0} pages using pdf2pic`);
        
        if (pageImages && pageImages.length > 0) {
          return pageImages;
        }
      } catch (conversionError) {
        throw new Error(`All PDF to image conversion methods failed. Last error: ${conversionError.message}`);
      }
      
      throw new Error('Failed to convert PDF pages to images - no pages generated');

    } finally {
      // Cleanup temp PDF file if created
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        try {
          fs.unlinkSync(tempFilePath);
        } catch (cleanupError) {
          console.error(`Failed to cleanup temp PDF file: ${cleanupError.message}`);
        }
      }
    }
  }

  async convertPDFWithCanvas(fileBuffer, tempDir, timestamp) {
    const pageImages = [];
    
    try {
      // Convert Buffer to Uint8Array if needed
      const pdfData = fileBuffer instanceof Buffer ? new Uint8Array(fileBuffer) : fileBuffer;
      
      const pdf = await pdfjsLib.getDocument({
        data: pdfData,
        useSystemFonts: true,
        disableFontFace: false,
        verbosity: 0
      }).promise;
      
      const numPages = pdf.numPages;
      console.log(`PDF has ${numPages} pages, converting with Canvas...`);
      
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2.0 });
        
        // Create canvas
        const canvas = createCanvas(viewport.width, viewport.height);
        const context = canvas.getContext('2d');
        
        // Render page to canvas
        const renderContext = {
          canvasContext: context,
          viewport: viewport
        };
        
        await page.render(renderContext).promise;
        
        // Save canvas as PNG
        const imagePath = path.join(tempDir, `page_${timestamp}_${pageNum}.png`);
        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(imagePath, buffer);
        
        pageImages.push({
          name: `page_${timestamp}_${pageNum}.png`,
          path: imagePath,
          page: pageNum
        });
      }
      
      return pageImages;
      
    } catch (error) {
      console.error('Canvas conversion error:', error);
      throw error;
    }
  }

  async processImageBasedPDF(fileBuffer, originalFileName) {
    const startTime = Date.now();
    let pageImages = [];
    
    this.logMemoryUsage('before OCR processing');
    
    try {
      // Convert PDF to images using fallback methods
      pageImages = await this.convertPDFToImages(fileBuffer, originalFileName);
      
      // Initialize OCR with retry mechanism
      let ocrWorker;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          this.logMemoryUsage(`before OCR init attempt ${retryCount + 1}`);
          ocrWorker = await this.initializeOCR();
          this.logMemoryUsage(`after OCR init attempt ${retryCount + 1}`);
          break;
        } catch (error) {
          retryCount++;
          console.warn(`OCR initialization attempt ${retryCount} failed:`, error.message);
          if (retryCount >= maxRetries) {
            throw new Error(`OCR initialization failed after ${maxRetries} attempts: ${error.message}`);
          }
          // Wait before retry with exponential backoff
          await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
        }
      }
      
      let allPageData = [];
      let totalTextItems = 0;
      let documentType = 'general';

      console.log(`Processing ${pageImages.length} pages from ${originalFileName} (OCR)`);

      // Process each page with OCR
      for (let i = 0; i < pageImages.length; i++) {
        const pageImage = pageImages[i];
        try {
          const pageData = await this.extractOCRPageData(pageImage.path, i + 1, ocrWorker);
          allPageData.push(pageData);
          totalTextItems += pageData.textItems.length;
          
          // Check if worker failed and needs reinitialization
          if (pageData.extractionMethod === 'ocr-failed' && pageData.error && 
              (pageData.error.includes('EOF') || pageData.error.includes('worker'))) {
            console.warn(`Worker may be corrupted, reinitializing for remaining pages...`);
            try {
              await this.cleanup();
              ocrWorker = await this.initializeOCR();
            } catch (reinitError) {
              console.error('Failed to reinitialize OCR worker:', reinitError);
              // Continue with failed worker - better than stopping completely
            }
          }
          
        } catch (pageError) {
          console.error(`Error processing page ${i + 1}:`, pageError);
          
          // Check if it's a worker communication error
          if (pageError.message.includes('EOF') || pageError.message.includes('write') || pageError.code === 'EOF') {
            console.warn(`Worker communication error on page ${i + 1}, attempting to reinitialize...`);
            try {
              await this.cleanup();
              ocrWorker = await this.initializeOCR();
            } catch (reinitError) {
              console.error('Failed to reinitialize OCR worker:', reinitError);
            }
          }
          
          // Add empty page data to maintain page numbering
          allPageData.push({
            pageNumber: i + 1,
            textItems: [],
            tables: [],
            images: [],
            formFields: [],
            ocrText: '',
            lines: [],
            extractionMethod: 'ocr-failed',
            error: pageError.message
          });
        }
      }

      // Detect document type
      documentType = this.detectDocumentType(allPageData);

      // Create enhanced Excel file
      const excelBuffer = await this.createFinancialExcelFile(allPageData, originalFileName, documentType);
      const processingTime = Date.now() - startTime;

      // Create detailed preview
      const previewData = this.generateFinancialPreview(allPageData, documentType);

      return {
        success: true,
        excelBuffer,
        processingTime,
        pagesProcessed: pageImages.length,
        originalFileName,
        documentType,
        previewData,
        processingMethod: 'ocr-extraction',
        metadata: {
          totalTextItems,
          totalImages: pageImages.length,
          totalTables: allPageData.reduce((sum, page) => sum + page.tables.length, 0),
          documentType,
          extractionQuality: 'ocr-based'
        }
      };

    } catch (error) {
      console.error('OCR processing error:', error);
      return {
        success: false,
        error: error.message,
        processingTime: Date.now() - startTime,
        processingMethod: 'ocr-extraction',
        requiresManualExtraction: true
      };
    } finally {
      // Cleanup temp files with better error handling
      const filesToCleanup = [];
      
      pageImages.forEach(img => {
        if (img && img.path && fs.existsSync(img.path)) {
          filesToCleanup.push(img.path);
        }
      });
      
      for (const filePath of filesToCleanup) {
        try {
          fs.unlinkSync(filePath);
          console.log(`Cleaned up temp file: ${filePath}`);
        } catch (cleanupError) {
          console.error(`Failed to cleanup file ${filePath}:`, cleanupError);
        }
      }
      
      // Ensure OCR worker is cleaned up
      try {
        await this.cleanup();
      } catch (workerCleanupError) {
        console.error('OCR worker cleanup error:', workerCleanupError);
      }
    }
  }

  async extractOCRPageData(imagePath, pageNumber, ocrWorker) {
    let retryCount = 0;
    const maxRetries = 2;
    
    while (retryCount <= maxRetries) {
      try {
        // Check if image file exists
        if (!fs.existsSync(imagePath)) {
          throw new Error(`Image file not found: ${imagePath}`);
        }
        
        // Verify worker is still valid
        if (!ocrWorker) {
          throw new Error('OCR worker is not available');
        }
        
        // Add timeout to OCR recognition with shorter timeout for retries
        const timeout = retryCount === 0 ? 30000 : 15000;
        const recognitionPromise = ocrWorker.recognize(imagePath);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('OCR recognition timeout')), timeout)
        );
        
        const result = await Promise.race([
          recognitionPromise,
          timeoutPromise
        ]);
        
        // Validate result structure
        if (!result || !result.data) {
          throw new Error('Invalid OCR result structure');
        }
        
        const { text, lines, words } = result.data;
        
        // Process OCR results into structured data with better error handling
        const textItems = (words || [])
          .filter(word => word && word.text && word.bbox && word.confidence > 60)
          .map((word, index) => ({
            text: word.text.trim(),
            confidence: word.confidence,
            x: word.bbox.x0 || 0,
            y: word.bbox.y0 || 0,
            width: (word.bbox.x1 || 0) - (word.bbox.x0 || 0),
            height: (word.bbox.y1 || 0) - (word.bbox.y0 || 0),
            index
          }))
          .filter(item => item.text.length > 0);

        // Detect tables from OCR data
        const tables = this.detectTablesFromOCR(textItems);
        
        return {
          pageNumber,
          textItems,
          tables,
          images: [{ type: 'scanned_page', path: imagePath }],
          formFields: [],
          ocrText: text || '',
          lines: (lines || []).map(line => line.text || '').filter(line => line.trim().length > 0),
          extractionMethod: 'ocr'
        };
        
      } catch (error) {
        retryCount++;
        console.error(`OCR error for page ${pageNumber} (attempt ${retryCount}):`, error);
        
        // Check for specific EOF or worker communication errors
        if (error.message.includes('EOF') || error.message.includes('write') || error.code === 'EOF') {
          console.warn(`Worker communication error detected for page ${pageNumber}, attempt ${retryCount}`);
          
          if (retryCount <= maxRetries) {
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            continue;
          }
        }
        
        // If max retries reached or non-recoverable error, return failed page data
        if (retryCount > maxRetries) {
          console.error(`Max retries reached for page ${pageNumber}`);
          break;
        }
      }
    }
    
    // Return failed page data
    return {
      pageNumber,
      textItems: [],
      tables: [],
      images: [],
      formFields: [],
      ocrText: '',
      lines: [],
      extractionMethod: 'ocr-failed',
      error: 'OCR processing failed after retries'
    };
  }

  detectTablesFromOCR(textItems) {
    const tables = [];
    const tolerance = 10;
    
    // Group items by rows (similar Y coordinates)
    const rows = this.groupItemsByRows(textItems, tolerance);
    
    // Look for table-like structures
    for (let i = 0; i < rows.length - 1; i++) {
      const currentRow = rows[i];
      const nextRow = rows[i + 1];
      
      if (this.areRowsSimilar(currentRow, nextRow, tolerance)) {
        let tableRows = [currentRow, nextRow];
        let j = i + 2;
        
        while (j < rows.length && this.areRowsSimilar(tableRows[tableRows.length - 1], rows[j], tolerance)) {
          tableRows.push(rows[j]);
          j++;
        }
        
        if (tableRows.length >= 2) {
          tables.push({
            type: 'ocr-table',
            startRow: i,
            endRow: j - 1,
            rows: tableRows,
            columns: this.detectColumns(tableRows),
            rowCount: tableRows.length,
            columnCount: this.getMaxColumns(tableRows)
          });
          
          i = j - 1;
        }
      }
    }
    
    return tables;
  }

  detectDocumentType(allPageData) {
    let allText = '';
    
    // Combine all text from all pages
    allPageData.forEach(page => {
      if (page.textItems) {
        allText += page.textItems.map(item => item.text).join(' ') + ' ';
      }
      if (page.ocrText) {
        allText += page.ocrText + ' ';
      }
    });
    
    allText = allText.toLowerCase();
    
    // Check against financial patterns
    for (const [type, config] of Object.entries(this.financialPatterns)) {
      const matches = config.patterns.filter(pattern => pattern.test(allText));
      if (matches.length >= 2) {
        return type;
      }
    }
    
    return 'general';
  }

  async createFinancialExcelFile(allPageData, originalFileName, documentType) {
    const workbook = new ExcelJS.Workbook();
    
    // Set workbook properties
    workbook.creator = 'Advanced PDF to Excel Converter';
    workbook.created = new Date();
    workbook.modified = new Date();
    workbook.subject = `Financial Document: ${originalFileName}`;

    // Create summary worksheet
    await this.createFinancialSummaryWorksheet(workbook, allPageData, originalFileName, documentType);

    // Create document-specific worksheets
    await this.createDocumentSpecificWorksheets(workbook, allPageData, documentType);

    // Create comprehensive data worksheet
    await this.createComprehensiveDataWorksheet(workbook, allPageData);

    // Create manual extraction template
    await this.createManualExtractionTemplate(workbook, documentType);

    return workbook.xlsx.writeBuffer();
  }

  async createFinancialSummaryWorksheet(workbook, allPageData, originalFileName, documentType) {
    const worksheet = workbook.addWorksheet('📊 Financial Summary');
    
    // Title
    worksheet.mergeCells('A1:D1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `Financial Document Analysis: ${originalFileName}`;
    titleCell.font = { bold: true, size: 16, color: { argb: 'FF0066CC' } };
    titleCell.alignment = { horizontal: 'center' };

    // Document Type
    worksheet.mergeCells('A3:D3');
    const typeCell = worksheet.getCell('A3');
    typeCell.value = `Document Type: ${documentType.toUpperCase()}`;
    typeCell.font = { bold: true, size: 14, color: { argb: 'FF009900' } };
    typeCell.alignment = { horizontal: 'center' };

    // Statistics
    let row = 5;
    const stats = [
      ['Total Pages', allPageData.length],
      ['Total Text Items', allPageData.reduce((sum, page) => sum + page.textItems.length, 0)],
      ['Total Tables Detected', allPageData.reduce((sum, page) => sum + (page.tables?.length || 0), 0)],
      ['Processing Method', allPageData[0]?.extractionMethod || 'text-extraction'],
      ['Analysis Date', new Date().toLocaleString()],
      ['Document Category', this.getDocumentCategory(documentType)]
    ];

    stats.forEach(([label, value]) => {
      worksheet.getCell(`A${row}`).value = label;
      worksheet.getCell(`B${row}`).value = value;
      worksheet.getCell(`A${row}`).font = { bold: true };
      row++;
    });

    // Financial patterns found
    row += 2;
    worksheet.getCell(`A${row}`).value = 'Financial Patterns Detected:';
    worksheet.getCell(`A${row}`).font = { bold: true, color: { argb: 'FF0066CC' } };
    row++;

    if (this.financialPatterns[documentType]) {
      this.financialPatterns[documentType].patterns.forEach(pattern => {
        worksheet.getCell(`A${row}`).value = `• ${pattern.source}`;
        row++;
      });
    }

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = 25;
    });
  }

  async createDocumentSpecificWorksheets(workbook, allPageData, documentType) {
    const config = this.financialPatterns[documentType];
    
    if (config) {
      const worksheet = workbook.addWorksheet(`${documentType.toUpperCase()} Data`);
      
      // Create headers based on document type
      const headers = config.tableHeaders;
      headers.forEach((header, index) => {
        const cell = worksheet.getCell(1, index + 1);
        cell.value = header;
        cell.font = { bold: true };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE6F2FF' }
        };
      });

      // Extract and populate data based on document type
      await this.populateDocumentSpecificData(worksheet, allPageData, documentType);
    }
  }

  async populateDocumentSpecificData(worksheet, allPageData, documentType) {
    let row = 2;
    
    // Extract relevant data based on document type
    allPageData.forEach(page => {
      if (page.tables && page.tables.length > 0) {
        page.tables.forEach(table => {
          if (table.rows && table.rows.length > 0) {
            table.rows.forEach(tableRow => {
              const rowData = tableRow.map(item => item.text || item);
              rowData.forEach((cellData, colIndex) => {
                worksheet.getCell(row, colIndex + 1).value = cellData;
              });
              row++;
            });
          }
        });
      }
    });
  }

  async createManualExtractionTemplate(workbook, documentType) {
    const worksheet = workbook.addWorksheet('🔧 Manual Extraction');
    
    // Title
    worksheet.mergeCells('A1:E1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'Manual Data Extraction Template';
    titleCell.font = { bold: true, size: 16, color: { argb: 'FFFF6600' } };
    titleCell.alignment = { horizontal: 'center' };

    // Instructions
    worksheet.mergeCells('A3:E3');
    const instructionsCell = worksheet.getCell('A3');
    instructionsCell.value = 'Use this template to manually extract data when automatic processing fails';
    instructionsCell.font = { italic: true, color: { argb: 'FF666666' } };
    instructionsCell.alignment = { horizontal: 'center' };

    // Create template based on document type
    const config = this.financialPatterns[documentType] || this.financialPatterns.general;
    const headers = config?.tableHeaders || ['Item', 'Value', 'Notes'];
    
    // Headers
    headers.forEach((header, index) => {
      const cell = worksheet.getCell(5, index + 1);
      cell.value = header;
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFFF99' }
      };
    });

    // Add empty rows for manual data entry
    for (let i = 6; i <= 25; i++) {
      headers.forEach((_, colIndex) => {
        const cell = worksheet.getCell(i, colIndex + 1);
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    }

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = 20;
    });
  }

  getDocumentCategory(documentType) {
    const categories = {
      bankStatement: 'Banking & Transactions',
      financialReport: 'Financial Reporting',
      invoice: 'Billing & Invoicing',
      investment: 'Investment & Portfolio',
      general: 'General Document'
    };
    return categories[documentType] || 'Unknown';
  }

  generateFinancialPreview(allPageData, documentType) {
    const preview = {
      totalPages: allPageData.length,
      documentType,
      totalTextItems: 0,
      totalTables: 0,
      totalImages: 0,
      sampleContent: [],
      tablePreview: [],
      financialSummary: {}
    };

    allPageData.forEach((pageData, index) => {
      preview.totalTextItems += pageData.textItems.length;
      preview.totalTables += pageData.tables?.length || 0;
      preview.totalImages += pageData.images?.length || 0;

      // Sample content from first page
      if (index === 0 && pageData.textItems.length > 0) {
        preview.sampleContent = pageData.textItems
          .slice(0, 15)
          .map(item => item.text)
          .filter(text => text.trim().length > 0);
      }

      // Table preview
      if (preview.tablePreview.length === 0 && pageData.tables && pageData.tables.length > 0) {
        const firstTable = pageData.tables[0];
        preview.tablePreview = firstTable.rows.slice(0, 3).map(row =>
          row.map(item => item.text || item).join(' | ')
        );
      }
    });

    // Financial summary based on document type
    preview.financialSummary = {
      documentCategory: this.getDocumentCategory(documentType),
      detectedPatterns: this.financialPatterns[documentType]?.patterns.length || 0,
      extractionMethod: allPageData[0]?.extractionMethod || 'text-extraction',
      recommendedAction: this.getRecommendedAction(documentType, preview.totalTables)
    };

    return preview;
  }

  getRecommendedAction(documentType, tableCount) {
    if (tableCount === 0) {
      return 'Use manual extraction template for data entry';
    }
    if (documentType === 'general') {
      return 'Review extracted data and use document-specific template';
    }
    return 'Review extracted financial data in document-specific worksheet';
  }

  // Helper methods from original processor
  async extractCompletePageData(page, pageNum) {
    const viewport = page.getViewport({ scale: 1.0 });
    
    const textContent = await page.getTextContent({
      normalizeWhitespace: false,
      disableCombineTextItems: false
    });

    const operatorList = await page.getOperatorList();
    const images = this.detectImages(operatorList);
    const processedTextItems = this.processTextItems(textContent.items, viewport);
    const tables = this.detectTables(processedTextItems);
    const annotations = await page.getAnnotations();
    const formFields = this.extractFormFields(annotations);

    return {
      pageNumber: pageNum,
      viewport,
      textItems: processedTextItems,
      images,
      tables,
      formFields,
      rawTextContent: textContent,
      operatorList
    };
  }

  processTextItems(items, viewport) {
    if (!items || items.length === 0) return [];

    return items.map((item, index) => {
      const transform = item.transform;
      const x = transform[4];
      const y = viewport.height - transform[5];
      
      return {
        ...item,
        index,
        x: Math.round(x * 100) / 100,
        y: Math.round(y * 100) / 100,
        width: item.width || 0,
        height: item.height || 0,
        fontSize: Math.abs(transform[0]) || 12,
        text: item.str || '',
        hasEOL: item.hasEOL || false,
        dir: item.dir || 'ltr',
        fontName: item.fontName || 'unknown'
      };
    }).filter(item => item.text.trim().length > 0);
  }

  detectImages(operatorList) {
    const images = [];
    const ops = operatorList.fnArray;
    const args = operatorList.argsArray;

    for (let i = 0; i < ops.length; i++) {
      if (ops[i] === pdfjsLib.OPS.paintImageXObject ||
          ops[i] === pdfjsLib.OPS.paintInlineImageXObject ||
          ops[i] === pdfjsLib.OPS.paintImageMaskXObject) {
        images.push({
          type: 'image',
          operation: ops[i],
          args: args[i],
          index: i
        });
      }
    }

    return images;
  }

  detectTables(textItems) {
    if (!textItems || textItems.length === 0) return [];

    const tables = [];
    const tolerance = 5;
    
    const rows = this.groupItemsByRows(textItems, tolerance);
    
    for (let i = 0; i < rows.length - 1; i++) {
      const currentRow = rows[i];
      const nextRow = rows[i + 1];
      
      if (this.areRowsSimilar(currentRow, nextRow, tolerance)) {
        let tableRows = [currentRow, nextRow];
        let j = i + 2;
        
        while (j < rows.length && this.areRowsSimilar(tableRows[tableRows.length - 1], rows[j], tolerance)) {
          tableRows.push(rows[j]);
          j++;
        }
        
        if (tableRows.length >= 2) {
          tables.push({
            type: 'table',
            startRow: i,
            endRow: j - 1,
            rows: tableRows,
            columns: this.detectColumns(tableRows),
            rowCount: tableRows.length,
            columnCount: this.getMaxColumns(tableRows)
          });
          
          i = j - 1;
        }
      }
    }

    return tables;
  }

  groupItemsByRows(items, tolerance) {
    if (!items || items.length === 0) return [];

    const rows = [];
    const sortedItems = [...items].sort((a, b) => b.y - a.y);
    
    let currentRow = [sortedItems[0]];
    let currentY = sortedItems[0].y;

    for (let i = 1; i < sortedItems.length; i++) {
      const item = sortedItems[i];
      
      if (Math.abs(item.y - currentY) <= tolerance) {
        currentRow.push(item);
      } else {
        currentRow.sort((a, b) => a.x - b.x);
        rows.push(currentRow);
        currentRow = [item];
        currentY = item.y;
      }
    }
    
    if (currentRow.length > 0) {
      currentRow.sort((a, b) => a.x - b.x);
      rows.push(currentRow);
    }

    return rows;
  }

  areRowsSimilar(row1, row2, tolerance) {
    if (!row1 || !row2 || row1.length < 2 || row2.length < 2) return false;
    
    const lengthDiff = Math.abs(row1.length - row2.length);
    if (lengthDiff > 2) return false;
    
    const positions1 = row1.map(item => item.x).sort((a, b) => a - b);
    const positions2 = row2.map(item => item.x).sort((a, b) => a - b);
    
    let matches = 0;
    for (let i = 0; i < Math.min(positions1.length, positions2.length); i++) {
      for (let j = 0; j < positions2.length; j++) {
        if (Math.abs(positions1[i] - positions2[j]) <= tolerance) {
          matches++;
          break;
        }
      }
    }
    
    return matches >= Math.min(positions1.length, positions2.length) * 0.6;
  }

  detectColumns(tableRows) {
    const allXPositions = [];
    
    tableRows.forEach(row => {
      row.forEach(item => {
        allXPositions.push(item.x);
      });
    });
    
    const uniquePositions = [];
    const sortedPositions = [...new Set(allXPositions)].sort((a, b) => a - b);
    
    for (const pos of sortedPositions) {
      if (!uniquePositions.some(existing => Math.abs(existing - pos) <= 5)) {
        uniquePositions.push(pos);
      }
    }
    
    return uniquePositions.map((x, index) => ({
      index,
      x,
      width: index < uniquePositions.length - 1 ? uniquePositions[index + 1] - x : 100
    }));
  }

  getMaxColumns(tableRows) {
    return Math.max(...tableRows.map(row => row.length));
  }

  extractFormFields(annotations) {
    if (!annotations || annotations.length === 0) return [];
    
    return annotations
      .filter(annotation => annotation.subtype === 'Widget')
      .map(field => ({
        type: 'form_field',
        fieldType: field.fieldType || 'unknown',
        fieldName: field.fieldName || '',
        fieldValue: field.fieldValue || '',
        rect: field.rect || [],
        readOnly: field.readOnly || false
      }));
  }

  async createComprehensiveDataWorksheet(workbook, allPageData) {
    const worksheet = workbook.addWorksheet('📄 All Extracted Data');
    
    // Headers
    const headers = ['Page', 'X', 'Y', 'Text', 'Font Size', 'Font Name', 'Confidence'];
    headers.forEach((header, index) => {
      const cell = worksheet.getCell(1, index + 1);
      cell.value = header;
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6F2FF' }
      };
    });

    let row = 2;
    allPageData.forEach(page => {
      page.textItems.forEach(item => {
        worksheet.getCell(row, 1).value = page.pageNumber;
        worksheet.getCell(row, 2).value = item.x;
        worksheet.getCell(row, 3).value = item.y;
        worksheet.getCell(row, 4).value = item.text;
        worksheet.getCell(row, 5).value = item.fontSize;
        worksheet.getCell(row, 6).value = item.fontName;
        worksheet.getCell(row, 7).value = item.confidence || 100;
        row++;
      });
    });

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = 15;
    });
  }

  async reinitializeOCR() {
    console.log('Reinitializing OCR worker...');
    await this.cleanup();
    return await this.initializeOCR();
  }

  async isWorkerHealthy(worker) {
    if (!worker) return false;
    
    try {
      // Try a simple operation to check if worker is responsive
      // This is a lightweight check
      return true; // For now, assume worker is healthy if it exists
    } catch (error) {
      console.warn('Worker health check failed:', error);
      return false;
    }
  }

  async cleanup() {
    if (this.ocrWorker) {
      try {
        // Add timeout to worker termination to prevent hanging
        const terminationPromise = this.ocrWorker.terminate();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Worker termination timeout')), 5000)
        );
        
        await Promise.race([terminationPromise, timeoutPromise]);
        console.log('OCR worker terminated successfully');
      } catch (error) {
        console.error('Error terminating OCR worker:', error);
        // Force cleanup even if termination fails
      } finally {
        this.ocrWorker = null;
      }
    }
  }
}