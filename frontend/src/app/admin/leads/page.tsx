'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, leadAPI, leadConversionAPI } from '@/lib/api';
import { User, USER_ROLE, Lead, LEAD_STAGE, SERVICE_TYPE } from '@/types';
import AdminLayout from '@/components/AdminLayout';
import toast, { Toaster } from 'react-hot-toast';
import { getFullName } from '@/utils/nameHelpers';

export default function AdminLeadsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [counselors, setCounselors] = useState<any[]>([]);
  const [enquiryFormUrl, setEnquiryFormUrl] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState(false);

  // Filters
  const [stageFilter, setStageFilter] = useState<string>('');
  const [selectedStageCard, setSelectedStageCard] = useState<string | null>(null); // For clickable cards
  const [serviceFilter, setServiceFilter] = useState<string>('');
  const [counselorFilter, setCounselorFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Assignment modal
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedCounselorId, setSelectedCounselorId] = useState<string>('');
  const [assigning, setAssigning] = useState(false);

  // Conversion approval
  const [approving, setApproving] = useState<string | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectLeadId, setRejectLeadId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      fetchLeads();
      fetchCounselors();
      fetchEnquiryFormUrl();
    }
  }, [user, stageFilter, serviceFilter, counselorFilter]);

  const checkAuth = async () => {
    try {
      const response = await authAPI.getProfile();
      const userData = response.data.data.user;

      if (userData.role !== USER_ROLE.ADMIN) {
        toast.error('Access denied. Admin only.');
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

  const fetchLeads = async () => {
    try {
      const params: any = {};
      if (stageFilter) params.stage = stageFilter;
      if (serviceFilter) params.serviceTypes = serviceFilter;
      if (counselorFilter) params.assignedCounselorId = counselorFilter;

      const response = await leadAPI.getAdminLeads(params);
      const fetchedLeads = response.data.data.leads;
      console.log('📋 Fetched leads sample:', fetchedLeads.slice(0, 2).map((l: any) => ({
        id: l._id,
        name: l.name,
        conversionStatus: l.conversionStatus,
        conversionRequestId: l.conversionRequestId
      })));
      setLeads(fetchedLeads);
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast.error('Failed to fetch leads');
    }
  };

  const fetchCounselors = async () => {
    try {
      const response = await leadAPI.getAdminCounselors();
      setCounselors(response.data.data.counselors);
    } catch (error) {
      console.error('Error fetching counselors:', error);
    }
  };

  const fetchEnquiryFormUrl = async () => {
    try {
      const response = await leadAPI.getEnquiryFormUrl();
      setEnquiryFormUrl(response.data.data.url);
    } catch (error) {
      console.error('Error fetching enquiry form URL:', error);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(enquiryFormUrl);
      setCopySuccess(true);
      toast.success('URL copied to clipboard!');
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      toast.error('Failed to copy URL');
    }
  };

  const openAssignModal = (lead: Lead) => {
    setSelectedLead(lead);
    setSelectedCounselorId(lead.assignedCounselorId?._id || '');
    setAssignModalOpen(true);
  };

  const handleAssign = async () => {
    if (!selectedLead) return;

    try {
      setAssigning(true);
      await leadAPI.assignLeadToCounselor(
        selectedLead._id,
        selectedCounselorId || null
      );
      toast.success(
        selectedCounselorId
          ? 'Lead assigned to counselor'
          : 'Lead assignment removed'
      );
      setAssignModalOpen(false);
      fetchLeads();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to assign lead');
    } finally {
      setAssigning(false);
    }
  };

  // Handle clicking a stage card - filter by that stage
  const handleStageCardClick = (stage: string | null) => {
    if (stage === null || stage === 'all') {
      // Clicking "Total Leads" - show all, clear stage filter
      setSelectedStageCard('all');
      setStageFilter('');
    } else {
      // Clicking a specific stage
      setSelectedStageCard(stage);
      setStageFilter(stage);
    }
  };

  // Approve conversion
  const handleApproveConversion = async (lead: Lead) => {
    if (!lead.conversionRequestId) {
      toast.error('No conversion request found for this lead');
      console.error('❌ Missing conversionRequestId:', lead);
      return;
    }
    
    try {
      setApproving(lead._id);
      console.log('🚀 Approving conversion:', { leadId: lead._id, conversionRequestId: lead.conversionRequestId });
      await leadConversionAPI.approveConversion(lead.conversionRequestId);
      toast.success(`${lead.name} has been converted to a student`);
      fetchLeads();
    } catch (error: any) {
      console.error('❌ Approval error:', error);
      console.error('❌ Error response:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to approve conversion');
    } finally {
      setApproving(null);
    }
  };

  // Reject conversion
  const handleRejectConversion = async () => {
    if (!rejectLeadId) return;
    
    const lead = leads.find(l => l._id === rejectLeadId);
    if (!lead?.conversionRequestId) return;
    
    try {
      setRejecting(true);
      await leadConversionAPI.rejectConversion(lead.conversionRequestId, rejectReason);
      toast.success('Conversion request rejected');
      setRejectModalOpen(false);
      setRejectLeadId(null);
      setRejectReason('');
      fetchLeads();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reject conversion');
    } finally {
      setRejecting(false);
    }
  };

  const openRejectModal = (leadId: string) => {
    setRejectLeadId(leadId);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  // Clear the stage card filter
  const clearStageCardFilter = () => {
    setSelectedStageCard(null);
    setStageFilter('');
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case LEAD_STAGE.NEW:
        return 'bg-blue-100 text-blue-800';
      case LEAD_STAGE.HOT:
        return 'bg-red-100 text-red-800';
      case LEAD_STAGE.WARM:
        return 'bg-orange-100 text-orange-800';
      case LEAD_STAGE.COLD:
        return 'bg-cyan-100 text-cyan-800';
      case LEAD_STAGE.CONVERTED:
        return 'bg-green-100 text-green-800';
      case LEAD_STAGE.CLOSED:
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getServiceColor = (service: string) => {
    switch (service) {
      case SERVICE_TYPE.CARRER_FOCUS_STUDY_ABROAD:
        return 'bg-indigo-100 text-indigo-800';
      case SERVICE_TYPE.IVY_LEAGUE_ADMISSION:
        return 'bg-amber-100 text-amber-800';
      case SERVICE_TYPE.EDUCATION_PLANNING:
        return 'bg-teal-100 text-teal-800';
      case SERVICE_TYPE.IELTS_GRE_LANGUAGE_COACHING:
        return 'bg-rose-100 text-rose-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Stats calculations
  const totalLeads = leads.length;
  const newLeads = leads.filter(l => l.stage === LEAD_STAGE.NEW).length;
  const hotLeads = leads.filter(l => l.stage === LEAD_STAGE.HOT).length;
  const warmLeads = leads.filter(l => l.stage === LEAD_STAGE.WARM).length;
  const coldLeads = leads.filter(l => l.stage === LEAD_STAGE.COLD).length;
  const convertedLeads = leads.filter(l => l.stage === LEAD_STAGE.CONVERTED).length;
  const closedLeads = leads.filter(l => l.stage === LEAD_STAGE.CLOSED).length;

  // Filter leads by search query
  const filteredLeads = leads.filter(lead => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (lead.name || '').toLowerCase().includes(query) || lead.email.toLowerCase().includes(query);
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <>
      <Toaster position="top-right" />
      <AdminLayout user={user}>
        <div className="p-8">
          {/* Header */}
          <div className="mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Lead Management</h1>
              <p className="text-gray-600 mt-1">Manage and track your enquiry leads</p>
            </div>

            {/* Enquiry Form URL */}
            {enquiryFormUrl && (
              <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 mb-1">Your Enquiry Form URL</p>
                  <p className="text-sm text-gray-700 truncate max-w-xs">{enquiryFormUrl}</p>
                </div>
                <button
                  onClick={copyToClipboard}
                  className={`p-2 rounded-lg transition-colors ${
                    copySuccess
                      ? 'bg-green-100 text-green-600'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  title="Copy URL"
                >
                  {copySuccess ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Stats Cards - Clickable */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-6">
            <StatCard
              title="Total Leads"
              value={totalLeads}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              }
              color="blue"
              onClick={() => handleStageCardClick('all')}
              isActive={selectedStageCard === 'all'}
              showPercentage={false}
            />
            <StatCard
              title="New"
              value={newLeads}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              }
              color="blue"
              onClick={() => handleStageCardClick(LEAD_STAGE.NEW)}
              isActive={selectedStageCard === LEAD_STAGE.NEW}
              percentage={totalLeads > 0 ? (newLeads / totalLeads) * 100 : 0}
            />
            <StatCard
              title="Hot"
              value={hotLeads}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                </svg>
              }
              color="red"
              onClick={() => handleStageCardClick(LEAD_STAGE.HOT)}
              isActive={selectedStageCard === LEAD_STAGE.HOT}
              percentage={totalLeads > 0 ? (hotLeads / totalLeads) * 100 : 0}
            />
            <StatCard
              title="Warm"
              value={warmLeads}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
                </svg>
              }
              color="orange"
              onClick={() => handleStageCardClick(LEAD_STAGE.WARM)}
              isActive={selectedStageCard === LEAD_STAGE.WARM}
              percentage={totalLeads > 0 ? (warmLeads / totalLeads) * 100 : 0}
            />
            <StatCard
              title="Cold"
              value={coldLeads}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              }
              color="cyan"
              onClick={() => handleStageCardClick(LEAD_STAGE.COLD)}
              isActive={selectedStageCard === LEAD_STAGE.COLD}
              percentage={totalLeads > 0 ? (coldLeads / totalLeads) * 100 : 0}
            />
            <StatCard
              title="Converted"
              value={convertedLeads}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              color="green"
              onClick={() => handleStageCardClick(LEAD_STAGE.CONVERTED)}
              isActive={selectedStageCard === LEAD_STAGE.CONVERTED}
              percentage={totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0}
            />
            <StatCard
              title="Closed"
              value={closedLeads}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              }
              color="gray"
              onClick={() => handleStageCardClick(LEAD_STAGE.CLOSED)}
              isActive={selectedStageCard === LEAD_STAGE.CLOSED}
              percentage={totalLeads > 0 ? (closedLeads / totalLeads) * 100 : 0}
            />
          </div>

          {/* Search and Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex flex-wrap gap-4">
              {/* Search */}
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>

              <div className="flex-1 min-w-[150px]">
                <label className="block text-xs font-medium text-gray-500 mb-1">Stage</label>
                <select
                  value={stageFilter}
                  onChange={(e) => setStageFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="">All Stages</option>
                  {Object.values(LEAD_STAGE).map((stage) => (
                    <option key={stage} value={stage}>{stage}</option>
                  ))}
                </select>
              </div>

              <div className="flex-1 min-w-[150px]">
                <label className="block text-xs font-medium text-gray-500 mb-1">Service</label>
                <select
                  value={serviceFilter}
                  onChange={(e) => setServiceFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="">All Services</option>
                  {Object.values(SERVICE_TYPE).map((service) => (
                    <option key={service} value={service}>{service}</option>
                  ))}
                </select>
              </div>

              <div className="flex-1 min-w-[150px]">
                <label className="block text-xs font-medium text-gray-500 mb-1">Counselor</label>
                <select
                  value={counselorFilter}
                  onChange={(e) => setCounselorFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="">All Counselors</option>
                  <option value="unassigned">Unassigned</option>
                  {counselors.map((counselor) => (
                    <option key={counselor._id} value={counselor._id}>
                      {getFullName(counselor) || counselor.email}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => {
                    setStageFilter('');
                    setServiceFilter('');
                    setCounselorFilter('');
                    setSearchQuery('');
                    setSelectedStageCard(null);
                  }}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Clear All
                </button>
              </div>
            </div>
          </div>

          {/* Leads Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {leads.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-1">No leads found</h3>
                <p className="text-gray-500">
                  {stageFilter || serviceFilter || counselorFilter
                    ? 'Try adjusting your filters'
                    : 'Share your enquiry form URL to start receiving leads'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full table-fixed">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="w-1/6 px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Lead</th>
                      <th className="w-1/6 px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Service</th>
                      <th className="w-1/6 px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Stage</th>
                      <th className="w-1/6 px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Assigned To</th>
                      <th className="w-1/6 px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                      <th className="w-1/6 px-4 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredLeads.map((lead) => (
                      <tr key={lead._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-4">
                          <div className="truncate">
                            <p className="font-medium text-gray-900 truncate">{lead.name}</p>
                            <p className="text-sm text-gray-500 truncate">{lead.email}</p>
                            <p className="text-sm text-gray-500">{lead.mobileNumber}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col gap-1">
                            {lead.serviceTypes?.map((service) => (
                              <span key={service} className={`px-2 py-1 rounded-full text-xs font-medium ${getServiceColor(service)}`}>
                                {service}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStageColor(lead.stage)}`}>
                            {lead.stage}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          {lead.assignedCounselorId ? (
                            <span className="text-sm text-gray-900 truncate block">
                              {lead.assignedCounselorId.userId ? getFullName(lead.assignedCounselorId.userId) : 'Unknown'}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400 italic">Unassigned</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-gray-500">
                            {new Date(lead.createdAt).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => router.push(`/admin/leads/${lead._id}`)}
                              className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                            >
                              View Details
                            </button>
                            {lead.conversionStatus === 'PENDING' && (
                              <>
                                <button
                                  onClick={() => handleApproveConversion(lead)}
                                  disabled={approving === lead._id}
                                  className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50"
                                >
                                  {approving === lead._id ? 'Approving...' : 'Approve'}
                                </button>
                                <button
                                  onClick={() => openRejectModal(lead._id)}
                                  className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </AdminLayout>

      {/* Assignment Modal */}
      {assignModalOpen && selectedLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Assign Lead to Counselor
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Assign <span className="font-medium text-gray-900">{selectedLead.name}</span> to a counselor
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Counselor
              </label>
              <select
                value={selectedCounselorId}
                onChange={(e) => setSelectedCounselorId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="">-- No Assignment --</option>
                {counselors.map((counselor) => (
                  <option key={counselor._id} value={counselor._id}>
                    {getFullName(counselor) || counselor.email}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setAssignModalOpen(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                disabled={assigning}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {assigning ? 'Assigning...' : 'Assign'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Reject Conversion Request
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Are you sure you want to reject this lead conversion request?
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Rejection (Optional)
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter reason for rejection..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 h-24 resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setRejectModalOpen(false);
                  setRejectLeadId(null);
                  setRejectReason('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectConversion}
                disabled={rejecting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {rejecting ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Stat Card Component
interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'red' | 'orange' | 'cyan' | 'gray';
  onClick?: () => void;
  isActive?: boolean;
  percentage?: number; // Percentage of total leads
  showPercentage?: boolean; // Whether to show percentage
}

function StatCard({ title, value, icon, color, onClick, isActive, percentage, showPercentage = true }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    red: 'bg-red-100 text-red-600',
    orange: 'bg-orange-100 text-orange-600',
    cyan: 'bg-cyan-100 text-cyan-600',
    gray: 'bg-gray-200 text-gray-600',
  };

  return (
    <div 
      className={`bg-white rounded-xl shadow-sm border-2 p-5 transition-all ${
        onClick ? 'cursor-pointer hover:shadow-md' : ''
      } ${
        isActive ? 'border-green-500 ring-2 ring-green-200' : 'border-gray-200'
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 ${colorClasses[color]} rounded-lg flex items-center justify-center`}>
          {icon}
        </div>
        <h3 className="text-3xl font-extrabold text-gray-900">{value}</h3>
      </div>
      <div className="flex items-center justify-between mt-3">
        <p className="text-sm font-semibold text-gray-700">{title}</p>
        {showPercentage && percentage !== undefined && (
          <p className="text-sm font-semibold text-gray-900">{percentage.toFixed(1)}%</p>
        )}
      </div>
    </div>
  );
}