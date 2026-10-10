'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Bell, Wifi, WifiOff, Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore, useNotificationStore } from '@/lib/store';
import { useSocket } from '@/lib/socket';
import { Avatar } from '@/components/ui/Avatar';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, action }) => {
  const { user } = useAuthStore();
  const { unreadCount, setUnreadCount } = useNotificationStore();
  const { isConnected } = useSocket();

  const { data: notifData } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: () => api.notifications.list(1, 1),
    refetchInterval: 10000,
    enabled: !!user,
  });

  useEffect(() => {
    if (notifData && typeof notifData.unreadCount === 'number') {
      setUnreadCount(notifData.unreadCount);
    }
  }, [notifData, setUnreadCount]);

  if (!user) return null;

  return (
    <header className="bg-gray-950/40 border-b border-gray-800/60 px-8 py-4 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md">
      <div>
        {title && <h1 className="text-xl font-bold text-gray-100">{title}</h1>}
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        {/* Real-time Socket Indicator */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
            isConnected
              ? 'bg-emerald-950/50 border-emerald-800/60 text-emerald-400'
              : 'bg-amber-950/50 border-amber-800/60 text-amber-400'
          }`}
          title={isConnected ? 'Real-time WebSocket connected' : 'Connecting WebSocket...'}
        >
          {isConnected ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Live Updates</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3 animate-spin" />
              <span>Offline</span>
            </>
          )}
        </div>

        {action}

        {/* Notification Bell */}
        <Link
          href="/notifications"
          className="relative p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/80 transition-colors"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-indigo-500 rounded-full ring-2 ring-gray-950" />
          )}
        </Link>

        {/* User Avatar link */}
        <Link href="/profile" className="hover:opacity-85 transition-opacity">
          <Avatar name={user.name} src={user.avatarUrl} size="sm" />
        </Link>
      </div>
    </header>
  );
};
