'use client';

import { USER_ROLE } from '@/types';
import IvyExpertLayout from '@/components/IvyExpertLayout';
import StaffArchiveContent from '@/components/StaffArchiveContent';

export default function IvyExpertArchivePage() {
  return (
    <StaffArchiveContent
      allowedRoles={[USER_ROLE.IVY_EXPERT]}
      Layout={IvyExpertLayout}
      studentDetailPath="/ivy-league/ivy-expert"
    />
  );
}
