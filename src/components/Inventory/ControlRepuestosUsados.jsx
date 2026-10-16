import React, { useState, useEffect } from 'react';
import { authFetch } from '../../utils/api';
import Pagination from '../Pagination';

export default function ControlRepuestosUsados({ tenantId }) {
  const [repuestos, setRepuestos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (tenantId) fetchRepuestos();
  }, [tenantId]);

  const fetchRepuestos = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/inventario/repuestos_usados?tenantId=${tenantId}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("API Error:", err);
        setRepuestos([]);
        return;
      }
      const data = await res.json();
      setRepuestos(Array.isArray(data) ? data : []);
      setCurrentPage(1);
    } catch (e) {
      console.error("Fetch exception:", e);
      setRepuestos([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEntregar = async (id) => {
    if (!window.confirm("¿Confirmar que el empleado entregó la pieza usada?")) return;
    try {
      const res = await authFetch(`/api/inventario/repuestos_usados/${id}/entregar`, { method: 'PUT' });
      if (res.ok) fetchRepuestos();
    } catch (e) {
      alert("Error al marcar la pieza.");
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0 }}>Logística Inversa: Control de Piezas y Repuestos Usados</h3>
        <button className="btn btn-outline" onClick={fetchRepuestos} disabled={loading}>
          {loading ? 'Cargando...' : 'Actualizar'}
        </button>
      </div>

      <p style={{ color: 'var(--text-secondary)' }}>
        Cuando un empleado retira un repuesto nuevo para una maquinaria, debe entregar la pieza dañada o vieja. Aquí se lleva el control.
      </p>

      <div className="table-wrapper table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Documento Salida</th>
              <th>Fecha</th>
              <th>Empleado Responsable</th>
              <th>Máquina / Equipo</th>
              <th>Repuesto Extraído</th>
              <th>Estado de Devolución</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {repuestos.length === 0 ? (
              <tr><td colSpan="7" style={{ textAlign: 'center' }}>No hay registros de repuestos extraídos.</td></tr>
            ) : repuestos.slice((currentPage - 1) * 20, currentPage * 20).map(r => (
              <tr key={r.id_cambio}>
                <td style={{ fontWeight: 600 }}>{r.consecutivo}</td>
                <td>{new Date(r.fecha_salida).toLocaleDateString()}</td>
                <td>{r.empleado_nombre}</td>
                <td>{r.maquina_nombre}</td>
                <td>{r.codigo} - {r.insumo_nombre}</td>
                <td>
                  {r.pieza_vieja_entregada ? (
                    <span className="badge" style={{ background: 'var(--success)', color: 'white', padding: '4px 8px', borderRadius: '4px' }}>
                      Pieza Entregada ({new Date(r.fecha_entrega_pieza).toLocaleDateString()})
                    </span>
                  ) : (
                    <span className="badge" style={{ background: 'var(--danger)', color: 'white', padding: '4px 8px', borderRadius: '4px' }}>
                      Pendiente por Entregar
                    </span>
                  )}
                </td>
                <td>
                  {!r.pieza_vieja_entregada && (
                    <button className="btn btn-sm btn-success" onClick={() => handleEntregar(r.id_cambio)}>
                      Marcar Pieza Recibida
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {repuestos.length > 0 && (
          <Pagination 
            currentPage={currentPage}
            totalItems={repuestos.length}
            pageSize={20}
            onPageChange={setCurrentPage}
          />
        )}
      </div>
    </div>
  );
}
