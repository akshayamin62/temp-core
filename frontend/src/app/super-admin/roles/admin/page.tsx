'use client';

import RoleUserListPage from '@/components/RoleUserListPage';
import { USER_ROLE } from '@/types';

export default function AdminUsersPage() {
  return (
    <RoleUserListPage
      role="admin"
      roleDisplayName="Admin"
      roleEnum={USER_ROLE.ADMIN}
      canAddUser={true}
    />
  );
}
