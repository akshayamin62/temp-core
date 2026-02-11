'use client';

import RoleUserListPage from '@/components/RoleUserListPage';
import { USER_ROLE } from '@/types';

export default function OpsUsersPage() {
  return (
    <RoleUserListPage
      role="ops"
      roleDisplayName="Ops"
      roleEnum={USER_ROLE.OPS}
      canAddUser={true}
    />
  );
}
