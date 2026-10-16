// src/services/waterApi.js
import { authFetch, API_BASE } from '../utils/api.js';

export async function fetchWaterOptions() {
  const resp = await authFetch(`${API_BASE}/water/options`);
  if (!resp.ok) throw new Error('Error al obtener tipos de agua');
  return resp.json();
}


export async function fetchWaterRecords(params = {}) {
  const query = new URLSearchParams(params).toString();
  const resp = await authFetch(`${API_BASE}/water?${query}`);
  if (!resp.ok) throw new Error('Error al obtener registros de agua');
  return resp.json();
}

export async function createWaterRecord(data) {
  const resp = await authFetch(`${API_BASE}/water`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    const errorObj = new Error(err.error || 'Error al crear registro');
    errorObj.response = { status: resp.status, data: err };
    throw errorObj;
  }
  return resp.json();
}

export async function updateWaterRecord(id, data) {
  const resp = await authFetch(`${API_BASE}/water/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    const errorObj = new Error(err.error || 'Error al actualizar registro');
    errorObj.response = { status: resp.status, data: err };
    throw errorObj;
  }
  return resp.json();
}

export async function deleteWaterRecord(id) {
  const resp = await authFetch(`${API_BASE}/water/${id}`, { method: 'DELETE' });
  if (!resp.ok) throw new Error('Error al eliminar registro');
  return resp.json();
}
