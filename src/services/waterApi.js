// src/services/waterApi.js
export async function fetchWaterOptions() {
  const resp = await fetch('/api/water/options');
  if (!resp.ok) throw new Error('Error al obtener tipos de agua');
  return resp.json();
}


export async function fetchWaterRecords(params = {}) {
  const query = new URLSearchParams(params).toString();
  const resp = await fetch(`/api/water?${query}`);
  if (!resp.ok) throw new Error('Error al obtener registros de agua');
  return resp.json();
}

export async function createWaterRecord(data) {
  const resp = await fetch('/api/water', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(err.error || 'Error al crear registro');
  }
  return resp.json();
}

export async function updateWaterRecord(id, data) {
  const resp = await fetch(`/api/water/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(err.error || 'Error al actualizar registro');
  }
  return resp.json();
}

export async function deleteWaterRecord(id) {
  const resp = await fetch(`/api/water/${id}`, { method: 'DELETE' });
  if (!resp.ok) throw new Error('Error al eliminar registro');
  return resp.json();
}
