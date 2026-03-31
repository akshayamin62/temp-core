'use client';

import { USER_ROLE } from '@/types';
import CounselorLayout from '@/components/CounselorLayout';
import StaffArchiveContent from '@/components/StaffArchiveContent';

export default function CounselorArchivePage() {
  return (
    <StaffArchiveContent
      allowedRoles={[USER_ROLE.COUNSELOR]}
      Layout={CounselorLayout}
      studentDetailPath="/counselor/students"
      parentDetailPath="/counselor/parents"
    />
  );
}
