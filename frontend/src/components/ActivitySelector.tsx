"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import DocumentViewer from "./DocumentViewer";
import { IVY_API_URL } from '@/lib/ivyApi';

interface Activity {
  _id: string;
  title: string;
  description: string;
  pointerNo: number;
  documentUrl?: string;
  documentName?: string;
  source: 'EXCEL' | 'SUPERADMIN';
  createdAt: string;
}

interface ActivitySelectorProps {
  pointerNo: 2 | 3 | 4;
}

export default function ActivitySelector({ pointerNo }: ActivitySelectorProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(
    null
  );
  const [showViewer, setShowViewer] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, [pointerNo]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${IVY_API_URL}/activities?pointerNo=${pointerNo}`
      );
      if (response.data.success) {
        setActivities(response.data.data);
      }
    } catch (err) {
      console.error("Error fetching activities:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleActivityClick = (activity: Activity) => {
    if (activity.documentUrl) {
      setSelectedActivity(activity);
      setShowViewer(true);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">
          Available Activities
        </h3>
        <p className="text-gray-500">Loading activities...</p>
      </div>
    );
  }

  if (activities.length === 0) {
    return null; // Don't show the section if there are no activities
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">
          Available Activities
        </h3>
        <div className="space-y-3">
          {activities.map((activity) => (
            <button
              key={activity._id}
              onClick={() => handleActivityClick(activity)}
              className="w-full text-left bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg p-4 transition"
              disabled={!activity.documentUrl}
            >
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-semibold text-gray-800">
                    {activity.title}
                  </h4>
                  {activity.documentName && (
                    <p className="text-sm text-gray-600 mt-1">
                      📄 {activity.documentName}
                    </p>
                  )}
                </div>
                {activity.documentUrl && (
                  <div className="text-blue-600">
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {showViewer && selectedActivity && selectedActivity.documentUrl && (
        <DocumentViewer
          documentUrl={selectedActivity.documentUrl}
          documentName={selectedActivity.documentName || selectedActivity.title}
          onClose={() => setShowViewer(false)}
        />
      )}
    </>
  );
}
