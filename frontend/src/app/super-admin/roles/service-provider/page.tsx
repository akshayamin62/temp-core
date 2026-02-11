'use client';

import RoleUserListPage from '@/components/RoleUserListPage';
import { USER_ROLE } from '@/types';

export default function ServiceProviderUsersPage() {
  return (
    <RoleUserListPage
      role="service-provider"
      roleDisplayName="Service Provider"
      roleEnum={USER_ROLE.SERVICE_PROVIDER}
      canAddUser={false}
    />
  );
}
