'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, b2bAPI } from '@/lib/api';
import { User, USER_ROLE, B2B_LEAD_STAGE, B2B_LEAD_TYPE } from '@/types';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import toast, { Toaster } from 'react-hot-toast';

interface B2BLeadData {
  _id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  mobileNumber: string;
  type: string;
  stage: string;
  source: string;
  assignedB2BSalesId?: {
    _id: string;
    userId: {
      _id: string;
      firstName: string;
      middleName?: string;
      lastName: string;
      email: string;
    };
  };
  assignedB2BOpsId?: {
    _id: string;
    userId: {
      _id: string;
      firstName: string;
      middleName?: string;
      lastName: string;
      email: string;
    };
  };
  conversionStatus?: string;
  createdAt: string;
}

interface B2BLeadStats {
  total: number;
  new: number;
  hot: number;
  warm: number;
  cold: number;
  inProcess: number;
  converted: number;
  closed: number;
}

interface B2BSalesStaff {
  _id: string;
  userId: {
    _id: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    email: string;
  };
}

interface B2BConversion {
  _id: string;
  b2bLeadId: {
    _id: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    email: string;
    type: string;
    createdAdvisorId?: { _id: string; companyName?: string; allowedServices?: string[]; b2bProfileData?: Record<string, any> } | null;
    createdAdminId?: { _id: string; companyName?: string; b2bProfileData?: Record<string, any> } | null;
  };
  step: string;
  status: string;
  targetRole?: string;
  companyName?: string;
  loginEmail?: string;
  mobileNumber?: string;
  allowedServices?: string[];
  requestedBy: {
    _id: string;
    firstName: string;
    middleName?: string;
    lastName: string;
  };
  createdAt: string;
}

export default function SuperAdminB2BLeadsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [leads, setLeads] = useState<B2BLeadData[]>([]);
  const [stats, setStats] = useState<B2BLeadStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [selectedStageCard, setSelectedStageCard] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState('');
  
  // Tab: leads vs pending approvals
  const [activeTab, setActiveTab] = useState<'leads' | 'approvals'>('leads');
  
  // Pending conversions
  const [pendingConversions, setPendingConversions] = useState<B2BConversion[]>([]);
  const [loadingConversions, setLoadingConversions] = useState(false);
  
  // Assign Sales modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningLeadId, setAssigningLeadId] = useState<string | null>(null);
  const [salesStaff, setSalesStaff] = useState<B2BSalesStaff[]>([]);
  const [selectedSalesId, setSelectedSalesId] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Reject modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingConversionId, setRejectingConversionId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  // Step 2 Approval modal
  const [showApproveStep2Modal, setShowApproveStep2Modal] = useState(false);
  const [approvingConversion, setApprovingConversion] = useState<B2BConversion | null>(null);
  const [enquirySlug, setEnquirySlug] = useState('');
  const [approving, setApproving] = useState(false);

  // Copy URL state
  const [copied, setCopied] = useState(false);

  const getEnquiryFormUrl = () => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/b2b-enquiry`;
    }
    return '/b2b-enquiry';
  };

  const handleCopyUrl = () => {
    const url = getEnquiryFormUrl();
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      toast.success('B2B Enquiry form URL copied!');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchLeads();
      fetchPendingConversions();
    }
  }, [currentUser, stageFilter]);

  const checkAuth = async () => {
    try {
      const response = await authAPI.getProfile();
      const userData = response.data.data.user;
      if (userData.role !== USER_ROLE.SUPER_ADMIN) {
        toast.error('Access denied.');
        router.push('/');
        return;
      }
      setCurrentUser(userData);
    } catch {
      toast.error('Authentication failed');
      router.push('/login');
    }
  };

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (stageFilter) params.stage = stageFilter;
      if (typeFilter) params.type = typeFilter;
      const response = await b2bAPI.getAllLeads(params);
      setLeads(response.data.data.leads);
      setStats(response.data.data.stats);
    } catch {
      toast.error('Failed to fetch B2B leads');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingConversions = async () => {
    try {
      setLoadingConversions(true);
      const response = await b2bAPI.getPendingConversions();
      setPendingConversions(response.data.data || []);
    } catch {
      console.error('Failed to fetch pending conversions');
    } finally {
      setLoadingConversions(false);
    }
  };

  const openAssignModal = async (leadId: string) => {
    setAssigningLeadId(leadId);
    setSelectedSalesId('');
    setShowAssignModal(true);
    try {
      const response = await b2bAPI.getSalesStaff();
      setSalesStaff(response.data.data.salesStaff || []);
    } catch {
      toast.error('Failed to load sales staff');
    }
  };

  const handleAssignSales = async () => {
    if (!assigningLeadId) return;
    try {
      setAssigning(true);
      await b2bAPI.assignSales(assigningLeadId, selectedSalesId || null);
      toast.success(selectedSalesId ? 'B2B Sales assigned successfully' : 'B2B Sales unassigned');
      setShowAssignModal(false);
      fetchLeads();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to assign');
    } finally {
      setAssigning(false);
    }
  };

  const handleApproveConversion = async (conversionId: string, step: string, conversion?: B2BConversion) => {
    try {
      if (step === 'TO_IN_PROCESS') {
        await b2bAPI.approveInProcessConversion(conversionId);
        toast.success('Conversion approved successfully');
        fetchPendingConversions();
        fetchLeads();
      } else {
        // Step 2: Open modal with details and slug editor
        if (conversion) {
          setApprovingConversion(conversion);
          // Generate slug from company fields first, then fallback to lead name.
          const advisorProfile = typeof conversion.b2bLeadId?.createdAdvisorId === 'object' ? conversion.b2bLeadId.createdAdvisorId : null;
          const adminProfile = typeof conversion.b2bLeadId?.createdAdminId === 'object' ? conversion.b2bLeadId.createdAdminId : null;
          const profileCompanyFromB2BData =
            advisorProfile?.b2bProfileData?.companyOfficialName ||
            advisorProfile?.b2bProfileData?.companyName ||
            adminProfile?.b2bProfileData?.companyOfficialName ||
            adminProfile?.b2bProfileData?.companyName ||
            null;
          const profileCompanyName =
            advisorProfile?.companyName ||
            adminProfile?.companyName ||
            null;

          const rawSlugSource =
            profileCompanyFromB2BData ||
            profileCompanyName ||
            conversion.companyName ||
            [conversion.b2bLeadId?.firstName, conversion.b2bLeadId?.lastName].filter(Boolean).join(' ');
          const slugSource = rawSlugSource.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
          setEnquirySlug(slugSource);
          setShowApproveStep2Modal(true);
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to approve');
    }
  };

  const handleConfirmStep2Approval = async () => {
    if (!approvingConversion) return;
    try {
      setApproving(true);
      await b2bAPI.approveAdminAdvisorConversion(approvingConversion._id, {
        enquiryFormSlug: enquirySlug.trim() || undefined,
      });
      toast.success('Conversion approved successfully');
      setShowApproveStep2Modal(false);
      setApprovingConversion(null);
      fetchPendingConversions();
      fetchLeads();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to approve');
    } finally {
      setApproving(false);
    }
  };

  const openRejectModal = (conversionId: string) => {
    setRejectingConversionId(conversionId);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const handleRejectConversion = async () => {
    if (!rejectingConversionId || !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    try {
      setRejecting(true);
      await b2bAPI.rejectConversion(rejectingConversionId, rejectionReason);
      toast.success('Conversion rejected');
      setShowRejectModal(false);
      fetchPendingConversions();
      fetchLeads();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reject');
    } finally {
      setRejecting(false);
    }
  };

  const handleStageCardClick = (stage: string) => {
    if (selectedStageCard === stage) {
      setSelectedStageCard(null);
      setStageFilter('');
    } else {
      setSelectedStageCard(stage);
      setStageFilter(stage);
    }
  };

  const getFullName = (user: { firstName: string; middleName?: string; lastName: string }) => {
    return [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ');
  };

  const filteredLeads = leads.filter((lead) => {
    let matches = true;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const name = getFullName(lead).toLowerCase();
      matches = name.includes(q) ||
        lead.email.toLowerCase().includes(q) ||
        lead.mobileNumber.includes(q);
    }
    if (matches && typeFilter) {
      matches = lead.type === typeFilter;
    }
    return matches;
  });

  const getStageColor = (stage: string) => {
    switch (stage) {
      case B2B_LEAD_STAGE.NEW: return 'bg-blue-100 text-blue-800';
      case B2B_LEAD_STAGE.HOT: return 'bg-red-100 text-red-800';
      case B2B_LEAD_STAGE.WARM: return 'bg-orange-100 text-orange-800';
      case B2B_LEAD_STAGE.COLD: return 'bg-cyan-100 text-cyan-800';
      case B2B_LEAD_STAGE.IN_PROCESS: return 'bg-purple-100 text-purple-800';
      case B2B_LEAD_STAGE.CONVERTED: return 'bg-green-100 text-green-800';
      case B2B_LEAD_STAGE.CLOSED: return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case B2B_LEAD_TYPE.FRANCHISE: return 'bg-indigo-100 text-indigo-800';
      case B2B_LEAD_TYPE.INSTITUTION: return 'bg-amber-100 text-amber-800';
      case B2B_LEAD_TYPE.ADVISOR: return 'bg-teal-100 text-teal-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const stageCards = [
    { title: 'Total Leads', key: 'total', stage: '', color: 'blue' as const, icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
    { title: 'New', key: 'new', stage: B2B_LEAD_STAGE.NEW, color: 'blue' as const, icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg> },
    { title: 'Hot', key: 'hot', stage: B2B_LEAD_STAGE.HOT, color: 'red' as const, icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /></svg> },
    { title: 'Warm', key: 'warm', stage: B2B_LEAD_STAGE.WARM, color: 'orange' as const, icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg> },
    { title: 'Cold', key: 'cold', stage: B2B_LEAD_STAGE.COLD, color: 'cyan' as const, icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg> },
    { title: 'Documentation', key: 'inProcess', stage: B2B_LEAD_STAGE.IN_PROCESS, color: 'purple' as const, icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg> },
    { title: 'Converted', key: 'converted', stage: B2B_LEAD_STAGE.CONVERTED, color: 'green' as const, icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
    { title: 'Closed', key: 'closed', stage: B2B_LEAD_STAGE.CLOSED, color: 'gray' as const, icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg> },
  ];

  if (loading && !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) return null;

  return (
    <>
      <Toaster position="top-right" />
      <SuperAdminLayout user={currentUser}>
        <div className="p-8">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">B2B Leads</h2>
              <p className="text-gray-600 mt-1">Manage franchise, institution, and advisor leads</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 flex items-center gap-3">
                <div>
                  <p className="text-xs text-blue-600 font-medium">B2B Enquiry Form</p>
                  <p className="text-sm font-mono text-blue-800 select-all">{getEnquiryFormUrl()}</p>
                </div>
                <button
                  onClick={handleCopyUrl}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                    copied
                      ? 'bg-green-600 text-white'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {copied ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy URL
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
            <button
              onClick={() => setActiveTab('leads')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'leads'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              All Leads
            </button>
            <button
              onClick={() => setActiveTab('approvals')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors relative ${
                activeTab === 'approvals'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Pending Approvals
              {pendingConversions.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {pendingConversions.length}
                </span>
              )}
            </button>
          </div>

          {activeTab === 'leads' ? (
            <>
              {/* Stage Cards - Matching SA Leads Style */}
              {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-8">
                  {stageCards.map((card) => {
                    const value = stats[card.key as keyof B2BLeadStats] || 0;
                    const percentage = stats.total > 0 ? (value / stats.total) * 100 : 0;
                    const isActive = selectedStageCard === card.stage;
                    return (
                      <StatCard
                        key={card.key}
                        title={card.title}
                        value={value.toString()}
                        icon={card.icon}
                        color={card.color}
                        onClick={() => card.stage ? handleStageCardClick(card.stage) : (() => { setSelectedStageCard(null); setStageFilter(''); })()}
                        isActive={isActive}
                        percentage={card.key !== 'total' ? percentage : undefined}
                        showPercentage={card.key !== 'total'}
                      />
                    );
                  })}
                </div>
              )}

              {/* Search & Filters */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
                <div className="p-4 border-b border-gray-100 bg-gray-50 rounded-t-xl">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search by name, email, phone..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-4 py-2.5 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      />
                      <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                      className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    >
                      <option value="">All Types</option>
                      <option value={B2B_LEAD_TYPE.FRANCHISE}>Franchise</option>
                      <option value={B2B_LEAD_TYPE.INSTITUTION}>Institution</option>
                      <option value={B2B_LEAD_TYPE.ADVISOR}>Advisor</option>
                    </select>
                    <button
                      onClick={() => { setSearchQuery(''); setTypeFilter(''); setSelectedStageCard(null); setStageFilter(''); }}
                      className="px-4 py-2.5 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      Clear Filters
                    </button>
                  </div>
                </div>

                {/* Leads Table */}
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="spinner"></div>
                  </div>
                ) : filteredLeads.length === 0 ? (
                  <div className="p-12 text-center">
                    <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <p className="text-gray-500 text-lg font-medium">No B2B leads found</p>
                    <p className="text-gray-400 text-sm mt-1">Try adjusting your search or filters</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Name</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Contact</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Type</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Stage</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">B2B Sales</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">B2B OPS</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Created</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {filteredLeads.map((lead) => (
                          <tr key={lead._id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{getFullName(lead)}</div>
                              <div className="text-xs text-gray-500">{lead.email}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{lead.mobileNumber}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getTypeColor(lead.type)}`}>
                                {lead.type}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getStageColor(lead.stage)}`}>
                                {lead.stage}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {lead.assignedB2BSalesId?.userId
                                ? getFullName(lead.assignedB2BSalesId.userId)
                                : <span className="text-gray-400">Unassigned</span>}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {lead.assignedB2BOpsId?.userId
                                ? getFullName(lead.assignedB2BOpsId.userId)
                                : <span className="text-gray-400">—</span>}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(lead.createdAt).toLocaleDateString('en-GB')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button
                                onClick={() => router.push(`/super-admin/b2b/leads/${lead._id}`)}
                                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-xs"
                              >
                                View Detail
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {leads.length > 0 && (
                <div className="text-sm text-gray-600">
                  Showing {filteredLeads.length} of {leads.length} total B2B leads
                </div>
              )}
            </>
          ) : (
            /* Pending Approvals Tab */
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Pending B2B Conversion Approvals</h3>
                <p className="text-sm text-gray-500 mt-1">Review and approve/reject conversion requests</p>
              </div>
              {loadingConversions ? (
                <div className="flex items-center justify-center py-12">
                  <div className="spinner"></div>
                </div>
              ) : pendingConversions.length === 0 ? (
                <div className="p-12 text-center">
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-gray-500 text-lg font-medium">No pending approvals</p>
                  <p className="text-gray-400 text-sm mt-1">All conversion requests have been processed</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {pendingConversions.map((conversion) => (
                    <div key={conversion._id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          {/* Header: Name + Badges */}
                          <div className="flex items-center gap-2 flex-wrap mb-3">
                            <h4 className="text-base font-semibold text-gray-900">
                              {conversion.b2bLeadId?.firstName} {conversion.b2bLeadId?.middleName ? `${conversion.b2bLeadId.middleName} ` : ''}{conversion.b2bLeadId?.lastName}
                            </h4>
                            <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                              conversion.step === 'TO_IN_PROCESS'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {conversion.step === 'TO_IN_PROCESS' ? `Step 1: Documentation (${conversion.targetRole})` : `Step 2: Convert to ${conversion.targetRole}`}
                            </span>
                            <span className={`px-2 py-0.5 text-xs rounded-full ${getTypeColor(conversion.b2bLeadId?.type || '')}`}>
                              {conversion.b2bLeadId?.type}
                            </span>
                          </div>

                          {/* Details Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                            {conversion.loginEmail && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-gray-500 font-medium">Login Email:</span>
                                <span className="text-gray-800">{conversion.loginEmail}</span>
                              </div>
                            )}
                            {conversion.mobileNumber && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-gray-500 font-medium">Mobile:</span>
                                <span className="text-gray-800">{conversion.mobileNumber}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1.5">
                              <span className="text-gray-500 font-medium">Lead Email:</span>
                              <span className="text-gray-800">{conversion.b2bLeadId?.email}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-gray-500 font-medium">Requested by:</span>
                              <span className="text-gray-800">{conversion.requestedBy?.firstName} {conversion.requestedBy?.lastName}</span>
                            </div>
                            {conversion.companyName && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-gray-500 font-medium">Company:</span>
                                <span className="text-gray-800">{conversion.companyName}</span>
                              </div>
                            )}
                          </div>

                          {/* Allowed Services for Advisor */}
                          {conversion.targetRole === 'Advisor' && conversion.allowedServices && conversion.allowedServices.length > 0 && (
                            <div className="mt-2.5">
                              <span className="text-sm text-gray-500 font-medium">Services: </span>
                              <div className="inline-flex flex-wrap gap-1.5 mt-1">
                                {conversion.allowedServices.map((service, idx) => (
                                  <span key={idx} className="px-2 py-0.5 bg-violet-50 text-violet-700 text-xs rounded-full border border-violet-200">
                                    {service.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          <p className="text-xs text-gray-400 mt-2">
                            {new Date(conversion.createdAt).toLocaleDateString('en-GB')} at{' '}
                            {new Date(conversion.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                          <button
                            onClick={() => router.push(`/super-admin/b2b/leads/${conversion.b2bLeadId?._id}`)}
                            className="px-3 py-1.5 text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors text-xs font-medium"
                          >
                            View Lead
                          </button>
                          <button
                            onClick={() => handleApproveConversion(conversion._id, conversion.step, conversion)}
                            className="px-4 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-medium"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => openRejectModal(conversion._id)}
                            className="px-4 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs font-medium"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Assign Sales Modal */}
        {showAssignModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAssignModal(false)}>
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Assign B2B Sales</h3>
              <select
                value={selectedSalesId}
                onChange={(e) => setSelectedSalesId(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 mb-4"
              >
                <option value="">Unassign (No Sales Person)</option>
                {salesStaff.map((staff) => (
                  <option key={staff._id} value={staff._id}>
                    {staff.userId.firstName} {staff.userId.lastName} — {staff.userId.email}
                  </option>
                ))}
              </select>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignSales}
                  disabled={assigning}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {assigning ? 'Assigning...' : 'Assign'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reject Conversion Modal */}
        {showRejectModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowRejectModal(false)}>
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Reject Conversion</h3>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter rejection reason..."
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 mb-4"
              />
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRejectConversion}
                  disabled={rejecting || !rejectionReason.trim()}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {rejecting ? 'Rejecting...' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2 Approval Modal */}
        {showApproveStep2Modal && approvingConversion && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => { setShowApproveStep2Modal(false); setApprovingConversion(null); }}>
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                Approve {approvingConversion.targetRole} Conversion
              </h3>
              <p className="text-sm text-gray-500 mb-5">Review details and set enquiry form slug before approval</p>

              {/* Lead Details */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 font-medium">Lead Name</span>
                  <span className="text-gray-900 font-medium">
                    {approvingConversion.b2bLeadId?.firstName} {approvingConversion.b2bLeadId?.middleName ? `${approvingConversion.b2bLeadId.middleName} ` : ''}{approvingConversion.b2bLeadId?.lastName}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 font-medium">Lead Email</span>
                  <span className="text-gray-900">{approvingConversion.b2bLeadId?.email}</span>
                </div>
                {approvingConversion.loginEmail && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 font-medium">Login Email</span>
                    <span className="text-gray-900">{approvingConversion.loginEmail}</span>
                  </div>
                )}
                {approvingConversion.mobileNumber && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 font-medium">Mobile</span>
                    <span className="text-gray-900">{approvingConversion.mobileNumber}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 font-medium">Target Role</span>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                    approvingConversion.targetRole === 'Admin' ? 'bg-blue-100 text-blue-700' : 'bg-teal-100 text-teal-700'
                  }`}>
                    {approvingConversion.targetRole}
                  </span>
                </div>
                {(() => {
                  const profile = approvingConversion.b2bLeadId?.createdAdvisorId || approvingConversion.b2bLeadId?.createdAdminId;
                  const companyName = typeof profile === 'object' && profile ? profile.companyName : null;
                  const advisorProfile = approvingConversion.b2bLeadId?.createdAdvisorId;
                  const services: string[] =
                    (advisorProfile && typeof advisorProfile === 'object' && advisorProfile.allowedServices?.length)
                      ? advisorProfile.allowedServices!
                      : (approvingConversion.allowedServices || []);
                  return (
                    <>
                      {companyName && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500 font-medium">Company</span>
                          <span className="text-gray-900">{companyName}</span>
                        </div>
                      )}
                      {approvingConversion.targetRole === 'Advisor' && services.length > 0 && (
                        <div className="pt-1">
                          <span className="text-sm text-gray-500 font-medium">Allowed Services</span>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {services.map((service: string, idx: number) => (
                              <span key={idx} className="px-2 py-0.5 bg-violet-50 text-violet-700 text-xs rounded-full border border-violet-200">
                                {service.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Enquiry Form Slug */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Enquiry Form Slug
                </label>
                <input
                  type="text"
                  value={enquirySlug}
                  onChange={(e) => setEnquirySlug(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))}
                  placeholder="e.g., acme-consultants"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
                />
                <p className="text-xs text-gray-400 mt-1">
                  This slug will be used for the enquiry form URL: /enquiry/{enquirySlug || 'slug'}
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => { setShowApproveStep2Modal(false); setApprovingConversion(null); }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmStep2Approval}
                  disabled={approving}
                  className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
                >
                  {approving ? 'Approving...' : 'Confirm & Approve'}
                </button>
              </div>
            </div>
          </div>
        )}
      </SuperAdminLayout>
    </>
  );
}

// Stat Card Component - Matching SA Leads Style
interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'red' | 'orange' | 'cyan' | 'gray' | 'purple';
  onClick?: () => void;
  isActive?: boolean;
  percentage?: number;
  showPercentage?: boolean;
}

function StatCard({ title, value, icon, color, onClick, isActive, percentage, showPercentage = true }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    red: 'bg-red-100 text-red-600',
    orange: 'bg-orange-100 text-orange-600',
    cyan: 'bg-cyan-100 text-cyan-600',
    gray: 'bg-gray-200 text-gray-600',
    purple: 'bg-purple-100 text-purple-600',
  };

  return (
    <div 
      className={`bg-white rounded-xl shadow-sm border-2 p-5 transition-all ${
        onClick ? 'cursor-pointer hover:shadow-md' : ''
      } ${
        isActive ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
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
