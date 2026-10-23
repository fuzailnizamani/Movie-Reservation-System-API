import { api } from './axiosClient';

export const login = (payload) => api.post('/auth/login', payload).then((response) => response.data);
export const register = (payload) => api.post('/auth/register', payload).then((response) => response.data);
export const logout = () => api.post('/auth/logout').then((response) => response.data);
