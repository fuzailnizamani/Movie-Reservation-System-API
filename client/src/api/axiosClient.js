import axios from 'axios';

const configuredBaseURL = import.meta.env.VITE_API_BASE_URL || '/api';
const normalizedBaseURL = configuredBaseURL.replace(/\/+$/, '');
const baseURL = normalizedBaseURL === '/api' || normalizedBaseURL.endsWith('/api')
  ? normalizedBaseURL
  : `${normalizedBaseURL}/api`;
export const api = axios.create({ baseURL, headers: { 'Content-Type': 'application/json' } });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshRequest;
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    let responseData = error.response?.data;
    if (
      error.response?.status === 403 &&
      typeof Blob !== 'undefined' &&
      responseData instanceof Blob &&
      responseData.type.includes('application/json')
    ) {
      try {
        responseData = JSON.parse(await responseData.text());
      } catch {
        responseData = null;
      }
    }
    const invalidAccessToken = error.response?.status === 403 && responseData?.message === 'Access Denied: Invalid Token';
    if ((error.response?.status !== 401 && !invalidAccessToken) || !original || original._retry || original.url?.includes('/auth/')) {
      return Promise.reject(error);
    }

    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return Promise.reject(error);
    original._retry = true;

    try {
      refreshRequest ||= axios.post(`${baseURL}/auth/refresh-token`, { refreshToken });
      const { data } = await refreshRequest;
      localStorage.setItem('accessToken', data.accessToken);
      original.headers.Authorization = `Bearer ${data.accessToken}`;
      return api(original);
    } catch (refreshError) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.dispatchEvent(new Event('auth:expired'));
      return Promise.reject(refreshError);
    } finally {
      refreshRequest = undefined;
    }
  },
);

export const errorMessage = (error) => error.response?.data?.error || error.response?.data?.message || 'Something went wrong. Please try again.';
