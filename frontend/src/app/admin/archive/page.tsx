'use client';

import { USER_ROLE } from '@/types';
import AdminLayout from '@/components/AdminLayout';
import StaffArchiveContent from '@/components/StaffArchiveContent';

export default function AdminArchivePage() {
  return (
    <StaffArchiveContent
      allowedRoles={[USER_ROLE.ADMIN]}
      Layout={AdminLayout}
      studentDetailPath="/admin/students"
      parentDetailPath="/admin/parents"
      counselorDetailPath="/admin/counselors"
    />
  );
}
