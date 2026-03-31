'use client';

import { USER_ROLE } from '@/types';
import OpsLayout from '@/components/OpsLayout';
import StaffArchiveContent from '@/components/StaffArchiveContent';

export default function OpsArchivePage() {
  return (
    <StaffArchiveContent
      allowedRoles={[USER_ROLE.OPS]}
      Layout={OpsLayout}
      studentDetailPath="/ops/students"
      parentDetailPath="/ops/parents"
    />
  );
}
