import React, { useState, useEffect } from 'react';
import { message } from 'antd';
import { authFetch } from '../../utils/api';

export default function CatalogoLabores({ tenantId }) {
  const [labores, setLabores] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Categorías basadas en el requerimiento del usuario
  const categorias = [
    'Todas', 'Agrícolas', 'Taller', 'Vivero', 'Producción', 'Maquinaria', 
    'Equipos', 'Cosechas', 'Bodegas', 'Despacho', 'Ganaderas', 'Piscícola', 'Administrativas', 'Otros'
  ];
  
  const [filtroCategoria, setFiltroCategoria] = useState('Todas');
  const [busqueda, setBusqueda] = useState('');

  // Estados del modal
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    categoria: 'Agrícolas',
    unidad_medida: 'Jornal',
    tarifa_base: '',
    estado: 'Activo'
  });

  const unidadesSugeridas = ['Jornal', 'Hora', 'Hectárea', 'Tonelada', 'Palma', 'Animal', 'Viaje', 'Unidad', 'Litro', 'Día', 'Servicio'];

  useEffect(() => {
    fetchLabores();
  }, [tenantId, filtroCategoria]);

  const fetchLabores = async () => {
    setLoading(true);
    try {
      const tid = tenantId || 1;
      let url = `/api/rrhh/catalogo-labores?tenantId=${tid}`;
      if (filtroCategoria !== 'Todas') {
        url += `&categoria=${encodeURIComponent(filtroCategoria)}`;
      }
      const res = await authFetch(url);
      const data = await res.json();
      setLabores(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      message.error('Error al cargar el catálogo de labores');
    } finally {
      setLoading(false);
    }
  };

  const openNewModal = () => {
    setEditingId(null);
    setFormData({
      codigo: '',
      nombre: '',
      categoria: filtroCategoria !== 'Todas' ? filtroCategoria : 'Agrícolas',
      unidad_medida: 'Jornal',
      tarifa_base: '',
      estado: 'Activo'
    });
    setShowModal(true);
  };

  const openEditModal = (labor) => {
    setEditingId(labor.id_labor_catalogo);
    setFormData({
      codigo: labor.codigo,
      nombre: labor.nombre,
      categoria: labor.categoria,
      unidad_medida: labor.unidad_medida,
      tarifa_base: labor.tarifa_base,
      estado: labor.estado
    });
    setShowModal(true);
  };

  const closeModal = () => setShowModal(false);

  const handleSave = async () => {
    if (!formData.codigo || !formData.nombre) {
      return message.error('El código y el nombre son obligatorios');
    }
    
    try {
      const url = editingId ? `/api/rrhh/catalogo-labores/${editingId}` : '/api/rrhh/catalogo-labores';
      const method = editingId ? 'PUT' : 'POST';
      
      const payload = { ...formData, tenantId: tenantId || 1 };
      
      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) throw new Error('Error guardando la labor');
      
      message.success(`Labor ${editingId ? 'actualizada' : 'creada'} exitosamente`);
      closeModal();
      fetchLabores();
    } catch (e) {
      message.error(e.message);
    }
  };

  const handleToggleEstado = async (id, estadoActual) => {
    // Si queremos eliminar o desactivar, aquí cambiamos el estado
    const nuevoEstado = estadoActual === 'Activo' ? 'Inactivo' : 'Activo';
    try {
      // Obtenemos la labor actual completa de la lista para actualizar solo el estado
      const labor = labores.find(l => l.id_labor_catalogo === id);
      const url = `/api/rrhh/catalogo-labores/${id}`;
      await authFetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...labor, estado: nuevoEstado })
      });
      message.success(`Estado cambiado a ${nuevoEstado}`);
      fetchLabores();
    } catch (e) {
      message.error('Error al cambiar estado');
    }
  };

  const laboresFiltradas = labores.filter(l => 
    l.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
    l.codigo.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="catalog-container">
      <div className="catalog-header print:hidden">
        <h2>📚 Catálogo Central de Labores</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={openNewModal} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>+</span> Nueva Labor
          </button>
        </div>
      </div>

      {/* Controles de Filtro */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', background: 'white', padding: '16px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}>Módulo Operativo (Categoría)</label>
          <select 
            value={filtroCategoria} 
            onChange={(e) => setFiltroCategoria(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
          >
            {categorias.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ flex: 2 }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}>Buscar labor...</label>
          <input 
            type="text" 
            placeholder="Buscar por código o nombre..." 
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
          />
        </div>
      </div>

      {/* Tabla del Catálogo */}
      <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>Cargando catálogo...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', color: '#475569', fontSize: '13px', textTransform: 'uppercase' }}>
                <th style={{ padding: '16px', borderBottom: '1px solid #e2e8f0' }}>Código</th>
                <th style={{ padding: '16px', borderBottom: '1px solid #e2e8f0' }}>Nombre de la Labor</th>
                <th style={{ padding: '16px', borderBottom: '1px solid #e2e8f0' }}>Módulo / Categoría</th>
                <th style={{ padding: '16px', borderBottom: '1px solid #e2e8f0' }}>Unidad de Medida</th>
                <th style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>Tarifa Base</th>
                <th style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>Estado</th>
                <th style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {laboresFiltradas.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                    No se encontraron labores para esta selección.
                  </td>
                </tr>
              ) : laboresFiltradas.map(l => (
                <tr key={l.id_labor_catalogo} style={{ borderBottom: '1px solid #f1f5f9' }} className="hover:bg-gray-50">
                  <td style={{ padding: '16px', fontWeight: 'bold', color: '#3b82f6' }}>{l.codigo}</td>
                  <td style={{ padding: '16px', color: '#1e293b', fontWeight: '500' }}>{l.nombre}</td>
                  <td style={{ padding: '16px' }}>
                    <span style={{ fontSize: '12px', background: '#e2e8f0', padding: '4px 8px', borderRadius: '6px', color: '#475569' }}>
                      {l.categoria}
                    </span>
                  </td>
                  <td style={{ padding: '16px', color: '#64748b' }}>{l.unidad_medida}</td>
                  <td style={{ padding: '16px', textAlign: 'right', fontWeight: 'bold', color: '#10b981' }}>
                    ${Number(l.tarifa_base).toLocaleString()}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center' }}>
                    <button 
                      onClick={() => handleToggleEstado(l.id_labor_catalogo, l.estado)}
                      style={{ 
                        padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', border: 'none', cursor: 'pointer',
                        background: l.estado === 'Activo' ? '#dcfce7' : '#fee2e2',
                        color: l.estado === 'Activo' ? '#166534' : '#991b1b'
                      }}
                    >
                      {l.estado}
                    </button>
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center' }}>
                    <button 
                      onClick={() => openEditModal(l)}
                      style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
                    >
                      ✏️ Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Crear/Editar */}
      {showModal && (
        <div style={{ position: 'fixed', top:0, left:0, right:0, bottom:0, background: 'rgba(15, 23, 42, 0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'white', padding:'24px', borderRadius:'12px', width:'500px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <h3 style={{ marginTop: 0, color: '#1e293b', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', marginBottom: '20px' }}>
              {editingId ? 'Modificar Labor' : 'Registrar Nueva Labor'}
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}>Código *</label>
                  <input type="text" value={formData.codigo} onChange={e=>setFormData({...formData, codigo:e.target.value})} placeholder="Ej: AGR-001" style={{ width:'100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}>Nombre de la Labor *</label>
                  <input type="text" value={formData.nombre} onChange={e=>setFormData({...formData, nombre:e.target.value})} placeholder="Ej: Poda de Palma" style={{ width:'100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}>Módulo Operativo / Categoría</label>
                <select value={formData.categoria} onChange={e=>setFormData({...formData, categoria:e.target.value})} style={{ width:'100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                  {categorias.filter(c => c !== 'Todas').map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#94a3b8' }}>
                  Determina en qué parte del sistema aparecerá esta labor (Taller, Agrícola, Ganadería, etc.)
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}>Unidad de Medida</label>
                  <input 
                    type="text" 
                    list="unidades"
                    value={formData.unidad_medida} 
                    onChange={e=>setFormData({...formData, unidad_medida:e.target.value})} 
                    style={{ width:'100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} 
                  />
                  <datalist id="unidades">
                    {unidadesSugeridas.map(u => <option key={u} value={u} />)}
                  </datalist>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}>Tarifa Base ($)</label>
                  <input type="number" value={formData.tarifa_base} onChange={e=>setFormData({...formData, tarifa_base:e.target.value})} placeholder="0.00" style={{ width:'100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                </div>
              </div>

            </div>

            <div style={{ display:'flex', justifyContent:'flex-end', gap:'12px', marginTop: '30px' }}>
              <button onClick={closeModal} style={{ background: 'transparent', color: '#64748b', border: 'none', padding: '8px 16px', cursor: 'pointer', fontWeight: 'bold' }}>
                Cancelar
              </button>
              <button onClick={handleSave} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '8px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 6px rgba(59, 130, 246, 0.3)' }}>
                {editingId ? 'Guardar Cambios' : 'Registrar Labor'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
