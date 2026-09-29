import { api } from './api';

export function getUsers() {
  return api.get('/users');
}

export function getUser(id) {
  return api.get(`/users/${id}`);
}

export function createUser(payload) {
  return api.post('/users', payload);
}

export function updateUser(id, payload) {
  return api.put(`/users/${id}`, payload);
}

export function setUserStatus(id, isActive) {
  return api.patch(`/users/${id}/status`, isActive);
}
