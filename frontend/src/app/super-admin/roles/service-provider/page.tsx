'use client';

import Link from 'next/link';
import RoleUserListPage from '@/components/RoleUserListPage';
import { USER_ROLE } from '@/types';

export default function ServiceProviderUsersPage() {
  return (
    <RoleUserListPage
      role="service-provider"
      roleDisplayName="Service Provider"
      roleEnum={USER_ROLE.SERVICE_PROVIDER}
      canAddUser={false}
      headerExtra={
        <Link
          href="/super-admin/roles/service-provider/all-services"
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
          </svg>
          All Service
        </Link>
      }
    />
  );
}
