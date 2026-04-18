'use client';

import RoleUserListPage from '@/components/RoleUserListPage';
import { USER_ROLE } from '@/types';

export default function SuperAdminB2BOpsPage() {
  return (
    <RoleUserListPage
      role="b2b-ops"
      roleDisplayName="B2B OPS"
      roleEnum={USER_ROLE.B2B_OPS}
      canAddUser={true}
    />
  );
}
