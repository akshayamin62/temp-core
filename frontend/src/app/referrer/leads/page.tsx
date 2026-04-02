'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, referrerAPI } from '@/lib/api';
import { User, USER_ROLE } from '@/types';
import ReferrerLayout from '@/components/ReferrerLayout';
import toast, { Toaster } from 'react-hot-toast';

interface LeadData {
  _id: string;
  name: string;
  email: string;
  mobileNumber: string;
  city: string;
  serviceTypes: string[];
  stage: string;
  source: string;
  createdAt: string;
}

const STAGE_COLORS: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-800',
  HOT: 'bg-red-100 text-red-800',
  WARM: 'bg-orange-100 text-orange-800',
  COLD: 'bg-cyan-100 text-cyan-800',
  CONVERTED: 'bg-green-100 text-green-800',
  CLOSED: 'bg-gray-100 text-gray-800',
};

export default function ReferrerLeadsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [leads, setLeads] = useState<LeadData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

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
      fetchLeads();
    } catch (error) {
      toast.error('Please login to continue');
      router.push('/login');
    }
  };

  const fetchLeads = async (stage?: string, search?: string) => {
    try {
      setLoading(true);
      const params: any = {};
      if (stage) params.stage = stage;
      if (search) params.search = search;
      const response = await referrerAPI.getLeads(params);
      setLeads(response.data.data.leads);
    } catch (error: any) {
      toast.error('Failed to fetch leads');
      console.error('Fetch leads error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchLeads(stageFilter || undefined, searchQuery || undefined);
    }
  }, [stageFilter]);

  const handleSearch = () => {
    fetchLeads(stageFilter || undefined, searchQuery || undefined);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-right" />
      <ReferrerLayout user={user}>
        <div className="p-8">
          {/* Back */}
          <button
            onClick={() => router.push('/referrer/dashboard')}
            className="mb-6 flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </button>

          <div className="mb-6">
            <h2 className="text-3xl font-bold text-gray-900">My Referred Leads</h2>
            <p className="text-gray-600 mt-2">View leads that came through your referral link</p>
          </div>

          {/* Search + Filter */}
          <div className="mb-6 flex gap-4">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">All Stages</option>
              <option value="NEW">New</option>
              <option value="HOT">Hot</option>
              <option value="WARM">Warm</option>
              <option value="COLD">Cold</option>
              <option value="CONVERTED">Converted</option>
              <option value="CLOSED">Closed</option>
            </select>
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Search
            </button>
          </div>

          {/* Leads Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="text-center py-12">
                <div className="spinner mx-auto mb-4"></div>
                <p className="text-gray-500">Loading leads...</p>
              </div>
            ) : leads.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className="text-gray-500 text-lg">No leads found</p>
                <p className="text-gray-400 text-sm mt-2">Share your referral link to start getting leads</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">City</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Services</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stage</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {leads.map((lead) => (
                    <tr key={lead._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{lead.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">{lead.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">{lead.mobileNumber}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">{lead.city}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {lead.serviceTypes?.map((s: string) => (
                            <span key={s} className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full">{s}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${STAGE_COLORS[lead.stage] || 'bg-gray-100 text-gray-800'}`}>
                          {lead.stage}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600 text-sm">
                        {new Date(lead.createdAt).toLocaleDateString('en-GB')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {!loading && leads.length > 0 && (
            <div className="mt-4 text-sm text-gray-500">
              Showing {leads.length} lead{leads.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </ReferrerLayout>
    </>
  );
}
