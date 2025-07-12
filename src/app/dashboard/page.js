'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FileText, Calendar, Clock, TrendingUp, User, Crown } from 'lucide-react';
import FileUpload from '../../components/FileUpload';
import { formatDate, formatFileSize } from '../../lib/utils';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [userStats, setUserStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/');
      return;
    }

    fetchUserStats();
  }, [session, status, router]);

  const fetchUserStats = async () => {
    try {
      const response = await fetch('/api/user/stats');
      if (response.ok) {
        const data = await response.json();
        setUserStats(data);
      }
    } catch (error) {
      console.error('Error fetching user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadComplete = () => {
    fetchUserStats(); // Refresh stats after upload
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600">Welcome back, {session.user.name}!</p>
            </div>
            {userStats?.user?.isSubscribed && (
              <div className="flex items-center space-x-2 bg-yellow-50 text-yellow-700 px-4 py-2 rounded-lg">
                <Crown className="h-5 w-5" />
                <span className="font-medium">Pro Member</span>
              </div>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        {userStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Today&apos;s Usage</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {userStats.usage.today}
                  </p>
                </div>
                <div className="bg-blue-100 rounded-full p-3">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm text-gray-600">
                  {userStats.usage.remainingToday === 'Unlimited' 
                    ? 'Unlimited remaining' 
                    : `${userStats.usage.remainingToday} remaining`}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">This Month</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {userStats.usage.thisMonth}
                  </p>
                </div>
                <div className="bg-green-100 rounded-full p-3">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Conversions</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {userStats.usage.total}
                  </p>
                </div>
                <div className="bg-purple-100 rounded-full p-3">
                  <FileText className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Account Status</p>
                  <p className="text-sm font-bold text-gray-900">
                    {userStats.user.isSubscribed ? 'Premium' : 'Free'}
                  </p>
                </div>
                <div className="bg-yellow-100 rounded-full p-3">
                  <User className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
              {userStats.user.subscriptionEndDate && (
                <div className="mt-4">
                  <p className="text-sm text-gray-600">
                    Expires: {formatDate(userStats.user.subscriptionEndDate)}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Convert New Document
          </h2>
          <FileUpload onUploadComplete={handleUploadComplete} />
        </div>

        {/* Conversion History */}
        {userStats?.conversions && userStats.conversions.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Recent Conversions
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">File Name</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Size</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Processing Time</th>
                  </tr>
                </thead>
                <tbody>
                  {userStats.conversions.map((conversion) => (
                    <tr key={conversion.id} className="border-b border-gray-100">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-blue-600" />
                          <span className="text-sm text-gray-900">
                            {conversion.originalFileName}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {formatFileSize(conversion.fileSize)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          conversion.status === 'success' 
                            ? 'bg-green-100 text-green-800' 
                            : conversion.status === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {conversion.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {formatDate(conversion.createdAt)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{(conversion.processingTime / 1000).toFixed(1)}s</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Upgrade CTA for free users */}
        {!userStats?.user?.isSubscribed && (
          <div className="mt-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
            <h3 className="text-xl font-semibold mb-2">Upgrade to Premium</h3>
            <p className="mb-4">
              Get unlimited conversions, priority processing, and advanced features.
            </p>
            <button
              onClick={() => router.push('/pricing')}
              className="bg-white text-blue-600 px-6 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors"
            >
              View Plans
            </button>
          </div>
        )}
      </div>
    </div>
  );
}