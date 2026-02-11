'use client';

import { useState, useEffect, Suspense } from 'react';
import axios from 'axios';
import { useStudentService } from '../useStudentService';
import { IVY_API_URL } from '@/lib/ivyApi';

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
  certificateFileName: string | null;
  certificateFileUrl: string | null;
  certificateUploadedAt: string | null;
  score: number | null;
  scoredBy: string | null;
  scoredAt: string | null;
}

function Pointer6Content() {
  const { studentId, studentIvyServiceId, loading: serviceLoading, error: serviceError } = useStudentService();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [pointer6Score, setPointer6Score] = useState<number | null>(null);
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [dateInputs, setDateInputs] = useState<{ [key: string]: { startDate: string; endDate: string } }>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every second for real-time countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // Update every second
    return () => clearInterval(timer);
  }, []);

  const getCountdown = (startDate: string | null, endDate: string | null, certificateFileName: string | null) => {
    if (!startDate || !endDate) return null;
    // If certificate is uploaded, course is completed — no countdown needed
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
      return { status: 'overdue', days: 0, hours: 0, minutes: 0, seconds: 0, label: 'Complete the course and upload the certificate' };
    }
  };

  useEffect(() => {
    if (!studentIvyServiceId) return;

    const fetchCourses = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${IVY_API_URL}/pointer6/status`, {
          params: { studentIvyServiceId },
        });
        if (response.data.success && response.data.data.courses) {
          const coursesData = response.data.data.courses;
          setCourses(coursesData);
          
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
      try {
        const response = await axios.get(`${IVY_API_URL}/pointer6/course-score`, {
          params: { studentIvyServiceId },
        });
        if (response.data.success && response.data.data.score !== undefined) {
          setPointer6Score(response.data.data.score);
        }
      } catch (error) {
        console.error('Error fetching pointer6 score:', error);
      }
    };

    fetchCourses();
    fetchPointer6Score();
  }, [studentIvyServiceId]);

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
        userId: studentId,
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

  const handleUploadCertificate = async (courseId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('certificate', file);
    formData.append('studentIvyServiceId', studentIvyServiceId!);
    formData.append('courseId', courseId);
    formData.append('studentId', studentId!);

    setUploading(courseId);
    try {
      const response = await axios.post(`${IVY_API_URL}/pointer6/upload-course-certificate`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.success) {
        setCourses(courses.map(c => c._id === courseId ? { 
          ...c,
          certificateFileName: response.data.data.certificateFileName,
          certificateFileUrl: response.data.data.certificateFileUrl,
          certificateUploadedAt: response.data.data.certificateUploadedAt,
        } : c));
        setMessage({ type: 'success', text: 'Certificate uploaded successfully!' });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to upload certificate' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setUploading(null);
      e.target.value = '';
    }
  };

  if (!studentIvyServiceId && !serviceLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-2xl shadow-xl p-12">
            <div className="bg-red-50 text-red-800 border border-red-200 p-6 rounded-2xl font-bold uppercase tracking-tight text-center">
              {serviceError || 'Student Ivy Service ID is required.'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (serviceLoading) {
    return <div className="p-20 text-center text-gray-500">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header with Score */}
          <div className="mb-8 flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Pointer 6: Engagement with Learning & Intellectual Curiosity
              </h1>
              <p className="text-gray-600">Select courses you want to pursue</p>
            </div>
            {pointer6Score != null && (
              <div className="bg-white p-10 rounded-[3rem] shadow-2xl border-4 border-indigo-50 flex flex-col items-center justify-center text-center scale-110 md:mr-10">
                <span className="text-[10px] font-black tracking-[0.3em] text-gray-400 uppercase mb-2">Current Mean Score</span>
                <div className="text-7xl font-black text-indigo-600 leading-none">{typeof pointer6Score === 'number' ? pointer6Score.toFixed(1) : '0.00'}</div>
              </div>
            )}
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
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                <p className="text-gray-600">Loading courses...</p>
              </div>
            </div>
          ) : courses.length === 0 ? (
            <div className="text-center py-12">
              <svg
                className="w-20 h-20 mx-auto text-indigo-600 animate-pulse mb-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">No Courses Yet</h2>
              <p className="text-gray-600">
                Your Ivy Expert will upload recommended courses soon. Stay tuned!
              </p>
            </div>
          ) : (
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
                          className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer disabled:cursor-not-allowed"
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
                              className="text-indigo-600 hover:text-indigo-900 underline font-medium text-sm"
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
                        upcoming: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-600', unit: 'text-blue-500' },
                        ongoing:  { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-600', unit: 'text-blue-500' },
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
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed text-gray-900 disabled:text-gray-900"
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
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed text-gray-900 disabled:text-gray-900"
                            />
                          </div>
                          {!course.selected && (
                            <button
                              onClick={() => handleSaveDates(course._id)}
                              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                            >
                              Save
                            </button>
                          )}
                        </div>

                        {/* Certificate Upload Section - Show only for selected courses without certificate */}
                        {course.selected && !course.certificateFileName && (
                          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-2 flex-1">
                              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                              </svg>
                              <span className="text-sm text-gray-600">No certificate uploaded yet</span>
                            </div>
                            <div>
                              <input
                                type="file"
                                id={`certificate-${course._id}`}
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) => handleUploadCertificate(course._id, e)}
                                className="hidden"
                              />
                              <label
                                htmlFor={`certificate-${course._id}`}
                                className={`px-4 py-2 rounded-lg font-medium cursor-pointer inline-block transition-colors ${
                                  uploading === course._id
                                    ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                }`}
                              >
                                {uploading === course._id ? 'Uploading...' : 'Upload Certificate'}
                              </label>
                            </div>
                          </div>
                        )}

                        {/* Certificate Display - Show only after upload */}
                        {course.selected && course.certificateFileName && (
                          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3 flex-1">
                              <div className="flex items-center gap-2">
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
                              {course.score !== undefined && course.score !== null && (
                                <div className="ml-auto flex items-center gap-2 bg-indigo-100 px-3 py-1 rounded-full">
                                  <svg className="w-4 h-4 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                  </svg>
                                  <span className="text-sm font-bold text-indigo-900">{course.score}/10</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
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

export default function Pointer6Page() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <Pointer6Content />
    </Suspense>
  );
}
