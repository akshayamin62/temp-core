'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { authAPI, referrerAPI } from '@/lib/api';
import { User, USER_ROLE, LEAD_STAGE, SERVICE_TYPE } from '@/types';
import toast, { Toaster } from 'react-hot-toast';
import ReferrerLayout from '@/components/ReferrerLayout';

interface LeadDetail {
  _id: string;
  name: string;
  email: string;
  mobileNumber: string;
  city: string;
  serviceTypes: string[];
  stage: string;
  source: string;
  intake?: string;
  year?: string;
  parentDetail?: {
    firstName?: string;
    middleName?: string;
    lastName?: string;
    relationship?: string;
    mobileNumber?: string;
    email?: string;
    qualification?: string;
    occupation?: string;
  };
  createdAt: string;
}

export default function ReferrerLeadDetailPage() {
  const router = useRouter();
  const params = useParams();
  const leadId = params.leadId as string;

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [lead, setLead] = useState<LeadDetail | null>(null);

  // Student info for converted leads
  const [studentId, setStudentId] = useState<string | null>(null);
  const [loadingStudentId, setLoadingStudentId] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      fetchLead();
    }
  }, [user, leadId]);

  useEffect(() => {
    if (lead?.stage === LEAD_STAGE.CONVERTED) {
      fetchStudentId();
    }
  }, [lead]);

  const checkAuth = async () => {
    try {
      const response = await authAPI.getProfile();
      const userData = response.data.data.user;

      if (userData.role !== USER_ROLE.REFERRER) {
        toast.error('Access denied. Referrer only.');
        router.push('/');
        return;
      }

      setUser(userData);
    } catch (error) {
      toast.error('Please login to continue');
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchLead = async () => {
    try {
      const response = await referrerAPI.getLeadDetail(leadId);
      setLead(response.data.data.lead);
    } catch (error: any) {
      console.error('Error fetching lead:', error);
      if (error.response?.status === 404) {
        toast.error('Lead not found or access denied');
        router.push('/referrer/leads');
      } else {
        toast.error('Failed to fetch lead details');
      }
    }
  };

  const fetchStudentId = async () => {
    try {
      setLoadingStudentId(true);
      const response = await referrerAPI.getStudentByLeadId(leadId);
      if (response.data.data.student) {
        setStudentId(response.data.data.student._id);
      }
    } catch (error) {
      console.error('Error fetching student ID:', error);
    } finally {
      setLoadingStudentId(false);
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case LEAD_STAGE.NEW: return 'bg-blue-100 text-blue-800 border-blue-200';
      case LEAD_STAGE.HOT: return 'bg-red-100 text-red-800 border-red-200';
      case LEAD_STAGE.WARM: return 'bg-orange-100 text-orange-800 border-orange-200';
      case LEAD_STAGE.COLD: return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case LEAD_STAGE.CONVERTED: return 'bg-green-100 text-green-800 border-green-200';
      case LEAD_STAGE.CLOSED: return 'bg-gray-100 text-gray-600 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getServiceColor = (service: string) => {
    switch (service) {
      case SERVICE_TYPE.CAREER_FOCUS_STUDY_ABROAD: return 'bg-indigo-100 text-indigo-800';
      case SERVICE_TYPE.IVY_LEAGUE_ADMISSION: return 'bg-amber-100 text-amber-800';
      case SERVICE_TYPE.EDUCATION_PLANNING: return 'bg-teal-100 text-teal-800';
      case SERVICE_TYPE.COACHING_CLASSES: return 'bg-rose-100 text-rose-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !lead) return null;

  return (
    <>
      <Toaster position="top-right" />
      <ReferrerLayout user={user}>
        <div className="p-8">
          {/* Back Button & Header */}
          <div className="mb-6">
            <button
              onClick={() => router.push('/referrer/leads')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Leads
            </button>

            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">{lead.name}</h2>
                <p className="text-gray-600 mt-1">Lead Details</p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span className="text-sm font-medium">Read-only access</span>
              </div>
            </div>
          </div>

          {/* Main Info Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Contact Information Card */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Contact Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Mobile Number</label>
                  <p className="text-gray-900 font-medium">{lead.mobileNumber}</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Email Address</label>
                  <p className="text-gray-900 text-sm break-all">{lead.email}</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">City</label>
                  <p className="text-gray-900 font-medium">{lead.city || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Submitted On</label>
                  <p className="text-gray-900">
                    {new Date(lead.createdAt).toLocaleString('en-GB', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
                {lead.intake && (
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Intake</label>
                    <p className="text-gray-900 font-medium">{lead.intake}</p>
                  </div>
                )}
                {lead.year && (
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Year</label>
                    <p className="text-gray-900 font-medium">{lead.year}</p>
                  </div>
                )}
              </div>

              {/* Parent Detail */}
              {lead.parentDetail && (
                <>
                  <hr className="my-4 border-gray-200" />
                  <h4 className="text-md font-bold text-gray-900 mb-3">Parent Detail</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">Name</label>
                      <p className="text-gray-900 font-medium">
                        {[lead.parentDetail.firstName, lead.parentDetail.middleName, lead.parentDetail.lastName].filter(Boolean).join(' ')}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">Relationship</label>
                      <p className="text-gray-900 font-medium capitalize">{lead.parentDetail.relationship}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">Mobile Number</label>
                      <p className="text-gray-900 font-medium">{lead.parentDetail.mobileNumber}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">Email Address</label>
                      <p className="text-gray-900 text-sm break-all">{lead.parentDetail.email}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">Qualification</label>
                      <p className="text-gray-900 font-medium">{lead.parentDetail.qualification}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">Occupation</label>
                      <p className="text-gray-900 font-medium">{lead.parentDetail.occupation}</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Right Column - Stage + Services */}
            <div className="space-y-4">
              {/* Stage Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <h3 className="text-sm font-bold text-gray-900 mb-2">Stage</h3>
                <div className={`w-full px-3 py-2 rounded-lg border-2 text-sm font-medium ${getStageColor(lead.stage)}`}>
                  {lead.stage}
                </div>

                {/* View Student Info for converted leads */}
                {lead.stage === LEAD_STAGE.CONVERTED && (
                  <div className="mt-3">
                    {loadingStudentId ? (
                      <div className="flex items-center justify-center py-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      </div>
                    ) : studentId ? (
                      <button
                        onClick={() => router.push(`/referrer/students/${studentId}`)}
                        className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        View Student Info
                      </button>
                    ) : (
                      <p className="text-xs text-gray-500 text-center mt-2">Student data not available</p>
                    )}
                  </div>
                )}
              </div>

              {/* Services Interested Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <h3 className="text-sm font-bold text-gray-900 mb-2">Services Interested</h3>
                <div className="flex flex-wrap gap-1.5">
                  {lead.serviceTypes?.map((service, idx) => (
                    <span key={idx} className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getServiceColor(service)}`}>
                      {service}
                    </span>
                  )) || <span className="text-gray-500 text-sm">N/A</span>}
                </div>
              </div>

              {/* Source Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <h3 className="text-sm font-bold text-gray-900 mb-2">Source</h3>
                <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                  Referral
                </span>
              </div>
            </div>
          </div>
        </div>
      </ReferrerLayout>
    </>
  );
}
