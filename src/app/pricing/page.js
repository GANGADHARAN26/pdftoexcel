'use client';

import { useSession } from 'next-auth/react';
import PricingCard from '../../components/PricingCard';
import { SUBSCRIPTION_PLANS } from '../../lib/stripe';

export default function PricingPage() {
  const { data: session } = useSession();

  const freePlan = {
    name: 'Free',
    price: 0,
    features: [
      '5 conversions every 24 hours',
      'Basic PDF to Excel conversion',
      'Anonymous conversions',
      'Standard support'
    ]
  };

  const registeredPlan = {
    name: 'Registered',
    price: 0,
    features: [
      '5 conversions every 24 hours',
      'PDF to Excel conversion',
      'Save conversion history',
      'Email support',
      'Priority processing'
    ]
  };

  return (
    <div className="py-16 px-4 sm:px-6 lg:px-8 min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* Development Mode Banner */}
        <div className="mb-12 p-6 bg-gradient-to-r from-green-100 to-blue-100 border-2 border-green-300 rounded-lg text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="text-2xl">🚀</span>
            <span className="font-bold text-green-800 text-2xl">DEVELOPMENT MODE</span>
          </div>
          <p className="text-lg text-green-700 font-medium mb-2">
            All PDF conversion features are currently FREE and unlimited!
          </p>
          <p className="text-green-600">
            No sign-up required • No payment needed • Full access to all features
          </p>
        </div>

        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Select the perfect plan for your document conversion needs
          </p>
          <p className="text-lg text-blue-600 font-medium mt-2">
            (Currently all features are free in development mode)
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
          {/* Free Plan */}
          <PricingCard
            plan={freePlan}
            planId="free"
          />

          {/* Registered Plan */}
          <PricingCard
            plan={registeredPlan}
            planId="registered"
          />

          {/* Basic Plan */}
          <PricingCard
            plan={SUBSCRIPTION_PLANS.basic}
            planId="basic"
            isPopular={true}
          />

          {/* Pro Plan */}
          <PricingCard
            plan={SUBSCRIPTION_PLANS.pro}
            planId="pro"
          />
        </div>

        {/* FAQ Section */}
        <div className="mt-20">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Frequently Asked Questions
          </h2>
          
          <div className="max-w-3xl mx-auto">
            <div className="space-y-6">
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-2">
                  How secure is my data?
                </h3>
                <p className="text-gray-600">
                  We use enterprise-grade encryption and comply with strict security standards. 
                  Your files are processed securely and deleted after conversion.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-2">
                  What file formats are supported?
                </h3>
                <p className="text-gray-600">
                  We currently support PDF files containing tables, forms, reports,
                  and other structured data. Output is provided in Excel (.xlsx) format.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Can I cancel my subscription anytime?
                </h3>
                <p className="text-gray-600">
                  Yes, you can cancel your subscription at any time. You&apos;ll continue to have 
                  access to premium features until your current billing period ends.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-2">
                  What if the conversion doesn&apos;t work correctly?
                </h3>
                <p className="text-gray-600">
                  We&apos;re continuously improving our algorithms. If a file doesn&apos;t convert to your 
                  expectations, please contact us and we&apos;ll work to fix it.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-20 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Need More Than What&apos;s Listed?
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            We provide bespoke services for clients who have other document formats to process
          </p>
          <a
            href="mailto:contact@pdfconverter.com"
            className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium inline-block"
          >
            Contact Us
          </a>
        </div>
      </div>
    </div>
  );
}