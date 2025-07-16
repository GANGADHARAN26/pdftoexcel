'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Shield, Users, CheckCircle, FileText, Download, Upload, Zap, Database, Image } from 'lucide-react';
import AdvancedFileUpload from '../components/AdvancedFileUpload';
import Link from 'next/link';

export default function Home() {
  const { data: session } = useSession();
  const [sessionId, setSessionId] = useState(null);

  useEffect(() => {
    // Generate session ID for anonymous users
    const newSessionId = session?.user?.id || `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(newSessionId);
  }, [session]);
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <section className="pt-16 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Convert Finance PDFs to Excel
            <span className="text-blue-600"> With AI</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Advanced PDF converter for financial documents with OCR support, manual extraction, and AI-powered data recognition.
            Perfect for bank statements, reports, and scanned documents.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link href="/pricing" className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium">
              Get Started Free
            </Link>
            <Link href="#features" className="border border-gray-300 text-gray-700 px-8 py-3 rounded-lg hover:bg-gray-50 transition-colors font-medium">
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Upload Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Development Mode Banner */}
          <div className="mb-8 p-4 bg-green-100 border border-green-300 rounded-lg text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-bold text-green-800 text-lg">DEVELOPMENT MODE ACTIVE</span>
            </div>
            <p className="text-green-700">
              🚀 All restrictions removed • No sign-in required • Unlimited uploads • 50MB file limit
            </p>
          </div>

          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Advanced Financial PDF Processing
            </h2>
            <p className="text-lg text-gray-600">
              AI-powered extraction with OCR support and manual editing - No registration needed
            </p>
          </div>
          
          {sessionId && <AdvancedFileUpload sessionId={sessionId} user={session?.user} />}
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Why Choose Our Advanced PDF Converter?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Specialized for financial documents with multiple processing methods and manual backup options
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="bg-blue-100 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Database className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Financial Focus</h3>
              <p className="text-gray-600">
                Specialized templates and recognition patterns for bank statements, reports, invoices, and investment documents.
              </p>
            </div>

            <div className="text-center p-6">
              <div className="bg-green-100 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Image className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">OCR Support</h3>
              <p className="text-gray-600">
                Advanced OCR technology processes scanned documents and image-based PDFs with high accuracy.
              </p>
            </div>

            <div className="text-center p-6">
              <div className="bg-purple-100 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Zap className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Manual Backup</h3>
              <p className="text-gray-600">
                Built-in table editor for manual data extraction when automatic processing isn&apos;t sufficient.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-lg text-gray-600">
              Convert your PDF documents in three simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-600 text-white rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold mx-auto mb-4">
                1
              </div>
              <Upload className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Upload PDF</h3>
              <p className="text-gray-600">
                Select your PDF file and upload it securely to our platform
              </p>
            </div>

            <div className="text-center">
              <div className="bg-blue-600 text-white rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold mx-auto mb-4">
                2
              </div>
              <FileText className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">AI Processing</h3>
              <p className="text-gray-600">
                Auto-detects text/image PDFs and applies OCR when needed for maximum accuracy
              </p>
            </div>

            <div className="text-center">
              <div className="bg-blue-600 text-white rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold mx-auto mb-4">
                3
              </div>
              <Download className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Download Excel</h3>
              <p className="text-gray-600">
                Get your perfectly formatted Excel file ready for analysis
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-blue-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Convert Your PDFs?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of professionals who trust PDFConverter for their document processing needs
          </p>
          <Link href="/pricing" className="bg-white text-blue-600 px-8 py-3 rounded-lg hover:bg-gray-50 transition-colors font-medium inline-block">
            View Pricing Plans
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <FileText className="h-8 w-8 text-blue-500" />
            <span className="text-xl font-bold">PDFConverter</span>
          </div>
          <p className="text-gray-400 mb-4">
            The world&apos;s most trusted PDF converter
          </p>
          <div className="flex justify-center space-x-6">
            <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-gray-400 hover:text-white transition-colors">
              Terms of Service
            </Link>
            <Link href="/contact" className="text-gray-400 hover:text-white transition-colors">
              Contact Us
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
