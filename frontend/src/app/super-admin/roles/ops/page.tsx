'use client';

import { useRef, useState } from 'react';
import RoleUserListPage from '@/components/RoleUserListPage';
import { USER_ROLE } from '@/types';
import { programAPI } from '@/lib/api';
import toast from 'react-hot-toast';

export default function OpsUsersPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleQsUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const response = await programAPI.uploadQsRankingExcel(file);
      toast.success(response.data.message || 'QS ranking file uploaded successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to upload QS ranking file');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const qsUploadButton = (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleQsUpload}
        className="hidden"
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        {uploading ? 'Uploading...' : 'Upload QS Ranking'}
      </button>
    </>
  );

  return (
    <RoleUserListPage
      role="ops"
      roleDisplayName="Ops"
      roleEnum={USER_ROLE.OPS}
      canAddUser={true}
      headerExtra={qsUploadButton}
    />
  );
}
