'use client';

import React from 'react';
import { Shield, Key, Mail, CheckCircle2, User, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { Header } from '@/components/layout/Header';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';

export default function ProfilePage() {
  const { user } = useAuthStore();

  if (!user) return null;

  const getRoleCapabilities = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return [
          'Create & delete projects across the platform',
          'Manage system users and assign global roles',
          'Assign project managers to projects',
          'Full audit log and system activity visibility',
        ];
      case 'PROJECT_MANAGER':
        return [
          'Manage assigned projects & update settings',
          'Add & remove project team members',
          'Create, update, assign, and delete tasks',
          'Moderate task comments and view project activity',
        ];
      case 'TEAM_MEMBER':
        return [
          'View projects you belong to',
          'View & update assigned tasks and change status',
          'Add comments and attachments to tasks',
          'Receive real-time Socket.IO notifications',
        ];
      default:
        return [
          'Read-only access to projects you are assigned to',
          'View task status, board, and comments',
          'Cannot create, edit, or delete tasks',
        ];
    }
  };

  return (
    <div className="flex-1 pb-12">
      <Header
        title="User Profile"
        subtitle="Account details and role-based permissions matrix"
      />

      <div className="px-8 mt-6 max-w-4xl space-y-6">
        {/* User Info Card */}
        <div className="glass-card p-6 rounded-2xl flex items-center gap-6">
          <Avatar name={user.name} src={user.avatarUrl} size="xl" />

          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-gray-100">{user.name}</h2>
            <p className="text-sm text-gray-400 flex items-center gap-2">
              <Mail className="w-4 h-4 text-indigo-400" />
              {user.email}
            </p>
            <div className="pt-2">
              <Badge variant={user.globalRole === 'ADMIN' ? 'danger' : user.globalRole === 'PROJECT_MANAGER' ? 'purple' : 'primary'}>
                Role: {user.globalRole.replace('_', ' ')}
              </Badge>
            </div>
          </div>
        </div>

        {/* Role Permissions Matrix */}
        <div className="glass-card p-6 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-800 pb-3">
            <Shield className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-bold text-gray-100">
              Role Authority & System Permissions
            </h3>
          </div>

          <p className="text-xs text-gray-400">
            Your permissions are determined by your global system role (
            <strong className="text-indigo-300">{user.globalRole}</strong>) and your assigned project-level roles.
          </p>

          <div className="space-y-2.5 pt-2">
            {getRoleCapabilities(user.globalRole).map((cap, idx) => (
              <div key={idx} className="flex items-start gap-3 text-sm text-gray-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{cap}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
