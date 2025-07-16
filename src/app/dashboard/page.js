'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import ProcessingDashboard from '../../components/ProcessingDashboard';
import { generateSessionId } from '../../lib/utils';

export default function DashboardPage() {
  const { data: session } = useSession();
  const [sessionId, setSessionId] = useState(null);

  useEffect(() => {
    // Generate session ID for anonymous users or use user ID
    const newSessionId = session?.user?.id || `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(newSessionId);
  }, [session]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Processing Dashboard
          </h1>
          <p className="text-lg text-gray-600">
            View your recent PDF conversions and extraction results
          </p>
        </div>
        
        {sessionId && <ProcessingDashboard sessionId={sessionId} />}
      </div>
    </div>
  );
}