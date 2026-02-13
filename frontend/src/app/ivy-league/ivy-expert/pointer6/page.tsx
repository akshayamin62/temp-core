'use client';

import { useState, useEffect, Suspense } from 'react';
import axios from 'axios';
import { useSearchParams } from 'next/navigation';
import { IVY_API_URL } from '@/lib/ivyApi';
import { fetchBlobUrl } from '@/lib/useBlobUrl';

interface Course {
  _id: string;
  srNo: number;
  platform: string;
  courseName: string;
  duration: string;
  fees: string;
  link: string;
  selected: boolean;
  startDate: string | null;
  endDate: string | null;
  certificateFileName?: string;
  certificateFileUrl?: string;
  certificateUploadedAt?: string;
  score?: number;
  scoredBy?: string;
  scoredAt?: string;
}

function Pointer6Content() {
  const searchParams = useSearchParams();
  const studentIvyServiceId = searchParams.get('studentIvyServiceId');
  const ivyExpertId = searchParams.get('ivyExpertId') || '';
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [coursesUploaded, setCoursesUploaded] = useState(false);
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [dateInputs, setDateInputs] = useState<{ [key: string]: { startDate: string; endDate: string } }>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pointer6Score, setPointer6Score] = useState<number | null>(null);
  const [scoringCourse, setScoringCourse] = useState<string | null>(null);
  const [scoreInputs, setScoreInputs] = useState<{ [key: string]: string }>({});
  const [certificateModal, setCertificateModal] = useState<{ isOpen: boolean; url: string | null }>({ isOpen: false, url: null });
  const [feedbacks, setFeedbacks] = useState<{ [key: string]: string }>({});
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every second for real-time countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // Update every second
    return () => clearInterval(timer);
  }, []);

  const getCountdown = (startDate: string | null, endDate: string | null, certificateFileName: string | undefined) => {
    if (!startDate || !endDate) return null;
    // Hide countdown when certificate is uploaded
    if (certificateFileName) return null;
    
    const now = currentTime.getTime();
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    
    if (now < start) {
      const diff = start - now;
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      return { status: 'upcoming', days, hours, minutes, seconds, label: 'Starts in' };
    } else if (now >= start && now <= end) {
      const diff = end - now;
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      return { status: 'ongoing', days, hours, minutes, seconds, label: 'Time remaining' };
    } else {
      return { status: 'overdue', days: 0, hours: 0, minutes: 0, seconds: 0, label: 'Pending course' };
    }
  };

  const fetchCourses = async () => {
    if (!studentIvyServiceId) return;
    setLoading(true);
    try {
      const response = await axios.get(`${IVY_API_URL}/pointer6/status`, {
        params: { studentIvyServiceId },
      });
      if (response.data.success && response.data.data.courses) {
        const coursesData = response.data.data.courses;
        setCourses(coursesData);
        setCoursesUploaded(coursesData.length > 0);
        
        // Initialize date inputs for selected courses
        const dates: { [key: string]: { startDate: string; endDate: string } } = {};
        coursesData.forEach((course: Course) => {
          if (course.selected && course.startDate && course.endDate) {
            dates[course._id] = {
              startDate: course.startDate.split('T')[0],
              endDate: course.endDate.split('T')[0],
            };
          }
        });
        setDateInputs(dates);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPointer6Score = async () => {
    if (!studentIvyServiceId) return;
    try {
      const response = await axios.get(`${IVY_API_URL}/pointer6/course-score/${studentIvyServiceId}`);
      if (response.data.success) {
        setPointer6Score(response.data.data.averageScore);
      }
    } catch (error) {
      console.error('Error fetching Pointer 6 score:', error);
    }
  };

  const handleScoreCertificate = async (courseId: string) => {
    const scoreValue = scoreInputs[courseId];
    if (!scoreValue) {
      setMessage({ type: 'error', text: 'Please enter a score' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    const score = parseFloat(scoreValue);
    if (isNaN(score) || score < 0 || score > 10) {
      setMessage({ type: 'error', text: 'Score must be between 0 and 10' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    setScoringCourse(courseId);
    try {
      await axios.post(`${IVY_API_URL}/pointer6/score-course-certificate`, {
        studentIvyServiceId,
        courseId,
        score,
        ivyExpertId,
      });

      // Update course in state
      setCourses(courses.map(c => c._id === courseId ? { 
        ...c, 
        score,
        scoredBy: ivyExpertId,
        scoredAt: new Date().toISOString()
      } : c));

      // Clear score input
      setScoreInputs(prev => {
        const newInputs = { ...prev };
        delete newInputs[courseId];
        return newInputs;
      });

      setMessage({ type: 'success', text: 'Score assigned successfully!' });
      setTimeout(() => setMessage(null), 3000);
      
      // Refresh pointer 6 score
      fetchPointer6Score();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to assign score' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setScoringCourse(null);
    }
  };

  useEffect(() => {
    fetchCourses();
    fetchPointer6Score();
  }, [studentIvyServiceId]);

  const handleUploadCourses = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!studentIvyServiceId) {
      setMessage({ type: 'error', text: 'Student Ivy Service ID is required' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    const formData = new FormData();
    formData.append('courseListFile', file);
    formData.append('studentIvyServiceId', studentIvyServiceId);
    formData.append('ivyExpertId', ivyExpertId);

    setUploading(true);
    try {
      const response = await axios.post(`${IVY_API_URL}/pointer6/course-list/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.success) {
        setMessage({ type: 'success', text: 'Courses uploaded successfully!' });
        setTimeout(() => setMessage(null), 3000);
        fetchCourses();
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to upload courses' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSelectCourse = async (courseId: string) => {
    const course = courses.find(c => c._id === courseId);
    if (!course) return;

    // Check if there's another selected course without certificate
    const selectedWithoutCertificate = courses.find(c => 
      c.selected && c._id !== courseId && !c.certificateFileUrl
    );

    if (selectedWithoutCertificate && !course.selected) {
      setMessage({ 
        type: 'error', 
        text: `Please complete the selected course "${selectedWithoutCertificate.courseName}" first by uploading a certificate.` 
      });
      setTimeout(() => setMessage(null), 5000);
      return;
    }

    if (course.selected) {
      // Unselect
      try {
        await axios.post(`${IVY_API_URL}/pointer6/unselect-course`, {
          studentIvyServiceId,
          courseId,
        });
        
        setCourses(courses.map(c => c._id === courseId ? { ...c, selected: false, startDate: null, endDate: null } : c));
        setExpandedCourse(null);
        setDateInputs(prev => {
          const newInputs = { ...prev };
          delete newInputs[courseId];
          return newInputs;
        });
        setMessage({ type: 'success', text: 'Course unselected successfully!' });
        setTimeout(() => setMessage(null), 3000);
      } catch (error: any) {
        setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to unselect course' });
        setTimeout(() => setMessage(null), 3000);
      }
    } else {
      // Expand to show date inputs
      setExpandedCourse(courseId);
      if (!dateInputs[courseId]) {
        setDateInputs(prev => ({ ...prev, [courseId]: { startDate: '', endDate: '' } }));
      }
    }
  };

  const handleDateChange = (courseId: string, field: 'startDate' | 'endDate', value: string) => {
    setDateInputs(prev => ({
      ...prev,
      [courseId]: {
        ...prev[courseId],
        [field]: value,
      }
    }));
  };

  const handleSaveDates = async (courseId: string) => {
    const dates = dateInputs[courseId];
    if (!dates || !dates.startDate || !dates.endDate) {
      setMessage({ type: 'error', text: 'Please select both start and end dates' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    if (new Date(dates.startDate) >= new Date(dates.endDate)) {
      setMessage({ type: 'error', text: 'Start date must be before end date' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    try {
      await axios.post(`${IVY_API_URL}/pointer6/select-course`, {
        studentIvyServiceId,
        courseId,
        startDate: dates.startDate,
        endDate: dates.endDate,
        userId: ivyExpertId,
      });

      setCourses(courses.map(c => c._id === courseId ? { 
        ...c, 
        selected: true, 
        startDate: dates.startDate,
        endDate: dates.endDate 
      } : c));
      setExpandedCourse(null);
      setMessage({ type: 'success', text: 'Course selected successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to select course' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  if (!studentIvyServiceId) {
    return (
      <div className="min-h-screen bg-brand-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-2xl shadow-xl p-12">
            <div className="bg-red-50 text-red-800 border border-red-200 p-6 rounded-2xl font-bold uppercase tracking-tight text-center">
              Student Ivy Service ID is required
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header with Score */}
          <div className="mb-8 flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Pointer 6: Engagement with Learning & Intellectual Curiosity
              </h1>
              <p className="text-gray-600">Manage and recommend courses for the student</p>
            </div>
            {pointer6Score != null && (
              <div className="bg-brand-100 rounded-lg p-4 text-center min-w-[120px]">
                <p className="text-sm text-brand-600 font-medium">Pointer 6 Score</p>
                <p className="text-3xl font-bold text-brand-900">{pointer6Score.toFixed(1)}</p>
                <p className="text-xs text-brand-500 mt-1">out of 10</p>
              </div>
            )}
          </div>

          {/* Upload Section */}
          <div className={`mb-8 border border-gray-200 rounded-lg p-6 ${coursesUploaded ? 'bg-gray-100' : 'bg-gray-50'}`}>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Course List</h2>
            <div className="flex items-center gap-4">
              <label className={`flex-1 flex items-center justify-center px-4 py-3 border-2 border-dashed rounded-lg transition-colors ${
                coursesUploaded 
                  ? 'border-gray-300 bg-gray-50 cursor-not-allowed opacity-60' 
                  : 'border-gray-300 cursor-pointer hover:border-brand-400 bg-white'
              }`}>
                <div className="text-center">
                  <svg className={`mx-auto h-12 w-12 ${coursesUploaded ? 'text-gray-300' : 'text-gray-400'}`} stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <p className={`mt-1 text-sm ${coursesUploaded ? 'text-gray-400' : 'text-gray-600'}`}>
                    {uploading ? 'Uploading...' : coursesUploaded ? 'Courses already uploaded' : 'Click to upload Excel file'}
                  </p>
                  <p className={`mt-1 text-xs ${coursesUploaded ? 'text-gray-400' : 'text-gray-500'}`}>.xlsx, .xls</p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept=".xlsx,.xls"
                  onChange={handleUploadCourses}
                  disabled={uploading || coursesUploaded}
                />
              </label>
            </div>
          </div>

          {/* Success/Error Message */}
          {message && (
            <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
              {message.text}
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mb-4"></div>
                <p className="text-gray-600">Loading courses...</p>
              </div>
            </div>
          ) : courses.length === 0 ? (
            <div className="text-center py-12">
              <svg
                className="w-20 h-20 mx-auto text-gray-400 mb-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">No Courses Uploaded</h2>
              <p className="text-gray-600">
                Upload an Excel file with course recommendations to get started.
              </p>
            </div>
          ) : (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Uploaded Courses ({courses.length})</h2>
              <div className="space-y-4">
                {courses.map((course) => {
                  const _countdown = course.selected && course.startDate && course.endDate && course.score == null
                    ? getCountdown(course.startDate, course.endDate, course.certificateFileName)
                    : null;
                  const isOverdue = _countdown?.status === 'overdue';
                  return (
                  <div key={course._id} className="relative border border-gray-200 rounded-lg overflow-hidden">
                    {/* Overdue Ribbon */}
                    {isOverdue && (
                      <div className="absolute top-0 left-0 w-28 h-28 overflow-hidden z-10 pointer-events-none">
                        <div className="absolute top-[14px] left-[-32px] w-[140px] text-center text-white text-[11px] font-extrabold uppercase tracking-wider py-1.5 bg-red-600 shadow-lg transform -rotate-45">
                          Overdue
                        </div>
                      </div>
                    )}
                    <div className="bg-white p-4">
                      <div className="flex items-start gap-4">
                        {/* Checkbox */}
                        <div className="flex items-center pt-1">
                          <input
                            type="checkbox"
                            checked={course.selected}
                            onChange={() => handleSelectCourse(course._id)}
                            disabled={!!(course.selected && course.startDate && course.endDate)}
                            className="w-5 h-5 text-brand-600 border-gray-300 rounded focus:ring-brand-500 cursor-pointer disabled:cursor-not-allowed"
                            title={course.selected && course.startDate && course.endDate ? "Cannot unselect - course has saved dates" : ""}
                          />
                        </div>

                        {/* Course Details */}
                        <div className="flex-1 grid grid-cols-6 gap-4">
                          <div className="flex items-center justify-center">
                            <div className="text-center">
                              <p className="text-xs text-gray-500 mb-1">Sr. No.</p>
                              <p className="font-medium text-gray-900">{course.srNo}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-center">
                            <div className="text-center">
                              <p className="text-xs text-gray-500 mb-1">Platform</p>
                              <p className="text-gray-900">{course.platform}</p>
                            </div>
                          </div>
                          <div className="col-span-2 flex items-center justify-center">
                            <div className="text-center">
                              <p className="text-xs text-gray-500 mb-1">Course Name</p>
                              <p className="text-gray-900">{course.courseName}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-center">
                            <div className="text-center">
                              <p className="text-xs text-gray-500 mb-1">Duration</p>
                              <p className="text-gray-900">{course.duration}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-center">
                            <div className="text-center">
                              <p className="text-xs text-gray-500 mb-1">Link</p>
                              <a
                                href={course.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-brand-600 hover:text-brand-900 underline font-medium text-sm"
                              >
                                View
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Real-time Countdown Display — hidden once certificate is uploaded */}
                      {course.selected && course.startDate && course.endDate && course.score == null && (() => {
                        const countdown = getCountdown(course.startDate, course.endDate, course.certificateFileName);
                        if (!countdown) return null;

                        const colorMap: Record<string, { bg: string; border: string; text: string; badge: string; unit: string }> = {
                          upcoming: { bg: 'bg-brand-50', border: 'border-brand-200', text: 'text-brand-700', badge: 'bg-brand-600', unit: 'text-brand-500' },
                          ongoing:  { bg: 'bg-brand-50', border: 'border-brand-200', text: 'text-brand-700', badge: 'bg-brand-600', unit: 'text-brand-500' },
                          overdue:  { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-600', unit: 'text-red-500' },
                        };
                        const c = colorMap[countdown.status] || colorMap.ongoing;

                        return (
                          <div className={`mt-3 p-4 ${c.bg} border ${c.border} rounded-xl`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full ${c.badge} text-white`}>
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </span>
                                <span className={`text-sm font-bold ${c.text} uppercase tracking-wide`}>{countdown.label}</span>
                              </div>

                              {countdown.status !== 'overdue' && (
                                <div className="flex items-center gap-2">
                                  {[{ value: countdown.days, label: 'Days' },
                                    { value: countdown.hours, label: 'Hrs' },
                                    { value: countdown.minutes, label: 'Min' },
                                    { value: countdown.seconds, label: 'Sec' }].map((item) => (
                                    <div key={item.label} className="flex flex-col items-center">
                                      <span className={`text-2xl font-black ${c.text} tabular-nums leading-none min-w-[2.5rem] text-center`}>
                                        {String(item.value).padStart(2, '0')}
                                      </span>
                                      <span className={`text-[10px] font-semibold ${c.unit} uppercase tracking-wider mt-0.5`}>{item.label}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Date Inputs - Show when selected or expanding */}
                      {(course.selected || expandedCourse === course._id) && (
                        <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
                          <div className="flex items-end gap-4">
                            <div className="flex-1">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Start Date
                              </label>
                              <input
                                type="date"
                                value={dateInputs[course._id]?.startDate || ''}
                                onChange={(e) => handleDateChange(course._id, 'startDate', e.target.value)}
                                disabled={course.selected}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:bg-gray-100 disabled:cursor-not-allowed text-gray-900 disabled:text-gray-900"
                              />
                            </div>
                            <div className="flex-1">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                End Date
                              </label>
                              <input
                                type="date"
                                value={dateInputs[course._id]?.endDate || ''}
                                onChange={(e) => handleDateChange(course._id, 'endDate', e.target.value)}
                                disabled={course.selected}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:bg-gray-100 disabled:cursor-not-allowed text-gray-900 disabled:text-gray-900"
                              />
                            </div>
                            {!course.selected && (
                              <button
                                onClick={() => handleSaveDates(course._id)}
                                className="px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-medium"
                              >
                                Save
                              </button>
                            )}
                          </div>

                          {/* Certificate Section - Show only for selected courses */}
                          {course.selected && (
                            <div className="p-4 bg-gray-50 rounded-lg">
                              <h3 className="text-sm font-semibold text-gray-700 mb-3">Course Certificate & Scoring</h3>
                              {course.certificateFileName ? (
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      <div>
                                        <p className="text-sm font-medium text-gray-900">{course.certificateFileName}</p>
                                        {course.certificateUploadedAt && (
                                          <p className="text-xs text-gray-500">
                                            Uploaded on {new Date(course.certificateUploadedAt).toLocaleDateString()}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                    <a
                                      onClick={async () => {
                                        if (!course.certificateFileUrl) {
                                          console.error('Certificate file URL is missing');
                                          return;
                                        }
                                        try {
                                          const blobUrl = await fetchBlobUrl(course.certificateFileUrl);
                                          setCertificateModal({ isOpen: true, url: blobUrl });
                                        } catch {
                                          console.error('Failed to load certificate');
                                        }
                                      }}
                                      className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors text-sm font-medium cursor-pointer"
                                    >
                                      View Certificate
                                    </a>
                                  </div>

                                  {/* Scoring Section */}
                                  <div className="flex items-end gap-3 pt-3 border-t border-gray-200">
                                    {course.score !== undefined && course.score !== null ? (
                                      <div className="flex items-center gap-3 flex-1">
                                        <div className="flex items-center gap-2 bg-brand-100 px-4 py-2 rounded-lg">
                                          <svg className="w-5 h-5 text-brand-600" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                          </svg>
                                          <span className="text-sm font-bold text-brand-900">Score: {course.score}/10</span>
                                        </div>
                                        {course.scoredAt && (
                                          <p className="text-xs text-gray-500">
                                            Scored on {new Date(course.scoredAt).toLocaleDateString()}
                                          </p>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="space-y-2 w-full">
                                        <div className="flex gap-2 w-full">
                                          <label className="flex-1 text-xs font-medium text-gray-700">
                                            Assign Score (0-10)
                                          </label>
                                          <label className="flex-1 text-xs font-medium text-gray-700">
                                            Feedback (Optional)
                                          </label>
                                          <div className="w-24"></div>
                                        </div>
                                        <div className="flex items-start gap-2 w-full">
                                          <input
                                            type="number"
                                            min="0"
                                            max="10"
                                            step="0.1"
                                            value={scoreInputs[course._id] || ''}
                                            onChange={(e) => setScoreInputs(prev => ({ ...prev, [course._id]: e.target.value }))}
                                            placeholder="Enter score"
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-gray-900"
                                          />
                                          <textarea
                                            value={feedbacks[course._id] || ''}
                                            onChange={(e) => setFeedbacks(prev => ({ ...prev, [course._id]: e.target.value }))}
                                            placeholder="Add feedback for the student..."
                                            rows={2}
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-gray-900 text-sm resize-none"
                                          />
                                          <button
                                            onClick={() => handleScoreCertificate(course._id)}
                                            disabled={scoringCourse === course._id}
                                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed h-fit whitespace-nowrap"
                                          >
                                            {scoringCourse === course._id ? 'Scoring...' : 'Submit Score'}
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 text-gray-500 text-sm">
                                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <span>Waiting for student to upload certificate</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Certificate Modal */}
      {certificateModal.isOpen && certificateModal.url && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Certificate View</h2>
              <button
                onClick={() => setCertificateModal({ isOpen: false, url: null })}
                className="text-gray-500 hover:text-gray-700 text-3xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              {certificateModal.url.endsWith('.pdf') ? (
                <iframe
                  src={certificateModal.url}
                  className="w-full h-[70vh] rounded-lg border border-gray-200"
                  title="Certificate"
                />
              ) : (
                <div className="flex items-center justify-center h-[70vh]">
                  <img
                    src={certificateModal.url}
                    alt="Certificate"
                    className="max-w-full max-h-full object-contain rounded-lg"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Pointer6Page() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <Pointer6Content />
    </Suspense>
  );
}
