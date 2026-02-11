'use client';

import RoleUserListPage from '@/components/RoleUserListPage';
import { USER_ROLE } from '@/types';

export default function EduPlanCoachUsersPage() {
  return (
    <RoleUserListPage
      role="eduplan-coach"
      roleDisplayName="EduPlan Coach"
      roleEnum={USER_ROLE.EDUPLAN_COACH}
      canAddUser={true}
    />
  );
}
