'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  MessageSquare,
  Send,
  Trash2,
  Clock,
  User,
  Tag,
  ShieldAlert,
  Folder,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { showToast } from '@/lib/toast';
import { formatDistanceToNow } from 'date-fns';

export default function TaskDetailPage() {
  const params = useParams();
  const taskId = params.id as string;
  const router = useRouter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [commentText, setCommentText] = useState('');

  const { data: taskData, isLoading } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => api.tasks.getOne(taskId),
  });

  const task = taskData?.data;

  const addCommentMutation = useMutation({
    mutationFn: (content: string) => api.comments.create(taskId, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      setCommentText('');
      showToast.success('Comment posted');
    },
    onError: (err: any) => {
      showToast.error(err.response?.data?.message || 'Failed to post comment');
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) => api.comments.delete(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      showToast.success('Comment deleted');
    },
    onError: (err: any) => {
      showToast.error(err.response?.data?.message || 'Failed to delete comment');
    },
  });

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    addCommentMutation.mutate(commentText);
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-8">
        <div className="h-40 bg-gray-900/50 animate-pulse rounded-2xl border border-gray-800" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex-1 p-12 text-center">
        <h2 className="text-xl font-bold text-gray-300">Task Not Found</h2>
        <Button onClick={() => router.back()} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  const isViewer = user?.globalRole === 'VIEWER';

  return (
    <div className="flex-1 pb-12">
      <Header
        title={`Task #${task.id.slice(0, 8)}`}
        subtitle={`Project: ${task.project?.name}`}
        action={
          <Button
            variant="ghost"
            onClick={() => router.push(`/projects/${task.projectId}`)}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Back to Board
          </Button>
        }
      />

      <div className="px-8 mt-6 max-w-5xl mx-auto space-y-6">
        {/* Main Task Header Card */}
        <div className="glass-card p-6 rounded-2xl space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={task.status === 'DONE' ? 'success' : task.status === 'IN_PROGRESS' ? 'primary' : 'default'}>
                  {task.status}
                </Badge>
                <Badge variant={task.priority === 'CRITICAL' ? 'danger' : task.priority === 'HIGH' ? 'warning' : 'default'}>
                  {task.priority}
                </Badge>
                <span className="text-xs text-gray-500 font-mono">v{task.version}</span>
              </div>

              <h1 className="text-2xl font-bold text-gray-100">{task.title}</h1>
            </div>

            {task.assignee ? (
              <div className="flex items-center gap-3 bg-gray-900/80 border border-gray-800 p-2.5 rounded-xl">
                <Avatar name={task.assignee.name} src={task.assignee.avatarUrl} size="sm" />
                <div className="text-xs">
                  <span className="text-gray-400 block text-[10px]">Assignee</span>
                  <span className="font-semibold text-gray-200">{task.assignee.name}</span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-gray-500 bg-gray-900/40 p-2.5 rounded-xl border border-gray-800">
                Unassigned
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-gray-800/80">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Description
            </h3>
            <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">
              {task.description || 'No detailed description provided.'}
            </p>
          </div>

          <div className="flex items-center gap-6 pt-3 text-xs text-gray-400">
            <span className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-400" />
              Creator: <strong className="text-gray-300">{task.creator?.name}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-purple-400" />
              Created {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
            </span>
          </div>
        </div>

        {/* Comments Section */}
        <div className="glass-card p-6 rounded-2xl space-y-6">
          <div className="flex items-center gap-2 border-b border-gray-800 pb-4">
            <MessageSquare className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-gray-100">
              Discussion & Comments ({task.comments?.length || 0})
            </h2>
          </div>

          {/* Add Comment Input */}
          {!isViewer && (
            <form onSubmit={handlePostComment} className="flex gap-3">
              <Avatar name={user?.name || ''} src={user?.avatarUrl} size="sm" />
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  placeholder="Write a comment or update..."
                  className="flex-1 bg-gray-900/80 border border-gray-700/80 rounded-xl px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                />
                <Button
                  type="submit"
                  isLoading={addCommentMutation.isPending}
                  disabled={!commentText.trim()}
                  rightIcon={<Send className="w-3.5 h-3.5" />}
                >
                  Post
                </Button>
              </div>
            </form>
          )}

          {/* Comments List */}
          <div className="space-y-4">
            {task.comments?.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No comments yet. Start the conversation!</p>
            ) : (
              task.comments?.map((c: any) => {
                const canDelete =
                  user?.globalRole === 'ADMIN' ||
                  user?.globalRole === 'PROJECT_MANAGER' ||
                  c.authorId === user?.id;

                return (
                  <div key={c.id} className="p-4 rounded-xl bg-gray-950/60 border border-gray-800/80 flex items-start gap-3.5">
                    <Avatar name={c.author?.name} src={c.author?.avatarUrl} size="sm" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-gray-200">{c.author?.name}</span>
                          <span className="text-[10px] text-gray-500">
                            {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                          </span>
                        </div>

                        {canDelete && (
                          <button
                            onClick={() => deleteCommentMutation.mutate(c.id)}
                            className="text-gray-500 hover:text-rose-400 transition-colors p-1"
                            title="Delete comment"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <p className="text-xs text-gray-300 mt-1.5 leading-relaxed">
                        {c.content}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
