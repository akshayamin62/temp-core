'use client';

import RoleUserListPage from '@/components/RoleUserListPage';
import { USER_ROLE } from '@/types';

export default function CounselorUsersPage() {
  return (
    <RoleUserListPage
      role="counselor"
      roleDisplayName="Counselor"
      roleEnum={USER_ROLE.COUNSELOR}
      canAddUser={true}
    />
  );
}
