'use client';

import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  PieChart, 
  TrendingUp, 
  FileText, 
  Clock, 
  Landmark,
  CheckCircle,
  AlertTriangle,
  Download,
  Eye
} from 'lucide-react';

const ProcessingDashboard = ({ sessionId }) => {
  const [stats, setStats] = useState(null);
  const [recentConversions, setRecentConversions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [sessionId]);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch(`/api/process-pdf?sessionId=${sessionId}`);
      const data = await response.json();
      
      if (data.success) {
        setRecentConversions(data.recentConversions);
        generateStats(data.recentConversions);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateStats = (conversions) => {
    const bankTypes = {};
    const statusCount = { success: 0, failed: 0 };
    let totalTransactions = 0;
    let totalProcessingTime = 0;

    conversions.forEach(conversion => {
      // Bank distribution
      const bank = conversion.bankType || 'Unknown';
      bankTypes[bank] = (bankTypes[bank] || 0) + 1;

      // Status count
      statusCount[conversion.status]++;

      // Aggregates
      totalTransactions += conversion.transactionCount || 0;
      totalProcessingTime += conversion.processingTime || 0;
    });

    setStats({
      bankDistribution: Object.entries(bankTypes).map(([bank, count]) => ({
        bank,
        count,
        percentage: Math.round((count / conversions.length) * 100)
      })),
      successRate: conversions.length ? Math.round((statusCount.success / conversions.length) * 100) : 0,
      totalConversions: conversions.length,
      totalTransactions,
      avgProcessingTime: conversions.length ? Math.round(totalProcessingTime / conversions.length) : 0
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status) => {
    return status === 'success' 
      ? <CheckCircle className="w-4 h-4 text-green-500" />
      : <AlertTriangle className="w-4 h-4 text-red-500" />;
  };

  const getBankIcon = (bankType) => {
    const colors = {
      'SBI': 'text-blue-600',
      'HDFC': 'text-red-600',
      'ICICI': 'text-orange-600',
      'AXIS': 'text-purple-600',
      'FEDERAL': 'text-green-600',
      'COMMERCE': 'text-indigo-600'
    };
    
    return <Landmark className={`w-4 h-4 ${colors[bankType] || 'text-gray-600'}`} />;
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Processing Dashboard</h1>
        <button
          onClick={fetchDashboardData}
          className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-100 rounded-md hover:bg-blue-200"
        >
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Conversions</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalConversions}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold text-green-600">{stats.successRate}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                <p className="text-2xl font-bold text-purple-600">{stats.totalTransactions.toLocaleString()}</p>
              </div>
              <BarChart className="w-8 h-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Processing Time</p>
                <p className="text-2xl font-bold text-orange-600">{stats.avgProcessingTime}ms</p>
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
          </div>
        </div>
      )}

      {/* Bank Distribution */}
      {stats && stats.bankDistribution.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Bank Distribution</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.bankDistribution.map(({ bank, count, percentage }) => (
              <div key={bank} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                <div className="flex items-center gap-2">
                  {getBankIcon(bank)}
                  <span className="font-medium text-gray-900">{bank}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">{count}</p>
                  <p className="text-xs text-gray-500">{percentage}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Conversions */}
      <div className="bg-white rounded-lg shadow-lg">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Recent Conversions</h2>
        </div>
        
        {recentConversions.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No conversions yet. Upload your first PDF to get started!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    File
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transactions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Processing Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentConversions.map((conversion) => (
                  <tr key={conversion._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FileText className="w-5 h-5 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                            {conversion.originalFileName}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getBankIcon(conversion.bankType)}
                        <span className="text-sm text-gray-900">
                          {conversion.bankType || 'Unknown'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {conversion.transactionCount || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(conversion.status)}
                        <span className={`text-sm font-medium ${
                          conversion.status === 'success' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {conversion.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {conversion.processingTime}ms
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(conversion.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProcessingDashboard;