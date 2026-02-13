'use client';

import { useState } from 'react';
import axios from 'axios';
import { IVY_API_URL } from '@/lib/ivyApi';

interface AgentSuggestion {
  _id: string;
  title: string;
  description: string;
  tags: string[];
  pointerNo: number;
}

export default function AgentSuggestionsPage() {
  const [studentInterest, setStudentInterest] = useState<string>('');
  const [selectedPointer, setSelectedPointer] = useState<number | ''>(2);
  const [suggestions, setSuggestions] = useState<AgentSuggestion[]>([]);
  const [selectedActivities, setSelectedActivities] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleFetchSuggestions = async () => {
    if (!studentInterest.trim()) {
      setMessage({ type: 'error', text: 'Please enter student interest' });
      return;
    }

    if (!selectedPointer) {
      setMessage({ type: 'error', text: 'Please select a pointer' });
      return;
    }

    setLoading(true);
    setMessage(null);
    setSelectedActivities(new Set()); // Clear selections when fetching new suggestions

    try {
      const response = await axios.get<AgentSuggestion[]>(
        `${IVY_API_URL}/agent-suggestions`,
        {
          params: {
            studentInterest: studentInterest.trim(),
            pointerNo: selectedPointer,
          },
        }
      );

      setSuggestions(response.data);
      if (response.data.length === 0) {
        setMessage({
          type: 'error',
          text: 'No suitable activities found.',
        });
      }
    } catch (error: any) {
      console.error('Error fetching agent suggestions:', error);
      const errorMessage =
        error.response?.data?.message || 'Failed to load agent suggestions';
      setMessage({ type: 'error', text: errorMessage });
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActivity = (activityId: string) => {
    const newSelected = new Set(selectedActivities);
    if (newSelected.has(activityId)) {
      newSelected.delete(activityId);
    } else {
      newSelected.add(activityId);
    }
    setSelectedActivities(newSelected);
  };

  const getPointerLabel = (pointerNo: number): string => {
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

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Agent Suggestions</h1>

        <div className="space-y-6">
          {/* Student Interest Input */}
          <div>
            <label
              htmlFor="studentInterest"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Student Interest
            </label>
            <textarea
              id="studentInterest"
              value={studentInterest}
              onChange={(e) => setStudentInterest(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-gray-900 bg-white resize-y"
              placeholder="Enter student's primary interest here..."
            />
          </div>

          {/* Pointer Selection */}
          <div>
            <label
              htmlFor="pointer"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Select Pointer
            </label>
            <select
              id="pointer"
              value={selectedPointer}
              onChange={(e) => setSelectedPointer(e.target.value ? parseInt(e.target.value, 10) : '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-gray-900 bg-white"
            >
              <option value="">-- Select Pointer --</option>
              <option value="2">Pointer 2: Spike in One Area</option>
              <option value="3">Pointer 3: Leadership & Initiative</option>
              <option value="4">Pointer 4: Global & Social Impact</option>
            </select>
          </div>

          {/* Fetch Button */}
          <div>
            <button
              type="button"
              onClick={handleFetchSuggestions}
              disabled={loading || !studentInterest.trim() || !selectedPointer}
              className="w-full bg-brand-600 text-white py-2 px-4 rounded-md hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Fetching Suggestions...' : 'Get Suggestions'}
            </button>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-8">
              <div className="text-gray-500">Loading suggestions...</div>
            </div>
          )}

          {/* Error or Info Message */}
          {message && !loading && (
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

          {/* Suggestions List */}
          {!loading && suggestions.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  {getPointerLabel(selectedPointer as number)} - Suitable Activities
                </h2>
                <span className="text-sm text-gray-500">
                  {suggestions.length} activit{suggestions.length !== 1 ? 'ies' : 'y'}
                  {selectedActivities.size > 0 && ` • ${selectedActivities.size} selected`}
                </span>
              </div>

              <div className="space-y-3">
                {suggestions.map((suggestion) => (
                  <div
                    key={suggestion._id}
                    className={`border rounded-lg p-4 transition-all ${
                      selectedActivities.has(suggestion._id)
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-gray-200 bg-white hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id={`activity-${suggestion._id}`}
                        checked={selectedActivities.has(suggestion._id)}
                        onChange={() => handleToggleActivity(suggestion._id)}
                        className="mt-1 h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300 rounded"
                      />
                      <div className="flex-1">
                        <label
                          htmlFor={`activity-${suggestion._id}`}
                          className="cursor-pointer"
                        >
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {suggestion.title}
                          </h3>
                          <p className="text-gray-700 mb-3 whitespace-pre-wrap">
                            {suggestion.description}
                          </p>
                          {suggestion.tags && suggestion.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {suggestion.tags.map((tag, tagIndex) => (
                                <span
                                  key={tagIndex}
                                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!loading && !message && suggestions.length === 0 && studentInterest && selectedPointer && (
            <div className="text-center py-12 text-gray-500">
              <p>Click "Get Suggestions" to fetch activities.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
