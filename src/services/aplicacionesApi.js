import { authFetch } from '../utils/api.js';

const API_BASE = '/api/aplicaciones';

export async function getRecetas({ tenantId = 1 } = {}) {
  const params = new URLSearchParams({ tenantId: String(tenantId) });
  const res = await authFetch(`${API_BASE}/recipes?${params}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error al cargar recetas' }));
    throw new Error(err.error || 'Error al cargar recetas');
  }
  return res.json();
}

export async function createReceta(payload) {
  const res = await authFetch(`${API_BASE}/recipes`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error al crear receta' }));
    throw new Error(err.error || 'Error al crear receta');
  }
  return res.json();
}

export async function getMezclas({ tenantId = 1 } = {}) {
  const res = await authFetch(`${API_BASE}/mezclas?tenantId=${tenantId}`);
  if (!res.ok) throw new Error('Error al cargar mezclas');
  return res.json();
}

export async function createMezcla(payload) {
  const res = await authFetch(`${API_BASE}/mezclas`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Error al crear mezcla');
  return res.json();
}

export async function updateMezcla(id, payload) {
  const res = await authFetch(`${API_BASE}/mezclas/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Error al actualizar mezcla');
  return res.json();
}

export async function deleteMezcla(id) {
  const res = await authFetch(`${API_BASE}/mezclas/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Error al eliminar mezcla');
  return res.json();
}

export async function getProduccion({ tenantId = 1 } = {}) {
  const res = await authFetch(`${API_BASE}/produccion?tenantId=${tenantId}`);
  if (!res.ok) throw new Error('Error al cargar producción orgánica');
  return res.json();
}

export async function createProduccion(payload) {
  const res = await authFetch(`${API_BASE}/produccion`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Error al crear producción');
  return res.json();
}

export async function updateProduccion(id, payload) {
  const res = await authFetch(`${API_BASE}/produccion/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Error al actualizar producción');
  return res.json();
}

export async function deleteProduccion(id) {
  const res = await authFetch(`${API_BASE}/produccion/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Error al eliminar producción');
  return res.json();
}

export async function getProgramacion({ tenantId = 1 } = {}) {
  const res = await authFetch(`${API_BASE}/schedule?tenantId=${tenantId}`);
  if (!res.ok) throw new Error('Error al cargar programación');
  return res.json();
}

export async function createProgramacion(payload) {
  const res = await authFetch(`${API_BASE}/schedule`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Error al crear programación');
  return res.json();
}

export async function completeProgramacion(id, payload) {
  const res = await authFetch(`${API_BASE}/complete/${encodeURIComponent(id)}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Error al completar programación');
  return res.json();
}

export async function getCostos({ tenantId = 1, fincaId } = {}) {
  const params = new URLSearchParams({ tenantId: String(tenantId) });
  if (fincaId) params.append('fincaId', String(fincaId));
  const res = await authFetch(`${API_BASE}/reportes?${params}`);
  if (!res.ok) throw new Error('Error al cargar costos');
  const json = await res.json();
  return json.report || [];
}
