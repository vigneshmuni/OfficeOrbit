'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Activity as ActivityIcon } from 'lucide-react';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { formatDistanceToNow } from 'date-fns';

export default function ProjectActivityPage() {
  const params = useParams();
  const projectId = params.id as string;
  const router = useRouter();

  const { data: projectData } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => api.projects.getOne(projectId),
  });

  const { data: activityData, isLoading } = useQuery({
    queryKey: ['project-activity', projectId],
    queryFn: () => api.projects.getActivity(projectId),
  });

  const project = projectData?.data || projectData;
  const activityLogs = activityData?.logs || activityData?.data || (Array.isArray(activityData) ? activityData : []);

  return (
    <div className="flex-1 pb-12">
      <Header
        title={`Activity Stream — ${project?.name || ''}`}
        subtitle="Real-time audit logs of all actions within this project"
        action={
          <Button
            variant="ghost"
            onClick={() => router.push(`/projects/${projectId}`)}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Back to Board
          </Button>
        }
      />

      <div className="px-8 mt-6 max-w-4xl space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-900/50 animate-pulse rounded-xl border border-gray-800" />
            ))}
          </div>
        ) : activityLogs.length === 0 ? (
          <div className="glass-card p-12 rounded-2xl text-center text-gray-400">
            No project activity recorded yet.
          </div>
        ) : (
          <div className="space-y-3">
            {activityLogs.map((act: any) => (
              <div key={act.id} className="glass-card p-4 rounded-xl flex items-start gap-3.5 text-sm">
                <Avatar name={act.user.name} src={act.user.avatarUrl} size="sm" />
                <div className="flex-1">
                  <p className="text-gray-200">
                    <span className="font-semibold text-white">{act.user.name}</span>{' '}
                    <span className="text-indigo-300 font-medium">{act.action}</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDistanceToNow(new Date(act.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
