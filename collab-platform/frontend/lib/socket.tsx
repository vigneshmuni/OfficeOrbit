'use client';

import { createContext, useContext, useEffect, useState, useRef, ReactNode, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/lib/store';
import { useQueryClient } from '@tanstack/react-query';
import { useNotificationStore } from '@/lib/store';
import { toast } from '@/lib/toast';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinProject: (projectId: string) => void;
  leaveProject: (projectId: string) => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  joinProject: () => {},
  leaveProject: () => {},
});

export function SocketProvider({ children }: { children: ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { token, isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();
  const { incrementUnread } = useNotificationStore();

  useEffect(() => {
    if (!isAuthenticated() || !token) return;

    const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';
    const socket = io(`${WS_URL}/ws`, {
      auth: { token },
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('🔌 WebSocket connected');
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('🔌 WebSocket disconnected');
      setIsConnected(false);
    });

    // ── Task events ──────────────────────────────────────
    socket.on('task:created', (task) => {
      queryClient.invalidateQueries({ queryKey: ['project-tasks', task.projectId] });
      toast.info(`New task: ${task.title}`);
    });

    socket.on('task:updated', (task) => {
      queryClient.invalidateQueries({ queryKey: ['project-tasks', task.projectId] });
      queryClient.invalidateQueries({ queryKey: ['task', task.id] });
    });

    socket.on('task:deleted', ({ id, projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] });
      queryClient.removeQueries({ queryKey: ['task', id] });
    });

    // ── Comment events ───────────────────────────────────
    socket.on('comment:created', (comment) => {
      queryClient.invalidateQueries({ queryKey: ['task', comment.taskId] });
    });

    socket.on('comment:deleted', (data) => {
      queryClient.invalidateQueries({ queryKey: ['task', data.taskId] });
    });

    // ── Project events ───────────────────────────────────
    socket.on('project:created', (project) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.info(`New project created: ${project.name}`);
    });

    socket.on('project:updated', (project) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', project.id] });
    });

    socket.on('project:member-added', () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    });

    socket.on('project:member-removed', () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    });

    // ── Notifications ────────────────────────────────────
    socket.on('notification:new', (notification) => {
      incrementUnread();
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.info(notification.title || 'New notification');
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [token]);

  const joinProject = useCallback((projectId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('join:project', projectId);
    }
  }, []);

  const leaveProject = useCallback((projectId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('leave:project', projectId);
    }
  }, []);

  return (
    <SocketContext.Provider
      value={{
        socket: socketRef.current,
        isConnected,
        joinProject,
        leaveProject,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
