import pdfParse from 'pdf-parse';
import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';

export class PDFProcessor {
  constructor() {
    this.ensureUploadDir();
  }

  ensureUploadDir() {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
  }

  async processPDF(fileBuffer, originalFileName) {
    const startTime = Date.now();
    
    try {
      // Parse PDF
      const pdfData = await pdfParse(fileBuffer);
      const text = pdfData.text;
      
      // Extract table data
      const extractedData = this.extractTableData(text);
      
      // Create Excel file
      const excelBuffer = await this.createExcelFile(extractedData, originalFileName);
      
      const processingTime = Date.now() - startTime;
      
      return {
        success: true,
        excelBuffer,
        processingTime,
        pagesProcessed: pdfData.numpages,
        originalFileName,
      };
    } catch (error) {
      console.error('PDF processing error:', error);
      return {
        success: false,
        error: error.message,
        processingTime: Date.now() - startTime,
      };
    }
  }

  extractTableData(text) {
    const lines = text.split('\n');
    const tableData = [];
    let headers = [];
    
    // Find table boundaries and extract data
    const relevantLines = lines.filter(line => {
      return line.includes('|') && !line.includes('---') && line.trim().length > 0;
    });

    for (let i = 0; i < relevantLines.length; i++) {
      const line = relevantLines[i];
      const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell.length > 0);
      
      if (cells.length > 0) {
        if (i === 0) {
          // First row as headers
          headers = cells;
          tableData.push(headers);
        } else {
          // Ensure we have consistent number of columns
          const row = [];
          for (let j = 0; j < Math.max(headers.length, cells.length); j++) {
            row.push(cells[j] || '');
          }
          tableData.push(row);
        }
      }
    }

    // If no proper table structure found, try to extract financial data patterns
    if (tableData.length === 0) {
      return this.extractFinancialData(text);
    }

    return tableData;
  }

  extractFinancialData(text) {
    const lines = text.split('\n');
    const financialData = [];
    
    // Common patterns for financial statements
    const patterns = [
      /(\d{2,4})\s*-?\s*([A-Za-z\s]+)\s*\|\s*([\d,]+\.?\d*)/g,
      /([A-Za-z\s]+)\s*\|\s*([\d,]+\.?\d*)\s*\|\s*([\d,]+\.?\d*)/g,
      /(\d+)\s*-\s*([A-Za-z\s]+)\s*([\d,]+\.?\d*)/g,
    ];

    // Add headers
    financialData.push(['Account Code', 'Description', 'Amount', 'Previous', 'Cumulative']);

    lines.forEach(line => {
      if (line.trim().length === 0) return;
      
      patterns.forEach(pattern => {
        const matches = [...line.matchAll(pattern)];
        matches.forEach(match => {
          const row = match.slice(1).map(item => item?.trim() || '');
          if (row.length > 0) {
            financialData.push(row);
          }
        });
      });
    });

    return financialData.length > 1 ? financialData : [['Raw Data'], [text]];
  }

  async createExcelFile(data, originalFileName) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Financial Data');

    // Add data to worksheet
    if (data.length > 0) {
      // Add headers with styling
      const headerRow = worksheet.addRow(data[0]);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };

      // Add data rows
      for (let i = 1; i < data.length; i++) {
        const row = worksheet.addRow(data[i]);
        
        // Format numeric cells
        row.eachCell((cell, colNumber) => {
          const value = cell.value;
          if (typeof value === 'string' && /^\d+\.?\d*$/.test(value.replace(/,/g, ''))) {
            cell.numFmt = '#,##0.00';
            cell.value = parseFloat(value.replace(/,/g, '')) || 0;
          }
        });
      }

      // Auto-fit columns
      worksheet.columns.forEach((column, index) => {
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, (cell) => {
          const cellLength = cell.value ? cell.value.toString().length : 0;
          maxLength = Math.max(maxLength, cellLength);
        });
        column.width = Math.min(Math.max(maxLength + 2, 10), 50);
      });

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
    }

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }

  generateFileName(originalFileName) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const baseName = path.basename(originalFileName, path.extname(originalFileName));
    return `${baseName}_converted_${timestamp}.xlsx`;
  }
}

export default PDFProcessor;