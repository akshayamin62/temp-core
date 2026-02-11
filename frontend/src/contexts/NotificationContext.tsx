'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

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

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children, initialUserId }: { children: ReactNode; initialUserId?: string }) => {
  const [userId, setUserId] = useState<string | null>(initialUserId || null);
  const [unreadCounts, setUnreadCounts] = useState<NotificationCounts>({
    byPointer: {},
    total: 0,
  });
  const [isLoading, setIsLoading] = useState(false);

  const refreshNotifications = async () => {
    if (!userId) return;
    
    try {
      setIsLoading(true);
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const response = await axios.get(`${backendUrl}/api/ivy/notifications/unread-counts`, {
        params: { userId },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      
      if (response.data.success) {
        setUnreadCounts(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch notification counts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const markPointerAsRead = async (pointerNumber: number) => {
    if (!userId) return;
    
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      await axios.post(
        `${backendUrl}/api/ivy/notifications/mark-read`,
        { userId, pointerNumber },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      
      // Refresh counts after marking as read
      await refreshNotifications();
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
    }
  };

  // Auto-refresh notifications every 5 seconds for near real-time updates
  useEffect(() => {
    if (userId) {
      refreshNotifications();
      
      const interval = setInterval(() => {
        refreshNotifications();
      }, 5000); // 5 seconds for real-time feel

      return () => clearInterval(interval);
    }
  }, [userId]);

  return (
    <NotificationContext.Provider
      value={{
        unreadCounts,
        refreshNotifications,
        markPointerAsRead,
        isLoading,
        setUserId,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
