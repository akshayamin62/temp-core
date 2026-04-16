'use client';

import RoleUserListPage from '@/components/RoleUserListPage';
import { USER_ROLE } from '@/types';

export default function AdvisoryUsersPage() {
  return (
    <RoleUserListPage
      role="advisory"
      roleDisplayName="Advisor"
      roleEnum={USER_ROLE.ADVISORY}
      canAddUser={true}
    />
  );
}
