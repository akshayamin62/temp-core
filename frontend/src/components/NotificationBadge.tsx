import React from 'react';

/**
 * Notification system has been removed.
 * These components are kept as no-op stubs so existing consumers don't break.
 */

interface NotificationBadgeProps {
  count: number;
  size?: 'sm' | 'md' | 'lg';
}

export const NotificationBadge = (_props: NotificationBadgeProps) => {
  return null;
};

interface PointerBadgeProps {
  pointerNumber: number;
  count: number;
}

export const PointerBadge = (_props: PointerBadgeProps) => {
  return null;
};
