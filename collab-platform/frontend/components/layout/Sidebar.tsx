'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Users,
  Bell,
  User,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { useNotificationStore } from '@/lib/store';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';

export const Sidebar = () => {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { unreadCount } = useNotificationStore();

  if (!user) return null;

  const isAdmin = user.globalRole === 'ADMIN';

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Projects', href: '/projects', icon: FolderKanban },
    { label: 'Notifications', href: '/notifications', icon: Bell, badge: unreadCount },
    ...(isAdmin ? [{ label: 'User Admin', href: '/users', icon: Users }] : []),
    { label: 'My Profile', href: '/profile', icon: User },
  ];

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'danger';
      case 'PROJECT_MANAGER': return 'purple';
      case 'TEAM_MEMBER': return 'primary';
      default: return 'default';
    }
  };

  return (
    <aside className="w-64 bg-gray-950/80 border-r border-gray-800/80 flex flex-col h-screen sticky top-0 shrink-0 backdrop-blur-md">
      {/* Brand header */}
      <div className="p-5 flex items-center gap-3 border-b border-gray-800/80">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
          <Sparkles className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <h1 className="font-bold text-base bg-gradient-to-r from-white via-indigo-200 to-indigo-400 bg-clip-text text-transparent">
            OfficeOrbit
          </h1>
          <p className="text-[11px] text-gray-400 font-medium">Collab Platform</p>
        </div>
      </div>

      {/* User Card */}
      <div className="mx-4 my-4 p-3 rounded-xl bg-gray-900/60 border border-gray-800/60 flex items-center gap-3">
        <Avatar name={user.name} src={user.avatarUrl} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-gray-200 truncate">{user.name}</p>
          <div className="mt-0.5">
            <Badge variant={getRoleBadgeVariant(user.globalRole)} size="sm">
              {user.globalRole.replace('_', ' ')}
            </Badge>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-gray-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-600 text-white rounded-full">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer / Logout */}
      <div className="p-4 border-t border-gray-800/80">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-rose-400 hover:bg-rose-950/30 hover:text-rose-300 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
