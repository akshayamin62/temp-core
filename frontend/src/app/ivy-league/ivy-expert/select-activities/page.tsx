'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import axios from 'axios';
import { useSearchParams, useRouter } from 'next/navigation';
import mammoth from 'mammoth';
import { IVY_API_URL } from '@/lib/ivyApi';
import { useBlobUrl, fileApi } from '@/lib/useBlobUrl';

// Inline document viewer (same as activities page)
function InlineDocViewer({ url }: { url: string }) {
  const { blobUrl, loading: blobLoading, error: blobError } = useBlobUrl(url);
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
  const isWord = /\.(doc|docx)$/i.test(url);
  const [wordContent, setWordContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isWord) {
      setIsLoading(true);
      setError('');
      fileApi.get(url, { responseType: 'arraybuffer' })
        .then(response => mammoth.convertToHtml({ arrayBuffer: response.data }))
        .then(result => {
          setWordContent(result.value);
          setIsLoading(false);
        })
        .catch(() => {
          setError('Failed to load document');
          setIsLoading(false);
        });
    }
  }, [url, isWord]);

  if (blobLoading || isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  if (blobError || error) {
    return <div className="text-center py-8 text-red-500 text-sm">{blobError || error}</div>;
  }

  if (isImage && blobUrl) {
    return <img src={blobUrl} alt="Document" className="max-w-full h-auto mx-auto" />;
  }

  if (isWord && wordContent) {
    return (
      <div
        className="prose max-w-none p-4"
        style={{ userSelect: 'none' }}
        dangerouslySetInnerHTML={{ __html: wordContent }}
      />
    );
  }

  if (blobUrl) {
    return (
      <iframe
        src={blobUrl}
        className="w-full border-0"
        style={{ height: '500px', userSelect: 'none' }}
        title="Document Preview"
      />
    );
  }

  return <div className="text-center py-8 text-gray-500 text-sm">Unable to preview this document</div>;
}

interface AgentSuggestion {
  _id: string;
  title: string;
  description: string;
  tags: string[];
  pointerNo: number;
  source?: string;
  documentUrl?: string | null;
  documentName?: string | null;
}

interface StudentActivity {
  selectionId: string;
  suggestion?: AgentSuggestion;
  pointerNo: number;
  weightage?: number;
  deadline?: string;
}

function SelectActivitiesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const studentIvyServiceId = searchParams.get('studentIvyServiceId');
  const ivyExpertId = searchParams.get('ivyExpertId') || '';
  const studentId = searchParams.get('studentId') || '';
  const pointerNo = parseInt(searchParams.get('pointerNo') || '2');

  // State
  const [adminActivities, setAdminActivities] = useState<AgentSuggestion[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [selectedActivities, setSelectedActivities] = useState<Set<string>>(new Set());
  const [activityWeightages, setActivityWeightages] = useState<Record<string, number>>({});
  const [activityDeadlines, setActivityDeadlines] = useState<Record<string, string>>({});
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [alreadyAssignedIds, setAlreadyAssignedIds] = useState<Set<string>>(new Set());
  const [alreadyAssignedToCurrentPointer, setAlreadyAssignedToCurrentPointer] = useState<Set<string>>(new Set());

  const getPointerLabel = (p: number): string => {
    switch (p) {
      case 2: return 'Pointer 2: Spike in One Area';
      case 3: return 'Pointer 3: Leadership & Initiative';
      case 4: return 'Pointer 4: Global & Social Impact';
      default: return `Pointer ${p}`;
    }
  };

  // Fetch admin activities + already-assigned activities
  useEffect(() => {
    if (!studentIvyServiceId) return;

    const loadData = async () => {
      setLoadingActivities(true);
      try {
        // Fetch admin activities for this pointer
        const activitiesRes = await axios.get(`${IVY_API_URL}/activities`, {
          params: { pointerNo },
        });
        const activities: AgentSuggestion[] = activitiesRes.data.success ? activitiesRes.data.data || [] : [];
        setAdminActivities(activities);

        // Fetch student's already-assigned activities across ALL pointers
        if (studentId) {
          try {
            const studentRes = await axios.get(
              `${IVY_API_URL}/pointer/activity/student/${studentId}`,
              { params: { studentIvyServiceId } }
            );
            if (studentRes.data.success) {
              const payload = studentRes.data.data;
              const rawActivities: StudentActivity[] =
                payload && Array.isArray(payload.activities) ? payload.activities : [];

              const assignedIds = new Set<string>();
              const preSelectedIds = new Set<string>();
              const assignedToCurrentPointerIds = new Set<string>();
              const weightagesFromDb: Record<string, number> = {};
              const deadlinesFromDb: Record<string, string> = {};

              rawActivities.forEach((act) => {
                if (act.suggestion?._id) {
                  assignedIds.add(act.suggestion._id);
                  // If this activity belongs to the current pointer, pre-select it
                  if (act.pointerNo === pointerNo) {
                    preSelectedIds.add(act.suggestion._id);
                    assignedToCurrentPointerIds.add(act.suggestion._id);
                    if (act.weightage !== undefined && act.weightage !== null) {
                      weightagesFromDb[act.suggestion._id] = act.weightage;
                    }
                    if (act.deadline) {
                      deadlinesFromDb[act.suggestion._id] = new Date(act.deadline).toISOString().slice(0, 16);
                    }
                  }
                }
              });

              setAlreadyAssignedIds(assignedIds);
              setAlreadyAssignedToCurrentPointer(assignedToCurrentPointerIds);
              setSelectedActivities(preSelectedIds);
              setActivityWeightages(weightagesFromDb);
              setActivityDeadlines(deadlinesFromDb);
            }
          } catch {
            // Student may not have activities yet
          }
        }

        // Auto-highlight the first activity
        if (activities.length > 0) {
          setHighlightedId(activities[0]._id);
        }
      } catch (error) {
        console.error('Error loading activities:', error);
      } finally {
        setLoadingActivities(false);
      }
    };

    loadData();
  }, [studentIvyServiceId, studentId, pointerNo]);

  // Filter activities by search query
  const filteredActivities = useMemo(() => {
    if (!searchQuery.trim()) return adminActivities;
    const q = searchQuery.toLowerCase();
    return adminActivities.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [adminActivities, searchQuery]);

  // The currently highlighted activity for detail panel
  const highlightedActivity = useMemo(
    () => adminActivities.find((a) => a._id === highlightedId) || null,
    [adminActivities, highlightedId]
  );

  // Toggle activity selection
  const handleToggleActivity = (activityId: string) => {
    // Prevent deselecting activities already assigned to current pointer
    if (alreadyAssignedToCurrentPointer.has(activityId)) {
      return;
    }

    const newSelected = new Set(selectedActivities);
    const updatedWeightages = { ...activityWeightages };
    const updatedDeadlines = { ...activityDeadlines };

    if (newSelected.has(activityId)) {
      newSelected.delete(activityId);
      delete updatedWeightages[activityId];
      delete updatedDeadlines[activityId];
    } else {
      newSelected.add(activityId);
      // Auto-distribute weightage
      const count = newSelected.size;
      if (count === 1) {
        updatedWeightages[activityId] = 100;
      } else {
        const equalWeight = Math.floor(100 / count);
        const remainder = 100 - equalWeight * count;
        let idx = 0;
        newSelected.forEach((id) => {
          updatedWeightages[id] = idx === 0 ? equalWeight + remainder : equalWeight;
          idx++;
        });
      }
    }

    setSelectedActivities(newSelected);
    setActivityWeightages(updatedWeightages);
    setActivityDeadlines(updatedDeadlines);
  };

  // Weightage helpers
  const handleWeightageChange = async (id: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    const newWeightages = { ...activityWeightages, [id]: numValue };
    setActivityWeightages(newWeightages);

    // Auto-save
    if (studentIvyServiceId) {
      try {
        const weightagesPayload: Record<string, number> = {};
        selectedActivities.forEach((actId) => {
          weightagesPayload[actId] = newWeightages[actId] || 0;
        });
        await axios.put(`${IVY_API_URL}/pointer/activity/weightages`, {
          studentIvyServiceId,
          ivyExpertId,
          weightages: weightagesPayload,
        });
      } catch {
        // Silently handle — validation shows in UI
      }
    }
  };

  const getTotalWeightage = () =>
    Array.from(selectedActivities).reduce((sum, id) => sum + (activityWeightages[id] || 0), 0);

  const isWeightageValid = () => {
    if (selectedActivities.size <= 1) return true;
    return Math.abs(getTotalWeightage() - 100) < 0.01;
  };

  const areDeadlinesValid = () => {
    for (const id of selectedActivities) {
      if (!activityDeadlines[id] || activityDeadlines[id].trim() === '') return false;
    }
    return true;
  };

  // Submit
  const handleSubmit = async () => {
    const idsToSubmit = Array.from(selectedActivities);
    if (idsToSubmit.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one activity' });
      return;
    }
    if (!studentIvyServiceId) {
      setMessage({ type: 'error', text: 'Student Ivy Service ID is required' });
      return;
    }
    if (idsToSubmit.length > 1 && !isWeightageValid()) {
      setMessage({ type: 'error', text: `Total weightage must be 100%. Current: ${getTotalWeightage().toFixed(1)}%` });
      return;
    }
    if (!areDeadlinesValid()) {
      setMessage({ type: 'error', text: 'All selected activities must have a deadline' });
      return;
    }

    setSubmitting(true);
    setMessage(null);
    try {
      const payload: any = {
        studentIvyServiceId,
        ivyExpertId,
        agentSuggestionIds: idsToSubmit,
        pointerNo,
      };
      if (idsToSubmit.length > 0) {
        payload.weightages = idsToSubmit.map((id) => activityWeightages[id] || 0);
      }
      payload.deadlines = idsToSubmit.map((id) => activityDeadlines[id] || '');

      const response = await axios.post(`${IVY_API_URL}/pointer/activity/select`, payload);
      if (response.data.success) {
        setMessage({ type: 'success', text: 'Activities selected successfully!' });
        // Navigate back after short delay
        setTimeout(() => {
          const params = new URLSearchParams();
          params.set('studentId', studentId);
          params.set('studentIvyServiceId', studentIvyServiceId || '');
          params.set('ivyExpertId', ivyExpertId);
          params.set('pointerNo', String(pointerNo));
          router.push(`/ivy-league/ivy-expert/activities?${params.toString()}`);
        }, 1200);
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to select activities' });
    } finally {
      setSubmitting(false);
    }
  };

  // Back navigation
  const handleBack = () => {
    const params = new URLSearchParams();
    params.set('studentId', studentId);
    params.set('studentIvyServiceId', studentIvyServiceId || '');
    params.set('ivyExpertId', ivyExpertId);
    params.set('pointerNo', String(pointerNo));
    router.push(`/ivy-league/ivy-expert/activities?${params.toString()}`);
  };

  if (!studentIvyServiceId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md">
          <div className="bg-red-50 text-red-800 border border-red-200 p-4 rounded-md">
            Student Ivy Service ID is required.
          </div>
        </div>
      </div>
    );
  }

  if (loadingActivities) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600"></div>
          <p className="text-gray-500 text-sm font-medium">Loading activities...</p>
        </div>
      </div>
    );
  }

  const selectedCount = selectedActivities.size;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBack}
                className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{getPointerLabel(pointerNo)}</h1>
                <p className="text-sm text-gray-500">Select activities to assign to the student</p>
              </div>
            </div>

            {/* Search Bar */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search activities by name, description, or tags..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Selection count badge */}
            {selectedCount > 0 && (
              <div className="flex items-center gap-2 bg-brand-50 border border-brand-200 px-3 py-1.5 rounded-lg">
                <span className="text-sm font-semibold text-brand-700">{selectedCount} selected</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className="max-w-[1600px] mx-auto px-6 mt-4">
          <div className={`p-3 rounded-lg text-sm font-medium ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.text}
          </div>
        </div>
      )}

      {/* Main Content: Left list + Right detail */}
      <div className="flex-1 max-w-[1600px] mx-auto px-6 py-6 w-full">
        {adminActivities.length === 0 ? (
          <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center py-12 text-gray-500 bg-white rounded-xl border border-dashed border-gray-300 px-12">
              <svg className="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="text-lg font-semibold text-gray-600">No activities available</p>
              <p className="text-sm text-gray-400 mt-1">Super Admin needs to upload activities for this pointer first.</p>
            </div>
          </div>
        ) : (
          <div className="flex gap-6 h-[calc(100vh-180px)]">
            {/* Left Panel: Activity List */}
            <div className="w-[380px] flex-shrink-0 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                  Activities ({filteredActivities.length})
                </h2>
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
                {filteredActivities.length === 0 ? (
                  <div className="p-6 text-center text-gray-400 text-sm">
                    No activities match your search.
                  </div>
                ) : (
                  filteredActivities.map((activity) => {
                    const isSelected = selectedActivities.has(activity._id);
                    const isHighlighted = highlightedId === activity._id;
                    const isAlreadyAssignedToCurrentPointer = alreadyAssignedToCurrentPointer.has(activity._id);
                    const isAlreadyAssigned = alreadyAssignedIds.has(activity._id) && !selectedActivities.has(activity._id);

                    return (
                      <div
                        key={activity._id}
                        onClick={() => setHighlightedId(activity._id)}
                        className={`flex items-start gap-3 px-4 py-3.5 cursor-pointer transition-all group ${
                          isHighlighted
                            ? 'bg-brand-50 border-l-4 border-l-brand-500'
                            : 'border-l-4 border-l-transparent hover:bg-gray-50'
                        } ${isAlreadyAssigned ? 'opacity-50' : ''}`}
                      >
                        {/* Checkbox */}
                        <div className="pt-0.5 flex-shrink-0">
                          <label
                            className={`relative flex items-center ${
                              isAlreadyAssignedToCurrentPointer || isAlreadyAssigned ? 'cursor-not-allowed' : 'cursor-pointer'
                            }`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleActivity(activity._id)}
                              disabled={isAlreadyAssignedToCurrentPointer || isAlreadyAssigned}
                              className="sr-only peer"
                            />
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                              isSelected
                                ? isAlreadyAssignedToCurrentPointer
                                  ? 'bg-amber-500 border-amber-500'
                                  : 'bg-brand-600 border-brand-600'
                                : isAlreadyAssigned
                                ? 'bg-gray-100 border-gray-300'
                                : 'border-gray-300 group-hover:border-brand-400'
                            }`}>
                              {isSelected && (
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                              {isAlreadyAssigned && !isSelected && (
                                <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                          </label>
                        </div>

                        {/* Activity Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className={`text-sm font-semibold leading-tight truncate ${
                            isHighlighted ? 'text-brand-900' : 'text-gray-900'
                          }`}>
                            {activity.title}
                          </h3>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {activity.description}
                          </p>
                          {activity.tags && activity.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {activity.tags.slice(0, 3).map((tag, i) => (
                                <span key={i} className="inline-block px-1.5 py-0.5 bg-gray-100 text-gray-600 text-[10px] rounded font-medium">
                                  {tag}
                                </span>
                              ))}
                              {activity.tags.length > 3 && (
                                <span className="text-[10px] text-gray-400 font-medium">+{activity.tags.length - 3}</span>
                              )}
                            </div>
                          )}
                          {isAlreadyAssignedToCurrentPointer && (
                            <span className="inline-block mt-1.5 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                              ✓ Assigned (locked)
                            </span>
                          )}
                          {isAlreadyAssigned && !isAlreadyAssignedToCurrentPointer && (
                            <span className="inline-block mt-1.5 text-[10px] font-semibold text-gray-600 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-200">
                              Already assigned to other pointer
                            </span>
                          )}
                        </div>

                        {/* Arrow indicator */}
                        {isHighlighted && (
                          <svg className="w-4 h-4 text-brand-400 flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Panel: Activity Detail + Selection Controls */}
            <div className="flex-1 flex flex-col gap-6 min-w-0">
              {/* Detail Card */}
              {highlightedActivity ? (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex-1 overflow-y-auto">
                  <div className="p-6">
                    {/* Title & Select Button */}
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex-1">
                        <h2 className="text-2xl font-bold text-gray-900">{highlightedActivity.title}</h2>
                        {highlightedActivity.source && (
                          <p className="text-sm text-gray-500 mt-1">Source: {highlightedActivity.source}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleToggleActivity(highlightedActivity._id)}
                        disabled={
                          alreadyAssignedToCurrentPointer.has(highlightedActivity._id) ||
                          (alreadyAssignedIds.has(highlightedActivity._id) && !selectedActivities.has(highlightedActivity._id))
                        }
                        className={`flex-shrink-0 px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                          selectedActivities.has(highlightedActivity._id)
                            ? alreadyAssignedToCurrentPointer.has(highlightedActivity._id)
                              ? 'bg-amber-500 text-white cursor-not-allowed'
                              : 'bg-brand-600 text-white hover:bg-brand-700'
                            : alreadyAssignedIds.has(highlightedActivity._id)
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-brand-50 text-brand-700 border border-brand-200 hover:bg-brand-100'
                        }`}
                      >
                        {selectedActivities.has(highlightedActivity._id) ? (
                          alreadyAssignedToCurrentPointer.has(highlightedActivity._id) ? (
                            <span className="flex items-center gap-1.5">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                              Assigned (Locked)
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                              Selected
                            </span>
                          )
                        ) : alreadyAssignedIds.has(highlightedActivity._id) ? (
                          'Already Assigned to Other Pointer'
                        ) : (
                          <span className="flex items-center gap-1.5">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                            Select
                          </span>
                        )}
                      </button>
                    </div>

                    {/* Tags */}
                    {highlightedActivity.tags && highlightedActivity.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {highlightedActivity.tags.map((tag, i) => (
                          <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Description */}
                    <div className="mb-6">
                      <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Description</h3>
                      <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{highlightedActivity.description}</p>
                    </div>

                    {/* Document */}
                    {highlightedActivity.documentUrl && (
                      <div>
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Attached Document</h3>
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                          <div className="bg-brand-600 text-white px-4 py-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span className="font-semibold text-sm">{highlightedActivity.documentName || 'Activity Document'}</span>
                            </div>
                            <span className="text-xs bg-white/20 px-2 py-1 rounded">View-only</span>
                          </div>
                          <div className="bg-white" style={{ userSelect: 'none' }} onContextMenu={(e) => e.preventDefault()}>
                            <InlineDocViewer url={highlightedActivity.documentUrl} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex-1 flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                    </svg>
                    <p className="text-sm font-medium">Click an activity on the left to view details</p>
                  </div>
                </div>
              )}

              {/* Bottom: Selection Summary + Weightage + Deadlines + Submit */}
              {selectedCount > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-gray-900">
                      Selected Activities ({selectedCount})
                    </h3>
                    {selectedCount > 1 && (
                      <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
                        isWeightageValid()
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        Weightage: {getTotalWeightage().toFixed(1)}/100
                      </span>
                    )}
                  </div>

                  <div className="space-y-3 mb-4">
                    {Array.from(selectedActivities).map((id) => {
                      const activity = adminActivities.find((a) => a._id === id);
                      if (!activity) return null;
                      return (
                        <div
                          key={id}
                          className="flex items-center gap-4 bg-gray-50 rounded-lg p-3 border border-gray-100"
                        >
                          {/* Activity name */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{activity.title}</p>
                          </div>

                          {/* Weightage */}
                          {selectedCount > 1 ? (
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                value={activityWeightages[id] || 0}
                                onChange={(e) => handleWeightageChange(id, e.target.value)}
                                className="w-20 px-2 py-1.5 border border-gray-300 rounded-md text-sm font-semibold text-gray-900 bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-center"
                              />
                              <span className="text-sm font-semibold text-gray-500">%</span>
                            </div>
                          ) : (
                            <span className="text-xs font-semibold text-green-700 bg-green-50 px-2 py-1 rounded border border-green-200 flex-shrink-0">
                              100%
                            </span>
                          )}

                          {/* Deadline */}
                          <div className="flex-shrink-0">
                            <input
                              type="datetime-local"
                              value={activityDeadlines[id] || ''}
                              onChange={(e) =>
                                setActivityDeadlines((prev) => ({ ...prev, [id]: e.target.value }))
                              }
                              className="px-2 py-1.5 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                            />
                          </div>

                          {/* Remove - only for newly selected activities */}
                          {!alreadyAssignedToCurrentPointer.has(id) ? (
                            <button
                              onClick={() => handleToggleActivity(id)}
                              className="flex-shrink-0 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition"
                              title="Remove"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          ) : (
                            <div className="flex-shrink-0 p-1.5" title="Cannot remove assigned activity">
                              <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Validation Warnings */}
                  {selectedCount > 1 && !isWeightageValid() && (
                    <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                      <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <p className="text-sm text-red-700">
                        Weightage must total <strong>100%</strong>. Current: <strong>{getTotalWeightage().toFixed(1)}%</strong>
                      </p>
                    </div>
                  )}
                  {!areDeadlinesValid() && (
                    <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                      <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm text-amber-700">All selected activities must have a deadline set.</p>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    onClick={handleSubmit}
                    disabled={
                      submitting ||
                      (selectedCount > 1 && !isWeightageValid()) ||
                      !areDeadlinesValid()
                    }
                    className="w-full bg-green-600 text-white py-2.5 px-4 rounded-lg font-semibold hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
                  >
                    {submitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Selecting...
                      </span>
                    ) : (
                      `Select ${selectedCount} Activity${selectedCount > 1 ? 'ies' : ''}`
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SelectActivitiesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
        </div>
      }
    >
      <SelectActivitiesContent />
    </Suspense>
  );
}
