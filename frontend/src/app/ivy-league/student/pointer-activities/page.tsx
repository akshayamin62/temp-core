'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import axios from 'axios';
import { useSearchParams } from 'next/navigation';
import ActivitySelector from '@/components/ActivitySelector';
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
    pointerNo: number;
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

function StudentPointerActivitiesContent() {
  const searchParams = useSearchParams();
  const studentIvyServiceIdFromUrl = searchParams.get('studentIvyServiceId') || '';
  const studentIdFromUrl = searchParams.get('studentId') || '1'; // TODO: auth

  const [studentIvyServiceId, setStudentIvyServiceId] = useState(studentIvyServiceIdFromUrl);
  const [studentId, setStudentId] = useState(studentIdFromUrl);
  const [activitiesData, setActivitiesData] = useState<ActivitiesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [remarksDraft, setRemarksDraft] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pointerScores, setPointerScores] = useState<{ [key: number]: number | null }>({ 2: null, 3: null, 4: null });

  const apiBase = useMemo(() => BACKEND_URL, []);

  const fetchActivities = async () => {
    if (!studentIvyServiceId) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await axios.get<{ success: boolean; data: ActivitiesResponse }>(
        `${apiBase}/api/pointer/activity/student`,
        { params: { studentIvyServiceId } },
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
    setStudentIvyServiceId(studentIvyServiceIdFromUrl);
    setStudentId(studentIdFromUrl);
  }, [studentIvyServiceIdFromUrl, studentIdFromUrl]);

  useEffect(() => {
    if (studentIvyServiceId) {
      fetchActivities();
      fetchPointerScores();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentIvyServiceId]);

  const fetchPointerScores = async () => {
    if (!studentIvyServiceId) return;
    try {
      const scores: { [key: number]: number | null } = { 2: null, 3: null, 4: null };
      for (const pointerNo of [2, 3, 4]) {
        const res = await axios.get(
          `${apiBase}/api/pointer/activity/score/${studentIvyServiceId}/${pointerNo}`,
        );
        if (res.data.success && res.data.data !== undefined) {
          scores[pointerNo] = res.data.data;
        }
      }
      setPointerScores(scores);
    } catch (error) {
      console.error('Error fetching pointer scores:', error);
    }
  };

  const downloadFile = async (url: string) => {
    try {
      const response = await fetch(`${apiBase}${url}`);
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

  const handleUpload = async (selectionId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!studentIvyServiceId || !studentId) {
      setMessage({ type: 'error', text: 'Student ID and Ivy Service ID are required' });
      return;
    }
    setUploadingFor(selectionId);
    setMessage(null);
    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => formData.append('proofFiles', file));
      formData.append('ivyExpertSelectedSuggestionId', selectionId);
      formData.append('studentId', studentId);
      if (remarksDraft[selectionId]) {
        formData.append('remarks', remarksDraft[selectionId]);
      }

      const res = await axios.post(`${apiBase}/api/pointer/activity/proof/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.success) {
        setMessage({ type: 'success', text: 'Proof uploaded successfully' });
        await fetchActivities();
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to upload proof';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setUploadingFor(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-md p-8 space-y-6">
        <header className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Your Assigned Activities (Pointers 2 / 3 / 4)</h1>
            <p className="text-gray-600 text-sm mt-1">Complete your assigned activities and earn scores</p>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Student Ivy Service ID</label>
            <input
              value={studentIvyServiceId}
              onChange={(e) => setStudentIvyServiceId(e.target.value)}
              placeholder="studentIvyServiceId"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
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
          disabled={!studentIvyServiceId || loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Refresh Activities'}
        </button>

        {!studentIvyServiceId && (
          <p className="text-sm text-red-600">Enter studentIvyServiceId to load your tasks.</p>
        )}

        {/* Activity Selectors for each pointer */}
        <div className="space-y-4">
          <ActivitySelector pointerNo={2} />
          <ActivitySelector pointerNo={3} />
          <ActivitySelector pointerNo={4} />
        </div>

        {loading && <p className="text-sm text-gray-500">Loading assigned activities...</p>}

        {!loading && activitiesData && activitiesData.activities.length === 0 && (
          <p className="text-sm text-gray-500">No activities assigned yet.</p>
        )}

        {/* Display activities grouped by pointer with score cards */}
        {!loading && activitiesData && (
          <div className="space-y-8">
            {[2, 3, 4].map((pointerNo) => {
              const pointerActivities = activitiesData.activities.filter((act) => act.pointerNo === pointerNo);
              if (pointerActivities.length === 0) return null;

              return (
                <div key={pointerNo} className="space-y-4">
                  {/* Pointer Header with Score Card */}
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{pointerLabel(pointerNo)}</h2>
                      <p className="text-sm text-gray-600 mt-1">Complete these activities to improve your score</p>
                    </div>
                    {/* Score Card */}
                    {pointerScores[pointerNo] !== null && pointerScores[pointerNo] !== undefined && (
                      <div className="bg-white p-6 rounded-2xl shadow-md border-2 border-indigo-100 flex flex-col items-center justify-center text-center">
                        <span className="text-xs font-black tracking-widest text-gray-400 uppercase mb-2">Current Score</span>
                        <div className="text-5xl font-black text-indigo-600 leading-none">
                          {typeof pointerScores[pointerNo] === 'number' ? pointerScores[pointerNo].toFixed(2) : '0.00'}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Activities for this pointer */}
                  <div className="space-y-4">
                    {pointerActivities.map((act) => (
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
                  <p className="text-sm font-medium text-blue-900">Your submission</p>
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

              {!act.submission && (
                <div className="border border-gray-200 rounded-md p-3 space-y-3">
                  <p className="text-sm font-semibold text-gray-900">Upload proof</p>
                  <textarea
                    rows={2}
                    value={remarksDraft[act.selectionId] ?? ''}
                    onChange={(e) => setRemarksDraft((prev) => ({ ...prev, [act.selectionId]: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
                    placeholder="Add remarks (optional)"
                    disabled={uploadingFor === act.selectionId}
                  />
                  <input
                    type="file"
                    multiple
                    onChange={(e) => handleUpload(act.selectionId, e.target.files)}
                    disabled={uploadingFor === act.selectionId}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
                  />
                  <p className="text-xs text-gray-500">Upload PDFs or images.</p>
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
                  </div>
                </div>
              );
            })}
          </div>
        )}

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

export default function StudentPointerActivitiesPage() {
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
      <StudentPointerActivitiesContent />
    </Suspense>
  );
}


