'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, superAdminAPI } from '@/lib/api';
import { User, USER_ROLE } from '@/types';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import toast, { Toaster } from 'react-hot-toast';

interface Advisory {
  _id: string;
  userId: {
    _id: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    email: string;
    isActive: boolean;
  };
  companyName: string;
  email: string;
  enquiryFormSlug: string;
  allowedServices: string[];
  isActive: boolean;
  leadCount: number;
  studentCount: number;
  createdAt: string;
}

const SERVICE_LABELS: Record<string, string> = {
  'study-abroad': 'Study Abroad',
  'ivy-league': 'Ivy League',
  'education-planning': 'Education Planning',
  'coaching-classes': 'Coaching Classes',
};

const ALL_SERVICES = [
  { slug: 'study-abroad', label: 'Study Abroad' },
  { slug: 'ivy-league', label: 'Ivy League' },
  { slug: 'education-planning', label: 'Education Planning' },
  { slug: 'coaching-classes', label: 'Coaching Classes' },
];

export default function SuperAdminAdvisoriesPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [advisories, setAdvisories] = useState<Advisory[]>([]);
  const [editModal, setEditModal] = useState<{ open: boolean; advisory: Advisory | null }>({ open: false, advisory: null });
  const [editServices, setEditServices] = useState<string[]>([]);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await authAPI.getProfile();
      const userData = response.data.data.user;
      if (userData.role !== USER_ROLE.SUPER_ADMIN) {
        toast.error('Access denied.');
        router.push('/');
        return;
      }
      setUser(userData);
      fetchAdvisories();
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchAdvisories = async () => {
    try {
      const response = await superAdminAPI.getAdvisories();
      setAdvisories(response.data.data || []);
    } catch (error) {
      console.error('Error fetching advisories:', error);
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      await superAdminAPI.toggleAdvisoryStatus(id);
      toast.success('Advisor status updated');
      fetchAdvisories();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
  };

  const openEditServices = (advisory: Advisory) => {
    setEditServices([...advisory.allowedServices]);
    setEditModal({ open: true, advisory });
  };

  const handleSaveServices = async () => {
    if (!editModal.advisory || editServices.length === 0) {
      toast.error('Select at least one service');
      return;
    }
    try {
      await superAdminAPI.updateAdvisoryServices(editModal.advisory._id, { allowedServices: editServices });
      toast.success('Services updated');
      setEditModal({ open: false, advisory: null });
      fetchAdvisories();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update services');
    }
  };

  const toggleServiceSelection = (slug: string) => {
    setEditServices((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <>
      <Toaster position="top-right" />
      <SuperAdminLayout user={user}>
        <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Advisories</h1>
            <p className="text-gray-600 mt-1">{advisories.length} total advisories</p>
          </div>
          <button
            onClick={() => router.push('/super-admin/users')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            Create Advisory (via Users)
          </button>
        </div>

        {/* Advisories List */}
        <div className="space-y-4">
          {advisories.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <p className="text-gray-500">No advisories found</p>
            </div>
          ) : (
            advisories.map((advisory) => (
              <div key={advisory._id} className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-900">{advisory.companyName}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        advisory.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {advisory.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {advisory.userId?.firstName} {advisory.userId?.middleName ? advisory.userId.middleName + ' ' : ''}{advisory.userId?.lastName} — {advisory.email}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      Slug: <span className="font-mono">{advisory.enquiryFormSlug}</span>
                    </p>

                    {/* Services */}
                    <div className="flex flex-wrap gap-1 mt-3">
                      {advisory.allowedServices?.map((service) => (
                        <span key={service} className="px-2 py-1 bg-emerald-50 text-emerald-700 text-xs rounded-full">
                          {SERVICE_LABELS[service] || service}
                        </span>
                      ))}
                    </div>

                    {/* Stats */}
                    <div className="flex gap-4 mt-3">
                      <span className="text-sm text-gray-500">
                        <span className="font-medium text-gray-700">{advisory.leadCount}</span> Leads
                      </span>
                      <span className="text-sm text-gray-500">
                        <span className="font-medium text-gray-700">{advisory.studentCount}</span> Students
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditServices(advisory)}
                      className="px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      Edit Services
                    </button>
                    <button
                      onClick={() => handleToggleStatus(advisory._id)}
                      className={`px-3 py-2 text-sm font-medium rounded-lg ${
                        advisory.isActive
                          ? 'text-red-600 hover:bg-red-50'
                          : 'text-green-600 hover:bg-green-50'
                      }`}
                    >
                      {advisory.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Edit Services Modal */}
        {editModal.open && editModal.advisory && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <h2 className="text-lg font-semibold mb-2">Edit Allowed Services</h2>
              <p className="text-sm text-gray-500 mb-4">
                {editModal.advisory.companyName}
              </p>
              <div className="space-y-3 mb-6">
                {ALL_SERVICES.map((service) => (
                  <label key={service.slug} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editServices.includes(service.slug)}
                      onChange={() => toggleServiceSelection(service.slug)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">{service.label}</span>
                  </label>
                ))}
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setEditModal({ open: false, advisory: null })}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveServices}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      </SuperAdminLayout>
    </>
  );
}
