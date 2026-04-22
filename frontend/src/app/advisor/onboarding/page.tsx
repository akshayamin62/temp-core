'use client';

import React from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, onboardingAPI } from '@/lib/api';
import { b2bLeadDocumentAPI } from '@/lib/b2bLeadDocumentAPI';
import { User, USER_ROLE, B2BDocumentField, B2BLeadDocument } from '@/types';
import toast, { Toaster } from 'react-hot-toast';
import { B2B_FORM_SECTIONS } from '@/config/b2bOnboardingConfig';
import B2BProfileForm from '@/components/B2BProfileForm';

type ProfileData = Record<string, string>;

export default function AdvisorOnboardingPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<ProfileData>({});
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [b2bDocFields, setB2BDocFields] = useState<B2BDocumentField[]>([]);
  const [b2bDocuments, setB2BDocuments] = useState<B2BLeadDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);

  useEffect(() => { checkAuth(); }, []);

  const checkAuth = async () => {
    try {
      const res = await authAPI.getProfile();
      const userData = res.data.data.user;
      if (userData.role !== USER_ROLE.ADVISOR) { router.push('/'); return; }
      if (res.data.data.advisor?.isVerified) { router.replace('/advisor/dashboard'); return; }
      setUser(userData);
      await Promise.all([fetchProfile(), fetchAndSeedDocs()]);
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await onboardingAPI.getProfile();
      const p = res.data.data.profile;
      const saved = (p as any).b2bProfileData || {};
      setProfileData({ companyName: p.companyName || '', primaryMobile: p.mobileNumber || '', ...saved });
    } catch {
      toast.error('Failed to load profile');
    }
  };

  const fetchAndSeedDocs = async () => {
    setLoadingDocs(true);
    try {
      await b2bLeadDocumentAPI.seedDefaults();
      const [fr, dr] = await Promise.all([b2bLeadDocumentAPI.getMyFields(), b2bLeadDocumentAPI.getMyDocuments()]);
      setB2BDocFields(fr.data.data.fields || []);
      setB2BDocuments(dr.data.data.documents || []);
    } catch { /* silent */ } finally {
      setLoadingDocs(false);
    }
  };

  const readonlyData = {
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
  };

  const handleFieldChange = (key: string, value: string) => {
    setProfileData(prev => {
      const next = { ...prev, [key]: value };
      if (key === 'country') { next.state = ''; next.city = ''; }
      if (key === 'state') { next.city = ''; }
      if (key === 'companyCountry') { next.companyState = ''; next.companyCity = ''; }
      if (key === 'companyState') { next.companyCity = ''; }
      return next;
    });
  };

  const handleSaveSection = async (sectionId: string) => {
    const section = B2B_FORM_SECTIONS.find(s => s.id === sectionId);
    if (!section) return;
    for (const field of section.fields) {
      if (!field.required || field.type === 'readonly') continue;
      if (field.conditionalOn && profileData[field.conditionalOn] !== field.conditionalValue) continue;
      if (!profileData[field.key]?.trim()) { toast.error(`"${field.label}" is required`); return; }
      if (field.pattern && !new RegExp(field.pattern).test(profileData[field.key])) { toast.error(`"${field.label}" has invalid format`); return; }
    }
    const sectionData: ProfileData = {};
    section.fields.filter(f => f.type !== 'readonly').forEach(f => {
      if (profileData[f.key] !== undefined) sectionData[f.key] = profileData[f.key];
    });
    setSavingSection(sectionId);
    try {
      await onboardingAPI.updateProfile({ b2bProfileData: sectionData });
      toast.success(`${section.title} saved`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSavingSection(null);
    }
  };

  const handleUploadDoc = async (field: B2BDocumentField, file: File) => {
    setUploadingDocId(field._id);
    try {
      await b2bLeadDocumentAPI.uploadDocument(null, field._id, field.documentKey, field.documentName, file);
      toast.success(`${field.documentName} uploaded`);
      const [fr, dr] = await Promise.all([b2bLeadDocumentAPI.getMyFields(), b2bLeadDocumentAPI.getMyDocuments()]);
      setB2BDocFields(fr.data.data.fields || []);
      setB2BDocuments(dr.data.data.documents || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploadingDocId(null);
    }
  };

  const handleSubmit = async () => {
    for (const section of B2B_FORM_SECTIONS) {
      for (const field of section.fields) {
        if (!field.required || field.type === 'readonly') continue;
        if (field.conditionalOn && profileData[field.conditionalOn] !== field.conditionalValue) continue;
        if (!profileData[field.key]?.trim()) { toast.error(`${section.title}: "${field.label}" is required`); return; }
      }
    }
    setSubmitting(true);
    try {
      await onboardingAPI.updateProfile({ b2bProfileData: profileData });
      await onboardingAPI.submit();
      toast.success('Submitted for review!');
      router.push('/advisor/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const totalRequired = B2B_FORM_SECTIONS.reduce((sum, s) => sum + s.fields.filter(f => f.required && f.type !== 'readonly').length, 0);
  const totalFilled = B2B_FORM_SECTIONS.reduce((sum, s) => sum + s.fields.filter(f => f.required && f.type !== 'readonly' && profileData[f.key]?.trim()).length, 0);
  const overallPct = totalRequired === 0 ? 100 : Math.round((totalFilled / totalRequired) * 100);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin h-10 w-10 rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Advisor Onboarding</h1>
            <p className="text-sm text-gray-500 mt-0.5">Complete your profile to get verified</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold text-gray-700">{overallPct}% Complete</div>
              <div className="w-32 bg-gray-200 rounded-full h-1.5 mt-1">
                <div className="bg-blue-600 h-1.5 rounded-full transition-all" style={{ width: `${overallPct}%` }} />
              </div>
            </div>
            <button onClick={() => { localStorage.removeItem('token'); router.push('/login'); }}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-blue-800">
            Save each section individually using the <strong>Save Section</strong> button, then click <strong>Submit for Review</strong> when all sections are complete.
          </p>
        </div>

        <B2BProfileForm
          profileData={profileData}
          readonlyData={readonlyData}
          b2bDocFields={b2bDocFields}
          b2bDocuments={b2bDocuments}
          loadingDocs={loadingDocs}
          readOnly={false}
          savingSection={savingSection}
          onFieldChange={handleFieldChange}
          onSaveSection={handleSaveSection}
          uploadingDocId={uploadingDocId}
          onUploadDoc={handleUploadDoc}
        />

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            <span className="font-medium text-gray-700">{overallPct}%</span> of required fields completed
          </p>
          <button onClick={handleSubmit} disabled={submitting}
            className="px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {submitting ? 'Submitting\u2026' : 'Submit for Review'}
          </button>
        </div>
      </div>
    </div>
  );
}