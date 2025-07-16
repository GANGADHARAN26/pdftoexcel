# FinancePDF.ai - Advanced PDF to Excel Converter

🚀 **Development Mode Active** - All features unlocked, no authentication required!

An advanced PDF to Excel converter specialized for financial documents with AI-powered data extraction, OCR support, and manual editing capabilities.

## ✨ Key Features

### 🏦 Financial Document Focus
- **Bank Statements** - Automatic transaction extraction
- **Financial Reports** - Balance sheets, income statements
- **Investment Portfolios** - Holdings, performance data
- **Invoices & Bills** - Line items, totals, tax information
- **Tax Documents** - Form recognition and data extraction

### 🤖 AI-Powered Processing
- **Auto-Detection** - Automatically chooses best extraction method
- **Text Extraction** - High-speed processing for text-based PDFs
- **OCR Processing** - Tesseract.js integration for scanned documents
- **Manual Backup** - Built-in table editor when automation fails

### 🔧 Advanced Features
- **Multi-Method Processing** - Text, OCR, and manual extraction
- **Real-time Preview** - See extracted data before download
- **Document Type Recognition** - Specialized templates for different financial documents
- **Manual Table Editor** - Full spreadsheet-like editing capabilities
- **Multiple Output Formats** - Excel with multiple worksheets and CSV support

## 🛠️ Technology Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **PDF Processing**: PDF.js, Tesseract.js (OCR)
- **Excel Generation**: ExcelJS
- **File Upload**: Multer with 50MB limit
- **Image Processing**: Sharp, pdf2pic
- **Authentication**: NextAuth.js (disabled in dev mode)
- **Database**: MongoDB (for production)

## 📦 Installation

```bash
# Clone the repository
git clone <repository-url>
cd finance-pdf-to-excel-app

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Start development server
npm run dev
```

## 🚀 Usage

### Basic Usage
1. **Upload PDF** - Drag and drop or click to select
2. **Choose Processing Method** - Auto, Text, OCR, or Manual
3. **Select Document Type** - Bank statement, financial report, etc.
4. **Preview Results** - Review extracted data
5. **Download Excel** - Get your formatted spreadsheet

### Processing Methods

#### 1. Auto-Detection (Recommended)
```javascript
// Automatically detects if PDF is text-based or requires OCR
processingMethod: 'auto'
```

#### 2. Text Extraction
```javascript
// For standard text-based PDFs
processingMethod: 'text'
```

#### 3. OCR Processing
```javascript
// For scanned/image-based PDFs
processingMethod: 'ocr'
```

#### 4. Manual Extraction
```javascript
// Opens the manual table editor
processingMethod: 'manual'
```

### Document Types

- `general` - General documents
- `bankStatement` - Bank statements and transaction records
- `financialReport` - Financial reports and balance sheets
- `invoice` - Invoices and billing documents
- `investment` - Investment portfolios and statements

## 📊 Manual Table Editor

### Features
- **Full Excel-like Interface** - Add/remove rows and columns
- **Keyboard Navigation** - Arrow keys, Enter, Delete, F2
- **Copy/Paste Support** - Ctrl+C, Ctrl+V
- **Undo/Redo** - Ctrl+Z, Ctrl+Y
- **Financial Templates** - Pre-built templates for common documents
- **Real-time Editing** - Click or double-click to edit cells

### Keyboard Shortcuts
- **Navigation**: Arrow keys
- **Edit**: Enter, F2, Double-click
- **Delete**: Delete key
- **Copy**: Ctrl+C
- **Paste**: Ctrl+V
- **Undo**: Ctrl+Z
- **Redo**: Ctrl+Y

## 🔧 API Endpoints

### Process PDF
```
POST /api/process-advanced-pdf
```

**Parameters:**
- `file` - PDF file (max 50MB)
- `sessionId` - Session identifier
- `processingMethod` - auto|text|ocr|manual
- `documentType` - Document type identifier
- `previewOnly` - true/false for preview mode

**Response:**
- Success: Excel file download or preview data
- Error: JSON with error details and suggestions

### Health Check
```
GET /api/process-advanced-pdf
```

Returns API information and supported features.

## 🏗️ Project Structure

```
src/
├── app/
│   ├── api/
│   │   └── process-advanced-pdf/
│   │       └── route.js
│   ├── layout.js
│   └── page.js
├── components/
│   ├── AdvancedFileUpload.js
│   ├── ManualTableEditor.js
│   └── Header.js
└── lib/
    └── advanced-pdf-processor.js
```

## 📱 Components

### AdvancedFileUpload
Main upload component with processing method selection and preview.

### ManualTableEditor
Full-featured table editor with financial document templates.

### AdvancedPDFProcessor
Core processing engine with OCR and financial document recognition.

## 🔒 Security & Limits

### Development Mode
- ✅ No authentication required
- ✅ 50MB file size limit
- ✅ Unlimited conversions
- ✅ All features unlocked

### Production Mode (Future)
- 🔐 User authentication required
- 💳 Subscription-based pricing
- 📊 Usage analytics
- 🔒 Enhanced security

## 🌟 Financial Document Processing

### Bank Statements
- Transaction extraction
- Balance calculation
- Date parsing
- Category detection

### Financial Reports
- Balance sheet items
- Income statement data
- Cash flow analysis
- Ratio calculations

### Investment Documents
- Portfolio holdings
- Performance metrics
- Cost basis tracking
- Dividend records

### Invoices
- Line item extraction
- Tax calculation
- Payment terms
- Vendor information

## 🚨 Error Handling

The system includes comprehensive error handling:

- **OCR Failures** - Graceful fallback to manual extraction
- **PDF Corruption** - Clear error messages and suggestions
- **Processing Timeouts** - Automatic retry mechanisms
- **Memory Limits** - Efficient processing for large files

## 📈 Performance

- **Fast Text Processing** - Direct PDF.js extraction
- **Efficient OCR** - Optimized Tesseract.js configuration
- **Memory Management** - Proper cleanup and garbage collection
- **Streaming Support** - Large file handling

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Open an issue on GitHub
- Check the documentation
- Review the error messages and suggestions

## 🔄 Development Roadmap

### Phase 1 (Current)
- ✅ Basic PDF processing
- ✅ OCR integration
- ✅ Manual table editor
- ✅ Financial document templates

### Phase 2 (Planned)
- 🔄 AI-powered data recognition
- 🔄 Batch processing
- 🔄 API rate limiting
- 🔄 User authentication

### Phase 3 (Future)
- 🔄 Machine learning models
- 🔄 Advanced analytics
- 🔄 Multi-language support
- 🔄 Mobile app

---

**Built with ❤️ for financial document processing**