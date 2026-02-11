'use client';

import RoleUserListPage from '@/components/RoleUserListPage';
import { USER_ROLE } from '@/types';

export default function AlumniUsersPage() {
  return (
    <RoleUserListPage
      role="alumni"
      roleDisplayName="Alumni"
      roleEnum={USER_ROLE.ALUMNI}
      canAddUser={false}
    />
  );
}
