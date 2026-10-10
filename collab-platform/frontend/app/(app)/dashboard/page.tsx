'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { FolderKanban, CheckSquare, Clock, AlertCircle, ArrowUpRight, Activity } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { Header } from '@/components/layout/Header';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { formatDistanceToNow } from 'date-fns';

export default function DashboardPage() {
  const { user } = useAuthStore();

  const { data: projectsData, isLoading: isProjectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.projects.list(),
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DONE': return <Badge variant="success">DONE</Badge>;
      case 'IN_PROGRESS': return <Badge variant="primary">IN PROGRESS</Badge>;
      case 'IN_REVIEW': return <Badge variant="purple">IN REVIEW</Badge>;
      case 'BLOCKED': return <Badge variant="danger">BLOCKED</Badge>;
      default: return <Badge variant="default">TODO</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return <Badge variant="danger" size="sm">CRITICAL</Badge>;
      case 'HIGH': return <Badge variant="warning" size="sm">HIGH</Badge>;
      case 'MEDIUM': return <Badge variant="info" size="sm">MEDIUM</Badge>;
      default: return <Badge variant="default" size="sm">LOW</Badge>;
    }
  };

  const projects = projectsData?.projects || projectsData?.data || (Array.isArray(projectsData) ? projectsData : []);

  return (
    <div className="flex-1 pb-12">
      <Header
        title={`Welcome back, ${user?.name?.split(' ')[0]}`}
        subtitle={`Role: ${user?.globalRole?.replace('_', ' ')} • Overview of your workspace activity`}
      />

      <div className="px-8 mt-6 space-y-8">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="glass-card p-5 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400">Total Projects</span>
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <FolderKanban className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-extrabold text-white">{projects.length}</span>
              <p className="text-xs text-gray-400 mt-1">Accessible by your role</p>
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400">Active Tasks</span>
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-extrabold text-white">
                {projects.reduce((acc: number, p: any) => acc + (p._count?.tasks || 0), 0)}
              </span>
              <p className="text-xs text-gray-400 mt-1">Across all active projects</p>
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400">Team Members</span>
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Activity className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-extrabold text-white">
                {projects.reduce((acc: number, p: any) => acc + (p._count?.members || 0), 0)}
              </span>
              <p className="text-xs text-gray-400 mt-1">Project assignments</p>
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400">Role Authority</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckSquare className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-lg font-bold text-emerald-400 capitalize">
                {user?.globalRole?.replace('_', ' ')}
              </span>
              <p className="text-xs text-gray-400 mt-1">
                {user?.globalRole === 'ADMIN'
                  ? 'Full system access'
                  : user?.globalRole === 'PROJECT_MANAGER'
                  ? 'Project manager access'
                  : user?.globalRole === 'TEAM_MEMBER'
                  ? 'Collaborator access'
                  : 'Read-only viewer'}
              </p>
            </div>
          </div>
        </div>

        {/* Projects Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-100">Your Projects</h2>
            <Link
              href="/projects"
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              View all <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {isProjectsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-32 bg-gray-900/50 animate-pulse rounded-xl border border-gray-800" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="glass-card p-8 rounded-2xl text-center">
              <p className="text-gray-400 text-sm">No active projects found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {projects.map((proj: any) => (
                <Link
                  key={proj.id}
                  href={`/projects/${proj.id}`}
                  className="glass-card p-6 rounded-2xl block group"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-gray-100 group-hover:text-indigo-300 transition-colors">
                        {proj.name}
                      </h3>
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                        {proj.description || 'No description provided.'}
                      </p>
                    </div>
                    <Badge variant={proj.status === 'ACTIVE' ? 'success' : 'default'}>
                      {proj.status}
                    </Badge>
                  </div>

                  <div className="mt-6 flex items-center justify-between pt-4 border-t border-gray-800/60 text-xs text-gray-400">
                    <div className="flex items-center gap-4">
                      <span>{proj._count?.tasks || 0} Tasks</span>
                      <span>•</span>
                      <span>{proj._count?.members || 0} Members</span>
                    </div>

                    <div className="flex -space-x-2">
                      {proj.members?.slice(0, 3).map((m: any) => (
                        <Avatar key={m.id} name={m.user.name} src={m.user.avatarUrl} size="xs" />
                      ))}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
