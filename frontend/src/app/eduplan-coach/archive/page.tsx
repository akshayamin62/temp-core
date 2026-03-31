'use client';

import { USER_ROLE } from '@/types';
import EduplanCoachLayout from '@/components/EduplanCoachLayout';
import StaffArchiveContent from '@/components/StaffArchiveContent';

export default function EduplanCoachArchivePage() {
  return (
    <StaffArchiveContent
      allowedRoles={[USER_ROLE.EDUPLAN_COACH]}
      Layout={EduplanCoachLayout}
      studentDetailPath="/eduplan-coach/students"
      parentDetailPath="/eduplan-coach/parents"
    />
  );
}
