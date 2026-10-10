'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, UserPlus, Shield, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Modal } from '@/components/ui/Modal';
import { showToast } from '@/lib/toast';

export default function ProjectTeamPage() {
  const params = useParams();
  const projectId = params.id as string;
  const router = useRouter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [selectedUserEmail, setSelectedUserEmail] = useState('');
  const [selectedProjectRole, setSelectedProjectRole] = useState('TEAM_MEMBER');

  const { data: projectData, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => api.projects.getOne(projectId),
  });

  const project = projectData?.data || projectData;

  const myMemberInfo = project?.members?.find((m: any) => m.userId === user?.id);
  const myProjectRole = myMemberInfo?.projectRole || user?.globalRole;

  const canManageProject =
    user?.globalRole === 'ADMIN' ||
    user?.globalRole === 'PROJECT_MANAGER' ||
    myProjectRole === 'PROJECT_MANAGER';

  const addMemberMutation = useMutation({
    mutationFn: (data: any) => api.projects.addMember(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      showToast.success('Team member added/updated successfully');
      setIsAddMemberOpen(false);
      setSelectedUserEmail('');
    },
    onError: (err: any) => {
      showToast.error(err.response?.data?.message || 'Failed to update member');
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (targetUserId: string) => api.projects.removeMember(projectId, targetUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      showToast.success('Member removed from project');
    },
    onError: (err: any) => {
      showToast.error(err.response?.data?.message || 'Failed to remove member');
    },
  });

  if (isLoading) {
    return (
      <div className="flex-1 p-8">
        <div className="h-40 bg-gray-900/50 animate-pulse rounded-2xl border border-gray-800" />
      </div>
    );
  }

  return (
    <div className="flex-1 pb-12">
      <Header
        title={`Team Members — ${project?.name}`}
        subtitle="Manage team roster and project-level roles"
        action={
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={() => router.push(`/projects/${projectId}`)}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Back to Board
            </Button>
            {canManageProject && (
              <Button
                onClick={() => setIsAddMemberOpen(true)}
                leftIcon={<UserPlus className="w-4 h-4" />}
              >
                Add Member
              </Button>
            )}
          </div>
        }
      />

      <div className="px-8 mt-6 max-w-4xl space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {project?.members?.map((m: any) => (
            <div key={m.id} className="glass-card p-5 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar name={m.user.name} src={m.user.avatarUrl} size="md" />
                <div>
                  <h4 className="font-semibold text-sm text-gray-100">{m.user.name}</h4>
                  <p className="text-xs text-gray-400">{m.user.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {canManageProject ? (
                  <select
                    className="bg-gray-900 border border-gray-700 text-xs text-gray-200 rounded-lg p-1.5 focus:outline-none"
                    value={m.projectRole}
                    onChange={(e) => {
                      addMemberMutation.mutate({
                        userId: m.userId,
                        userEmail: m.user.email,
                        projectRole: e.target.value,
                      });
                    }}
                  >
                    <option value="PROJECT_MANAGER">Project Manager</option>
                    <option value="TEAM_MEMBER">Team Member</option>
                    <option value="VIEWER">Viewer</option>
                  </select>
                ) : (
                  <Badge variant={m.projectRole === 'PROJECT_MANAGER' ? 'purple' : 'primary'}>
                    {m.projectRole.replace('_', ' ')}
                  </Badge>
                )}

                {canManageProject && m.userId !== user?.id && (
                  <button
                    onClick={() => removeMemberMutation.mutate(m.userId)}
                    className="text-gray-500 hover:text-rose-400 p-1 transition-colors"
                    title="Remove member"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add / Edit Member Modal */}
      <Modal
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        title="Add or Change Member Role"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addMemberMutation.mutate({
              userEmail: selectedUserEmail,
              projectRole: selectedProjectRole,
            });
          }}
          className="space-y-4"
        >
          <Input
            label="User Email"
            placeholder="dev@collab.dev"
            value={selectedUserEmail}
            onChange={(e) => setSelectedUserEmail(e.target.value)}
            required
          />

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">Project Role</label>
            <select
              className="w-full bg-gray-900/80 border border-gray-700/80 rounded-lg p-2.5 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              value={selectedProjectRole}
              onChange={(e) => setSelectedProjectRole(e.target.value)}
            >
              <option value="PROJECT_MANAGER">Project Manager</option>
              <option value="TEAM_MEMBER">Team Member</option>
              <option value="VIEWER">Viewer</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsAddMemberOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={addMemberMutation.isPending}>
              Save Member
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
