'use client';

import { useState, useEffect, Suspense } from 'react';
import axios from 'axios';
import { useSearchParams } from 'next/navigation';
import { IVY_API_URL } from '@/lib/ivyApi';

function StudentInterestContent() {
  const searchParams = useSearchParams();
  const studentIvyServiceId = searchParams.get('studentIvyServiceId');

  const [studentInterest, setStudentInterest] = useState<string>('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch current student interest on mount
  useEffect(() => {
    if (!studentIvyServiceId) {
      setMessage({ type: 'error', text: 'Student Ivy Service ID is required' });
      return;
    }

    const fetchStudentInterest = async () => {
      setLoading(true);
      try {
        const response = await axios.get(
          `${IVY_API_URL}/student-interest?studentIvyServiceId=${studentIvyServiceId}`
        );

        if (response.data.success) {
          setStudentInterest(response.data.data.studentInterest || '');
          if (response.data.data.updatedAt) {
            setLastUpdated(new Date(response.data.data.updatedAt));
          }
        }
      } catch (error: any) {
        console.error('Error fetching student interest:', error);
        const errorMessage = error.response?.data?.message || 'Failed to load student interest';
        setMessage({ type: 'error', text: errorMessage });
      } finally {
        setLoading(false);
      }
    };

    fetchStudentInterest();
  }, [studentIvyServiceId]);

  const handleSave = async () => {
    if (!studentIvyServiceId) {
      setMessage({ type: 'error', text: 'Student Ivy Service ID is required' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const response = await axios.patch(`${IVY_API_URL}/student-interest`, {
        studentIvyServiceId,
        studentInterest,
      });

      if (response.data.success) {
        setMessage({ type: 'success', text: response.data.message || 'Student interest saved successfully!' });
        if (response.data.data.updatedAt) {
          setLastUpdated(new Date(response.data.data.updatedAt));
        }
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to save student interest';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setSaving(false);
    }
  };

  const formatTimestamp = (date: Date | null): string => {
    if (!date) return 'Never';
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  if (!studentIvyServiceId) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8">
          <div className="bg-red-50 text-red-800 border border-red-200 p-4 rounded-md">
            Student Ivy Service ID is required. Please provide studentIvyServiceId as a query parameter.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Student Primary Interest
        </h1>

        <div className="space-y-6">
          {/* Multiline Text Area */}
          <div>
            <label htmlFor="studentInterest" className="block text-sm font-medium text-gray-700 mb-2">
              Student Primary Interest
            </label>
            <textarea
              id="studentInterest"
              value={studentInterest}
              onChange={(e) => setStudentInterest(e.target.value)}
              disabled={loading || saving}
              rows={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white disabled:opacity-50 disabled:cursor-not-allowed resize-y"
              placeholder="Enter student primary interest here..."
            />
          </div>

          {/* Last Updated Timestamp */}
          {lastUpdated && (
            <div className="text-sm text-gray-500">
              Last updated: {formatTimestamp(lastUpdated)}
            </div>
          )}

          {/* Save Button */}
          <div>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading || saving}
              className="bg-blue-600 text-white py-2 px-6 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>

          {/* Success or Error Message */}
          {message && (
            <div
              className={`p-4 rounded-md ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="text-sm text-gray-500">
              Loading student interest...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function StudentInterestPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8">
          <div className="text-center text-gray-500">Loading...</div>
        </div>
      </div>
    }>
      <StudentInterestContent />
    </Suspense>
  );
}

