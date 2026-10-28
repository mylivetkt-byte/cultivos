import React, { useState, useEffect } from 'react';
import { getCostos } from '../../services/aplicacionesApi';
import { fetchTableData } from '../../utils/api';
import '../../components/dashboard.css';

export default function TableroControl({ tenantId, fincaId }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFinca, setSelectedFinca] = useState(fincaId || '');
  const [fincas, setFincas] = useState([]);

  useEffect(() => {
    cargarFincas();
  }, [tenantId]);

  useEffect(() => {
    cargarCostos();
  }, [tenantId, selectedFinca]);

  const cargarFincas = async () => {
    try {
      const res = await fetchTableData('fincas', { tenantId, pageSize: 200 });
      setFincas(res.data || []);
    } catch (e) {
      console.error('Error cargando fincas', e);
    }
  };

  const cargarCostos = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getCostos({ tenantId, fincaId: selectedFinca || undefined });
      setData(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const dataList = Array.isArray(data) ? data : [];
  const totalGeneral = dataList.reduce((s, r) => s + Number(r.total || 0), 0);
  const totalInsumos = dataList.reduce((s, r) => s + Number(r.insumos || 0), 0);
  const totalOperacion = dataList.reduce((s, r) => s + Number(r.operacion || 0), 0);
  const totalOrganico = dataList.reduce((s, r) => s + Number(r.organico || 0), 0);

  return (
    <div className="dashboard-container">
      <div className="page-header">
        <h2>📊 Tablero de Control y Costos</h2>
        <div className="form-row">
          <select
            className="form-control"
            style={{ maxWidth: '250px' }}
            value={selectedFinca}
            onChange={(e) => setSelectedFinca(e.target.value)}
          >
            <option value="">— Todas las fincas —</option>
            {fincas.map((f) => (
              <option key={f.id_finca} value={f.id_finca}>
                {f.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="cards-row" style={{ marginBottom: '20px' }}>
        <div className="card" style={{ flex: 1, textAlign: 'center' }}>
          <h4 className="text-muted">Total Insumos</h4>
          <h3 className="text-primary">${totalInsumos.toFixed(2)}</h3>
        </div>
        <div className="card" style={{ flex: 1, textAlign: 'center' }}>
          <h4 className="text-muted">Total Operación</h4>
          <h3 className="text-warning">${totalOperacion.toFixed(2)}</h3>
        </div>
        <div className="card" style={{ flex: 1, textAlign: 'center' }}>
          <h4 className="text-muted">Total Orgánico</h4>
          <h3 className="text-success">${totalOrganico.toFixed(2)}</h3>
        </div>
        <div className="card" style={{ flex: 1, textAlign: 'center' }}>
          <h4 className="text-muted">Costo Total</h4>
          <h3 className="text-danger">${totalGeneral.toFixed(2)}</h3>
        </div>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="spinner" />
          <span>Calculando costos…</span>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-sm table-hover">
            <thead>
              <tr>
                <th>Lote ID</th>
                <th>Costo Insumos ($)</th>
                <th>Costo Operación ($)</th>
                <th>Costo Orgánico ($)</th>
                <th>Total ($)</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center text-muted">
                    Sin datos de costos
                  </td>
                </tr>
              ) : (
                data.map((r) => (
                  <tr key={r.loteId}>
                    <td>{r.loteId}</td>
                    <td>{Number(r.insumos || 0).toFixed(2)}</td>
                    <td>{Number(r.operacion || 0).toFixed(2)}</td>
                    <td>{Number(r.organico || 0).toFixed(2)}</td>
                    <td className="font-weight-bold">{Number(r.total || 0).toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
