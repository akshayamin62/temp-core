'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminSidebar() {
  const pathname = usePathname();

  const menuItems = [
    { label: 'Dashboard', path: '/admin', icon: '📊' },
    { label: 'Questions', path: '/admin/questions', icon: '❓' },
    { label: 'Sections', path: '/admin/sections', icon: '📑' },
    { label: 'Services', path: '/admin/services', icon: '🎯' },
    { label: 'Enrollments', path: '/admin/enrollments', icon: '📋' },
    { label: 'Edit Requests', path: '/edit-requests', icon: '✏️' },
    { label: 'Users', path: '/admin/users', icon: '👥' },
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen">
      <div className="p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Admin Panel</h2>
        <p className="text-sm text-gray-600">Manage your platform</p>
      </div>
      <nav className="px-3">
        {menuItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

