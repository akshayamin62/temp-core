"use client";

import { useState, useEffect } from "react";
import ivyApi from "@/lib/ivyApi";

interface Activity {
  _id: string;
  title: string;
  description: string;
  pointerNo: number;
  documentUrl?: string;
  documentName?: string;
  source: string;
  createdAt: string;
}

const POINTER_LABELS: Record<number, string> = {
  2: "Spike in one area",
  3: "Leadership & Initiative",
  4: "Global & Social Impact",
};

export default function SuperAdminActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    pointerNo: "2",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingActivities, setFetchingActivities] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPointer, setFilterPointer] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchActivities();
  }, []);

  // Auto-dismiss success/error messages
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess("");
        setError("");
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  const fetchActivities = async () => {
    setFetchingActivities(true);
    try {
      const response = await ivyApi.get("/activities");
      if (response.data.success) {
        setActivities(response.data.data);
      }
    } catch (err) {
      console.error("Error fetching activities:", err);
    } finally {
      setFetchingActivities(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!formData.name.trim()) {
      setError("Activity name is required");
      return;
    }

    if (!formData.description.trim()) {
      setError("Activity description is required");
      return;
    }

    if (!selectedFile) {
      setError("Please select a Word document");
      return;
    }

    setLoading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("name", formData.name);
      formDataToSend.append("description", formData.description);
      formDataToSend.append("pointerNo", formData.pointerNo);
      formDataToSend.append("document", selectedFile);

      const response = await ivyApi.post("/activities", formDataToSend, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data.success) {
        setSuccess("Activity created successfully!");
        setFormData({ name: "", description: "", pointerNo: "2" });
        setSelectedFile(null);
        setShowForm(false);
        fetchActivities();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create activity");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this activity?")) {
      return;
    }

    setDeletingId(id);
    try {
      const response = await ivyApi.delete(`/activities/${id}`);

      if (response.data.success) {
        setSuccess("Activity deleted successfully!");
        fetchActivities();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to delete activity");
    } finally {
      setDeletingId(null);
    }
  };

  const filteredActivities = activities.filter((activity) => {
    const matchesSearch =
      !searchQuery ||
      activity.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPointer =
      filterPointer === null || activity.pointerNo === filterPointer;
    return matchesSearch && matchesPointer;
  });

  const activityCounts = {
    all: activities.length,
    2: activities.filter((a) => a.pointerNo === 2).length,
    3: activities.filter((a) => a.pointerNo === 3).length,
    4: activities.filter((a) => a.pointerNo === 4).length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <div className="bg-white border-b border-blue-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Activity Management
                </h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  Create and manage activities for Pointer 2, 3 & 4
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 shadow-md ${
                showForm
                  ? "bg-gray-100 text-gray-700 hover:bg-gray-200 shadow-none"
                  : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-blue-200"
              }`}
            >
              {showForm ? (
                <>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                  Close Form
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Add Activity
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Toast Messages */}
        {(error || success) && (
          <div
            className={`mb-6 flex items-center gap-3 p-4 rounded-xl border shadow-sm transition-all duration-300 ${
              error
                ? "bg-red-50 border-red-200 text-red-800"
                : "bg-emerald-50 border-emerald-200 text-emerald-800"
            }`}
          >
            <span
              className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                error ? "bg-red-100" : "bg-emerald-100"
              }`}
            >
              {error ? (
                <svg
                  className="w-4 h-4 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4 text-emerald-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </span>
            <span className="text-sm font-medium">{error || success}</span>
          </div>
        )}

        {/* Add Activity Form */}
        {showForm && (
          <div className="mb-8 bg-white rounded-2xl shadow-lg border border-blue-100 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Create New Activity
              </h2>
              <p className="text-blue-100 text-sm mt-1">
                Fill in the details below to add a new activity suggestion
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Activity Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-gray-50 hover:bg-white transition-colors placeholder:text-gray-400"
                      placeholder="e.g. Science Olympiad, Research Internship..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Pointer Category <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        {
                          value: "2",
                          label: "Pointer 2",
                          sublabel: "Spike in one area",
                          icon: "🏆",
                        },
                        {
                          value: "3",
                          label: "Pointer 3",
                          sublabel: "Leadership & Initiative",
                          icon: "🔬",
                        },
                        {
                          value: "4",
                          label: "Pointer 4",
                          sublabel: "Global & Social Impact",
                          icon: "🤝",
                        },
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              pointerNo: option.value,
                            })
                          }
                          className={`relative flex flex-col items-center p-3 rounded-xl border-2 transition-all duration-200 ${
                            formData.pointerNo === option.value
                              ? "border-blue-500 bg-blue-50 shadow-md shadow-blue-100"
                              : "border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50/50"
                          }`}
                        >
                          <span className="text-xl mb-1">{option.icon}</span>
                          <span
                            className={`text-xs font-bold ${
                              formData.pointerNo === option.value
                                ? "text-blue-700"
                                : "text-gray-700"
                            }`}
                          >
                            {option.label}
                          </span>
                          <span
                            className={`text-[10px] mt-0.5 ${
                              formData.pointerNo === option.value
                                ? "text-blue-500"
                                : "text-gray-400"
                            }`}
                          >
                            {option.sublabel}
                          </span>
                          {formData.pointerNo === option.value && (
                            <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                              <svg
                                className="w-3 h-3 text-white"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={3}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Document <span className="text-red-500">*</span>
                      <span className="font-normal text-gray-400 ml-1">
                        (Word files only)
                      </span>
                    </label>
                    <div
                      className={`relative border-2 border-dashed rounded-xl p-4 text-center transition-all duration-200 cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 ${
                        selectedFile
                          ? "border-blue-400 bg-blue-50"
                          : "border-gray-200 bg-gray-50"
                      }`}
                      onClick={() =>
                        document.getElementById("file-upload")?.click()
                      }
                    >
                      <input
                        id="file-upload"
                        type="file"
                        accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        onChange={(e) =>
                          setSelectedFile(
                            e.target.files ? e.target.files[0] : null
                          )
                        }
                        className="hidden"
                      />
                      {selectedFile ? (
                        <div className="flex items-center justify-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <svg
                              className="w-5 h-5 text-blue-600"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                              />
                            </svg>
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-semibold text-blue-700 truncate max-w-[200px]">
                              {selectedFile.name}
                            </p>
                            <p className="text-xs text-blue-500">
                              {(selectedFile.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedFile(null);
                            }}
                            className="ml-2 p-1 rounded-full hover:bg-blue-200 text-blue-600"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <>
                          <svg
                            className="w-8 h-8 text-gray-400 mx-auto mb-2"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                            />
                          </svg>
                          <p className="text-sm text-gray-500">
                            Click to upload or drag & drop
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            .doc, .docx files
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column — Description */}
                <div className="flex flex-col">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="flex-1 min-h-[200px] w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-gray-50 hover:bg-white transition-colors resize-none placeholder:text-gray-400"
                    placeholder="Describe the activity, its objectives, expected outcomes, and any specific requirements..."
                  />
                  <p className="text-xs text-gray-400 mt-2 text-right">
                    {formData.description.length} characters
                  </p>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setFormData({ name: "", description: "", pointerNo: "2" });
                    setSelectedFile(null);
                    setShowForm(false);
                  }}
                  className="px-5 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-md shadow-blue-200 disabled:shadow-none"
                >
                  {loading ? (
                    <>
                      <svg
                        className="animate-spin h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Creating...
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      Create Activity
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: "All Activities",
              count: activityCounts.all,
              pointer: null,
              color: "blue",
              icon: "📋",
            },
            {
              label: "Spike in one area",
              count: activityCounts[2],
              pointer: 2,
              color: "violet",
              icon: "🏆",
            },
            {
              label: "Leadership & Initiative",
              count: activityCounts[3],
              pointer: 3,
              color: "cyan",
              icon: "🔬",
            },
            {
              label: "Global & Social Impact",
              count: activityCounts[4],
              pointer: 4,
              color: "emerald",
              icon: "🤝",
            },
          ].map((stat) => {
            const isActive = filterPointer === stat.pointer;
            const colorClasses: Record<
              string,
              {
                bg: string;
                border: string;
                text: string;
                count: string;
                activeBg: string;
              }
            > = {
              blue: {
                bg: "bg-blue-50",
                border: "border-blue-200",
                text: "text-blue-700",
                count: "text-blue-900",
                activeBg: "bg-blue-100",
              },
              violet: {
                bg: "bg-violet-50",
                border: "border-violet-200",
                text: "text-violet-700",
                count: "text-violet-900",
                activeBg: "bg-violet-100",
              },
              cyan: {
                bg: "bg-cyan-50",
                border: "border-cyan-200",
                text: "text-cyan-700",
                count: "text-cyan-900",
                activeBg: "bg-cyan-100",
              },
              emerald: {
                bg: "bg-emerald-50",
                border: "border-emerald-200",
                text: "text-emerald-700",
                count: "text-emerald-900",
                activeBg: "bg-emerald-100",
              },
            };
            const c = colorClasses[stat.color];
            return (
              <button
                key={stat.label}
                onClick={() =>
                  setFilterPointer(isActive ? null : stat.pointer)
                }
                className={`relative p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                  isActive
                    ? `${c.activeBg} ${c.border} shadow-md`
                    : `bg-white border-gray-100 hover:${c.border} hover:shadow-sm`
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xl">{stat.icon}</span>
                  {isActive && (
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider ${c.text} bg-white/60 px-2 py-0.5 rounded-full`}
                    >
                      Active
                    </span>
                  )}
                </div>
                <p
                  className={`text-2xl font-black ${
                    isActive ? c.count : "text-gray-900"
                  }`}
                >
                  {stat.count}
                </p>
                <p
                  className={`text-xs font-semibold mt-0.5 ${
                    isActive ? c.text : "text-gray-500"
                  }`}
                >
                  {stat.label}
                </p>
              </button>
            );
          })}
        </div>

        {/* Search & Filter Bar */}
        <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search activities by name or description..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white text-sm placeholder:text-gray-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
          <div className="text-sm text-gray-500 whitespace-nowrap px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-center">
            Showing{" "}
            <span className="font-bold text-blue-700">
              {filteredActivities.length}
            </span>{" "}
            of{" "}
            <span className="font-bold text-gray-700">
              {activities.length}
            </span>{" "}
            activities
          </div>
        </div>

        {/* Activities List */}
        <div className="bg-white rounded-2xl shadow-lg border border-blue-50 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 10h16M4 14h16M4 18h16"
                />
              </svg>
              {filterPointer
                ? `Pointer ${filterPointer} — ${POINTER_LABELS[filterPointer]}`
                : "All Activities"}
            </h2>
            {filterPointer && (
              <button
                onClick={() => setFilterPointer(null)}
                className="text-blue-100 hover:text-white text-xs font-semibold bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                Clear Filter
              </button>
            )}
          </div>

          {fetchingActivities ? (
            <div className="p-12 text-center">
              <svg
                className="animate-spin h-8 w-8 text-blue-500 mx-auto mb-3"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <p className="text-gray-500 text-sm">Loading activities...</p>
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-blue-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <p className="text-gray-700 font-semibold mb-1">
                No activities found
              </p>
              <p className="text-gray-400 text-sm">
                {searchQuery || filterPointer
                  ? "Try adjusting your search or filter."
                  : 'Click "Add Activity" to create your first one.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredActivities.map((activity, index) => {
                const pointerColors: Record<
                  number,
                  { bg: string; text: string; dot: string }
                > = {
                  2: {
                    bg: "bg-violet-100",
                    text: "text-violet-700",
                    dot: "bg-violet-500",
                  },
                  3: {
                    bg: "bg-cyan-100",
                    text: "text-cyan-700",
                    dot: "bg-cyan-500",
                  },
                  4: {
                    bg: "bg-emerald-100",
                    text: "text-emerald-700",
                    dot: "bg-emerald-500",
                  },
                };
                const pc =
                  pointerColors[activity.pointerNo] || pointerColors[2];
                return (
                  <div
                    key={activity._id}
                    className="p-5 hover:bg-blue-50/30 transition-colors group"
                  >
                    <div className="flex items-start gap-4">
                      {/* Number Badge */}
                      <div className="flex-shrink-0 w-9 h-9 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-center">
                        <span className="text-sm font-bold text-blue-600">
                          {index + 1}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h3 className="text-base font-bold text-gray-900 truncate">
                                {activity.title}
                              </h3>
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${pc.bg} ${pc.text}`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${pc.dot}`}
                                ></span>
                                Pointer {activity.pointerNo}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                              {activity.description}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-gray-400">
                              {activity.documentName && (
                                <span className="flex items-center gap-1">
                                  <svg
                                    className="w-3.5 h-3.5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                    />
                                  </svg>
                                  {activity.documentName}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <svg
                                  className="w-3.5 h-3.5"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                  />
                                </svg>
                                {new Date(activity.createdAt).toLocaleDateString(
                                  "en-US",
                                  {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  }
                                )}
                              </span>
                            </div>
                          </div>

                          {/* Delete Button */}
                          <button
                            onClick={() => handleDelete(activity._id)}
                            disabled={deletingId === activity._id}
                            className="flex-shrink-0 p-2 rounded-lg text-gray-300 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all duration-200 disabled:opacity-50"
                            title="Delete activity"
                          >
                            {deletingId === activity._id ? (
                              <svg
                                className="animate-spin w-5 h-5 text-red-500"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                ></circle>
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                ></path>
                              </svg>
                            ) : (
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
