import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '../store/useAppStore.js';

export const useSocket = (projectId) => {
  const ref = useRef(); const queryClient = useQueryClient(); const { user, organisation, workspace } = useAppStore();
  useEffect(() => {
    if (!user || !organisation) return;
    const raw = sessionStorage.getItem('taskflow-access');
    const token = raw || null;
    if (!token) return;
    const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', { auth: { token }, withCredentials: true }); ref.current = socket;
    socket.emit('rooms:join', { organisationId: organisation.id, workspaceId: workspace?.id, projectId });
    ['task:created','task:updated','task:moved','task:deleted','column:created','column:updated','column:deleted','columns:reordered'].forEach((event) => socket.on(event, () => queryClient.invalidateQueries({ queryKey: ['board', projectId] })));
    socket.on('notification:new', () => { queryClient.invalidateQueries({ queryKey: ['notifications'] }); queryClient.invalidateQueries({ queryKey: ['invitations'] }); }); socket.on('invitation:responded', () => queryClient.invalidateQueries({ queryKey: ['invitations'] })); ['chat:message','chat:deleted'].forEach((event) => socket.on(event, () => { queryClient.invalidateQueries({ queryKey: ['chat-messages'] }); queryClient.invalidateQueries({ queryKey: ['chat-members'] }); })); socket.on('comment:created', () => queryClient.invalidateQueries({ queryKey: ['comments'] }));
    return () => socket.disconnect();
  }, [user?.id, organisation?.id, workspace?.id, projectId]); return ref;
};
