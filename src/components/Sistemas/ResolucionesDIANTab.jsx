import React, { useState, useEffect } from 'react';
import { fetchApi } from '../../utils/api';
import { Plus, Edit2, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import moment from 'moment';

export default function ResolucionesDIANTab({ tenantId }) {
  const [resoluciones, setResoluciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const [formData, setFormData] = useState({
    tipo_resolucion: 'Facturación Electrónica',
    numero_resolucion: '',
    prefijo: '',
    consecutivo_inicial: '',
    consecutivo_final: '',
    consecutivo_actual: '',
    fecha_inicial: '',
    fecha_vence: '',
    estado: 'Activa'
  });

  const loadResoluciones = async () => {
    try {
      setLoading(true);
      const res = await fetchApi(`/sistemas/tenant/${tenantId}/resoluciones`);
      setResoluciones(res.data || []);
    } catch (err) {
      console.error(err);
      alert('Error al cargar resoluciones: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenantId) {
      loadResoluciones();
    }
  }, [tenantId]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleOpen = (item = null) => {
    if (item) {
      setEditItem(item);
      setFormData({
        ...item,
        fecha_inicial: item.fecha_inicial ? moment(item.fecha_inicial).format('YYYY-MM-DD') : '',
        fecha_vence: item.fecha_vence ? moment(item.fecha_vence).format('YYYY-MM-DD') : ''
      });
    } else {
      setEditItem(null);
      setFormData({
        tipo_resolucion: 'Facturación Electrónica',
        numero_resolucion: '',
        prefijo: '',
        consecutivo_inicial: '',
        consecutivo_final: '',
        consecutivo_actual: '',
        fecha_inicial: '',
        fecha_vence: '',
        estado: 'Activa'
      });
    }
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editItem) {
        await fetchApi(`/sistemas/tenant/${tenantId}/resoluciones/${editItem.id_resolucion}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
      } else {
        await fetchApi(`/sistemas/tenant/${tenantId}/resoluciones`, {
          method: 'POST',
          body: JSON.stringify(formData)
        });
      }
      setShowModal(false);
      loadResoluciones();
    } catch (err) {
      console.error(err);
      alert('Error al guardar: ' + err.message);
    }
  };

  const checkStatus = (res) => {
    const today = moment();
    const vence = moment(res.fecha_vence);
    const diasRestantes = vence.diff(today, 'days');
    const consRestantes = res.consecutivo_final - (res.consecutivo_actual || res.consecutivo_inicial);

    let status = res.estado;
    let color = '#4caf50';
    let icon = <CheckCircle size={18} />;

    if (diasRestantes < 0 || consRestantes <= 0) {
      status = 'Vencida/Agotada';
      color = '#f44336';
      icon = <XCircle size={18} />;
    } else if (diasRestantes <= 15 || consRestantes <= 50) {
      status = 'Próxima a vencer';
      color = '#ff9800';
      icon = <AlertCircle size={18} />;
    } else if (res.estado === 'Inactiva') {
      status = 'Inactiva';
      color = '#9e9e9e';
      icon = <XCircle size={18} />;
    }

    return { status, color, icon };
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0, color: '#333' }}>Resoluciones DIAN</h3>
        <button 
          onClick={() => handleOpen()}
          style={{ 
            background: '#1976d2', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' 
          }}
        >
          <Plus size={18} /> Nueva Resolución
        </button>
      </div>

      {loading ? (
        <p>Cargando resoluciones...</p>
      ) : resoluciones.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', background: '#f9f9f9', borderRadius: '8px', border: '1px dashed #ccc' }}>
          <p style={{ color: '#666' }}>No hay resoluciones registradas.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
            <thead>
              <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                <th style={{ padding: '12px' }}>Tipo</th>
                <th style={{ padding: '12px' }}>Resolución / Prefijo</th>
                <th style={{ padding: '12px' }}>Rango Autorizado</th>
                <th style={{ padding: '12px' }}>Vigencia</th>
                <th style={{ padding: '12px' }}>Estado</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {resoluciones.map(res => {
                const { status, color, icon } = checkStatus(res);
                const isActive = res.estado === 'Activa';
                return (
                  <tr key={res.id_resolucion} style={{ borderBottom: '1px solid #eee', background: isActive ? '#f0fdf4' : 'transparent' }}>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {res.tipo_resolucion}
                        {isActive && <CheckCircle size={16} color="#4caf50" title="Resolución Activa" />}
                      </div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <strong>{res.numero_resolucion}</strong><br />
                      <span style={{ color: '#666', fontSize: '13px' }}>Prefijo: {res.prefijo}</span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ display: 'inline-block', background: '#e3f2fd', padding: '2px 6px', borderRadius: '4px', fontSize: '13px' }}>
                        {res.consecutivo_inicial} al {res.consecutivo_final}
                      </span>
                      <br/>
                      <small style={{ color: '#666' }}>Actual: {res.consecutivo_actual || res.consecutivo_inicial}</small>
                    </td>
                    <td style={{ padding: '12px' }}>
                      Desde: {moment(res.fecha_inicial).format('YYYY-MM-DD')}<br />
                      Hasta: {moment(res.fecha_vence).format('YYYY-MM-DD')}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color, fontWeight: '500' }}>
                        {icon} {status}
                      </div>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <button onClick={() => handleOpen(res)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1976d2' }}>
                        <Edit2 size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '8px', width: '90%', maxWidth: '600px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ marginTop: 0, marginBottom: '20px' }}>{editItem ? 'Editar Resolución' : 'Nueva Resolución'}</h3>
            
            <form onSubmit={handleSave}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Tipo de Resolución *</label>
                  <select name="tipo_resolucion" value={formData.tipo_resolucion} onChange={handleChange} required style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}>
                    <option value="Facturación Electrónica">Facturación Electrónica</option>
                    <option value="Punto de Venta POS">Punto de Venta POS</option>
                    <option value="Papel">Documento Equivalente (Papel)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Número Resolución *</label>
                  <input type="text" name="numero_resolucion" value={formData.numero_resolucion} onChange={handleChange} required style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }} />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Prefijo *</label>
                  <input type="text" name="prefijo" value={formData.prefijo} onChange={handleChange} required style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }} />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Consecutivo Inicial *</label>
                  <input type="number" name="consecutivo_inicial" value={formData.consecutivo_inicial} onChange={handleChange} required style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }} />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Consecutivo Final *</label>
                  <input type="number" name="consecutivo_final" value={formData.consecutivo_final} onChange={handleChange} required style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }} />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Fecha Inicial *</label>
                  <input type="date" name="fecha_inicial" value={formData.fecha_inicial} onChange={handleChange} required style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }} />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Fecha Vencimiento *</label>
                  <input type="date" name="fecha_vence" value={formData.fecha_vence} onChange={handleChange} required style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }} />
                </div>

                {editItem && (
                  <>
                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Consecutivo Actual</label>
                      <input type="number" name="consecutivo_actual" value={formData.consecutivo_actual || ''} onChange={handleChange} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Estado</label>
                      <select name="estado" value={formData.estado} onChange={handleChange} required style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}>
                        <option value="Activa">Activa</option>
                        <option value="Inactiva">Inactiva</option>
                      </select>
                    </div>
                  </>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', borderTop: '1px solid #eee', paddingTop: '16px' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '8px 16px', border: '1px solid #ccc', background: '#fff', borderRadius: '4px', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ padding: '8px 16px', border: 'none', background: '#4caf50', color: '#fff', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
