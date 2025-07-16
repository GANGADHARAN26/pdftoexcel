'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X, FileText } from 'lucide-react';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      {/* Development Mode Banner */}
      <div className="bg-green-600 text-white text-center py-1 text-sm font-medium">
        🚀 DEVELOPMENT MODE - Financial PDF AI with OCR & Manual Editor - No limits
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <FileText className="h-8 w-8 text-blue-600" />
              <span className="font-bold text-xl text-gray-900">
                FinancePDF.ai
              </span>
              <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full ml-2">
                DEV
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link href="/" className="text-gray-700 hover:text-blue-600 transition-colors">
              Home
            </Link>
            <Link href="/dashboard" className="text-gray-700 hover:text-blue-600 transition-colors">
              Dashboard
            </Link>
            <Link href="/pricing" className="text-gray-700 hover:text-blue-600 transition-colors">
              Pricing
            </Link>
            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
              No Auth Required
            </span>
          </nav>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-700 hover:text-blue-600"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <nav className="flex flex-col space-y-4">
              <Link href="/" className="text-gray-700 hover:text-blue-600">
                Home
              </Link>
              <Link href="/dashboard" className="text-gray-700 hover:text-blue-600">
                Dashboard
              </Link>
              <Link href="/pricing" className="text-gray-700 hover:text-blue-600">
                Pricing
              </Link>
              <div className="bg-green-100 text-green-700 px-3 py-2 rounded-lg text-sm font-medium text-center">
                🚀 Development Mode - No Authentication Required
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}