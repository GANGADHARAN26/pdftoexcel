import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';

if (typeof window === 'undefined') {
  const workerPath = path.join(process.cwd(), 'public', 'pdf.worker.mjs');
  pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;
} else {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.mjs`;
}

export class EnhancedPDFProcessor {
  constructor() {
    this.ensureUploadDir();
    this.debugMode = process.env.NODE_ENV === 'development';
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
      const pdf = await pdfjsLib.getDocument({
        data: fileBuffer,
        // Enhanced options for better text extraction
        useSystemFonts: true,
        disableFontFace: false,
        verbosity: this.debugMode ? 1 : 0
      }).promise;
      
      const numPages = pdf.numPages;
      let allPageData = [];
      let totalTextItems = 0;
      let totalImages = 0;
      let totalTables = 0;

      console.log(`Processing ${numPages} pages from ${originalFileName}`);

      // Process each page with comprehensive data extraction
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const pageData = await this.extractCompletePageData(page, pageNum);
        allPageData.push(pageData);
        
        totalTextItems += pageData.textItems.length;
        totalImages += pageData.images.length;
        totalTables += pageData.tables.length;
        
        if (this.debugMode) {
          console.log(`Page ${pageNum}: ${pageData.textItems.length} text items, ${pageData.images.length} images, ${pageData.tables.length} tables`);
        }
      }

      const excelBuffer = await this.createComprehensiveExcelFile(allPageData, originalFileName);
      const processingTime = Date.now() - startTime;

      // Create detailed preview data
      const previewData = this.generateDetailedPreview(allPageData);

      return {
        success: true,
        excelBuffer,
        processingTime,
        pagesProcessed: numPages,
        originalFileName,
        previewData,
        metadata: {
          totalTextItems,
          totalImages,
          totalTables,
          extractionQuality: 'comprehensive',
          processingDetails: {
            pagesProcessed: numPages,
            averageItemsPerPage: Math.round(totalTextItems / numPages),
            hasImages: totalImages > 0,
            hasTables: totalTables > 0
          }
        }
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

  async extractCompletePageData(page, pageNum) {
    const viewport = page.getViewport({ scale: 1.0 });
    
    // Extract text content with positioning
    const textContent = await page.getTextContent({
      normalizeWhitespace: false,
      disableCombineTextItems: false
    });

    // Extract operator list for additional content detection
    const operatorList = await page.getOperatorList();
    
    // Detect images and graphics
    const images = this.detectImages(operatorList);
    
    // Enhanced text processing with better positioning
    const processedTextItems = this.processTextItems(textContent.items, viewport);
    
    // Detect table structures
    const tables = this.detectTables(processedTextItems);
    
    // Extract form fields if any
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
      const y = viewport.height - transform[5]; // Convert to top-down coordinates
      
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
    const tolerance = 5; // Pixel tolerance for alignment
    
    // Group items by rows (similar Y coordinates)
    const rows = this.groupItemsByRows(textItems, tolerance);
    
    // Detect table-like structures
    for (let i = 0; i < rows.length - 1; i++) {
      const currentRow = rows[i];
      const nextRow = rows[i + 1];
      
      // Check if rows have similar column structure
      if (this.areRowsSimilar(currentRow, nextRow, tolerance)) {
        let tableRows = [currentRow, nextRow];
        let j = i + 2;
        
        // Extend table detection
        while (j < rows.length && this.areRowsSimilar(tableRows[tableRows.length - 1], rows[j], tolerance)) {
          tableRows.push(rows[j]);
          j++;
        }
        
        if (tableRows.length >= 2) { // Minimum 2 rows for a table
          tables.push({
            type: 'table',
            startRow: i,
            endRow: j - 1,
            rows: tableRows,
            columns: this.detectColumns(tableRows),
            rowCount: tableRows.length,
            columnCount: this.getMaxColumns(tableRows)
          });
          
          i = j - 1; // Skip processed rows
        }
      }
    }

    return tables;
  }

  groupItemsByRows(items, tolerance) {
    if (!items || items.length === 0) return [];

    const rows = [];
    const sortedItems = [...items].sort((a, b) => b.y - a.y); // Sort by Y coordinate (top to bottom)
    
    let currentRow = [sortedItems[0]];
    let currentY = sortedItems[0].y;

    for (let i = 1; i < sortedItems.length; i++) {
      const item = sortedItems[i];
      
      if (Math.abs(item.y - currentY) <= tolerance) {
        currentRow.push(item);
      } else {
        // Sort current row by X coordinate (left to right)
        currentRow.sort((a, b) => a.x - b.x);
        rows.push(currentRow);
        currentRow = [item];
        currentY = item.y;
      }
    }
    
    // Add the last row
    if (currentRow.length > 0) {
      currentRow.sort((a, b) => a.x - b.x);
      rows.push(currentRow);
    }

    return rows;
  }

  areRowsSimilar(row1, row2, tolerance) {
    if (!row1 || !row2 || row1.length < 2 || row2.length < 2) return false;
    
    // Check if rows have similar number of items
    const lengthDiff = Math.abs(row1.length - row2.length);
    if (lengthDiff > 2) return false;
    
    // Check if X positions are similar (indicating columns)
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
    
    return matches >= Math.min(positions1.length, positions2.length) * 0.6; // 60% similarity
  }

  detectColumns(tableRows) {
    const allXPositions = [];
    
    tableRows.forEach(row => {
      row.forEach(item => {
        allXPositions.push(item.x);
      });
    });
    
    // Sort and remove duplicates with tolerance
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

  generateDetailedPreview(allPageData) {
    const preview = {
      totalPages: allPageData.length,
      totalTextItems: 0,
      totalTables: 0,
      totalImages: 0,
      totalFormFields: 0,
      sampleContent: [],
      tablePreview: [],
      extractionSummary: {}
    };

    allPageData.forEach((pageData, index) => {
      preview.totalTextItems += pageData.textItems.length;
      preview.totalTables += pageData.tables.length;
      preview.totalImages += pageData.images.length;
      preview.totalFormFields += pageData.formFields.length;

      // Sample content from first page
      if (index === 0 && pageData.textItems.length > 0) {
        preview.sampleContent = pageData.textItems
          .slice(0, 20)
          .map(item => item.text)
          .filter(text => text.trim().length > 0);
      }

      // Table preview from first table found
      if (preview.tablePreview.length === 0 && pageData.tables.length > 0) {
        const firstTable = pageData.tables[0];
        preview.tablePreview = firstTable.rows.slice(0, 3).map(row =>
          row.map(item => item.text).join(' | ')
        );
      }
    });

    preview.extractionSummary = {
      hasText: preview.totalTextItems > 0,
      hasTables: preview.totalTables > 0,
      hasImages: preview.totalImages > 0,
      hasFormFields: preview.totalFormFields > 0,
      completeness: 'comprehensive'
    };

    return preview;
  }
async createComprehensiveExcelFile(allPageData, originalFileName) {
    const workbook = new ExcelJS.Workbook();
    
    // Set workbook properties
    workbook.creator = 'Enhanced PDF to Excel Converter';
    workbook.created = new Date();
    workbook.modified = new Date();
    workbook.subject = `Converted from ${originalFileName}`;

    // Create summary worksheet
    await this.createSummaryWorksheet(workbook, allPageData, originalFileName);

    // Create comprehensive data worksheet with ALL content
    await this.createAllDataWorksheet(workbook, allPageData);

    // Create separate worksheets for tables if detected
    await this.createTableWorksheets(workbook, allPageData);

    // Create form fields worksheet if any
    await this.createFormFieldsWorksheet(workbook, allPageData);

    // Create page-by-page worksheets for detailed analysis
    await this.createPageWorksheets(workbook, allPageData);

    return workbook.xlsx.writeBuffer();
  }

  async createSummaryWorksheet(workbook, allPageData, originalFileName) {
    const worksheet = workbook.addWorksheet('📊 Summary');
    
    // Title
    worksheet.mergeCells('A1:D1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `PDF Extraction Summary: ${originalFileName}`;
    titleCell.font = { bold: true, size: 16, color: { argb: 'FF0066CC' } };
    titleCell.alignment = { horizontal: 'center' };

    // Statistics
    let row = 3;
    const stats = [
      ['Total Pages', allPageData.length],
      ['Total Text Items', allPageData.reduce((sum, page) => sum + page.textItems.length, 0)],
      ['Total Tables Detected', allPageData.reduce((sum, page) => sum + page.tables.length, 0)],
      ['Total Images Detected', allPageData.reduce((sum, page) => sum + page.images.length, 0)],
      ['Total Form Fields', allPageData.reduce((sum, page) => sum + page.formFields.length, 0)],
      ['Extraction Date', new Date().toLocaleString()],
      ['Extraction Quality', 'COMPREHENSIVE - All data captured']
    ];

    stats.forEach(([label, value]) => {
      worksheet.getCell(`A${row}`).value = label;
      worksheet.getCell(`A${row}`).font = { bold: true };
      worksheet.getCell(`B${row}`).value = value;
      row++;
    });

    // Page breakdown
    row += 2;
    worksheet.getCell(`A${row}`).value = 'Page Breakdown:';
    worksheet.getCell(`A${row}`).font = { bold: true, size: 14 };
    row++;

    worksheet.getCell(`A${row}`).value = 'Page';
    worksheet.getCell(`B${row}`).value = 'Text Items';
    worksheet.getCell(`C${row}`).value = 'Tables';
    worksheet.getCell(`D${row}`).value = 'Images';
    worksheet.getCell(`E${row}`).value = 'Form Fields';
    
    // Style header row
    ['A', 'B', 'C', 'D', 'E'].forEach(col => {
      const cell = worksheet.getCell(`${col}${row}`);
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F3FF' } };
    });
    row++;

    allPageData.forEach((pageData, index) => {
      worksheet.getCell(`A${row}`).value = pageData.pageNumber;
      worksheet.getCell(`B${row}`).value = pageData.textItems.length;
      worksheet.getCell(`C${row}`).value = pageData.tables.length;
      worksheet.getCell(`D${row}`).value = pageData.images.length;
      worksheet.getCell(`E${row}`).value = pageData.formFields.length;
      row++;
    });

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, cell => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = maxLength < 15 ? 15 : Math.min(maxLength, 50);
    });
  }

  async createAllDataWorksheet(workbook, allPageData) {
    const worksheet = workbook.addWorksheet('🔍 All Data');
    
    let currentRow = 1;
    
    // Add header
    worksheet.mergeCells(`A1:F1`);
    const headerCell = worksheet.getCell('A1');
    headerCell.value = 'COMPLETE PDF CONTENT - ALL DATA EXTRACTED';
    headerCell.font = { bold: true, size: 14, color: { argb: 'FF0066CC' } };
    headerCell.alignment = { horizontal: 'center' };
    currentRow = 3;

    allPageData.forEach((pageData) => {
      // Page separator
      worksheet.mergeCells(`A${currentRow}:F${currentRow}`);
      const pageCell = worksheet.getCell(`A${currentRow}`);
      pageCell.value = `=== PAGE ${pageData.pageNumber} ===`;
      pageCell.font = { bold: true, size: 12, color: { argb: 'FF006600' } };
      pageCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F8F0' } };
      pageCell.alignment = { horizontal: 'center' };
      currentRow += 2;

      // Process all text items for this page
      if (pageData.textItems.length > 0) {
        const rows = this.groupItemsByRows(pageData.textItems, 5);
        
        rows.forEach(rowItems => {
          const excelRow = [];
          let lastX = 0;
          
          // Sort items by X position
          const sortedItems = rowItems.sort((a, b) => a.x - b.x);
          
          sortedItems.forEach(item => {
            // Calculate spacing based on X position
            const currentX = item.x;
            const spacing = Math.max(0, Math.floor((currentX - lastX) / 20));
            
            // Add empty cells for spacing
            for (let i = 0; i < spacing && excelRow.length < 50; i++) {
              excelRow.push('');
            }
            
            // Add the actual text
            if (excelRow.length < 50) {
              excelRow.push(item.text || '');
            }
            
            lastX = currentX + (item.width || 0);
          });
          
          // Add the row to worksheet
          if (excelRow.some(cell => cell.toString().trim().length > 0)) {
            worksheet.addRow(excelRow);
            currentRow++;
          }
        });
      }

      // Add tables for this page
      if (pageData.tables.length > 0) {
        currentRow += 1;
        worksheet.mergeCells(`A${currentRow}:F${currentRow}`);
        const tableHeaderCell = worksheet.getCell(`A${currentRow}`);
        tableHeaderCell.value = `--- TABLES ON PAGE ${pageData.pageNumber} ---`;
        tableHeaderCell.font = { bold: true, italic: true, color: { argb: 'FF800080' } };
        tableHeaderCell.alignment = { horizontal: 'center' };
        currentRow += 1;

        pageData.tables.forEach((table, tableIndex) => {
          // Table identifier
          worksheet.getCell(`A${currentRow}`).value = `Table ${tableIndex + 1}:`;
          worksheet.getCell(`A${currentRow}`).font = { bold: true };
          currentRow++;

          // Add table rows
          table.rows.forEach(rowItems => {
            const tableRow = rowItems.map(item => item.text || '');
            worksheet.addRow(tableRow);
            currentRow++;
          });
          currentRow++; // Extra space after table
        });
      }

      // Add form fields for this page
      if (pageData.formFields.length > 0) {
        currentRow += 1;
        worksheet.mergeCells(`A${currentRow}:F${currentRow}`);
        const formHeaderCell = worksheet.getCell(`A${currentRow}`);
        formHeaderCell.value = `--- FORM FIELDS ON PAGE ${pageData.pageNumber} ---`;
        formHeaderCell.font = { bold: true, italic: true, color: { argb: 'FFFF6600' } };
        formHeaderCell.alignment = { horizontal: 'center' };
        currentRow += 1;

        pageData.formFields.forEach(field => {
          worksheet.addRow([
            `Field: ${field.fieldName}`,
            `Type: ${field.fieldType}`,
            `Value: ${field.fieldValue}`,
            field.readOnly ? 'Read-Only' : 'Editable'
          ]);
          currentRow++;
        });
      }

      currentRow += 2; // Space between pages
    });

    // Auto-fit columns with reasonable limits
    worksheet.columns.forEach((column, index) => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, cell => {
        const columnLength = cell.value ? cell.value.toString().length : 0;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = Math.max(8, Math.min(maxLength + 2, 40));
    });
  }

  async createTableWorksheets(workbook, allPageData) {
    let tableCount = 0;
    
    allPageData.forEach((pageData) => {
      pageData.tables.forEach((table, tableIndex) => {
        tableCount++;
        const worksheetName = `📋 Table ${tableCount} (P${pageData.pageNumber})`;
        const worksheet = workbook.addWorksheet(worksheetName);
        
        // Table header
        worksheet.mergeCells('A1:E1');
        const headerCell = worksheet.getCell('A1');
        headerCell.value = `Table ${tableCount} from Page ${pageData.pageNumber}`;
        headerCell.font = { bold: true, size: 14 };
        headerCell.alignment = { horizontal: 'center' };
        
        let row = 3;
        
        // Add table data
        table.rows.forEach((rowItems, rowIndex) => {
          const rowData = rowItems.map(item => item.text || '');
          worksheet.addRow(rowData);
          
          // Style first row as header if it looks like one
          if (rowIndex === 0) {
            const currentRow = worksheet.getRow(row);
            currentRow.eachCell(cell => {
              cell.font = { bold: true };
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F3FF' } };
            });
          }
          row++;
        });
        
        // Auto-fit columns
        worksheet.columns.forEach(column => {
          let maxLength = 0;
          column.eachCell({ includeEmpty: true }, cell => {
            const columnLength = cell.value ? cell.value.toString().length : 0;
            if (columnLength > maxLength) {
              maxLength = columnLength;
            }
          });
          column.width = Math.max(10, Math.min(maxLength + 2, 50));
        });
      });
    });
  }

  async createFormFieldsWorksheet(workbook, allPageData) {
    const allFormFields = allPageData.flatMap(page => 
      page.formFields.map(field => ({ ...field, pageNumber: page.pageNumber }))
    );
    
    if (allFormFields.length === 0) return;
    
    const worksheet = workbook.addWorksheet('📝 Form Fields');
    
    // Header
    worksheet.mergeCells('A1:F1');
    const headerCell = worksheet.getCell('A1');
    headerCell.value = 'FORM FIELDS EXTRACTED FROM PDF';
    headerCell.font = { bold: true, size: 14 };
    headerCell.alignment = { horizontal: 'center' };
    
    // Column headers
    const headers = ['Page', 'Field Name', 'Field Type', 'Field Value', 'Read Only', 'Position'];
    worksheet.addRow(headers);
    
    const headerRow = worksheet.getRow(3);
    headerRow.eachCell(cell => {
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F3FF' } };
    });
    
    // Add form field data
    allFormFields.forEach(field => {
      worksheet.addRow([
        field.pageNumber,
        field.fieldName,
        field.fieldType,
        field.fieldValue,
        field.readOnly ? 'Yes' : 'No',
        field.rect ? `[${field.rect.join(', ')}]` : 'Unknown'
      ]);
    });
    
    // Auto-fit columns
    worksheet.columns.forEach(column => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, cell => {
        const columnLength = cell.value ? cell.value.toString().length : 0;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = Math.max(12, Math.min(maxLength + 2, 40));
    });
  }

  async createPageWorksheets(workbook, allPageData) {
    allPageData.forEach((pageData) => {
      const worksheetName = `📄 Page ${pageData.pageNumber}`;
      const worksheet = workbook.addWorksheet(worksheetName);
      
      // Page header
      worksheet.mergeCells('A1:F1');
      const headerCell = worksheet.getCell('A1');
      headerCell.value = `PAGE ${pageData.pageNumber} - DETAILED CONTENT`;
      headerCell.font = { bold: true, size: 14 };
      headerCell.alignment = { horizontal: 'center' };
      
      let currentRow = 3;
      
      // Page statistics
      worksheet.getCell(`A${currentRow}`).value = 'Page Statistics:';
      worksheet.getCell(`A${currentRow}`).font = { bold: true };
      currentRow++;
      
      const stats = [
        ['Text Items', pageData.textItems.length],
        ['Tables', pageData.tables.length],
        ['Images', pageData.images.length],
        ['Form Fields', pageData.formFields.length],
        ['Page Dimensions', `${Math.round(pageData.viewport.width)} x ${Math.round(pageData.viewport.height)}`]
      ];
      
      stats.forEach(([label, value]) => {
        worksheet.getCell(`A${currentRow}`).value = label + ':';
        worksheet.getCell(`B${currentRow}`).value = value;
        currentRow++;
      });
      
      currentRow += 2;
      
      // All text content for this page
      if (pageData.textItems.length > 0) {
        worksheet.getCell(`A${currentRow}`).value = 'All Text Content:';
        worksheet.getCell(`A${currentRow}`).font = { bold: true, size: 12 };
        currentRow += 2;
        
        const rows = this.groupItemsByRows(pageData.textItems, 5);
        rows.forEach(rowItems => {
          const rowData = [];
          let lastX = 0;
          
          rowItems.sort((a, b) => a.x - b.x).forEach(item => {
            const spacing = Math.max(0, Math.floor((item.x - lastX) / 15));
            for (let i = 0; i < spacing && rowData.length < 30; i++) {
              rowData.push('');
            }
            if (rowData.length < 30) {
              rowData.push(item.text || '');
            }
            lastX = item.x + (item.width || 0);
          });
          
          if (rowData.some(cell => cell.toString().trim().length > 0)) {
            worksheet.addRow(rowData);
            currentRow++;
          }
        });
      }
      
      // Auto-fit columns
      worksheet.columns.forEach(column => {
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, cell => {
          const columnLength = cell.value ? cell.value.toString().length : 0;
          if (columnLength > maxLength) {
            maxLength = columnLength;
          }
        });
        column.width = Math.max(8, Math.min(maxLength + 2, 35));
      });
    });
  }

  async createExcelFile(items, originalFileName) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('All Data');

    // Group items by line based on their vertical position (transform[5])
    const lines = this.groupItemsByLine(items);

    // Process each line and add it to the worksheet
    lines.forEach(line => {
      let row = [];
      let lastX = 0;
      line.items.forEach(item => {
        // Calculate the number of empty cells to add to simulate spacing
        const x = item.transform[4];
        const spaceCount = Math.round((x - lastX) / 10); // 10 is a scaling factor for space width
        for (let i = 0; i < spaceCount; i++) {
          row.push('');
        }
        row.push(item.str);
        lastX = x + (item.width);
      });
      worksheet.addRow(row);
    });
    
    // Auto-fit columns for better readability
    if (worksheet.columns) {
      worksheet.columns.forEach(column => {
          let maxLength = 0;
          column.eachCell({ includeEmpty: true }, cell => {
              const columnLength = cell.value ? cell.value.toString().length : 10;
              if (columnLength > maxLength) {
                  maxLength = columnLength;
              }
          });
          column.width = maxLength < 10 ? 10 : maxLength;
      });
    }

    return workbook.xlsx.writeBuffer();
  }

  groupItemsByLine(items) {
    if (!items || items.length === 0) {
      return [];
    }

    const lines = [];
    let currentLine = { y: items[0].transform[5], items: [items[0]] };

    for (let i = 1; i < items.length; i++) {
      const item = items[i];
      const y = item.transform[5];

      // A small tolerance for items on the same line
      if (Math.abs(y - currentLine.y) < 5) {
        currentLine.items.push(item);
      } else {
        // Sort items in the current line by their x-coordinate before saving
        currentLine.items.sort((a, b) => a.transform[4] - b.transform[4]);
        lines.push(currentLine);
        currentLine = { y: y, items: [item] };
      }
    }
    // Add the last line
    currentLine.items.sort((a, b) => a.transform[4] - b.transform[4]);
    lines.push(currentLine);

    // Sort lines by their y-coordinate
    return lines.sort((a, b) => b.y - a.y);
  }

  generateFileName(originalFileName) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const baseName = path.basename(originalFileName, path.extname(originalFileName));
    return `${baseName}_converted_${timestamp}.xlsx`;
  }
}

export default EnhancedPDFProcessor;