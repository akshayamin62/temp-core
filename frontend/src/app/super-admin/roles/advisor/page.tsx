'use client';

import RoleUserListPage from '@/components/RoleUserListPage';
import { USER_ROLE } from '@/types';

export default function AdvisorUsersPage() {
  return (
    <RoleUserListPage
      role="advisor"
      roleDisplayName="Advisor"
      roleEnum={USER_ROLE.ADVISOR}
      canAddUser={true}
    />
  );
}
