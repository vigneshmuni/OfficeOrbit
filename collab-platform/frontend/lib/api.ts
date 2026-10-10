import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

axiosInstance.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

axiosInstance.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export const api = {
  client: axiosInstance,
  auth: {
    login: async (data: any) => (await axiosInstance.post('/auth/login', data)).data,
    register: async (data: any) => (await axiosInstance.post('/auth/register', data)).data,
    me: async () => (await axiosInstance.get('/auth/me')).data,
  },
  users: {
    list: async (page = 1, limit = 20) => (await axiosInstance.get(`/users?page=${page}&limit=${limit}`)).data,
    getOne: async (id: string) => (await axiosInstance.get(`/users/${id}`)).data,
    create: async (data: any) => (await axiosInstance.post('/users', data)).data,
    update: async (id: string, data: any) => (await axiosInstance.put(`/users/${id}`, data)).data,
    deactivate: async (id: string) => (await axiosInstance.patch(`/users/${id}/deactivate`)).data,
  },
  projects: {
    list: async (page = 1, limit = 20) => (await axiosInstance.get(`/projects?page=${page}&limit=${limit}`)).data,
    getOne: async (id: string) => (await axiosInstance.get(`/projects/${id}`)).data,
    create: async (data: any) => (await axiosInstance.post('/projects', data)).data,
    update: async (id: string, data: any) => (await axiosInstance.put(`/projects/${id}`, data)).data,
    archive: async (id: string) => (await axiosInstance.patch(`/projects/${id}/archive`)).data,
    delete: async (id: string) => (await axiosInstance.delete(`/projects/${id}`)).data,
    addMember: async (id: string, data: any) => (await axiosInstance.post(`/projects/${id}/members`, data)).data,
    removeMember: async (id: string, userId: string) => (await axiosInstance.delete(`/projects/${id}/members/${userId}`)).data,
    getActivity: async (id: string, page = 1, limit = 30) =>
      (await axiosInstance.get(`/projects/${id}/activity?page=${page}&limit=${limit}`)).data,
  },
  tasks: {
    listByProject: async (projectId: string, params?: any) =>
      (await axiosInstance.get(`/projects/${projectId}/tasks`, { params })).data,
    getOne: async (id: string) => (await axiosInstance.get(`/tasks/${id}`)).data,
    create: async (projectId: string, data: any) => (await axiosInstance.post(`/projects/${projectId}/tasks`, data)).data,
    update: async (id: string, data: any) => (await axiosInstance.put(`/tasks/${id}`, data)).data,
    delete: async (id: string) => (await axiosInstance.delete(`/tasks/${id}`)).data,
  },
  comments: {
    create: async (taskId: string, data: { content: string }) =>
      (await axiosInstance.post(`/tasks/${taskId}/comments`, data)).data,
    delete: async (id: string) => (await axiosInstance.delete(`/comments/${id}`)).data,
  },
  notifications: {
    list: async (page = 1, limit = 30) => (await axiosInstance.get(`/notifications?page=${page}&limit=${limit}`)).data,
    markAsRead: async (id: string) => (await axiosInstance.patch(`/notifications/${id}/read`)).data,
    markAllAsRead: async () => (await axiosInstance.patch('/notifications/read-all')).data,
  },
};
