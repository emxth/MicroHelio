import { api } from './api';

/**
 * Fetch all prosumers, optionally filtering by status
 * @param {string} [status] - Optional. 'Pending', 'Active', or 'Deactivated'
 */
export async function getProsumers(status) {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return await api.get(`/prosumers${query}`);
}

/**
 * Fetch a single prosumer by NIC
 * @param {string} nic 
 */
export async function getProsumerByNic(nic) {
  return await api.get(`/prosumers/${encodeURIComponent(nic)}`);
}

/**
 * Activate a pending prosumer
 * @param {string} nic 
 */
export async function activateProsumer(nic) {
  return await api.patch(`/prosumers/${encodeURIComponent(nic)}/activate`);
}

/**
 * Reactivate a deactivated prosumer
 * @param {string} nic 
 */
export async function reactivateProsumer(nic) {
  return await api.patch(`/prosumers/${encodeURIComponent(nic)}/reactivate`);
}
