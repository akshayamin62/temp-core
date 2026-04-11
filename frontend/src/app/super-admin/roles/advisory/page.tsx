'use client';

import RoleUserListPage from '@/components/RoleUserListPage';
import { USER_ROLE } from '@/types';

export default function AdvisoryUsersPage() {
  return (
    <RoleUserListPage
      role="advisory"
      roleDisplayName="Advisory"
      roleEnum={USER_ROLE.ADVISORY}
      canAddUser={true}
    />
  );
}
