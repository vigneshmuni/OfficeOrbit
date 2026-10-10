import React from 'react';
import { clsx } from 'clsx';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'purple' | 'info';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className,
}) => {
  const base = 'inline-flex items-center font-medium rounded-full';

  const variants = {
    default: 'bg-gray-800 text-gray-300 border border-gray-700',
    primary: 'bg-indigo-900/60 text-indigo-300 border border-indigo-700/50',
    success: 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50',
    warning: 'bg-amber-900/60 text-amber-300 border border-amber-700/50',
    danger: 'bg-rose-900/60 text-rose-300 border border-rose-700/50',
    purple: 'bg-purple-900/60 text-purple-300 border border-purple-700/50',
    info: 'bg-cyan-900/60 text-cyan-300 border border-cyan-700/50',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
  };

  return (
    <span className={clsx(base, variants[variant], sizes[size], className)}>
      {children}
    </span>
  );
};
