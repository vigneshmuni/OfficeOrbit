'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, FolderKanban, Users, CheckSquare, Calendar } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Modal } from '@/components/ui/Modal';
import { showToast } from '@/lib/toast';
import { format } from 'date-fns';

export default function ProjectsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');

  const canCreateProject = user?.globalRole === 'ADMIN' || user?.globalRole === 'PROJECT_MANAGER';

  const { data: projectsData, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.projects.list(),
  });

  const createMutation = useMutation({
    mutationFn: (dto: { name: string; description?: string }) => api.projects.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      showToast.success('Project created successfully!');
      setIsModalOpen(false);
      setNewProjectName('');
      setNewProjectDesc('');
    },
    onError: (err: any) => {
      showToast.error(err.response?.data?.message || 'Failed to create project');
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) {
      showToast.error('Project name is required');
      return;
    }
    createMutation.mutate({ name: newProjectName, description: newProjectDesc });
  };

  const projectList = projectsData?.projects || projectsData?.data || (Array.isArray(projectsData) ? projectsData : []);
  const projects = projectList.filter((p: any) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="flex-1 pb-12">
      <Header
        title="Projects"
        subtitle="Manage collaborative projects, teams, and tasks"
        action={
          canCreateProject ? (
            <Button
              onClick={() => setIsModalOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              New Project
            </Button>
          ) : undefined
        }
      />

      <div className="px-8 mt-6 space-y-6">
        {/* Search Bar */}
        <div className="max-w-md">
          <Input
            placeholder="Search projects by name or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-gray-400" />}
          />
        </div>

        {/* Projects Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-44 bg-gray-900/50 animate-pulse rounded-2xl border border-gray-800" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="glass-card p-12 rounded-2xl text-center max-w-lg mx-auto">
            <FolderKanban className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-200">No projects found</h3>
            <p className="text-sm text-gray-400 mt-1">
              {searchTerm ? 'Try a different search term.' : 'Get started by creating your first project.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project: any) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="glass-card p-6 rounded-2xl block group relative flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-bold text-lg text-gray-100 group-hover:text-indigo-300 transition-colors line-clamp-1">
                      {project.name}
                    </h3>
                    <Badge variant={project.status === 'ACTIVE' ? 'success' : 'default'}>
                      {project.status}
                    </Badge>
                  </div>

                  <p className="text-xs text-gray-400 mt-2 line-clamp-3 leading-relaxed">
                    {project.description || 'No description provided.'}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-800/80 flex items-center justify-between text-xs text-gray-400">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
                      {project._count?.tasks || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-purple-400" />
                      {project._count?.members || 0}
                    </span>
                  </div>

                  <div className="flex -space-x-1.5 overflow-hidden">
                    {project.members?.slice(0, 4).map((m: any) => (
                      <Avatar key={m.id} name={m.user.name} src={m.user.avatarUrl} size="xs" />
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Project"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Project Name"
            placeholder="e.g., Mobile App Redesign"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            required
          />

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              Description (Optional)
            </label>
            <textarea
              className="w-full bg-gray-900/80 border border-gray-700/80 rounded-lg p-3 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 min-h-[100px]"
              placeholder="Briefly describe the project goals and scope..."
              value={newProjectDesc}
              onChange={(e) => setNewProjectDesc(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Create Project
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
