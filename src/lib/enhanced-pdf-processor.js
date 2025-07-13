import pdfParse from 'pdf-parse';
import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';

export class EnhancedPDFProcessor {
  constructor() {
    this.ensureUploadDir();
    this.bankPatterns = this.initializeBankPatterns();
    this.supportedBanks = ['SBI', 'HDFC', 'ICICI', 'AXIS', 'PNB', 'KOTAK', 'CANARA', 'BOI', 'UBI', 'FEDERAL', 'COMMERCE', 'UNION', 'SYNDICATE'];
  }

  ensureUploadDir() {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
  }

  initializeBankPatterns() {
    return {
      SBI: {
        header: /STATE BANK OF INDIA|SBI|STATEMENT OF ACCOUNT/i,
        transactionPattern: /(\d{2}\/\d{2}\/\d{4})\s+([A-Z0-9\/\-\s]+)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)/g,
        accountPattern: /Account No[:\s]+(\d+)/i,
        holderPattern: /Account Holder[:\s]+([A-Z\s]+)/i,
        dateRangePattern: /From[:\s]+(\d{2}\/\d{2}\/\d{4})\s+To[:\s]+(\d{2}\/\d{2}\/\d{4})/i
      },
      HDFC: {
        header: /HDFC BANK|STATEMENT OF ACCOUNT/i,
        transactionPattern: /(\d{2}\/\d{2}\/\d{4})\s+([A-Z0-9\/\-\s]+)\s+([\d,]+\.?\d*)\s*([\d,]+\.?\d*)\s+([\d,]+\.?\d*)/g,
        accountPattern: /Account Number[:\s]+(\d+)/i,
        holderPattern: /Name[:\s]+([A-Z\s]+)/i,
        dateRangePattern: /Statement Period[:\s]+(\d{2}\/\d{2}\/\d{4})\s+to\s+(\d{2}\/\d{2}\/\d{4})/i
      },
      ICICI: {
        header: /ICICI BANK|ACCOUNT STATEMENT/i,
        transactionPattern: /(\d{2}-\d{2}-\d{4})\s+([A-Z0-9\/\-\s]+)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)/g,
        accountPattern: /Account Number[:\s]+(\d+)/i,
        holderPattern: /Customer Name[:\s]+([A-Z\s]+)/i,
        dateRangePattern: /Statement Period[:\s]+(\d{2}-\d{2}-\d{4})\s+to\s+(\d{2}-\d{2}-\d{4})/i
      },
      AXIS: {
        header: /AXIS BANK|STATEMENT OF ACCOUNT/i,
        transactionPattern: /(\d{2}\/\d{2}\/\d{4})\s+([A-Z0-9\/\-\s]+)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)/g,
        accountPattern: /Account No[:\s]+(\d+)/i,
        holderPattern: /Account Holder[:\s]+([A-Z\s]+)/i,
        dateRangePattern: /From[:\s]+(\d{2}\/\d{2}\/\d{4})\s+To[:\s]+(\d{2}\/\d{2}\/\d{4})/i
      },
      FEDERAL: {
        header: /FEDERAL BANK|ACCOUNT STATEMENT/i,
        transactionPattern: /(\d{2}\/\d{2}\/\d{4})\s+([A-Z0-9\/\-\s]+)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)/g,
        accountPattern: /Account Number[:\s]+(\d+)/i,
        holderPattern: /Account Holder[:\s]+([A-Z\s]+)/i,
        dateRangePattern: /Statement Period[:\s]+(\d{2}\/\d{2}\/\d{4})\s+to\s+(\d{2}\/\d{2}\/\d{4})/i
      },
      COMMERCE: {
        header: /COMMERCE BANK|BANK STATEMENT/i,
        transactionPattern: /(\d{2}\/\d{2}\/\d{4})\s+([A-Z0-9\/\-\s]+)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)/g,
        accountPattern: /Account No[:\s]+(\d+)/i,
        holderPattern: /Account Holder[:\s]+([A-Z\s]+)/i,
        dateRangePattern: /From[:\s]+(\d{2}\/\d{2}\/\d{4})\s+To[:\s]+(\d{2}\/\d{2}\/\d{4})/i
      },
      GENERIC: {
        header: /BANK STATEMENT|STATEMENT OF ACCOUNT|ACCOUNT STATEMENT/i,
        transactionPattern: /(\d{2}[\/\-]\d{2}[\/\-]\d{4})\s+([A-Z0-9\/\-\s]+)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)/g,
        accountPattern: /Account\s*(?:No|Number)[:\s]+(\d+)/i,
        holderPattern: /(?:Account\s*Holder|Name|Customer\s*Name)[:\s]+([A-Z\s]+)/i,
        dateRangePattern: /(?:From|Statement\s*Period)[:\s]+(\d{2}[\/\-]\d{2}[\/\-]\d{4})\s+(?:to|To)\s+(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i
      }
    };
  }

  async processPDF(fileBuffer, originalFileName) {
    const startTime = Date.now();
    
    try {
      // Parse PDF
      const pdfData = await pdfParse(fileBuffer);
      const text = pdfData.text;
      
      // Detect bank type
      const bankType = this.detectBankType(text);
      
      // Extract structured data
      const structuredData = await this.extractStructuredData(text, bankType);
      
      // Convert to JSON format
      const jsonData = this.convertToJSON(structuredData, bankType);
      
      // Generate preview data
      const previewData = this.generatePreviewData(jsonData, text);
      
      // Create Excel file with preserved formatting
      const excelBuffer = await this.createFormattedExcelFile(jsonData, originalFileName, bankType);
      
      const processingTime = Date.now() - startTime;
      
      return {
        success: true,
        excelBuffer,
        jsonData,
        previewData,
        bankType,
        processingTime,
        pagesProcessed: pdfData.numpages,
        originalFileName,
        metadata: {
          accountNumber: structuredData.accountInfo?.accountNumber || 'N/A',
          accountHolder: structuredData.accountInfo?.accountHolder || 'N/A',
          statementPeriod: structuredData.accountInfo?.statementPeriod || 'N/A',
          transactionCount: structuredData.transactions?.length || 0,
          openingBalance: structuredData.summary?.openingBalance || 0,
          closingBalance: structuredData.summary?.closingBalance || 0
        }
      };
    } catch (error) {
      console.error('Enhanced PDF processing error:', error);
      return {
        success: false,
        error: error.message,
        processingTime: Date.now() - startTime,
      };
    }
  }

  detectBankType(text) {
    const upperText = text.toUpperCase();
    
    // Check for specific bank patterns
    for (const [bankName, pattern] of Object.entries(this.bankPatterns)) {
      if (bankName !== 'GENERIC' && pattern.header.test(upperText)) {
        return bankName;
      }
    }
    
    // Check for supported bank keywords
    for (const bank of this.supportedBanks) {
      if (upperText.includes(bank)) {
        return bank;
      }
    }
    
    return 'GENERIC';
  }

  async extractStructuredData(text, bankType) {
    const pattern = this.bankPatterns[bankType] || this.bankPatterns.GENERIC;
    const lines = text.split('\n');
    
    // Extract account information
    const accountInfo = this.extractAccountInfo(text, pattern);
    
    // Extract transactions
    const transactions = this.extractTransactions(text, pattern);
    
    // Extract summary information
    const summary = this.extractSummary(text, lines);
    
    // Extract table structure with spacing
    const tableStructure = this.extractTableStructure(lines);
    
    return {
      accountInfo,
      transactions,
      summary,
      tableStructure,
      rawText: text,
      bankType
    };
  }

  extractAccountInfo(text, pattern) {
    const accountMatch = text.match(pattern.accountPattern);
    const holderMatch = text.match(pattern.holderPattern);
    const dateMatch = text.match(pattern.dateRangePattern);
    
    return {
      accountNumber: accountMatch ? accountMatch[1] : null,
      accountHolder: holderMatch ? holderMatch[1].trim() : null,
      statementPeriod: dateMatch ? `${dateMatch[1]} to ${dateMatch[2]}` : null
    };
  }

  extractTransactions(text, pattern) {
    const transactions = [];
    const matches = [...text.matchAll(pattern.transactionPattern)];
    
    matches.forEach(match => {
      const [, date, description, debit, credit, balance] = match;
      transactions.push({
        date: this.normalizeDate(date),
        description: description.trim(),
        debit: this.parseAmount(debit) || 0,
        credit: this.parseAmount(credit) || 0,
        balance: this.parseAmount(balance) || 0,
        rawMatch: match[0]
      });
    });
    
    return transactions;
  }

  extractSummary(text, lines) {
    const summary = {
      openingBalance: 0,
      closingBalance: 0,
      totalCredits: 0,
      totalDebits: 0
    };
    
    // Look for balance patterns
    const balancePatterns = [
      /Opening Balance[:\s]+([\d,]+\.?\d*)/i,
      /Closing Balance[:\s]+([\d,]+\.?\d*)/i,
      /Total Credits[:\s]+([\d,]+\.?\d*)/i,
      /Total Debits[:\s]+([\d,]+\.?\d*)/i
    ];
    
    lines.forEach(line => {
      const openingMatch = line.match(balancePatterns[0]);
      const closingMatch = line.match(balancePatterns[1]);
      const creditMatch = line.match(balancePatterns[2]);
      const debitMatch = line.match(balancePatterns[3]);
      
      if (openingMatch) summary.openingBalance = this.parseAmount(openingMatch[1]);
      if (closingMatch) summary.closingBalance = this.parseAmount(closingMatch[1]);
      if (creditMatch) summary.totalCredits = this.parseAmount(creditMatch[1]);
      if (debitMatch) summary.totalDebits = this.parseAmount(debitMatch[1]);
    });
    
    return summary;
  }

  extractTableStructure(lines) {
    const tableStructure = {
      headers: [],
      rows: [],
      formatting: {
        columnWidths: [],
        borders: [],
        spacing: []
      }
    };
    
    // Detect table headers
    const headerKeywords = ['DATE', 'DESCRIPTION', 'DEBIT', 'CREDIT', 'BALANCE', 'PARTICULARS', 'WITHDRAWAL', 'DEPOSIT'];
    
    lines.forEach((line, index) => {
      const upperLine = line.toUpperCase();
      const hasMultipleKeywords = headerKeywords.filter(keyword => upperLine.includes(keyword)).length >= 2;
      
      if (hasMultipleKeywords && tableStructure.headers.length === 0) {
        // Extract column positions and widths
        const columns = this.detectColumns(line);
        tableStructure.headers = columns.map(col => col.text);
        tableStructure.formatting.columnWidths = columns.map(col => col.width);
        tableStructure.formatting.spacing = columns.map(col => col.position);
      }
      
      // Detect table rows based on date pattern
      if (/\d{2}[\/\-]\d{2}[\/\-]\d{4}/.test(line)) {
        const rowData = this.parseTableRow(line, tableStructure.formatting.spacing);
        tableStructure.rows.push(rowData);
      }
    });
    
    return tableStructure;
  }

  detectColumns(line) {
    const columns = [];
    const words = line.split(/\s+/);
    let currentPosition = 0;
    
    words.forEach(word => {
      const position = line.indexOf(word, currentPosition);
      columns.push({
        text: word,
        position: position,
        width: word.length
      });
      currentPosition = position + word.length;
    });
    
    return columns;
  }

  parseTableRow(line, spacing) {
    const cells = [];
    let currentIndex = 0;
    
    spacing.forEach((position, index) => {
      const nextPosition = spacing[index + 1] || line.length;
      const cellText = line.substring(position, nextPosition).trim();
      cells.push(cellText);
    });
    
    return cells;
  }

  convertToJSON(structuredData, bankType) {
    return {
      metadata: {
        bankType,
        accountNumber: structuredData.accountInfo?.accountNumber,
        accountHolder: structuredData.accountInfo?.accountHolder,
        statementPeriod: structuredData.accountInfo?.statementPeriod,
        processedAt: new Date().toISOString()
      },
      summary: structuredData.summary,
      transactions: structuredData.transactions,
      tableStructure: structuredData.tableStructure,
      formatting: {
        preserveSpacing: true,
        columnAlignment: this.detectColumnAlignment(structuredData.tableStructure),
        borders: true,
        headerStyling: true
      }
    };
  }

  detectColumnAlignment(tableStructure) {
    const alignments = [];
    
    if (tableStructure.headers) {
      tableStructure.headers.forEach((header, index) => {
        const headerLower = header.toLowerCase();
        if (headerLower.includes('date')) {
          alignments.push('center');
        } else if (headerLower.includes('amount') || headerLower.includes('balance') || 
                   headerLower.includes('debit') || headerLower.includes('credit')) {
          alignments.push('right');
        } else {
          alignments.push('left');
        }
      });
    }
    
    return alignments;
  }

  generatePreviewData(jsonData, rawText) {
    const preview = {
      accountInfo: jsonData.metadata,
      transactionSample: jsonData.transactions.slice(0, 10), // First 10 transactions
      summary: jsonData.summary,
      tableHeaders: jsonData.tableStructure.headers,
      totalTransactions: jsonData.transactions.length,
      rawTextSample: rawText.substring(0, 500) + '...'
    };
    
    return preview;
  }

  async createFormattedExcelFile(jsonData, originalFileName, bankType) {
    const workbook = new ExcelJS.Workbook();
    
    // Set workbook properties
    workbook.creator = 'Finance PDF to Excel Converter';
    workbook.created = new Date();
    workbook.modified = new Date();
    
    // Create Summary Sheet
    const summarySheet = workbook.addWorksheet('Summary');
    this.createSummarySheet(summarySheet, jsonData);
    
    // Create Transactions Sheet
    const transactionsSheet = workbook.addWorksheet('Transactions');
    this.createTransactionsSheet(transactionsSheet, jsonData);
    
    // Create Raw Data Sheet
    const rawDataSheet = workbook.addWorksheet('Raw Data');
    this.createRawDataSheet(rawDataSheet, jsonData);
    
    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }

  createSummarySheet(worksheet, jsonData) {
    // Add title
    const titleRow = worksheet.addRow([`${jsonData.metadata.bankType} Bank Statement Summary`]);
    titleRow.font = { bold: true, size: 16 };
    titleRow.alignment = { horizontal: 'center' };
    worksheet.mergeCells(1, 1, 1, 4);
    
    // Add spacing
    worksheet.addRow([]);
    
    // Add account information
    const accountInfo = [
      ['Account Number', jsonData.metadata.accountNumber],
      ['Account Holder', jsonData.metadata.accountHolder],
      ['Statement Period', jsonData.metadata.statementPeriod],
      ['Processed On', new Date().toLocaleDateString()]
    ];
    
    accountInfo.forEach(([label, value]) => {
      const row = worksheet.addRow([label, value]);
      row.getCell(1).font = { bold: true };
    });
    
    // Add spacing
    worksheet.addRow([]);
    
    // Add summary data
    const summaryData = [
      ['Opening Balance', jsonData.summary.openingBalance],
      ['Closing Balance', jsonData.summary.closingBalance],
      ['Total Credits', jsonData.summary.totalCredits],
      ['Total Debits', jsonData.summary.totalDebits],
      ['Total Transactions', jsonData.transactions.length]
    ];
    
    summaryData.forEach(([label, value]) => {
      const row = worksheet.addRow([label, value]);
      row.getCell(1).font = { bold: true };
      if (typeof value === 'number') {
        row.getCell(2).numFmt = '#,##0.00';
      }
    });
    
    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = 25;
    });
  }

  createTransactionsSheet(worksheet, jsonData) {
    // Add headers
    const headers = ['Date', 'Description', 'Debit', 'Credit', 'Balance'];
    const headerRow = worksheet.addRow(headers);
    
    // Style headers
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '366092' } };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    
    // Add transaction data
    jsonData.transactions.forEach(transaction => {
      const row = worksheet.addRow([
        transaction.date,
        transaction.description,
        transaction.debit || '',
        transaction.credit || '',
        transaction.balance
      ]);
      
      // Format numeric columns
      [3, 4, 5].forEach(colIndex => {
        const cell = row.getCell(colIndex);
        if (cell.value && typeof cell.value === 'number') {
          cell.numFmt = '#,##0.00';
          cell.alignment = { horizontal: 'right' };
        }
      });
      
      // Center align date
      row.getCell(1).alignment = { horizontal: 'center' };
    });
    
    // Add borders and auto-fit
    this.addBordersAndAutoFit(worksheet);
  }

  createRawDataSheet(worksheet, jsonData) {
    // Add raw text with proper formatting
    const rawLines = jsonData.tableStructure.rawText?.split('\n') || [];
    
    rawLines.forEach(line => {
      worksheet.addRow([line]);
    });
    
    // Set column width
    worksheet.getColumn(1).width = 100;
    worksheet.getColumn(1).alignment = { wrapText: true };
  }

  addBordersAndAutoFit(worksheet) {
    // Add borders
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });
    
    // Auto-fit columns
    worksheet.columns.forEach((column, index) => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const cellLength = cell.value ? cell.value.toString().length : 0;
        maxLength = Math.max(maxLength, cellLength);
      });
      column.width = Math.min(Math.max(maxLength + 2, 12), 50);
    });
  }

  normalizeDate(dateString) {
    // Convert various date formats to standard format
    const cleaned = dateString.replace(/[-]/g, '/');
    const parts = cleaned.split('/');
    
    if (parts.length === 3) {
      // Assuming DD/MM/YYYY format
      return `${parts[0]}/${parts[1]}/${parts[2]}`;
    }
    
    return dateString;
  }

  parseAmount(amountString) {
    if (!amountString) return 0;
    
    // Remove commas and parse as float
    const cleaned = amountString.replace(/,/g, '');
    const amount = parseFloat(cleaned);
    
    return isNaN(amount) ? 0 : amount;
  }

  generateFileName(originalFileName) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const baseName = path.basename(originalFileName, path.extname(originalFileName));
    return `${baseName}_processed_${timestamp}.xlsx`;
  }
}

export default EnhancedPDFProcessor;