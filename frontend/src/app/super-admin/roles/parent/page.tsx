'use client';

import RoleUserListPage from '@/components/RoleUserListPage';
import { USER_ROLE } from '@/types';

export default function ParentUsersPage() {
  return (
    <RoleUserListPage
      role="parent"
      roleDisplayName="Parent"
      roleEnum={USER_ROLE.PARENT}
      canAddUser={false}
    />
  );
}
