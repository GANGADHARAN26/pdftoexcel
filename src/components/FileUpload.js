'use client';

import { useState, useRef } from 'react';
import { Upload, FileText, X, Download } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import { formatFileSize, generateSessionId } from '../lib/utils';

export default function FileUpload({ onUploadComplete }) {
  const { data: session } = useSession();
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0); // Kept for potential future use
  const [sessionId] = useState(() => generateSessionId());
  const fileInputRef = useRef(null);

  const handleFileSelect = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        toast.error('Please select a PDF file');
        return;
      }
      
      // DEVELOPMENT: Increased file size limit to 50MB for testing
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (selectedFile.size > maxSize) {
        toast.error(`File size must be less than ${maxSize / 1024 / 1024}MB`);
        return;
      }
      
      setFile(selectedFile);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect({ target: { files: [droppedFile] } });
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);
    const toastId = toast.loading('Starting conversion...');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sessionId', sessionId);

      const response = await fetch('/api/process-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Conversion failed');
      }

      toast.loading('Downloading results...', { id: toastId });

      const blob = await response.blob();
      const contentDisposition = response.headers.get('content-disposition');
      let fileName = `${file.name.replace('.pdf', '')}_converted.xlsx`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) {
          fileName = match[1];
        }
      }
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('PDF converted successfully! All data, tables, and content extracted to multiple worksheets.', { id: toastId });
      setFile(null);
      
      if (onUploadComplete) {
        onUploadComplete(sessionId);
      }
    } catch (error) {
      console.error('Conversion error:', error);
      toast.error(error.message || 'Conversion failed', { id: toastId });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const removeFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {!file ? (
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors cursor-pointer"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-lg font-medium text-gray-700 mb-2">
            Drop your PDF file here or click to browse
          </p>
          <p className="text-sm text-gray-500">
            Comprehensive PDF to Excel Converter - Extracts ALL data, tables, and content
          </p>
          <p className="text-xs text-blue-600 mt-1">
            ✓ All text content ✓ Tables detected ✓ Form fields ✓ Multiple worksheets (Max 50MB)
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <FileText className="h-8 w-8 text-blue-600" />
              <div>
                <p className="font-medium text-gray-900">{file.name}</p>
                <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
              </div>
            </div>
            <button
              onClick={removeFile}
              className="text-gray-400 hover:text-red-500 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {isUploading && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Converting...</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `100%` }} // Indeterminate progress
                ></div>
              </div>
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={isUploading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
          >
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Converting...</span>
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                <span>Convert to Excel</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}