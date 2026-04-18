'use client';

import RoleUserListPage from '@/components/RoleUserListPage';
import { USER_ROLE } from '@/types';

export default function SuperAdminB2BSalesPage() {
  return (
    <RoleUserListPage
      role="b2b-sales"
      roleDisplayName="B2B Sales"
      roleEnum={USER_ROLE.B2B_SALES}
      canAddUser={true}
    />
  );
}
