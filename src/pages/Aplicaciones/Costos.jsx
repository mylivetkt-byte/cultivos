import React, { useState, useEffect } from 'react';
import { getCostos } from '../../services/aplicacionesApi';
import { fetchTableData } from '../../utils/api';
import '../../components/dashboard.css';

export default function Costos({ tenantId, loteId }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLote, setSelectedLote] = useState(loteId || '');
  const [lotes, setLotes] = useState([]);

  useEffect(() => {
    cargarLotes();
  }, [tenantId]);

  useEffect(() => {
    cargarCostos();
  }, [tenantId, selectedLote]);

  const cargarLotes = async () => {
    try {
      const res = await fetchTableData('lotes', { tenantId, pageSize: 500 });
      setLotes(res.data || []);
    } catch (e) {
      console.error('Error cargando lotes', e);
    }
  };

  const cargarCostos = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getCostos({ tenantId, fincaId: selectedLote ? undefined : undefined });
      const lotesFiltrados = selectedLote ? res.filter((r) => String(r.loteId) === String(selectedLote)) : res;
      setData(lotesFiltrados);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const total = Array.isArray(data) ? data.reduce((s, r) => s + Number(r.total_costos || 0), 0) : 0;

  return (
    <div>
      <h3>Costos por Lote</h3>
      <div className="form-row" style={{ marginBottom: '12px' }}>
        <select
          className="form-control"
          style={{ maxWidth: '300px' }}
          value={selectedLote}
          onChange={(e) => setSelectedLote(e.target.value)}
        >
          <option value="">— Todos los lotes —</option>
          {lotes.map((l) => (
            <option key={l.id_lote} value={l.id_lote}>
              {l.nombre || `Lote ${l.id_lote}`}
            </option>
          ))}
        </select>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      <div>
        <button className="btn btn-outline-primary btn-sm mr-2" onClick={() => alert('Exportar CSV')}>Exportar CSV</button>
        <button className="btn btn-outline-success btn-sm" onClick={() => alert('Exportar Excel')}>Exportar Excel</button>
      </div>
      <div className="table-responsive" style={{ marginTop: '12px' }}>
        <div>
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Lote ID</th>
             <th>Costo insumos ($)</th>
             <th>Costo operación ($)</th>
             <th>Costo orgánico ($)</th>
             <th>Total ($)</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.loteId}>
                  <td>{r.loteId}</td>
                  <td>{Number(r.insumos || 0).toFixed(2)}</td>
                  <td>{Number(r.operacion || 0).toFixed(2)}</td>
                  <td>{Number(r.organico || 0).toFixed(2)}</td>
                  <td className="font-weight-bold">{Number(r.total || 0).toFixed(2)}</td>
                </tr>
              ))}
              <tr className="font-weight-bold">
                <td colSpan="4">TOTAL</td>
                <td>{total.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
