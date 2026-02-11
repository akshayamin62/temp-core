import React from 'react';

interface NotificationBadgeProps {
  count: number;
  size?: 'sm' | 'md' | 'lg';
}

export const NotificationBadge = ({ count, size = 'md' }: NotificationBadgeProps) => {
  if (count === 0) return null;

  const displayCount = count > 99 ? '99+' : count.toString();

  const sizeClasses = {
    sm: 'min-w-[16px] h-4 text-[10px] px-1',
    md: 'min-w-[20px] h-5 text-xs px-1.5',
    lg: 'min-w-[24px] h-6 text-sm px-2',
  };

  return (
    <span
      className={`
        ${sizeClasses[size]}
        inline-flex items-center justify-center
        bg-red-500 text-white font-semibold
        rounded-full
        shadow-md
      `}
    >
      {displayCount}
    </span>
  );
};

interface PointerBadgeProps {
  pointerNumber: number;
  count: number;
}

export const PointerBadge = ({ pointerNumber, count }: PointerBadgeProps) => {
  if (count === 0) return null;

  return (
    <div className="relative inline-block">
      <div className="absolute -top-1 -right-1 z-10">
        <NotificationBadge count={count} size="sm" />
      </div>
    </div>
  );
};
