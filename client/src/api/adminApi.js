import { api } from './axiosClient';

export const getAdminReservations = (params, signal) =>
  api.get('/admin/reservations', { params, signal }).then(({ data }) => data);
