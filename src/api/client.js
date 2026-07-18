import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'https://task-backend-eight-theta.vercel.app/api/v1';
let accessToken = sessionStorage.getItem('taskflow-access');
let refreshPromise = null;
export const setAccessToken = (value) => { accessToken = value; if (value) sessionStorage.setItem('taskflow-access', value); else sessionStorage.removeItem('taskflow-access'); };

const api = axios.create({ baseURL, withCredentials: true, timeout: 20000 });
api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  const organisationId = localStorage.getItem('taskflow-organisation');
  if (organisationId) config.headers['X-Organisation-Id'] = organisationId;
  return config;
});
api.interceptors.response.use((response) => response, async (error) => {
  const original = error.config;
  if (error.response?.status !== 401 || original?._retry || original?.url?.includes('/auth/refresh') || original?.url?.includes('/auth/login')) return Promise.reject(error);
  original._retry = true;
  try {
    refreshPromise ||= axios.post(`${baseURL}/auth/refresh`, {}, { withCredentials: true }).finally(() => { refreshPromise = null; });
    const { data } = await refreshPromise; setAccessToken(data.data.accessToken); original.headers.Authorization = `Bearer ${data.data.accessToken}`; return api(original);
  } catch (refreshError) { setAccessToken(null); localStorage.removeItem('taskflow-auth'); if (!location.pathname.startsWith('/login')) location.assign('/login'); return Promise.reject(refreshError); }
});
export default api;
