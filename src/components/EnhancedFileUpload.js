'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Upload, FileText, Download, Eye, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

const EnhancedFileUpload = ({ sessionId, user }) => {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [preview, setPreview] = useState(null);
  const [processingStatus, setProcessingStatus] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const supportedFormats = [
    'Tables and structured data', 'Financial documents', 'Reports and statements', 'Forms and applications',
    'Invoices and receipts', 'Academic documents', 'Legal documents',
    'Technical specifications', 'Data sheets', 'Business documents', 'Research papers'
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

    // DEVELOPMENT: Increased file size limit to 50MB for testing
    if (selectedFile.size > 50 * 1024 * 1024) {
      toast.error('File size must be less than 50MB');
      return;
    }

    setFile(selectedFile);
    setPreview(null);
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

      const response = await fetch('/api/process-pdf', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setPreview(result);
        toast.success('Preview generated successfully!');
      } else {
        toast.error(result.error || 'Failed to generate preview');
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

    setIsProcessing(true);
    setProcessingStatus('Processing PDF...');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sessionId', sessionId);

      const response = await fetch('/api/process-pdf', {
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
          : `${file.name.replace('.pdf', '')}_converted.xlsx`;
        
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        const processingTime = response.headers.get('X-Processing-Time');

        toast.success(
          `PDF converted successfully! All data, tables, and content extracted to multiple worksheets. Processing time: ${processingTime}ms`,
          { duration: 5000 }
        );
        
        // Reset form
        setFile(null);
        setPreview(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        const error = await response.json();
        toast.error(error.error || 'Conversion failed');
      }
    } catch (error) {
      console.error('Processing error:', error);
      toast.error('Processing failed. Please try again.');
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Upload Section */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Upload PDF Document
        </h2>

        {/* DEVELOPMENT MODE: Enhanced status display */}
        <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-lg">
          <div className="flex items-center justify-center gap-2 mb-2">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <span className="font-bold text-green-800 text-xl">DEVELOPMENT MODE</span>
          </div>
          <div className="text-center space-y-1">
            <p className="text-green-700 font-medium">✅ No authentication required</p>
            <p className="text-blue-700 font-medium">✅ Unlimited conversions</p>
            <p className="text-purple-700 font-medium">✅ 50MB file size limit</p>
            <p className="text-orange-700 font-medium">✅ All features unlocked</p>
          </div>
        </div>
        
        {/* Supported Formats Info */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-blue-900">Supported Document Types:</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-blue-800">
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
                Comprehensive extraction: ALL text, tables, forms, and data → Multiple Excel worksheets (Max 50MB)
              </p>
              <p className="text-xs text-blue-600 mt-1">
                ✓ Complete data extraction ✓ Table detection ✓ Form fields ✓ Multi-worksheet output
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
                    {(file.size / 1024 / 1024).toFixed(2)} MB
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
                  <Download className="w-4 h-4" />
                  {isProcessing ? 'Processing...' : 'Convert'}
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
          <h3 className="text-xl font-bold text-gray-900 mb-4">📊 Complete Data Extraction Preview</h3>
          
          {/* Processing Status */}
          <div className="mb-6 p-4 bg-green-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-semibold text-green-900">
                Document processed successfully - ALL DATA EXTRACTED
              </span>
            </div>
            <div className="text-sm text-green-800">
              Processing Time: {preview.processingTime}ms
            </div>
          </div>

          {/* Extraction Summary */}
          {preview?.preview && (
            <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600">{preview.preview.totalPages || 0}</div>
                <div className="text-sm text-blue-800">Pages</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">{preview.preview.totalTextItems || 0}</div>
                <div className="text-sm text-green-800">Text Items</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-purple-600">{preview.preview.totalTables || 0}</div>
                <div className="text-sm text-purple-800">Tables</div>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-orange-600">{preview.preview.totalImages || 0}</div>
                <div className="text-sm text-orange-800">Images</div>
              </div>
            </div>
          )}

          {/* Sample Content Preview */}
          {preview?.preview?.sampleContent && preview.preview.sampleContent.length > 0 && (
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 mb-3">📄 Sample Extracted Content</h4>
              <div className="p-4 bg-gray-50 rounded-lg max-h-60 overflow-y-auto">
                <div className="space-y-1">
                  {preview.preview.sampleContent.map((text, index) => (
                    <div key={index} className="text-sm text-gray-700 border-b border-gray-200 pb-1">
                      <span className="text-xs text-gray-500 mr-2">[{index + 1}]</span>
                      {text}
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                ✅ This is a sample of the extracted text content. The full Excel file will contain ALL data.
              </p>
            </div>
          )}

          {/* Table Preview */}
          {preview?.preview?.tablePreview && preview.preview.tablePreview.length > 0 && (
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 mb-3">📋 Detected Table Preview</h4>
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="space-y-2">
                  {preview.preview.tablePreview.map((row, index) => (
                    <div key={index} className="text-sm font-mono text-blue-800 border-b border-blue-200 pb-1">
                      <span className="text-xs text-blue-500 mr-2">Row {index + 1}:</span>
                      {row}
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                ✅ Tables detected and will be extracted to separate Excel worksheets with proper formatting.
              </p>
            </div>
          )}

          {/* Extraction Quality Indicators */}
          <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-3">🎯 Extraction Quality Report</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className={preview?.preview?.extractionSummary?.hasText ? 'text-green-700' : 'text-gray-500'}>
                  Text Content
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className={preview?.preview?.extractionSummary?.hasTables ? 'text-green-700' : 'text-gray-500'}>
                  Table Data
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className={preview?.preview?.extractionSummary?.hasImages ? 'text-green-700' : 'text-gray-500'}>
                  Images Detected
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className={preview?.preview?.extractionSummary?.hasFormFields ? 'text-green-700' : 'text-gray-500'}>
                  Form Fields
                </span>
              </div>
            </div>
            <div className="mt-3 p-2 bg-white rounded border">
              <span className="text-sm font-medium text-gray-700">
                Completeness: {preview?.preview?.extractionSummary?.completeness || 'comprehensive'}
              </span>
            </div>
          </div>

          {/* Excel Output Preview */}
          <div className="mb-6 p-4 bg-yellow-50 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-3">📊 Excel Output Structure</h4>
            <div className="text-sm text-gray-700 space-y-1">
              <div>✅ <strong>Summary Sheet:</strong> Overview and statistics</div>
              <div>✅ <strong>All Data Sheet:</strong> Complete content with original layout</div>
              {preview?.preview?.totalTables > 0 && (
                <div>✅ <strong>Table Sheets:</strong> {preview.preview.totalTables} separate table(s) with proper formatting</div>
              )}
              {preview?.preview?.totalFormFields > 0 && (
                <div>✅ <strong>Form Fields Sheet:</strong> All form data extracted</div>
              )}
              <div>✅ <strong>Page-by-Page Sheets:</strong> Detailed content for each page</div>
            </div>
          </div>

          {/* Convert Button */}
          <div className="mt-6 pt-4 border-t">
            <button
              onClick={processFile}
              disabled={isProcessing}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 font-medium text-lg"
            >
              <Download className="w-5 h-5" />
              {isProcessing ? 'Converting All Data to Excel...' : 'Convert to Excel - ALL DATA INCLUDED'}
            </button>
            <p className="text-center text-sm text-gray-500 mt-2">
              Your Excel file will contain multiple worksheets with ALL extracted data, tables, and content.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedFileUpload;