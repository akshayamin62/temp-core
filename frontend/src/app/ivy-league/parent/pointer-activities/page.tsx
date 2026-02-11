'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import axios from 'axios';
import { useSearchParams } from 'next/navigation';
import { BACKEND_URL } from '@/lib/ivyApi';

interface ActivityRecord {
  selectionId: string;
  pointerNo: number;
  isVisibleToStudent: boolean;
  suggestion: {
    _id: string;
    title: string;
    description: string;
    tags: string[];
  };
  submission: {
    _id: string;
    files: string[];
    remarks?: string;
    submittedAt: string;
  } | null;
  evaluation: {
    _id: string;
    score: number;
    feedback?: string;
    evaluatedAt: string;
  } | null;
}

interface ActivitiesResponse {
  studentIvyServiceId: string;
  studentId: string;
  activities: ActivityRecord[];
}

const pointerLabel = (pointerNo: number) => {
  switch (pointerNo) {
    case 2:
      return 'Pointer 2: Spike in One Area';
    case 3:
      return 'Pointer 3: Leadership & Initiative';
    case 4:
      return 'Pointer 4: Global & Social Impact';
    default:
      return `Pointer ${pointerNo}`;
  }
};

function ParentPointerActivitiesContent() {
  const searchParams = useSearchParams();
  const studentIdFromUrl = searchParams.get('studentId') || '';
  const studentIvyServiceIdFromUrl = searchParams.get('studentIvyServiceId') || '';

  const [studentId, setStudentId] = useState(studentIdFromUrl);
  const [activitiesData, setActivitiesData] = useState<ActivitiesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const apiBase = useMemo(() => BACKEND_URL, []);

  const fetchActivities = async () => {
    if (!studentId) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await axios.get<{ success: boolean; data: ActivitiesResponse }>(
        `${apiBase}/api/ivy/pointer/activity/student/${studentId}`,
        { params: { studentIvyServiceId: studentIvyServiceIdFromUrl || undefined } }
      );
      if (res.data.success) {
        setActivitiesData(res.data.data);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to load activities';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setStudentId(studentIdFromUrl);
  }, [studentIdFromUrl]);

  useEffect(() => {
    if (studentId) {
      fetchActivities();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  const downloadFile = async (url: string) => {
    try {
      const response = await fetch(`${apiBase}${url}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      const fileName = url.split('/').pop() || 'proof';
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download failed:', error);
      window.open(`${apiBase}${url}`, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-md p-8 space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Student Activities (Pointers 2 / 3 / 4)</h1>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Student ID</label>
            <input
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="studentId"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <button
          onClick={fetchActivities}
          disabled={!studentId || loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>

        {!studentId && <p className="text-sm text-red-600">Enter studentId to view activities.</p>}
        {loading && <p className="text-sm text-gray-500">Loading activities...</p>}

        {!loading && activitiesData && activitiesData.activities.length === 0 && (
          <p className="text-sm text-gray-500">No activities assigned yet.</p>
        )}

        {!loading &&
          activitiesData &&
          activitiesData.activities.map((act) => (
            <div key={act.selectionId} className="border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase text-gray-500">{pointerLabel(act.pointerNo)}</p>
                  <h3 className="text-lg font-semibold text-gray-900">{act.suggestion?.title}</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap mt-1">
                    {act.suggestion?.description}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {act.suggestion?.tags?.map((tag, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Visible to student: {act.isVisibleToStudent ? 'Yes' : 'No'}
                  </p>
                </div>
                {act.submission ? (
                  <span className="text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded">
                    Proof submitted
                  </span>
                ) : (
                  <span className="text-xs font-medium text-orange-700 bg-orange-50 border border-orange-200 px-2 py-1 rounded">
                    Pending submission
                  </span>
                )}
              </div>

              {act.submission && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3 space-y-2">
                  <p className="text-sm font-medium text-blue-900">Submission</p>
                  {act.submission.remarks && (
                    <p className="text-sm text-blue-800 whitespace-pre-wrap">{act.submission.remarks}</p>
                  )}
                  <ul className="text-sm text-blue-800 space-y-1">
                    {act.submission.files.map((file, idx) => (
                      <li key={idx}>
                        <button onClick={() => downloadFile(file)} className="underline hover:text-blue-900">
                          Proof {idx + 1}
                        </button>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-blue-700">
                    Submitted at: {new Date(act.submission.submittedAt).toLocaleString()}
                  </p>
                </div>
              )}

              {act.evaluation && (
                <div className="bg-green-50 border border-green-200 rounded-md p-3 space-y-2">
                  <p className="text-sm font-medium text-green-900">Evaluation</p>
                  <p className="text-2xl font-bold text-green-800">{act.evaluation.score}/10</p>
                  {act.evaluation.feedback && (
                    <p className="text-sm text-green-800 whitespace-pre-wrap">{act.evaluation.feedback}</p>
                  )}
                  <p className="text-xs text-green-700">
                    Updated: {new Date(act.evaluation.evaluatedAt).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          ))}

        {message && (
          <div
            className={`p-4 rounded-md ${message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
              }`}
          >
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ParentPointerActivitiesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-8">
            <div className="text-center text-gray-500">Loading...</div>
          </div>
        </div>
      }
    >
      <ParentPointerActivitiesContent />
    </Suspense>
  );
}


