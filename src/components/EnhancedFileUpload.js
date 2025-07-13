'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Upload, FileText, Download, Eye, AlertCircle, CheckCircle, Clock, Landmark } from 'lucide-react';
import toast from 'react-hot-toast';

const EnhancedFileUpload = ({ sessionId }) => {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [preview, setPreview] = useState(null);
  const [processingStatus, setProcessingStatus] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const supportedBanks = [
    'State Bank of India (SBI)', 'HDFC Bank', 'ICICI Bank', 'Axis Bank',
    'Punjab National Bank (PNB)', 'Kotak Mahindra Bank', 'Canara Bank',
    'Bank of India', 'Union Bank', 'Federal Bank', 'Commerce Bank'
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

    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
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

        const bankType = response.headers.get('X-Bank-Type');
        const transactionCount = response.headers.get('X-Transaction-Count');
        const processingTime = response.headers.get('X-Processing-Time');

        toast.success(
          `Successfully converted! Bank: ${bankType}, Transactions: ${transactionCount}, Time: ${processingTime}ms`
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
          Upload Financial PDF
        </h2>
        
        {/* Supported Banks Info */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Landmark className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-blue-900">Supported Banks:</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-blue-800">
            {supportedBanks.map((bank, index) => (
              <div key={index} className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                {bank}
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
                Supports bank statements, financial documents (Max 10MB)
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

      {/* Preview Section */}
      {preview && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Document Preview</h3>
          
          {/* Bank Detection */}
          <div className="mb-6 p-4 bg-green-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-semibold text-green-900">
                Detected Bank: {preview.bankType}
              </span>
            </div>
            <div className="text-sm text-green-800">
              Processing Time: {preview.processingTime}ms
            </div>
          </div>

          {/* Account Information */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900">Account Information</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Account Number:</span>
                  <span className="font-medium">{preview.metadata.accountNumber || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Account Holder:</span>
                  <span className="font-medium">{preview.metadata.accountHolder || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Statement Period:</span>
                  <span className="font-medium">{preview.metadata.statementPeriod || 'N/A'}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900">Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Transactions:</span>
                  <span className="font-medium">{preview.metadata.transactionCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Opening Balance:</span>
                  <span className="font-medium">₹{preview.metadata.openingBalance?.toLocaleString() || '0'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Closing Balance:</span>
                  <span className="font-medium">₹{preview.metadata.closingBalance?.toLocaleString() || '0'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sample Transactions */}
          {preview.preview.transactionSample && preview.preview.transactionSample.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Sample Transactions</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Debit</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Credit</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {preview.preview.transactionSample.slice(0, 5).map((transaction, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-900">{transaction.date}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 max-w-xs truncate">
                          {transaction.description}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 text-right">
                          {transaction.debit ? `₹${transaction.debit.toLocaleString()}` : '-'}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 text-right">
                          {transaction.credit ? `₹${transaction.credit.toLocaleString()}` : '-'}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 text-right">
                          ₹{transaction.balance.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {preview.preview.totalTransactions > 5 && (
                <p className="text-sm text-gray-500 mt-2">
                  Showing 5 of {preview.preview.totalTransactions} transactions
                </p>
              )}
            </div>
          )}

          {/* Convert Button */}
          <div className="mt-6 pt-4 border-t">
            <button
              onClick={processFile}
              disabled={isProcessing}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 font-medium"
            >
              <Download className="w-5 h-5" />
              {isProcessing ? 'Converting...' : 'Convert to Excel'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedFileUpload;