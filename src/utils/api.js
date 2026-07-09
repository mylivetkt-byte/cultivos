export const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export function getAuthHeaders() {
  const token = localStorage.getItem('token');
  const h = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

export function authFetch(url, options = {}) {
  const headers = { ...getAuthHeaders(), ...options.headers };
  return fetch(url, { ...options, headers });
}

export async function fetchApi(endpoint, options = {}) {
  const headers = { ...getAuthHeaders(), ...options.headers };
  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  if (!res.ok) {
    if (res.status === 401) {
      console.warn('authFetch: 401 Unauthorized - token may be missing or invalid');
    }
    const err = await res.json().catch(() => ({ error: 'Error en la petición' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchTables() {
  const res = await authFetch(`${API_BASE}/tables`);
  if (!res.ok) throw new Error('Error fetching tables');
  return res.json();
}

export async function fetchModules() {
  const res = await authFetch(`${API_BASE}/tables/modules`);
  if (!res.ok) throw new Error('Error fetching modules');
  return res.json();
}

export async function fetchTableStructure(tableName) {
  const res = await authFetch(`${API_BASE}/tables/${encodeURIComponent(tableName)}/structure`);
  if (!res.ok) throw new Error(`Error fetching structure for ${tableName}`);
  return res.json();
}

export async function fetchTableData(tableName, options = {}) {
  const { page = 1, pageSize = 20, search = '', sortColumn = '', sortDirection = 'ASC', tenantId, fincaId, nucleoId, filterGrupo, filterSubgrupo, filterFinca, filterDateFrom, filterDateTo } = options;
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    search,
    sortColumn,
    sortDirection,
  });
  if (tenantId) params.append('tenantId', tenantId);
  if (fincaId) params.append('fincaId', fincaId);
  if (nucleoId) params.append('nucleoId', nucleoId);
  if (filterGrupo) params.append('filterGrupo', filterGrupo);
  if (filterSubgrupo) params.append('filterSubgrupo', filterSubgrupo);
  if (filterFinca) params.append('filterFinca', filterFinca);
  if (filterDateFrom) params.append('filterDateFrom', filterDateFrom);
  if (filterDateTo) params.append('filterDateTo', filterDateTo);

  const res = await authFetch(`${API_BASE}/table/${encodeURIComponent(tableName)}/data?${params}`);
  if (!res.ok) throw new Error(`Error fetching data for ${tableName}`);
  return res.json();
}

export async function insertRecord(tableName, data) {
  const res = await authFetch(`${API_BASE}/table/${encodeURIComponent(tableName)}/data`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Error inserting record');
  }
  return res.json();
}

export async function updateRecord(tableName, id, data) {
  const res = await authFetch(`${API_BASE}/table/${encodeURIComponent(tableName)}/data/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Error updating record');
  }
  return res.json();
}

export async function deleteRecord(tableName, id) {
  const res = await authFetch(`${API_BASE}/table/${encodeURIComponent(tableName)}/data/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Error deleting record');
  }
  return res.json();
}

export async function fetchFKLookup(tableName, fkCol, filters = {}) {
  const params = new URLSearchParams();
  if (filters.tenantId) params.append('tenantId', filters.tenantId);
  if (filters.fincaId) params.append('fincaId', filters.fincaId);
  if (filters.nucleoId) params.append('nucleoId', filters.nucleoId);

  const res = await authFetch(`${API_BASE}/table/${encodeURIComponent(tableName)}/lookup/${encodeURIComponent(fkCol)}?${params}`);
  if (!res.ok) throw new Error(`Error fetching FK lookup for ${fkCol}`);
  return res.json();
}

export async function checkUniqueValue(tableName, column, value, excludeId = '', scope = {}) {
  const params = new URLSearchParams();
  params.append('column', column);
  params.append('value', value);
  if (excludeId !== undefined && excludeId !== null && excludeId !== '') {
    params.append('excludeId', excludeId);
  }
  if (scope && Object.keys(scope).length > 0) {
    params.append('scope', JSON.stringify(scope));
  }

  const res = await authFetch(`${API_BASE}/table/${encodeURIComponent(tableName)}/unique?${params}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Error checking unique value for ${column}`);
  }
  return res.json();
}

export async function fetchUniquenessRules(tableName = '') {
  const params = new URLSearchParams();
  if (tableName) params.append('tabla', tableName);

  const res = await authFetch(`${API_BASE}/table/unicidad/reglas${params.toString() ? `?${params}` : ''}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error fetching uniqueness rules');
  }
  return res.json();
}

export async function fetchDashboardStats(filters = {}) {
  const params = new URLSearchParams();
  if (filters.fincaId) params.append('fincaId', filters.fincaId);
  if (filters.nucleoId) params.append('nucleoId', filters.nucleoId);

  const res = await authFetch(`${API_BASE}/dashboard/stats?${params}`);
  if (!res.ok) throw new Error('Error fetching dashboard stats');
  return res.json();
}

export function formatTableName(name) {
  return name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatColumnName(name) {
  if (name === 'horas_motor_actuales') return 'H. Motor (Act)';
  if (name === 'horas_motor_totales') return 'H. Motor (Tot)';
  return name.replace(/_/g, ' ').replace(/\bid\b/gi, 'ID').replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function fetchSatelliteConnections() {
  const res = await authFetch(`${API_BASE}/satellite/connections`);
  if (!res.ok) throw new Error('Error fetching satellite connections');
  return res.json();
}

export async function saveSatelliteToken(id, api_key) {
  const res = await authFetch(`${API_BASE}/satellite/save/${encodeURIComponent(id)}`, {
    method: 'POST',
    body: JSON.stringify({ api_key }),
  });
  if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Error saving satellite token'); }
  return res.json();
}

export async function validateSatelliteConnection(id) {
  const res = await authFetch(`${API_BASE}/satellite/validate/${encodeURIComponent(id)}`, { method: 'POST' });
  if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Error validating satellite connection'); }
  return res.json();
}

export async function refreshSatelliteToken(id) {
  const res = await authFetch(`${API_BASE}/satellite/refresh/${encodeURIComponent(id)}`, { method: 'POST' });
  if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Error refreshing satellite token'); }
  return res.json();
}

export async function authenticateSatelliteConnection(id, email, password) {
  const res = await authFetch(`${API_BASE}/satellite/authenticate/${encodeURIComponent(id)}`, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Error authenticating with Copernicus'); }
  return res.json();
}

export async function fetchSatelliteStatus(id) {
  const res = await authFetch(`${API_BASE}/satellite/status/${encodeURIComponent(id)}`);
  if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Error fetching satellite status'); }
  return res.json();
}

export async function fetchSatelliteWorkflows(id) {
  const res = await authFetch(`${API_BASE}/satellite/${encodeURIComponent(id)}/workflows`);
  if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Error fetching satellite workflows'); }
  return res.json();
}

export async function fetchSatelliteOrders(id) {
  const res = await authFetch(`${API_BASE}/satellite/${encodeURIComponent(id)}/orders`);
  if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Error fetching production orders'); }
  return res.json();
}

export async function createSatelliteOrder(id, workflowName, productReference) {
  const res = await authFetch(`${API_BASE}/satellite/${encodeURIComponent(id)}/orders`, {
    method: 'POST',
    body: JSON.stringify({ workflowName, productReference }),
  });
  if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Error creating production order'); }
  return res.json();
}

export async function fetchGPSConnections({ tenantId } = {}) {
  const params = new URLSearchParams();
  if (tenantId) params.append('tenantId', tenantId);
  const res = await authFetch(`${API_BASE}/tracking/connections?${params}`);
  if (!res.ok) throw new Error('Error fetching GPS connections');
  return res.json();
}

export async function fetchGPSAssignments({ tenantId } = {}) {
  const params = new URLSearchParams();
  if (tenantId) params.append('tenantId', tenantId);
  const res = await authFetch(`${API_BASE}/tracking/assignments?${params}`);
  if (!res.ok) throw new Error('Error fetching GPS assignments');
  return res.json();
}

export async function pingGPSTelemetry(payload) {
  const res = await authFetch(`${API_BASE}/tracking/ping`, { method: 'POST', body: JSON.stringify(payload) });
  if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Error sending GPS ping'); }
  return res.json();
}

export async function fetchGPSTrajectory(deviceId) {
  const res = await authFetch(`${API_BASE}/tracking/history/${encodeURIComponent(deviceId)}`);
  if (!res.ok) throw new Error('Error fetching GPS trajectory');
  return res.json();
}

export async function fetchRRHULocationEmployees({ tenantId, fincaId } = {}) {
  const params = new URLSearchParams();
  if (tenantId) params.append('tenantId', tenantId);
  if (fincaId) params.append('fincaId', fincaId);
  const res = await authFetch(`${API_BASE}/rrhh/ubicacion/personal?${params}`);
  if (!res.ok) throw new Error('Error fetching RRHH location employees');
  return res.json();
}

export async function fetchRRHULocationHistory(employeeId, { tenantId } = {}) {
  const params = new URLSearchParams();
  if (tenantId) params.append('tenantId', tenantId);
  const res = await authFetch(`${API_BASE}/rrhh/ubicacion/historial/${encodeURIComponent(employeeId)}?${params}`);
  if (!res.ok) throw new Error('Error fetching RRHH location history');
  return res.json();
}

export async function rrhhGpsRegister(payload) {
  const res = await authFetch(`${API_BASE}/rrhh/gps/register`, { method: 'POST', body: JSON.stringify(payload) });
  if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Error registering GPS access'); }
  return res.json();
}

export async function rrhhGpsLogin(payload) {
  const res = await authFetch(`${API_BASE}/rrhh/gps/login`, { method: 'POST', body: JSON.stringify(payload) });
  if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Error logging in GPS access'); }
  return res.json();
}

export async function rrhhGpsSession(sessionToken) {
  const res = await authFetch(`${API_BASE}/rrhh/gps/session`, { headers: { Authorization: `Bearer ${sessionToken}` } });
  if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Error validating GPS session'); }
  return res.json();
}

export async function rrhhGpsLogout(sessionToken) {
  const res = await authFetch(`${API_BASE}/rrhh/gps/logout`, { method: 'POST', body: JSON.stringify({ session_token: sessionToken }) });
  if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Error logging out GPS session'); }
  return res.json();
}

export async function rrhhGpsSelfie(payload) {
  const res = await authFetch(`${API_BASE}/rrhh/gps/selfie`, { method: 'POST', body: JSON.stringify(payload) });
  if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Error refreshing selfie'); }
  return res.json();
}

export async function rrhhGpsPing(payload) {
  const res = await authFetch(`${API_BASE}/tracking/ping`, { method: 'POST', body: JSON.stringify(payload) });
  if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Error sending GPS ping'); }
  return res.json();
}

export async function fetchTrees({ tenantId, loteId } = {}) {
  const params = new URLSearchParams();
  if (tenantId) params.append('tenantId', tenantId);
  if (loteId) params.append('loteId', loteId);
  const res = await authFetch(`${API_BASE}/agronomy/trees?${params}`);
  if (!res.ok) throw new Error('Error fetching planted trees');
  return res.json();
}

export async function fetchTreeDetail(treeId) {
  const res = await authFetch(`${API_BASE}/agronomy/tree/${encodeURIComponent(treeId)}`);
  if (!res.ok) throw new Error('Error fetching tree details');
  return res.json();
}

export async function createTree(payload) {
  const res = await authFetch(`${API_BASE}/agronomy/tree`, { method: 'POST', body: JSON.stringify(payload) });
  if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Error planting tree'); }
  return res.json();
}

export async function createVisit(payload) {
  const res = await authFetch(`${API_BASE}/agronomy/visit`, { method: 'POST', body: JSON.stringify(payload) });
  if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Error logging fitosanitario visit'); }
  return res.json();
}

export async function fetchRecipes({ tenantId } = {}) {
  const params = new URLSearchParams();
  if (tenantId) params.append('tenantId', tenantId);
  const res = await authFetch(`${API_BASE}/agronomy/recipes?${params}`);
  if (!res.ok) throw new Error('Error fetching prescriptions');
  return res.json();
}

export async function applyRecipe(recipeId) {
  const res = await authFetch(`${API_BASE}/agronomy/recipe/${encodeURIComponent(recipeId)}/apply`, { method: 'POST' });
  if (!res.ok) throw new Error('Error applying recipe');
  return res.json();
}

export async function fetchLabores({ tenantId, date, categoria, estado } = {}) {
  const params = new URLSearchParams();
  if (tenantId) params.append('tenantId', tenantId);
  if (date) params.append('date', date);
  if (categoria) params.append('categoria', categoria);
  if (estado) params.append('estado', estado);
  const res = await authFetch(`${API_BASE}/labores?${params}`);
  if (!res.ok) throw new Error('Error fetching daily labors');
  return res.json();
}

export async function createLabor(payload) {
  const res = await authFetch(`${API_BASE}/labores`, { method: 'POST', body: JSON.stringify(payload) });
  if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Error creating daily labor'); }
  return res.json();
}

export async function autoGenerateLabores(payload) {
  const res = await authFetch(`${API_BASE}/labores/auto-generate`, { method: 'POST', body: JSON.stringify(payload) });
  if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Error auto-generating labors'); }
  return res.json();
}

export async function evaluateLabor(laborId, payload) {
  const res = await authFetch(`${API_BASE}/labores/${encodeURIComponent(laborId)}/evaluar`, { method: 'PUT', body: JSON.stringify(payload) });
  if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Error evaluating labor'); }
  return res.json();
}

export async function sendLaborReport(laborId) {
  const res = await authFetch(`${API_BASE}/labores/${encodeURIComponent(laborId)}/reportar`, { method: 'POST' });
  if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Error sending labor compliance report'); }
  return res.json();
}

export async function fetchHarvSummary({ tenantId } = {}) {
  const res = await authFetch(`${API_BASE}/dashboard/harvest`);
  if (!res.ok) throw new Error('Error fetching harvest summary');
  return res.json();
}

export async function fetchAcuicolaStats({ tenantId } = {}) {
  const res = await authFetch(`${API_BASE}/acuicola/stats`);
  if (!res.ok) throw new Error('Error fetching acuicola stats');
  return res.json();
}

export async function fetchComercialStats({ tenantId } = {}) {
  const res = await authFetch(`${API_BASE}/comercializacion/stats`);
  if (!res.ok) throw new Error('Error fetching comercializacion stats');
  return res.json();
}

export async function fetchLaborStats({ tenantId } = {}) {
  const res = await authFetch(`${API_BASE}/dashboard/labor-stats`);
  if (!res.ok) throw new Error('Error fetching labor stats');
  return res.json();
}

export async function fetchHarvestTrend({ tenantId } = {}) {
  const res = await authFetch(`${API_BASE}/dashboard/harvest-trend`);
  if (!res.ok) throw new Error('Error fetching harvest trend');
  return res.json();
}
export async function fetchCamadas({ tenantId }) { return []; }

export async function fetchLaboresSemillero({ tenantId }) { return []; }

export async function fetchStock({ tenantId }) { return []; }
export async function fetchVentas({ tenantId }) { return []; }
