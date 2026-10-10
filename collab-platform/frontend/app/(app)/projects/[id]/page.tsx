'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FolderKanban,
  Users,
  Activity as ActivityIcon,
  Plus,
  AlertTriangle,
  Clock,
  MessageSquare,
  CheckCircle2,
  Trash2,
  UserPlus,
  Shield,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { useSocket } from '@/lib/socket';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Modal } from '@/components/ui/Modal';
import { showToast } from '@/lib/toast';
import { format, formatDistanceToNow } from 'date-fns';

const COLUMNS = [
  { id: 'TODO', title: 'To Do', color: 'border-l-gray-500' },
  { id: 'IN_PROGRESS', title: 'In Progress', color: 'border-l-indigo-500' },
  { id: 'IN_REVIEW', title: 'In Review', color: 'border-l-purple-500' },
  { id: 'DONE', title: 'Done', color: 'border-l-emerald-500' },
  { id: 'BLOCKED', title: 'Blocked', color: 'border-l-rose-500' },
];

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;
  const router = useRouter();
  const { user } = useAuthStore();
  const { joinProject, leaveProject } = useSocket();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'board' | 'team' | 'activity'>('board');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any | null>(null);

  // Form states for Create/Edit task
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskPriority, setTaskPriority] = useState('MEDIUM');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskStatus, setTaskStatus] = useState('TODO');

  // Optimistic Concurrency Conflict Modal state
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [conflictData, setConflictData] = useState<{
    myChanges: any;
    serverTask: any;
  } | null>(null);

  // Team Member Add Modal state
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [selectedUserEmail, setSelectedUserEmail] = useState('');
  const [selectedProjectRole, setSelectedProjectRole] = useState('TEAM_MEMBER');

  // Join WebSocket project room
  useEffect(() => {
    if (projectId) {
      joinProject(projectId);
      return () => leaveProject(projectId);
    }
  }, [projectId, joinProject, leaveProject]);

  // Fetch Project Details
  const { data: projectData, isLoading: isProjectLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => api.projects.getOne(projectId),
  });

  // Fetch Project Tasks
  const { data: tasksData, isLoading: isTasksLoading } = useQuery({
    queryKey: ['project-tasks', projectId],
    queryFn: () => api.tasks.listByProject(projectId),
  });

  // Fetch Activity Logs
  const { data: activityData } = useQuery({
    queryKey: ['project-activity', projectId],
    queryFn: () => api.projects.getActivity(projectId),
    enabled: activeTab === 'activity',
  });

  const project = projectData?.data || projectData;
  const tasks = tasksData?.tasks || tasksData?.data || (Array.isArray(tasksData) ? tasksData : []);
  const activityLogs = activityData?.logs || activityData?.data || (Array.isArray(activityData) ? activityData : []);

  const myMemberInfo = project?.members?.find((m: any) => m.userId === user?.id);
  const myProjectRole = myMemberInfo?.projectRole || user?.globalRole;

  const canManageProject =
    user?.globalRole === 'ADMIN' ||
    user?.globalRole === 'PROJECT_MANAGER' ||
    myProjectRole === 'PROJECT_MANAGER';

  const isViewer =
    user?.globalRole === 'VIEWER' || myProjectRole === 'VIEWER';

  // Task Mutations
  const createTaskMutation = useMutation({
    mutationFn: (data: any) => api.tasks.create(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] });
      showToast.success('Task created successfully');
      closeTaskModal();
    },
    onError: (err: any) => {
      showToast.error(err.response?.data?.message || 'Failed to create task');
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.tasks.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] });
      showToast.success('Task updated successfully');
      closeTaskModal();
    },
    onError: (err: any) => {
      // Catch HTTP 409 Conflict (Optimistic Concurrency Detection)
      if (err.response?.status === 409) {
        const serverTask = err.response.data.currentTask;
        setConflictData({
          myChanges: {
            id: editingTask.id,
            title: taskTitle,
            description: taskDesc,
            priority: taskPriority,
            status: taskStatus,
            assigneeId: taskAssignee || null,
            version: serverTask ? serverTask.version : editingTask.version + 1,
          },
          serverTask: serverTask || editingTask,
        });
        setConflictModalOpen(true);
      } else {
        showToast.error(err.response?.data?.message || 'Failed to update task');
      }
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: () => api.projects.delete(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      showToast.success('Project deleted successfully');
      router.push('/projects');
    },
    onError: (err: any) => {
      showToast.error(err.response?.data?.message || 'Failed to delete project');
    },
  });

  const archiveProjectMutation = useMutation({
    mutationFn: () => api.projects.archive(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      showToast.success('Project archived successfully');
      router.push('/projects');
    },
    onError: (err: any) => {
      showToast.error(err.response?.data?.message || 'Failed to archive project');
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id: string) => api.tasks.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] });
      showToast.success('Task deleted successfully');
      closeTaskModal();
    },
    onError: (err: any) => {
      showToast.error(err.response?.data?.message || 'Failed to delete task');
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: (data: any) => api.projects.addMember(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      showToast.success('Team member added successfully');
      setIsAddMemberOpen(false);
      setSelectedUserEmail('');
    },
    onError: (err: any) => {
      showToast.error(err.response?.data?.message || 'Failed to add member');
    },
  });

  const openCreateTaskModal = (initialStatus = 'TODO') => {
    setEditingTask(null);
    setTaskTitle('');
    setTaskDesc('');
    setTaskPriority('MEDIUM');
    setTaskAssignee('');
    setTaskStatus(initialStatus);
    setIsTaskModalOpen(true);
  };

  const openEditTaskModal = (task: any) => {
    setEditingTask(task);
    setTaskTitle(task.title);
    setTaskDesc(task.description || '');
    setTaskPriority(task.priority);
    setTaskAssignee(task.assigneeId || '');
    setTaskStatus(task.status);
    setIsTaskModalOpen(true);
  };

  const closeTaskModal = () => {
    setIsTaskModalOpen(false);
    setEditingTask(null);
  };

  const handleTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) {
      showToast.error('Task title is required');
      return;
    }

    const payload = {
      title: taskTitle,
      description: taskDesc,
      priority: taskPriority,
      assigneeId: taskAssignee || undefined,
      status: taskStatus,
      ...(editingTask ? { version: editingTask.version } : {}),
    };

    if (editingTask) {
      updateTaskMutation.mutate({ id: editingTask.id, data: payload });
    } else {
      createTaskMutation.mutate(payload);
    }
  };

  const handleResolveConflict = (resolution: 'overwrite' | 'reload') => {
    if (resolution === 'overwrite' && conflictData) {
      // Force update with latest server version number
      updateTaskMutation.mutate({
        id: conflictData.myChanges.id,
        data: {
          ...conflictData.myChanges,
          version: conflictData.serverTask.version,
        },
      });
    } else if (resolution === 'reload' && conflictData) {
      // Update local edit state to match latest server data
      const latest = conflictData.serverTask;
      setEditingTask(latest);
      setTaskTitle(latest.title);
      setTaskDesc(latest.description || '');
      setTaskPriority(latest.priority);
      setTaskAssignee(latest.assigneeId || '');
      setTaskStatus(latest.status);
      showToast.info('Reloaded latest task version from server');
    }
    setConflictModalOpen(false);
  };

  if (isProjectLoading) {
    return (
      <div className="flex-1 p-8">
        <div className="h-32 bg-gray-900/50 animate-pulse rounded-2xl border border-gray-800" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex-1 p-12 text-center">
        <h2 className="text-xl font-bold text-gray-300">Project Not Found</h2>
        <Button onClick={() => router.push('/projects')} className="mt-4">
          Back to Projects
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header
        title={project.name}
        subtitle={project.description || 'Project workspace board'}
        action={
          !isViewer && (
            <div className="flex items-center gap-3">
              {canManageProject && (
                <>
                  <Button
                    variant="danger"
                    onClick={() => {
                      if (confirm('Are you sure you want to permanently delete this project? All associated tasks and comments will be erased.')) {
                        deleteProjectMutation.mutate();
                      }
                    }}
                    isLoading={deleteProjectMutation.isPending}
                    leftIcon={<Trash2 className="w-4 h-4" />}
                  >
                    Delete Project
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (confirm('Are you sure you want to archive this project?')) {
                        archiveProjectMutation.mutate();
                      }
                    }}
                    isLoading={archiveProjectMutation.isPending}
                  >
                    Archive Project
                  </Button>
                </>
              )}
              <Button onClick={() => openCreateTaskModal()} leftIcon={<Plus className="w-4 h-4" />}>
                Create Task
              </Button>
            </div>
          )
        }
      />

      {/* Tabs Navigation */}
      <div className="px-8 border-b border-gray-800/80 bg-gray-950/60 backdrop-blur-md flex items-center gap-6 text-sm font-medium text-gray-400">
        <button
          onClick={() => setActiveTab('board')}
          className={`py-3 flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'board'
              ? 'border-indigo-500 text-indigo-400 font-semibold'
              : 'border-transparent hover:text-gray-200'
          }`}
        >
          <FolderKanban className="w-4 h-4" />
          Kanban Board
        </button>

        <button
          onClick={() => setActiveTab('team')}
          className={`py-3 flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'team'
              ? 'border-indigo-500 text-indigo-400 font-semibold'
              : 'border-transparent hover:text-gray-200'
          }`}
        >
          <Users className="w-4 h-4" />
          Team Members ({project.members?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('activity')}
          className={`py-3 flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'activity'
              ? 'border-indigo-500 text-indigo-400 font-semibold'
              : 'border-transparent hover:text-gray-200'
          }`}
        >
          <ActivityIcon className="w-4 h-4" />
          Activity Feed
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 p-8 overflow-x-auto">
        {/* KANBAN BOARD TAB */}
        {activeTab === 'board' && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-5 items-start min-w-[1100px]">
            {COLUMNS.map((col) => {
              const columnTasks = tasks.filter((t: any) => t.status === col.id);
              return (
                <div
                  key={col.id}
                  className="bg-gray-900/40 border border-gray-800/80 rounded-2xl p-4 flex flex-col max-h-[calc(100vh-220px)]"
                >
                  {/* Column Header */}
                  <div className={`flex items-center justify-between pb-3 border-b border-gray-800 ${col.color} border-l-4 pl-3`}>
                    <span className="font-bold text-xs uppercase tracking-wider text-gray-200">
                      {col.title}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-800 text-gray-400">
                      {columnTasks.length}
                    </span>
                  </div>

                  {/* Task List Container */}
                  <div className="mt-4 space-y-3 overflow-y-auto pr-1 flex-1 min-h-[150px]">
                    {columnTasks.length === 0 ? (
                      <div className="p-4 rounded-xl border border-dashed border-gray-800/80 text-center text-xs text-gray-500">
                        No tasks
                      </div>
                    ) : (
                      columnTasks.map((task: any) => (
                        <div
                          key={task.id}
                          onClick={() => router.push(`/tasks/${task.id}`)}
                          className="glass-card p-4 rounded-xl cursor-pointer group hover:scale-[1.01] transition-all"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-semibold text-sm text-gray-100 group-hover:text-indigo-300 transition-colors line-clamp-2">
                              {task.title}
                            </h4>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditTaskModal(task);
                              }}
                              className="opacity-0 group-hover:opacity-100 text-xs text-gray-400 hover:text-white transition-opacity"
                            >
                              Edit
                            </button>
                          </div>

                          {task.description && (
                            <p className="text-xs text-gray-400 mt-1.5 line-clamp-2">
                              {task.description}
                            </p>
                          )}

                          <div className="mt-4 pt-3 border-t border-gray-800/60 flex items-center justify-between text-xs text-gray-400">
                            <Badge variant={task.priority === 'CRITICAL' ? 'danger' : task.priority === 'HIGH' ? 'warning' : 'default'} size="sm">
                              v{task.version} • {task.priority}
                            </Badge>

                            <div className="flex items-center gap-2">
                              {task._count?.comments > 0 && (
                                <span className="flex items-center gap-1 text-[11px] text-gray-400">
                                  <MessageSquare className="w-3 h-3 text-indigo-400" />
                                  {task._count.comments}
                                </span>
                              )}
                              {task.assignee ? (
                                <Avatar name={task.assignee.name} src={task.assignee.avatarUrl} size="xs" />
                              ) : (
                                <span className="w-5 h-5 rounded-full border border-dashed border-gray-700 flex items-center justify-center text-[9px] text-gray-500">
                                  ?
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {!isViewer && (
                    <button
                      onClick={() => openCreateTaskModal(col.id)}
                      className="mt-3 w-full py-2 rounded-xl border border-dashed border-gray-800 text-xs text-gray-400 hover:text-white hover:border-gray-700 hover:bg-gray-800/30 flex items-center justify-center gap-1 transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Task
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* TEAM MEMBERS TAB */}
        {activeTab === 'team' && (
          <div className="max-w-4xl space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-100">Project Members</h3>
              {canManageProject && (
                <Button
                  onClick={() => setIsAddMemberOpen(true)}
                  leftIcon={<UserPlus className="w-4 h-4" />}
                >
                  Add Member
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {project.members?.map((m: any) => (
                <div key={m.id} className="glass-card p-4 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar name={m.user.name} src={m.user.avatarUrl} size="md" />
                    <div>
                      <h4 className="font-semibold text-sm text-gray-100">{m.user.name}</h4>
                      <p className="text-xs text-gray-400">{m.user.email}</p>
                    </div>
                  </div>
                  <Badge variant={m.projectRole === 'PROJECT_MANAGER' ? 'purple' : 'primary'}>
                    {m.projectRole.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ACTIVITY FEED TAB */}
        {activeTab === 'activity' && (
          <div className="max-w-3xl space-y-4">
            <h3 className="text-lg font-bold text-gray-100 mb-4">Real-time Activity Stream</h3>

            {activityLogs.length === 0 ? (
              <div className="glass-card p-8 rounded-xl text-center text-gray-400 text-sm">
                No activity recorded yet.
              </div>
            ) : (
              <div className="space-y-3">
                {activityLogs.map((act: any) => (
                  <div key={act.id} className="glass-card p-4 rounded-xl flex items-start gap-3 text-sm">
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
        )}
      </div>

      {/* Create / Edit Task Modal */}
      <Modal
        isOpen={isTaskModalOpen}
        onClose={closeTaskModal}
        title={editingTask ? `Edit Task (v${editingTask.version})` : 'Create New Task'}
      >
        <form onSubmit={handleTaskSubmit} className="space-y-4">
          <Input
            label="Task Title"
            placeholder="e.g., Implement OAuth2 integration"
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
            required
          />

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              Description
            </label>
            <textarea
              className="w-full bg-gray-900/80 border border-gray-700/80 rounded-lg p-3 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 min-h-[90px]"
              placeholder="Detailed acceptance criteria or implementation notes..."
              value={taskDesc}
              onChange={(e) => setTaskDesc(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">Status</label>
              <select
                className="w-full bg-gray-900/80 border border-gray-700/80 rounded-lg p-2.5 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                value={taskStatus}
                onChange={(e) => setTaskStatus(e.target.value)}
              >
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="IN_REVIEW">In Review</option>
                <option value="DONE">Done</option>
                <option value="BLOCKED">Blocked</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">Priority</label>
              <select
                className="w-full bg-gray-900/80 border border-gray-700/80 rounded-lg p-2.5 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                value={taskPriority}
                onChange={(e) => setTaskPriority(e.target.value)}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">Assignee</label>
            <select
              className="w-full bg-gray-900/80 border border-gray-700/80 rounded-lg p-2.5 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              value={taskAssignee}
              onChange={(e) => setTaskAssignee(e.target.value)}
            >
              <option value="">Unassigned</option>
              {project.members?.map((m: any) => (
                <option key={m.user.id} value={m.user.id}>
                  {m.user.name} ({m.projectRole})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between pt-4">
            {editingTask && !isViewer ? (
              <Button
                type="button"
                variant="danger"
                onClick={() => {
                  if (confirm('Are you sure you want to delete this task?')) {
                    deleteTaskMutation.mutate(editingTask.id);
                  }
                }}
                isLoading={deleteTaskMutation.isPending}
              >
                Delete Task
              </Button>
            ) : <div />}

            <div className="flex gap-3">
              <Button type="button" variant="ghost" onClick={closeTaskModal}>
                Cancel
              </Button>
              <Button
                type="submit"
                isLoading={createTaskMutation.isPending || updateTaskMutation.isPending}
              >
                {editingTask ? 'Update Task' : 'Create Task'}
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* OPTIMISTIC CONCURRENCY CONFLICT MODAL (HTTP 409) */}
      <Modal
        isOpen={conflictModalOpen}
        onClose={() => setConflictModalOpen(false)}
        title="⚠️ Concurrent Update Conflict (HTTP 409)"
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl text-xs text-amber-300 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400" />
            <span>
              Another team member updated this task while you were editing it! Version conflict detected on the server.
            </span>
          </div>

          {conflictData && (
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-gray-950 border border-gray-800">
                <h5 className="font-bold text-gray-300 mb-2">Your Draft Changes</h5>
                <p><span className="text-gray-500">Title:</span> {conflictData.myChanges.title}</p>
                <p><span className="text-gray-500">Status:</span> {conflictData.myChanges.status}</p>
                <p><span className="text-gray-500">Priority:</span> {conflictData.myChanges.priority}</p>
              </div>

              <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-800/50">
                <h5 className="font-bold text-indigo-300 mb-2">Latest Server State (v{conflictData.serverTask.version})</h5>
                <p><span className="text-gray-500">Title:</span> {conflictData.serverTask.title}</p>
                <p><span className="text-gray-500">Status:</span> {conflictData.serverTask.status}</p>
                <p><span className="text-gray-500">Priority:</span> {conflictData.serverTask.priority}</p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleResolveConflict('reload')}
            >
              Reload Server Version
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={() => handleResolveConflict('overwrite')}
            >
              Force Overwrite
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Member Modal */}
      <Modal
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        title="Add Project Member"
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
              Add to Project
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
