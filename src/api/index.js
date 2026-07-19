import api from './client.js';
export const authApi = { register: (data) => api.post('/auth/register', data), login: (data) => api.post('/auth/login', data), refresh: () => api.post('/auth/refresh'), logout: () => api.post('/auth/logout'), me: () => api.get('/auth/me'), forgot: (data) => api.post('/auth/forgot-password', data), reset: (data) => api.post('/auth/reset-password', data), profile: (data) => api.patch('/auth/profile', data), avatar: (data) => api.post('/auth/avatar', data), password: (data) => api.put('/auth/change-password', data) };
export const organisationsApi = { list: () => api.get('/organisations'), create: (data) => api.post('/organisations', data), update: (id, data) => api.patch(`/organisations/${id}`, data), remove: (id) => api.delete(`/organisations/${id}`), members: (id) => api.get(`/organisations/${id}/members`), invite: (id, data) => api.post(`/organisations/${id}/invitations`, data), role: (id, memberId, role) => api.patch(`/organisations/${id}/members/${memberId}/role`, { role }), removeMember: (id, memberId) => api.delete(`/organisations/${id}/members/${memberId}`), activity: (id) => api.get(`/organisations/${id}/activity`) };
export const workspacesApi = { list: () => api.get('/workspaces'), create: (data) => api.post('/workspaces', data), update: (id, data) => api.patch(`/workspaces/${id}`, data), remove: (id) => api.delete(`/workspaces/${id}`) };
export const projectsApi = { list: (params) => api.get('/projects', { params }), get: (id) => api.get(`/projects/${id}`), create: (data) => api.post('/projects', data), update: (id, data) => api.patch(`/projects/${id}`, data), archive: (id) => api.patch(`/projects/${id}/archive`), remove: (id) => api.delete(`/projects/${id}`) };
export const boardsApi = { get: (projectId) => api.get(`/boards/project/${projectId}`), addColumn: (boardId, data) => api.post(`/boards/${boardId}/columns`, data), updateColumn: (id, data) => api.patch(`/boards/columns/${id}`, data), reorder: (boardId, columnIds) => api.patch(`/boards/${boardId}/columns/reorder`, { columnIds }), removeColumn: (id) => api.delete(`/boards/columns/${id}`) };
export const tasksApi = { list: (params) => api.get('/tasks', { params }), get: (id) => api.get(`/tasks/${id}`), create: (data) => api.post('/tasks', data), update: (id, data) => api.patch(`/tasks/${id}`, data), move: (id, data) => api.patch(`/tasks/${id}/move`, data), remove: (id) => api.delete(`/tasks/${id}`), checklist: (id, text) => api.post(`/tasks/${id}/checklist`, { text }), toggleChecklist: (id, itemId) => api.patch(`/tasks/${id}/checklist/${itemId}`), subtask: (id, data) => api.post(`/tasks/${id}/subtasks`, data), toggleSubtask: (id, subtaskId) => api.patch(`/tasks/${id}/subtasks/${subtaskId}`), bulk: (data) => api.patch('/tasks/bulk', data) };
export const commentsApi = { list: (taskId) => api.get('/comments', { params: { taskId } }), create: (data) => api.post('/comments', data), update: (id, body) => api.patch(`/comments/${id}`, { body }), react: (id, emoji) => api.post(`/comments/${id}/reactions`, { emoji }), remove: (id) => api.delete(`/comments/${id}`) };
export const notificationsApi = { list: () => api.get('/notifications'), read: (id) => api.patch(`/notifications/${id}/read`), readAll: () => api.patch('/notifications/read-all'), remove: (id) => api.delete(`/notifications/${id}`) };
export const filesApi = { list: (params) => api.get('/files', { params }), upload: (data) => api.post('/files', data, { headers: { 'Content-Type': 'multipart/form-data' } }), remove: (id) => api.delete(`/files/${id}`) };
export const analyticsApi = { dashboard: () => api.get('/analytics/dashboard') };
export const usersApi = { get: (id) => api.get(`/users/${id}`), subscription: () => api.get('/users/subscription') };
export const invitationsApi = {
  list: () => api.get('/invitations'),
  preview: (token) => api.get('/invitations/preview', { params: { token } }),
  respond: (invitationId, action) => api.post('/invitations/respond', { invitationId, action }),
  respondToken: (token, action) => api.post('/invitations/respond', { token, action })
};
export const chatApi = {
  members: () => api.get('/chat/members'),
  messages: (memberId) => api.get(`/chat/${memberId}/messages`),
  send: (memberId, data) =>
    api.post(`/chat/${memberId}/messages`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  remove: (messageId, scope) =>
    api.delete(`/chat/messages/${messageId}`, { params: { scope } }),
  download: (messageId, attachmentId) =>
    api.get(`/chat/messages/${messageId}/attachments/${attachmentId}/download`, {
      responseType: 'blob',
    }),
};
