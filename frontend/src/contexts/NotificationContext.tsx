'use client';

import React, { ReactNode } from 'react';

/**
 * Notification system has been removed.
 * These exports are kept as no-op stubs so existing consumers don't break.
 */

interface NotificationCounts {
  byPointer: { [key: number]: number };
  total: number;
}

interface NotificationContextType {
  unreadCounts: NotificationCounts;
  refreshNotifications: () => Promise<void>;
  markPointerAsRead: (pointerNumber: number) => Promise<void>;
  isLoading: boolean;
  setUserId: (userId: string) => void;
}

const noopCounts: NotificationCounts = { byPointer: {}, total: 0 };

const noopContext: NotificationContextType = {
  unreadCounts: noopCounts,
  refreshNotifications: async () => {},
  markPointerAsRead: async () => {},
  isLoading: false,
  setUserId: () => {},
};

export const NotificationProvider = ({ children }: { children: ReactNode; initialUserId?: string }) => {
  return <>{children}</>;
};

export const useNotifications = (): NotificationContextType => {
  return noopContext;
};
