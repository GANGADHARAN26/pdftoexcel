'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  FileText, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

const ProcessingDashboard = ({ sessionId, onNewConversion }) => {
  const [recentConversions, setRecentConversions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/process-pdf?sessionId=${sessionId}`);
      const data = await response.json();
      
      if (data.success) {
        setRecentConversions(data.recentConversions);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    if (onNewConversion) {
        fetchDashboardData();
    }
  }, [onNewConversion, fetchDashboardData]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-IN', {
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

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-40 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Recent Conversions</h1>
        <button
          onClick={fetchDashboardData}
          className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-100 rounded-md hover:bg-blue-200 flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-lg">
        <div className="overflow-x-auto">
          {recentConversions.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No conversions yet. Upload your first PDF to get started!</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    File
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Extracted Data
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
                          <div className="text-xs text-gray-500">
                            {conversion.pagesProcessed} page{conversion.pagesProcessed !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(conversion.status)}
                        <div>
                          <span className={`text-sm font-medium ${
                            conversion.status === 'success' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {conversion.status}
                          </span>
                          {conversion.extractionQuality && (
                            <div className="text-xs text-gray-500 capitalize">
                              {conversion.extractionQuality} quality
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {conversion.metadata ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-4 text-xs">
                              <span className="text-blue-600">
                                📄 {conversion.metadata.totalTextItems || 0} text items
                              </span>
                              {conversion.metadata.totalTables > 0 && (
                                <span className="text-green-600">
                                  📋 {conversion.metadata.totalTables} tables
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-xs">
                              {conversion.metadata.totalImages > 0 && (
                                <span className="text-purple-600">
                                  🖼️ {conversion.metadata.totalImages} images
                                </span>
                              )}
                              {conversion.metadata.totalFormFields > 0 && (
                                <span className="text-orange-600">
                                  📝 {conversion.metadata.totalFormFields} forms
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-500 text-xs">No metadata</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        {conversion.processingTime}ms
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(conversion.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProcessingDashboard;