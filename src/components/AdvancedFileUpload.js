'use client';

import React, { useState, useCallback, useRef } from 'react';
import { 
  Upload, 
  FileText, 
  Download, 
  Eye, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Image,
  Edit3,
  Zap,
  Database,
  Settings,
  RefreshCw,
  FileSpreadsheet
} from 'lucide-react';
import toast from 'react-hot-toast';
import ManualTableEditor from './ManualTableEditor';

const AdvancedFileUpload = ({ sessionId, user }) => {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [preview, setPreview] = useState(null);
  const [processingStatus, setProcessingStatus] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [processingMethod, setProcessingMethod] = useState('auto');
  const [showManualEditor, setShowManualEditor] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [documentType, setDocumentType] = useState('general');
  const fileInputRef = useRef(null);

  const supportedFormats = [
    'Bank statements & financial reports',
    'Investment portfolios & statements', 
    'Invoices & billing documents',
    'Tax documents & forms',
    'Business reports & analytics',
    'Academic & research papers',
    'Legal documents & contracts',
    'Technical specifications',
    'Data sheets & tables',
    'Image-based PDFs (OCR)',
    'Scanned documents'
  ];

  const processingMethods = [
    { value: 'auto', label: 'Auto-detect (Recommended)', description: 'Automatically chooses best method' },
    { value: 'text', label: 'Text Extraction', description: 'For text-based PDFs' },
    { value: 'ocr', label: 'OCR Processing', description: 'For image-based/scanned PDFs' },
    { value: 'manual', label: 'Manual Extraction', description: 'Manual table creation' }
  ];

  const documentTypes = [
    { value: 'general', label: 'General Document' },
    { value: 'bankStatement', label: 'Bank Statement' },
    { value: 'financialReport', label: 'Financial Report' },
    { value: 'invoice', label: 'Invoice/Bill' },
    { value: 'investment', label: 'Investment Portfolio' }
  ];

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      handleFileSelection(droppedFile);
    }
  }, []);

  const handleFileSelection = (selectedFile) => {
    if (selectedFile.type !== 'application/pdf') {
      toast.error('Please select a PDF file');
      return;
    }

    if (selectedFile.size > 50 * 1024 * 1024) {
      toast.error('File size must be less than 50MB');
      return;
    }

    setFile(selectedFile);
    setPreview(null);
    setExtractedData(null);
    toast.success('File selected successfully!');
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const generatePreview = async () => {
    if (!file) return;

    setIsLoadingPreview(true);
    setProcessingStatus('Generating preview...');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sessionId', sessionId);
      formData.append('previewOnly', 'true');
      formData.append('processingMethod', processingMethod);
      formData.append('documentType', documentType);

      const response = await fetch('/api/process-advanced-pdf', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setPreview(result);
        toast.success('Preview generated successfully!');
      } else {
        toast.error(result.error || 'Failed to generate preview');
        if (result.requiresManualExtraction) {
          toast.info('Consider using manual extraction for this document');
        }
      }
    } catch (error) {
      console.error('Preview error:', error);
      toast.error('Failed to generate preview');
    } finally {
      setIsLoadingPreview(false);
      setProcessingStatus('');
    }
  };

  const processFile = async () => {
    if (!file) return;

    // If manual processing is selected, open the manual editor
    if (processingMethod === 'manual') {
      setShowManualEditor(true);
      return;
    }

    setIsProcessing(true);
    setProcessingStatus('Processing PDF with advanced AI...');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sessionId', sessionId);
      formData.append('processingMethod', processingMethod);
      formData.append('documentType', documentType);

      const response = await fetch('/api/process-advanced-pdf', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        const contentDisposition = response.headers.get('Content-Disposition');
        const filename = contentDisposition
          ? contentDisposition.split('filename=')[1].replace(/"/g, '')
          : `${file.name.replace('.pdf', '')}_financial_extracted.xlsx`;
        
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        const processingTime = response.headers.get('X-Processing-Time');
        const processingMethod = response.headers.get('X-Processing-Method');

        toast.success(
          `PDF processed successfully! Method: ${processingMethod}. Processing time: ${processingTime}ms`,
          { duration: 6000 }
        );
        
        // Reset form
        setFile(null);
        setPreview(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        const error = await response.json();
        toast.error(error.error || 'Processing failed');
        
        if (error.requiresManualExtraction) {
          toast.info('This document may require manual extraction. Try switching to manual mode.');
        }
      }
    } catch (error) {
      console.error('Processing error:', error);
      toast.error('Processing failed. Please try again.');
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  const handleManualSave = (tableData, tableName) => {
    setExtractedData({ tableData, tableName });
    setShowManualEditor(false);
    toast.success('Manual data extraction completed!');
  };

  const handleManualCancel = () => {
    setShowManualEditor(false);
  };

  const getProcessingMethodIcon = (method) => {
    switch (method) {
      case 'auto': return <Zap className="w-4 h-4" />;
      case 'text': return <FileText className="w-4 h-4" />;
      case 'ocr': return <Image className="w-4 h-4" />;
      case 'manual': return <Edit3 className="w-4 h-4" />;
      default: return <Settings className="w-4 h-4" />;
    }
  };

  if (showManualEditor) {
    return (
      <ManualTableEditor
        documentType={documentType}
        onSave={handleManualSave}
        onCancel={handleManualCancel}
      />
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Upload Section */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Advanced PDF to Excel Converter
        </h2>

        {/* Development Mode Banner */}
        <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-lg">
          <div className="flex items-center justify-center gap-2 mb-2">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <span className="font-bold text-green-800 text-xl">DEVELOPMENT MODE</span>
          </div>
          <div className="text-center space-y-1">
            <p className="text-green-700 font-medium">✅ Bank & Financial Document Support</p>
            <p className="text-blue-700 font-medium">✅ Advanced OCR for Scanned PDFs</p>
            <p className="text-purple-700 font-medium">✅ Manual Table Editor</p>
            <p className="text-orange-700 font-medium">✅ 50MB file limit, No authentication</p>
          </div>
        </div>

        {/* Processing Method Selection */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-3">Processing Method:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {processingMethods.map((method) => (
              <div
                key={method.value}
                className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  processingMethod === method.value
                    ? 'border-blue-500 bg-blue-100'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setProcessingMethod(method.value)}
              >
                <div className="flex items-center gap-2 mb-1">
                  {getProcessingMethodIcon(method.value)}
                  <span className="font-medium text-gray-900">{method.label}</span>
                </div>
                <p className="text-sm text-gray-600">{method.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Document Type Selection */}
        <div className="mb-6 p-4 bg-purple-50 rounded-lg">
          <h3 className="font-semibold text-purple-900 mb-3">Document Type:</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
            {documentTypes.map((type) => (
              <button
                key={type.value}
                onClick={() => setDocumentType(type.value)}
                className={`p-2 rounded-lg text-sm transition-all ${
                  documentType === type.value
                    ? 'bg-purple-200 text-purple-900 border-2 border-purple-500'
                    : 'bg-purple-100 text-purple-800 hover:bg-purple-150'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>
        
        {/* Supported Formats Info */}
        <div className="mb-6 p-4 bg-green-50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-5 h-5 text-green-600" />
            <span className="font-semibold text-green-900">Enhanced Support For:</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-green-800">
            {supportedFormats.map((format, index) => (
              <div key={index} className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                {format}
              </div>
            ))}
          </div>
        </div>

        {/* Drop Zone */}
        <div
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileInputChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          
          <div className="space-y-4">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <div>
              <p className="text-lg font-medium text-gray-900">
                Drop your PDF file here or click to browse
              </p>
              <p className="text-sm text-gray-500">
                Advanced AI-powered extraction for financial documents with OCR support
              </p>
              <p className="text-xs text-blue-600 mt-1">
                ✓ Auto-detect text/image PDFs ✓ Bank statements ✓ Financial reports ✓ Manual backup
              </p>
            </div>
          </div>
        </div>

        {/* Selected File */}
        {file && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-red-500" />
                <div>
                  <p className="font-medium text-gray-900">{file.name}</p>
                  <p className="text-sm text-gray-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB • {documentType} • {processingMethod}
                  </p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={generatePreview}
                  disabled={isLoadingPreview}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-100 rounded-md hover:bg-blue-200 disabled:opacity-50"
                >
                  <Eye className="w-4 h-4" />
                  {isLoadingPreview ? 'Loading...' : 'Preview'}
                </button>
                
                <button
                  onClick={processFile}
                  disabled={isProcessing}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {processingMethod === 'manual' ? <Edit3 className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                  {isProcessing ? 'Processing...' : processingMethod === 'manual' ? 'Manual Edit' : 'Convert'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Processing Status */}
        {processingStatus && (
          <div className="mt-4 flex items-center gap-2 text-blue-600">
            <Clock className="w-4 h-4 animate-spin" />
            <span>{processingStatus}</span>
          </div>
        )}
      </div>

      {/* Enhanced Preview Section */}
      {preview && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            📊 Advanced Document Analysis
          </h3>
          
          {/* Processing Status */}
          <div className="mb-6 p-4 bg-green-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-semibold text-green-900">
                Document processed successfully - Method: {preview.processingMethod?.toUpperCase() || 'AUTO'}
              </span>
            </div>
            <div className="text-sm text-green-800 space-y-1">
              <div>Processing Time: {preview.processingTime}ms</div>
              <div>Document Type: {preview.documentType || 'General'}</div>
              <div>Extraction Quality: {preview.metadata?.extractionQuality || 'Standard'}</div>
            </div>
          </div>

          {/* Extraction Summary */}
          {preview?.previewData && (
            <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600">{preview.previewData.totalPages || 0}</div>
                <div className="text-sm text-blue-800">Pages</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">{preview.previewData.totalTextItems || 0}</div>
                <div className="text-sm text-green-800">Text Items</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-purple-600">{preview.previewData.totalTables || 0}</div>
                <div className="text-sm text-purple-800">Tables</div>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-orange-600">{preview.previewData.totalImages || 0}</div>
                <div className="text-sm text-orange-800">Images</div>
              </div>
            </div>
          )}

          {/* Financial Summary */}
          {preview.previewData?.financialSummary && (
            <div className="mb-6 p-4 bg-yellow-50 rounded-lg">
              <h4 className="font-semibold text-yellow-900 mb-3">💰 Financial Document Analysis</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Category:</span> {preview.previewData.financialSummary.documentCategory}
                </div>
                <div>
                  <span className="font-medium">Patterns Found:</span> {preview.previewData.financialSummary.detectedPatterns}
                </div>
                <div className="col-span-2">
                  <span className="font-medium">Recommendation:</span> {preview.previewData.financialSummary.recommendedAction}
                </div>
              </div>
            </div>
          )}

          {/* Sample Content Preview */}
          {preview.previewData?.sampleContent && preview.previewData.sampleContent.length > 0 && (
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 mb-3">📄 Sample Extracted Content</h4>
              <div className="p-4 bg-gray-50 rounded-lg max-h-60 overflow-y-auto">
                <div className="space-y-1">
                  {preview.previewData.sampleContent.map((text, index) => (
                    <div key={index} className="text-sm text-gray-700 border-b border-gray-200 pb-1">
                      <span className="text-xs text-gray-500 mr-2">[{index + 1}]</span>
                      {text}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Table Preview */}
          {preview.previewData?.tablePreview && preview.previewData.tablePreview.length > 0 && (
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 mb-3">📋 Detected Table Preview</h4>
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="space-y-2">
                  {preview.previewData.tablePreview.map((row, index) => (
                    <div key={index} className="text-sm font-mono text-blue-800 border-b border-blue-200 pb-1">
                      <span className="text-xs text-blue-500 mr-2">Row {index + 1}:</span>
                      {row}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 justify-center">
            <button
              onClick={processFile}
              disabled={isProcessing}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4" />
              {isProcessing ? 'Processing...' : 'Download Excel'}
            </button>
            
            <button
              onClick={() => setShowManualEditor(true)}
              className="flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
            >
              <Edit3 className="w-4 h-4" />
              Manual Editor
            </button>
          </div>
        </div>
      )}

      {/* Manual Extraction Results */}
      {extractedData && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            ✅ Manual Extraction Completed
          </h3>
          
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-semibold text-green-900">
                Table "{extractedData.tableName}" created successfully
              </span>
            </div>
            <div className="text-sm text-green-800">
              Rows: {extractedData.tableData.length} • Columns: {extractedData.tableData[0]?.length || 0}
            </div>
          </div>
          
          <div className="mt-4 text-center">
            <p className="text-gray-600 mb-4">Your manually extracted data has been saved. You can now download it as an Excel file.</p>
            <button
              onClick={() => setShowManualEditor(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Edit Table Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedFileUpload;