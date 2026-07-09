import React, { useState, useEffect } from 'react';
import { message } from 'antd';
import { authFetch } from '../../utils/api';

export default function DistribucionContable({ tenantId }) {
  const [plantillas, setPlantillas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    tipo_planilla: 'Semanal',
    descripcion: '',
    id_comprobante: 3,
    cuenta_debito: '510506',
    cuenta_credito: '250505'
  });

  const tiposPlanilla = ['Semanal', 'Quincenal', 'Mensual', 'Contrato'];

  useEffect(() => {
    fetchPlantillas();
  }, [tenantId]);

  const fetchPlantillas = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/rrhh/plantillas-contables?tenantId=${tenantId || 1}`);
      const data = await res.json();
      setPlantillas(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      message.error('Error cargando distribución contable');
    } finally {
      setLoading(false);
    }
  };

  const openNewModal = () => {
    setEditingId(null);
    setFormData({ tipo_planilla: 'Semanal', descripcion: '', id_comprobante: 3, cuenta_debito: '510506', cuenta_credito: '250505' });
    setShowModal(true);
  };

  const openEditModal = (p) => {
    setEditingId(p.id_plantilla);
    setFormData({ 
      tipo_planilla: p.tipo_planilla, 
      descripcion: p.descripcion,
      id_comprobante: p.id_comprobante || 3,
      cuenta_debito: p.cuenta_debito || '510506',
      cuenta_credito: p.cuenta_credito || '250505'
    });
    setShowModal(true);
  };

  const closeModal = () => setShowModal(false);

  const handleSave = async () => {
    try {
      const url = editingId ? `/api/rrhh/plantillas-contables/${editingId}` : '/api/rrhh/plantillas-contables';
      const method = editingId ? 'PUT' : 'POST';
      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, tenantId: tenantId || 1 })
      });
      if (!res.ok) throw new Error('Error guardando plantilla');
      message.success('Plantilla registrada');
      closeModal();
      fetchPlantillas();
    } catch (e) {
      message.error(e.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar esta plantilla contable?')) return;
    try {
      await authFetch(`/api/rrhh/plantillas-contables/${id}`, { method: 'DELETE' });
      message.success('Eliminada');
      fetchPlantillas();
    } catch (e) {
      message.error('Error al eliminar');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="catalog-container">
      <div className="catalog-header print:hidden">
        <h2>🧾 Distribución Contable de Nómina</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handlePrint} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>🖨️</span> Imprimir Configuración
          </button>
          <button onClick={openNewModal} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>+</span> Nueva Plantilla
          </button>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', overflow: 'hidden', marginTop: '20px' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>Cargando configuraciones...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', color: '#475569', fontSize: '13px', textTransform: 'uppercase' }}>
                <th style={{ padding: '16px', borderBottom: '1px solid #e2e8f0' }}>ID</th>
                <th style={{ padding: '16px', borderBottom: '1px solid #e2e8f0' }}>Tipo de Planilla</th>
                <th style={{ padding: '16px', borderBottom: '1px solid #e2e8f0' }}>Descripción / Referencia</th>
                <th style={{ padding: '16px', borderBottom: '1px solid #e2e8f0' }}>Comprobante Destino</th>
                <th style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }} className="print:hidden">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {plantillas.length === 0 ? (
                <tr><td colSpan="5" style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>No hay plantillas contables configuradas.</td></tr>
              ) : plantillas.map(p => (
                <tr key={p.id_plantilla} style={{ borderBottom: '1px solid #f1f5f9' }} className="hover:bg-gray-50">
                  <td style={{ padding: '16px', fontWeight: 'bold' }}>{p.id_plantilla}</td>
                  <td style={{ padding: '16px', color: '#1e293b' }}>
                    <span style={{ background: '#e2e8f0', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>
                      {p.tipo_planilla}
                    </span>
                  </td>
                  <td style={{ padding: '16px', color: '#334155' }}>{p.descripcion}</td>
                  <td style={{ padding: '16px', color: '#64748b' }}>
                    Comp: {p.id_comprobante || '3'}<br/>
                    <span style={{ fontSize: '11px' }}>D: {p.cuenta_debito || '510506'} | C: {p.cuenta_credito || '250505'}</span>
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center', display: 'flex', gap: '8px', justifyContent: 'center' }} className="print:hidden">
                    <button 
                      onClick={() => openEditModal(p)}
                      style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
                    >
                      ✏️ Editar
                    </button>
                    <button 
                      onClick={() => handleDelete(p.id_plantilla)}
                      style={{ background: '#fee2e2', color: '#991b1b', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
                    >
                      🗑️ Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top:0, left:0, right:0, bottom:0, background: 'rgba(15, 23, 42, 0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'white', padding:'24px', borderRadius:'12px', width:'400px' }}>
            <h3 style={{ marginTop: 0, borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>Nueva Plantilla Contable</h3>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Aplica para Planilla Tipo:</label>
              <select value={formData.tipo_planilla} onChange={e=>setFormData({...formData, tipo_planilla:e.target.value})} style={{ width:'100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                {tiposPlanilla.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Descripción</label>
              <input type="text" value={formData.descripcion} onChange={e=>setFormData({...formData, descripcion:e.target.value})} placeholder="Ej: Nómina Agrícola Fija" style={{ width:'100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Comprobante</label>
                <input type="number" value={formData.id_comprobante} onChange={e=>setFormData({...formData, id_comprobante:e.target.value})} style={{ width:'100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Cta. Débito</label>
                <input type="text" value={formData.cuenta_debito} onChange={e=>setFormData({...formData, cuenta_debito:e.target.value})} style={{ width:'100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Cta. Crédito</label>
                <input type="text" value={formData.cuenta_credito} onChange={e=>setFormData({...formData, cuenta_credito:e.target.value})} style={{ width:'100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              </div>
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end', gap:'12px', marginTop: '20px' }}>
              <button onClick={closeModal} className="btn btn-outline">Cancelar</button>
              <button onClick={handleSave} className="btn btn-primary">Registrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
