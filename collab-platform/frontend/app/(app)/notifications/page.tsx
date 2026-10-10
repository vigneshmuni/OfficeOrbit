'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, Inbox, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import { useNotificationStore } from '@/lib/store';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { showToast } from '@/lib/toast';
import { formatDistanceToNow } from 'date-fns';

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount);

  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.notifications.list(),
  });

  const notifications = notificationsData?.notifications || notificationsData?.data || (Array.isArray(notificationsData) ? notificationsData : []);

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => api.notifications.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => api.notifications.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setUnreadCount(0);
      showToast.success('All notifications marked as read');
    },
  });

  const getBadgeVariant = (type: string) => {
    switch (type) {
      case 'TASK_ASSIGNED': return 'primary';
      case 'TASK_STATUS_CHANGED': return 'success';
      case 'TASK_COMMENT': return 'purple';
      default: return 'default';
    }
  };

  return (
    <div className="flex-1 pb-12">
      <Header
        title="Notifications"
        subtitle="Real-time alerts for assigned tasks, comments, and member updates"
        action={
          notifications.some((n: any) => !n.isRead) ? (
            <Button
              variant="outline"
              onClick={() => markAllReadMutation.mutate()}
              isLoading={markAllReadMutation.isPending}
              leftIcon={<CheckCheck className="w-4 h-4" />}
            >
              Mark all as read
            </Button>
          ) : undefined
        }
      />

      <div className="px-8 mt-6 max-w-4xl space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-900/50 animate-pulse rounded-xl border border-gray-800" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="glass-card p-12 rounded-2xl text-center">
            <Inbox className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-200">No notifications</h3>
            <p className="text-xs text-gray-400 mt-1">You are all caught up!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notif: any) => (
              <div
                key={notif.id}
                onClick={() => {
                  if (!notif.isRead) markAsReadMutation.mutate(notif.id);
                }}
                className={`glass-card p-4 rounded-xl flex items-start justify-between gap-4 transition-all cursor-pointer ${
                  !notif.isRead ? 'border-l-4 border-l-indigo-500 bg-gray-900/90' : 'opacity-75'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 mt-0.5">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-sm text-gray-100">{notif.title}</h4>
                      <Badge variant={getBadgeVariant(notif.type)} size="sm">
                        {notif.type.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-300 mt-1">{notif.message}</p>
                    <span className="text-[10px] text-gray-500 mt-2 block">
                      {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>

                {!notif.isRead && (
                  <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 mt-2" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
