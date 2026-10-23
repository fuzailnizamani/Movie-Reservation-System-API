import { api } from './axiosClient';

export const getMovies = (params) => api.get('/movies', { params }).then(({ data }) => data.movies || []);
export const getMovie = (id) => api.get(`/movies/${id}`).then(({ data }) => data.movie);
export const createMovie = (payload) => api.post('/movies', payload).then(({ data }) => data);
export const updateMovie = (id, payload) => api.patch(`/movies/${id}`, payload).then(({ data }) => data);
export const archiveMovie = (id) => api.delete(`/movies/${id}`).then(({ data }) => data);
