'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Shield, CheckCircle, XCircle, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Modal } from '@/components/ui/Modal';
import { showToast } from '@/lib/toast';

export default function UsersPage() {
  const { user: currentUser } = useAuthStore();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [globalRole, setGlobalRole] = useState('TEAM_MEMBER');

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.users.list(),
  });

  const [editingUser, setEditingUser] = useState<any | null>(null);

  const createUserMutation = useMutation({
    mutationFn: (data: any) => api.users.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      showToast.success('User created successfully');
      setIsCreateModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      showToast.error(err.response?.data?.message || 'Failed to create user');
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.users.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      showToast.success('User updated successfully');
      setIsCreateModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      showToast.error(err.response?.data?.message || 'Failed to update user');
    },
  });

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setGlobalRole('TEAM_MEMBER');
    setEditingUser(null);
  };

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => api.users.deactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      showToast.success('User account status updated');
    },
  });

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) {
      showToast.error('Name and email are required');
      return;
    }
    if (editingUser) {
      updateUserMutation.mutate({
        id: editingUser.id,
        data: { name, email, globalRole },
      });
    } else {
      if (!password) {
        showToast.error('Password is required for new users');
        return;
      }
      createUserMutation.mutate({ name, email, password, globalRole });
    }
  };

  const openEditUserModal = (u: any) => {
    setEditingUser(u);
    setName(u.name);
    setEmail(u.email);
    setGlobalRole(u.globalRole);
    setIsCreateModalOpen(true);
  };

  const userList = usersData?.users || usersData?.data || (Array.isArray(usersData) ? usersData : []);
  const users = userList.filter((u: any) =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 pb-12">
      <Header
        title="System User Management"
        subtitle="Admin controls: Create, manage, and assign roles across system users"
        action={
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            leftIcon={<UserPlus className="w-4 h-4" />}
          >
            Create User
          </Button>
        }
      />

      <div className="px-8 mt-6 max-w-5xl space-y-6">
        {/* Search */}
        <div className="max-w-md">
          <Input
            placeholder="Search users by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-gray-400" />}
          />
        </div>

        {/* Users Table */}
        <div className="glass-card rounded-2xl overflow-hidden border border-gray-800">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-gray-900/80 text-xs uppercase text-gray-400 border-b border-gray-800">
              <tr>
                <th className="py-3.5 px-6">User</th>
                <th className="py-3.5 px-6">Global Role</th>
                <th className="py-3.5 px-6">Projects</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">Loading users...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">No users found.</td>
                </tr>
              ) : (
                users.map((u: any) => (
                  <tr key={u.id} className="hover:bg-gray-900/30 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.name} src={u.avatarUrl} size="sm" />
                        <div>
                          <p className="font-semibold text-gray-100">{u.name}</p>
                          <p className="text-xs text-gray-400">{u.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <Badge variant={u.globalRole === 'ADMIN' ? 'danger' : u.globalRole === 'PROJECT_MANAGER' ? 'purple' : 'primary'}>
                        {u.globalRole.replace('_', ' ')}
                      </Badge>
                    </td>

                    <td className="py-4 px-6 text-xs text-gray-400">
                      {u._count?.projectMembers || 0} Projects
                    </td>

                    <td className="py-4 px-6">
                      {u.isActive ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400">
                          <CheckCircle className="w-3.5 h-3.5" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs text-rose-400">
                          <XCircle className="w-3.5 h-3.5" /> Disabled
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-6 text-right space-x-3">
                      <button
                        onClick={() => openEditUserModal(u)}
                        className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                      >
                        Edit
                      </button>

                      {u.id !== currentUser?.id && (
                        <button
                          onClick={() => deactivateMutation.mutate(u.id)}
                          className="text-xs text-rose-400 hover:text-rose-300 font-medium transition-colors"
                        >
                          {u.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit User Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          resetForm();
        }}
        title={editingUser ? `Edit System User (${editingUser.name})` : 'Create New System User'}
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <Input
            label="Full Name"
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Input
            label="Email Address"
            type="email"
            placeholder="john@collab.dev"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          {!editingUser && (
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          )}

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">Global Role</label>
            <select
              className="w-full bg-gray-900/80 border border-gray-700/80 rounded-lg p-2.5 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              value={globalRole}
              onChange={(e) => setGlobalRole(e.target.value)}
            >
              <option value="ADMIN">Admin (Full System Control)</option>
              <option value="PROJECT_MANAGER">Project Manager</option>
              <option value="TEAM_MEMBER">Team Member</option>
              <option value="VIEWER">Viewer (Read-only)</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createUserMutation.isPending}>
              Create User Account
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
