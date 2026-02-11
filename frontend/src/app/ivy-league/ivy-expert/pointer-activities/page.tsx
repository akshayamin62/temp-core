'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import axios from 'axios';
import { useSearchParams } from 'next/navigation';
import ActivitySelector from '@/components/ActivitySelector';
import { BACKEND_URL } from '@/lib/ivyApi';

interface AgentSuggestion {
  _id: string;
  title: string;
  description: string;
  tags: string[];
  pointerNo: number;
  documentUrl?: string | null;
  documentName?: string | null;
}

interface ActivityRecord {
  selectionId: string;
  pointerNo: number;
  isVisibleToStudent: boolean;
  weightage?: number; // Weightage for Pointer 2
  suggestion: AgentSuggestion;
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
  ivyExpertId: string;
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

function IvyExpertPointerActivitiesContent() {
  const searchParams = useSearchParams();
  const studentIvyServiceIdFromUrl = searchParams.get('studentIvyServiceId') || '';
  const ivyExpertIdFromUrl = searchParams.get('ivyExpertId') || '695b93a44df1114a001dc23d'; // TODO: plug into auth

  const [studentIvyServiceId, setStudentIvyServiceId] = useState(studentIvyServiceIdFromUrl);
  const [ivyExpertId, setIvyExpertId] = useState(ivyExpertIdFromUrl);
  const [careerRole, setCareerRole] = useState('');
  const [selectedPointer, setSelectedPointer] = useState<number | ''>(2);
  const [suggestions, setSuggestions] = useState<AgentSuggestion[]>([]);
  const [selectedActivities, setSelectedActivities] = useState<Set<string>>(new Set());
  const [activityWeightages, setActivityWeightages] = useState<Record<string, number>>({}); // Weightages for Pointer 2
  const [activitiesData, setActivitiesData] = useState<ActivitiesResponse | null>(null);
  const [scoreDrafts, setScoreDrafts] = useState<Record<string, string>>({});
  const [feedbackDrafts, setFeedbackDrafts] = useState<Record<string, string>>({});

  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [savingSelection, setSavingSelection] = useState(false);
  const [submittingEval, setSubmittingEval] = useState<string | null>(null);
  const [updatingActivityId, setUpdatingActivityId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pointerScores, setPointerScores] = useState<{ [key: number]: number | null }>({ 2: null, 3: null, 4: null });
  const [viewingDocument, setViewingDocument] = useState<{ url: string; name: string } | null>(null);

  const apiBase = useMemo(() => BACKEND_URL, []);

  const fetchActivities = async () => {
    if (!studentIvyServiceId) return;
    setLoadingActivities(true);
    setMessage(null);
    try {
      const res = await axios.get<{ success: boolean; data: ActivitiesResponse }>(
        `${apiBase}/api/pointer/activity/student`,
        {
          params: {
            studentIvyServiceId,
            includeInvisible: true,
          },
        },
      );
      if (res.data.success) {
        setActivitiesData(res.data.data);
        const draftScores: Record<string, string> = {};
        const draftFeedback: Record<string, string> = {};
        res.data.data.activities.forEach((act) => {
          if (act.evaluation) {
            draftScores[act.selectionId] = act.evaluation.score.toString();
            draftFeedback[act.selectionId] = act.evaluation.feedback || '';
          }
        });
        setScoreDrafts(draftScores);
        setFeedbackDrafts(draftFeedback);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to load activities';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setLoadingActivities(false);
    }
  };

  const fetchPointerScores = async () => {
    if (!studentIvyServiceId) return;
    try {
      for (const pointerNo of [2, 3, 4]) {
        const res = await axios.get<{ success: boolean; data: number }>(
          `${apiBase}/api/pointer/activity/score/${studentIvyServiceId}/${pointerNo}`
        );
        if (res.data.success) {
          setPointerScores(prev => ({ ...prev, [pointerNo]: res.data.data }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch pointer scores:', error);
    }
  };

  useEffect(() => {
    if (studentIvyServiceIdFromUrl) {
      setStudentIvyServiceId(studentIvyServiceIdFromUrl);
    }
    if (ivyExpertIdFromUrl) {
      setIvyExpertId(ivyExpertIdFromUrl);
    }
  }, [studentIvyServiceIdFromUrl, ivyExpertIdFromUrl]);

  useEffect(() => {
    if (studentIvyServiceId) {
      fetchActivities();
      fetchPointerScores();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentIvyServiceId]);

  const handleFetchSuggestions = async () => {
    if (!careerRole.trim()) {
      setMessage({ type: 'error', text: 'Please enter career role' });
      return;
    }
    if (!selectedPointer) {
      setMessage({ type: 'error', text: 'Select a pointer' });
      return;
    }

    setLoadingSuggestions(true);
    setMessage(null);
    setSelectedActivities(new Set());

    try {
      const res = await axios.get<AgentSuggestion[]>(`${apiBase}/api/agent-suggestions`, {
        params: { careerRole: careerRole.trim(), pointerNo: selectedPointer },
      });
      console.log('Fetched suggestions:', res.data);
      console.log('First suggestion document data:', res.data[0]);
      setSuggestions(res.data);
      if (res.data.length === 0) {
        setMessage({
          type: 'error',
          text: 'No activities found. Ensure Excel is uploaded for this pointer.',
        });
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch suggestions';
      setMessage({ type: 'error', text: errorMessage });
      setSuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const toggleActivity = (id: string) => {
    const updated = new Set(selectedActivities);
    const updatedWeightages = { ...activityWeightages };
    
    if (updated.has(id)) {
      updated.delete(id);
      delete updatedWeightages[id];
    } else {
      updated.add(id);
      // Auto-assign weightage for Pointer 2
      if (selectedPointer === 2) {
        if (updated.size === 1) {
          updatedWeightages[id] = 100; // Single activity gets 100
        } else {
          // Distribute evenly for multiple activities
          const equalWeight = Math.floor(100 / updated.size);
          const remainder = 100 - (equalWeight * updated.size);
          let index = 0;
          updated.forEach(actId => {
            updatedWeightages[actId] = index === 0 ? equalWeight + remainder : equalWeight;
            index++;
          });
        }
      }
    }
    
    setSelectedActivities(updated);
    setActivityWeightages(updatedWeightages);
  };

  const handleWeightageChange = (id: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setActivityWeightages(prev => ({ ...prev, [id]: numValue }));
  };

  const getTotalWeightage = () => {
    return Object.values(activityWeightages).reduce((sum, w) => sum + w, 0);
  };

  const isWeightageValid = () => {
    if (selectedPointer !== 2) return true;
    if (selectedActivities.size === 0) return true;
    if (selectedActivities.size === 1) return true;
    
    const total = getTotalWeightage();
    return Math.abs(total - 100) < 0.01; // Allow small floating point tolerance
  };

  const handleSaveSelection = async () => {
    if (!studentIvyServiceId) {
      setMessage({ type: 'error', text: 'Student Ivy Service ID is required' });
      return;
    }
    if (!selectedPointer) {
      setMessage({ type: 'error', text: 'Select a pointer' });
      return;
    }
    if (selectedActivities.size === 0) {
      setMessage({ type: 'error', text: 'Select at least one activity' });
      return;
    }
    
    // Validate weightages for Pointer 2
    if (selectedPointer === 2 && selectedActivities.size > 1) {
      if (!isWeightageValid()) {
        setMessage({ type: 'error', text: `Total weightage must equal 100. Current total: ${getTotalWeightage().toFixed(2)}` });
        return;
      }
    }
    
    setSavingSelection(true);
    setMessage(null);
    try {
      const payload: any = {
        studentIvyServiceId,
        ivyExpertId,
        pointerNo: selectedPointer,
        agentSuggestionIds: Array.from(selectedActivities),
        isVisibleToStudent: true,
      };
      
      // Add weightages for Pointer 2
      if (selectedPointer === 2 && selectedActivities.size > 0) {
        payload.weightages = Array.from(selectedActivities).map(id => activityWeightages[id] || 0);
      }
      
      const res = await axios.post(`${apiBase}/api/pointer/activity/select`, payload);
      if (res.data.success) {
        setMessage({ type: 'success', text: 'Activities saved for the student' });
        await fetchActivities();
        // Reset selections
        setSelectedActivities(new Set());
        setActivityWeightages({});
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to save activities';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setSavingSelection(false);
    }
  };

  const handleEvaluate = async (selectionId: string, submissionId?: string | null) => {
    if (!submissionId) {
      setMessage({ type: 'error', text: 'Submission not found for this activity' });
      return;
    }
    const scoreVal = parseFloat(scoreDrafts[selectionId] || '');
    if (isNaN(scoreVal) || scoreVal < 0 || scoreVal > 10) {
      setMessage({ type: 'error', text: 'Score must be between 0 and 10' });
      return;
    }
    setSubmittingEval(selectionId);
    setMessage(null);
    try {
      const res = await axios.post(`${apiBase}/api/pointer/activity/evaluate`, {
        studentSubmissionId: submissionId,
        ivyExpertId,
        score: scoreVal,
        feedback: feedbackDrafts[selectionId] || '',
      });
      if (res.data.success) {
        setMessage({ type: 'success', text: 'Evaluation saved' });
        await fetchActivities();
        await fetchPointerScores();
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to save evaluation';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setSubmittingEval(null);
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

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-md p-8 space-y-8">
        <h1 className="text-2xl font-bold text-gray-900">Pointers 2 / 3 / 4 - Activity Execution</h1>

        {/* Inputs */}
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Ivy Expert ID</label>
            <input
              value={ivyExpertId}
              onChange={(e) => setIvyExpertId(e.target.value)}
              placeholder="ivyExpertId"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Suggestion fetch */}
        <div className="border border-gray-200 rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Select Agent Activities</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Career Role</label>
              <textarea
                value={careerRole}
                onChange={(e) => setCareerRole(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter the student's career role (e.g., Doctor, Engineer, Finance, Lawyer)..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pointer</label>
              <select
                value={selectedPointer}
                onChange={(e) => setSelectedPointer(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="">-- Select pointer --</option>
                <option value="2">Pointer 2: Spike in One Area</option>
                <option value="3">Pointer 3: Leadership & Initiative</option>
                <option value="4">Pointer 4: Global & Social Impact</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleFetchSuggestions}
                disabled={loadingSuggestions || !careerRole.trim() || !selectedPointer}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {loadingSuggestions ? 'Fetching...' : 'Get Suggestions'}
              </button>
            </div>
          </div>

          {!loadingSuggestions && suggestions.length > 0 && (
            <div className="space-y-3">
              {/* Weightage Info Banner for Pointer 2 */}
              {selectedPointer === 2 && selectedActivities.size > 0 && (
                <div className={`p-4 rounded-lg border-2 ${
                  selectedActivities.size === 1 
                    ? 'bg-green-50 border-green-300' 
                    : isWeightageValid() 
                      ? 'bg-green-50 border-green-300' 
                      : 'bg-red-50 border-red-300'
                }`}>
                  <h4 className="font-bold text-sm mb-2">
                    {selectedActivities.size === 1 ? '✓ Single Activity Selected' : '⚠️ Multiple Activities - Weightage Required'}
                  </h4>
                  {selectedActivities.size === 1 ? (
                    <p className="text-sm text-green-800">
                      This activity will automatically receive 100% weightage.
                    </p>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">
                        Total Weightage: <span className={`text-lg ${isWeightageValid() ? 'text-green-700' : 'text-red-700'}`}>
                          {getTotalWeightage().toFixed(1)}/100
                        </span>
                      </p>
                      <p className="text-sm text-gray-700">
                        Assign weightage to each activity below. The total must equal exactly 100%.
                      </p>
                    </div>
                  )}
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  {suggestions.length} activities found • {selectedActivities.size} selected
                  {selectedPointer === 2 && selectedActivities.size > 1 && (
                    <span className={`ml-2 font-semibold ${isWeightageValid() ? 'text-green-600' : 'text-red-600'}`}>
                      • Total: {getTotalWeightage().toFixed(1)}/100
                    </span>
                  )}
                </p>
                <button
                  onClick={handleSaveSelection}
                  disabled={savingSelection || selectedActivities.size === 0 || !studentIvyServiceId || (selectedPointer === 2 && selectedActivities.size > 1 && !isWeightageValid())}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {savingSelection ? 'Saving...' : 'Assign to Student'}
                </button>
              </div>
              <div className="space-y-3">
                {suggestions.map((sug) => (
                  <div
                    key={sug._id}
                    className={`border rounded-lg p-4 transition ${selectedActivities.has(sug._id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                      }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        checked={selectedActivities.has(sug._id)}
                        onChange={() => toggleActivity(sug._id)}
                      />
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h3 className="text-base font-semibold text-gray-900">{sug.title}</h3>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap mt-1">{sug.description}</p>
                          </div>
                          {/* Always show button for debugging - will update condition after */}
                          <button
                            onClick={() => {
                              console.log('Activity document data:', { documentUrl: sug.documentUrl, documentName: sug.documentName });
                              if (sug.documentUrl) {
                                setViewingDocument({ url: sug.documentUrl, name: sug.documentName || 'Activity Document' });
                              } else {
                                alert('No document URL available for this activity');
                              }
                            }}
                            className="flex-shrink-0 inline-flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition text-sm font-medium border border-indigo-200"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            {sug.documentUrl ? 'View Doc' : 'No Doc'}
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {sug.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                        
                        {/* Weightage input for Pointer 2 - Multiple Activities */}
                        {selectedPointer === 2 && selectedActivities.has(sug._id) && selectedActivities.size > 1 && (
                          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-300 rounded-md">
                            <div className="flex items-center gap-3">
                              <label className="text-sm font-semibold text-yellow-900">Weightage:</label>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                value={activityWeightages[sug._id] || 0}
                                onChange={(e) => handleWeightageChange(sug._id, e.target.value)}
                                className="w-24 px-3 py-2 border-2 border-yellow-400 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-sm font-semibold"
                              />
                              <span className="text-sm font-semibold text-yellow-900">%</span>
                            </div>
                            <p className="text-xs text-yellow-700 mt-1">
                              Assign weightage for this activity (total must equal 100%)
                            </p>
                          </div>
                        )}
                        {/* Weightage for Pointer 2 - Single Activity */}
                        {selectedPointer === 2 && selectedActivities.has(sug._id) && selectedActivities.size === 1 && (
                          <div className="mt-3">
                            <span className="text-sm font-semibold text-green-700 bg-green-100 px-3 py-1.5 rounded-md border border-green-300">
                              ✓ Weightage: 100% (Auto-assigned)
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Assigned activities */}
        <div className="border border-gray-200 rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Assigned Activities</h2>
            <button
              onClick={fetchActivities}
              disabled={loadingActivities || !studentIvyServiceId}
              className="text-sm bg-gray-100 px-3 py-2 rounded-md hover:bg-gray-200 disabled:opacity-50"
            >
              {loadingActivities ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          {!studentIvyServiceId && (
            <p className="text-sm text-red-600">Enter studentIvyServiceId to view assignments.</p>
          )}

          {/* Activity Selectors for each pointer */}
          <div className="space-y-4">
            <ActivitySelector pointerNo={2} />
            <ActivitySelector pointerNo={3} />
            <ActivitySelector pointerNo={4} />
          </div>

          {loadingActivities && <p className="text-sm text-gray-500">Loading assignments...</p>}

          {!loadingActivities && activitiesData && activitiesData.activities.length === 0 && (
            <p className="text-sm text-gray-500">No activities assigned yet.</p>
          )}

          {!loadingActivities &&
            activitiesData &&
            activitiesData.activities.length > 0 &&
            [2, 3, 4].map((pointerNo) => {
              const pointersWithActivities: { [key: number]: typeof activitiesData.activities } = {};
              [2, 3, 4].forEach((ptr) => {
                pointersWithActivities[ptr] = activitiesData.activities.filter((a) => a.pointerNo === ptr);
              });

              return pointersWithActivities[pointerNo]?.length > 0 ? (
                <div key={pointerNo} className="border border-gray-200 rounded-lg p-6 space-y-4">
                  {/* Header with Score Card */}
                  <header className="flex justify-between items-start mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">{pointerLabel(pointerNo)}</h2>
                    {/* Score Card */}
                    {pointerScores[pointerNo] !== null && pointerScores[pointerNo] !== undefined && (
                      <div className="bg-white p-6 rounded-2xl shadow-md border-2 border-indigo-100 flex flex-col items-center justify-center text-center">
                        <span className="text-xs font-black tracking-widest text-gray-400 uppercase mb-2">Current Score</span>
                        <div className="text-5xl font-black text-indigo-600 leading-none">
                          {typeof pointerScores[pointerNo] === 'number' ? pointerScores[pointerNo].toFixed(2) : '0.00'}
                        </div>
                      </div>
                    )}
                  </header>

                  {/* Activities for this pointer */}
                  <div className="space-y-4">
                    {pointersWithActivities[pointerNo]?.map((act) => (
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
                      {act.pointerNo === 2 && act.weightage !== undefined && (
                        <span className="ml-3 font-semibold text-blue-600">
                          • Weightage: {act.weightage}%
                        </span>
                      )}
                    </p>
                  </div>
                  {act.submission ? (
                    <span className="text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded">
                      Proof submitted
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-orange-700 bg-orange-50 border border-orange-200 px-2 py-1 rounded">
                      Awaiting proof
                    </span>
                  )}
                </div>

                {/* Submission */}
                {act.submission && (
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3 space-y-2">
                    <p className="text-sm font-medium text-blue-900">Student Submission</p>
                    {act.submission.remarks && (
                      <p className="text-sm text-blue-800 whitespace-pre-wrap">{act.submission.remarks}</p>
                    )}
                    <ul className="text-sm text-blue-800 space-y-1">
                      {act.submission.files.map((file, idx) => (
                        <li key={idx}>
                          <button
                            onClick={() => downloadFile(file)}
                            className="underline hover:text-blue-900"
                          >
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

                {/* Evaluation */}
                {act.evaluation && updatingActivityId !== act.selectionId ? (
                  <div className="border border-gray-200 rounded-md p-3 bg-green-50">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-green-900">Current Evaluation</p>
                      <button
                        onClick={() => setUpdatingActivityId(act.selectionId)}
                        className="px-4 py-2 bg-white border border-green-200 text-green-700 font-bold text-xs rounded-xl shadow-sm hover:bg-green-100 transition-all uppercase tracking-wider"
                      >
                        Update Score
                      </button>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-bold text-green-900">
                        Score: {act.evaluation.score}/10
                      </p>
                      {act.evaluation.feedback && (
                        <p className="text-sm text-green-800">
                          <span className="font-medium">Feedback:</span> {act.evaluation.feedback}
                        </p>
                      )}
                      <p className="text-xs text-green-700">
                        Last updated: {new Date(act.evaluation.evaluatedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-md p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-900">{act.evaluation ? 'Update Evaluation' : 'Evaluate Activity'}</p>
                      {act.evaluation && updatingActivityId === act.selectionId && (
                        <button
                          onClick={() => setUpdatingActivityId(null)}
                          className="text-xs font-bold text-gray-400 hover:text-gray-600 uppercase underline"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Score (0-10)</label>
                        <input
                          type="number"
                          min={0}
                          max={10}
                          step={0.1}
                          value={scoreDrafts[act.selectionId] ?? ''}
                          onChange={(e) =>
                            setScoreDrafts((prev) => ({ ...prev, [act.selectionId]: e.target.value }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                          disabled={submittingEval === act.selectionId}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Feedback</label>
                        <textarea
                          rows={3}
                          value={feedbackDrafts[act.selectionId] ?? ''}
                          onChange={(e) =>
                            setFeedbackDrafts((prev) => ({ ...prev, [act.selectionId]: e.target.value }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y text-gray-900"
                          disabled={submittingEval === act.selectionId}
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => handleEvaluate(act.selectionId, act.submission?._id)}
                      disabled={submittingEval === act.selectionId || !act.submission}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                    >
                      {submittingEval === act.selectionId ? 'Saving...' : (act.evaluation ? 'Update Evaluation' : 'Save Evaluation')}
                    </button>
                  </div>
                )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null;
            })}
        </div>

        {/* Messages */}
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

      {/* Document Viewer Modal - View Only (No Download, No Copy) */}
      {viewingDocument && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{viewingDocument.name}</h3>
                  <p className="text-xs text-gray-500">View-only mode • Document cannot be downloaded or copied</p>
                </div>
              </div>
              <button
                onClick={() => setViewingDocument(null)}
                className="p-2 hover:bg-gray-200 rounded-lg transition"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* Document Content */}
            <div 
              className="flex-1 overflow-auto bg-gray-100 p-4"
              style={{ userSelect: 'none' }}
              onContextMenu={(e) => e.preventDefault()}
            >
              {viewingDocument.url.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={`${apiBase}${viewingDocument.url}#toolbar=0&navpanes=0&scrollbar=1`}
                  className="w-full h-full min-h-[70vh] rounded-lg border-0 bg-white"
                  title="Activity Document"
                  style={{ pointerEvents: 'auto' }}
                />
              ) : viewingDocument.url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                <div className="flex items-center justify-center h-full">
                  <img
                    src={`${apiBase}${viewingDocument.url}`}
                    alt="Activity Document"
                    className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
                    onDragStart={(e) => e.preventDefault()}
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full min-h-[70vh] text-gray-500">
                  <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-lg font-medium">Document Preview</p>
                  <p className="text-sm mt-1">This document type cannot be previewed inline.</p>
                </div>
              )}
            </div>
            {/* Footer */}
            <div className="px-6 py-3 border-t bg-gray-50 flex items-center justify-between">
              <p className="text-xs text-gray-500 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Protected document - View only access
              </p>
              <button
                onClick={() => setViewingDocument(null)}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function IvyExpertPointerActivitiesPage() {
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
      <IvyExpertPointerActivitiesContent />
    </Suspense>
  );
}


