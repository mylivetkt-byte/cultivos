import React, { useState, useEffect } from 'react';
import { authFetch } from '../../../utils/api';
import { Search, Package, Box, CheckSquare, Square, ShoppingCart, X, Search as SearchIcon } from 'lucide-react';
import { Button, Select, DatePicker, Input, Table, Tag, Modal, Alert, Typography } from 'antd';
const { Option } = Select;
const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

const TallerInventario = ({ onBack, tenantId }) => {
  const [existencias, setExistencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Selección múltiple
  const [selectedItems, setSelectedItems] = useState({});
  const [showModal, setShowModal] = useState(false);

  // Datos para el formulario del pedido
  const [maquinas, setMaquinas] = useState([]);
  const [contactos, setContactos] = useState([]);
  const [form, setForm] = useState({
    id_tecnico: '',
    id_maquina: '',
    tipo_mantenimiento: 'Preventivo',
    id_rutina: ''
  });
  const [saving, setSaving] = useState(false);
  
  // CMMS Fase 1 - Rutinas
  const [rutinasMaquina, setRutinasMaquina] = useState([]);
  const [loadingRutinas, setLoadingRutinas] = useState(false);

  // Estado del historial de pedidos
  const [histVisible, setHistVisible] = useState(false);
  const [histData, setHistData] = useState([]);
  const [loadingHist, setLoadingHist] = useState(false);
  const [histMaquina, setHistMaquina] = useState(null);
  const [histEmpleado, setHistEmpleado] = useState(null);
  const [histDates, setHistDates] = useState([null, null]);
  const [histSearch, setHistSearch] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  // Fetch rutinas when maquina changes
  useEffect(() => {
    if (form.id_maquina && form.tipo_mantenimiento === 'Preventivo') {
      fetchRutinas(form.id_maquina);
    } else {
      setRutinasMaquina([]);
      setForm(prev => ({...prev, id_rutina: ''}));
    }
  }, [form.id_maquina, form.tipo_mantenimiento]);

  const fetchRutinas = async (id_maquina) => {
    setLoadingRutinas(true);
    try {
      const res = await authFetch(`/api/taller/rutinas/${id_maquina}?tenantId=${tenantId}`);
      const data = await res.json();
      if(data.success) {
        setRutinasMaquina(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingRutinas(false);
    }
  };

  const handleApplyRutina = (id_rutina) => {
    setForm(prev => ({...prev, id_rutina}));
    const rutina = rutinasMaquina.find(r => r.id_rutina.toString() === id_rutina.toString());
    if (rutina && rutina.insumos) {
      const newSelections = { ...selectedItems }; 
      let warning = false;
      rutina.insumos.forEach(ins => {
        newSelections[ins.id_insumo] = { cantidad: ins.cantidad_requerida };
        if (parseFloat(ins.stock_actual) < parseFloat(ins.cantidad_requerida)) {
          warning = true;
        }
      });
      setSelectedItems(newSelections);
      if (warning) {
        alert("Atención: Algunos ítems de esta rutina tienen stock insuficiente en bodega.");
      }
    }
  };

  const loadData = async () => {
    try {
      const [resCat, resMaq, resCont] = await Promise.all([
        authFetch(`/api/taller/repuestos-catalogo?tenantId=${tenantId}`),
        authFetch(`/api/taller/maquinas?tenantId=${tenantId}`),
        authFetch(`/api/taller/contactos?tenantId=${tenantId}`)
      ]);
      const dataCat = await resCat.json();
      const dataMaq = await resMaq.json();
      const dataCont = await resCont.json();
      
      setExistencias(dataCat);
      if(dataMaq.success) setMaquinas(dataMaq.data);
      if(dataCont.success) setContactos(dataCont.data.filter(c => c.tipo === 'Mecánico Interno'));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = existencias.filter(e => 
    (e.insumo_nombre && e.insumo_nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (e.codigo && e.codigo.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const toggleSelection = (id_insumo) => {
    setSelectedItems(prev => {
      const nw = { ...prev };
      if (nw[id_insumo]) {
        delete nw[id_insumo];
      } else {
        nw[id_insumo] = { cantidad: 1 };
      }
      return nw;
    });
  };

  const updateQuantity = (id_insumo, qty) => {
    setSelectedItems(prev => ({
      ...prev,
      [id_insumo]: { cantidad: qty }
    }));
  };

  const handleCreatePedido = async () => {
    if (!form.id_tecnico || !form.id_maquina) {
      alert("Debes seleccionar un mecánico y una máquina.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        id_tenant: tenantId,
        mecanico: form.id_tecnico,
        id_maquina: form.id_maquina,
        tipo_mantenimiento: form.tipo_mantenimiento,
        detalles: Object.keys(selectedItems).map(id => ({
          id_insumo: id,
          cantidad: selectedItems[id].cantidad
        }))
      };

      const res = await authFetch('/api/taller/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (data.success) {
        alert("Pedido generado correctamente. Número de Requisición: " + data.id_pedido);
        
        // Opcional: WhatsApp
        if (window.confirm("¿Deseas enviar un aviso al responsable de bodega por WhatsApp?")) {
          const mecanicoObj = contactos.find(c => c.nombre === form.id_tecnico);
          const tel = mecanicoObj ? mecanicoObj.telefono : '';
          const msg = encodeURIComponent(`🚨 *REQUISICIÓN DE TALLER #${data.id_pedido}* 🚨\n\nSe ha generado un nuevo pedido de bodega.\n\n${data.observaciones}`);
          window.open(`https://wa.me/?text=${msg}`, '_blank');
        }

        setSelectedItems({});
        setShowModal(false);
      } else {
        alert("Error al generar el pedido: " + data.error);
      }
    } catch (e) {
      console.error(e);
      alert("Error en la conexión");
    } finally {
      setSaving(false);
    }
  };

  // Cargar historial de pedidos
  const loadHistorial = async () => {
    setLoadingHist(true);
    try {
      let url = `/api/taller/pedidos-historial?tenantId=${tenantId}`;
      if (histMaquina) url += `&id_maquina=${histMaquina}`;
      if (histEmpleado) url += `&id_empleado=${histEmpleado}`;
      if (histDates[0] && histDates[1]) {
        url += `&startDate=${histDates[0].format('YYYY-MM-DD')}&endDate=${histDates[1].format('YYYY-MM-DD')}`;
      }
      if (histSearch) url += `&search=${encodeURIComponent(histSearch)}`;
      const res = await authFetch(url);
      const { success, data } = await res.json();
      if (success) setHistData(data);
    } catch (e) {
      console.error(e);
      message.error('Error cargando el historial');
    } finally {
      setLoadingHist(false);
    }
  };

  const selectedCount = Object.keys(selectedItems).length;

  return (
    <div style={{ padding: '20px', background: '#f8fafc', minHeight: '100%', position: 'relative' }}>
      <div style={{ marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Package size={24} color="#3b82f6" /> 
            Catálogo de Repuestos
          </Title>
          <Text type="secondary" style={{ fontSize: '0.9rem' }}>
            Busca por código o descripción. Selecciona varios repuestos para generar un pedido.
          </Text>
        </div>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          {selectedCount > 0 && (
            <Button type="primary" danger onClick={() => setShowModal(true)}>
              <ShoppingCart size={18} /> Generar Pedido ({selectedCount})
            </Button>
          )}
        </div>
      </div>

      <div style={{ position: 'relative', marginBottom: '20px' }}>
        <Search size={20} color="#64748b" style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)' }} />
        <input 
          type="text" 
          placeholder="Buscar por nombre o código..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ 
            width: '100%', padding: '12px 14px 12px 45px', borderRadius: '8px', 
            border: '1px solid #cbd5e1', fontSize: '1rem', boxSizing: 'border-box'
          }}
        />
      </div>

      {loading ? (
        <p>Cargando catálogo...</p>
      ) : (
        <div style={{ overflowX: 'auto', background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '12px 15px', width: '50px' }}></th>
                <th style={{ padding: '12px 15px', color: '#475569', fontSize: '0.9rem' }}>Código</th>
                <th style={{ padding: '12px 15px', color: '#475569', fontSize: '0.9rem' }}>Descripción</th>
                <th style={{ padding: '12px 15px', color: '#475569', fontSize: '0.9rem' }}>Stock Actual</th>
                <th style={{ padding: '12px 15px', color: '#475569', fontSize: '0.9rem', width: '120px' }}>Cant. Pedir</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => {
                const isSelected = !!selectedItems[item.id_insumo];
                const hasStock = item.cantidad > 0;
                return (
                  <tr key={item.id_insumo} style={{ borderBottom: '1px solid #e2e8f0', background: isSelected ? '#f0fdf4' : 'transparent' }}>
                    <td style={{ padding: '12px 15px', cursor: 'pointer' }} onClick={() => toggleSelection(item.id_insumo)}>
                      {isSelected ? <CheckSquare color="#10b981" /> : <Square color="#cbd5e1" />}
                    </td>
                    <td style={{ padding: '12px 15px', fontSize: '0.9rem', fontWeight: '500' }}>{item.codigo || 'N/A'}</td>
                    <td style={{ padding: '12px 15px' }}>
                      <div style={{ fontWeight: 'bold', color: '#1e293b' }}>{item.insumo_nombre}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{item.bodega_nombre}</div>
                    </td>
                    <td style={{ padding: '12px 15px' }}>
                      <span style={{ color: hasStock ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>
                        {parseFloat(item.cantidad || 0).toLocaleString()} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#64748b' }}>{item.unidad_medida}</span>
                      </span>
                    </td>
                    <td style={{ padding: '12px 15px' }}>
                      {isSelected && (
                        <input 
                          type="number" 
                          min="0.1" 
                          step="0.1"
                          value={selectedItems[item.id_insumo].cantidad}
                          onChange={(e) => updateQuantity(item.id_insumo, e.target.value)}
                          style={{ width: '80px', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                    No se encontraron repuestos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal para Generar Pedido */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', padding: '25px', borderRadius: '16px', width: '90%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Generar Requisición</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '5px' }}>Mecánico Solicitante *</label>
                <select 
                  value={form.id_tecnico} 
                  onChange={e => setForm({...form, id_tecnico: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="">Selecciona mecánico...</option>
                  {contactos.map((c, i) => <option key={i} value={c.nombre}>{c.nombre}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '5px' }}>Máquina / Equipo *</label>
                <select 
                  value={form.id_maquina} 
                  onChange={e => setForm({...form, id_maquina: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="">Selecciona una máquina...</option>
                  {maquinas.map(m => <option key={m.id_maq_agro} value={m.id_maq_agro}>[{m.placa}] {m.marca_modelo}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '5px' }}>Tipo de Mantenimiento *</label>
                <select 
                  value={form.tipo_mantenimiento} 
                  onChange={e => setForm({...form, tipo_mantenimiento: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="Preventivo">Preventivo (Filtros, Aceites, Lubricantes)</option>
                  <option value="Correctivo">Correctivo (Repuestos, Averías)</option>
                </select>
                <p style={{ margin: '5px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                  Nota: Al elegir Preventivo, recuerda pedir los insumos de recambio periódico. Si es Correctivo, los repuestos específicos.
                </p>
              </div>

              {form.tipo_mantenimiento === 'Preventivo' && form.id_maquina && (
                <div style={{ background: '#f0fdf4', padding: '15px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#166534', marginBottom: '5px' }}>
                    Aplicar Rutina Recomendada (Opcional)
                  </label>
                  <select 
                    value={form.id_rutina} 
                    onChange={e => handleApplyRutina(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #86efac' }}
                  >
                    <option value="">Selecciona una rutina para autollenar repuestos...</option>
                    {rutinasMaquina.map(r => (
                      <option key={r.id_rutina} value={r.id_rutina}>
                        {r.nombre_rutina} ({r.frecuencia_horas}H)
                      </option>
                    ))}
                  </select>
                  {loadingRutinas && <span style={{ fontSize: '0.8rem', color: '#166534' }}>Cargando rutinas...</span>}
                </div>
              )}

              <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '10px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem' }}>Resumen de Items ({selectedCount})</h4>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.85rem', color: '#475569' }}>
                  {Object.keys(selectedItems).map(id => {
                    const item = existencias.find(e => e.id_insumo.toString() === id.toString());
                    return <li key={id}>{item?.insumo_nombre} x {selectedItems[id].cantidad}</li>;
                  })}
                </ul>
              </div>

              <button 
                onClick={handleCreatePedido}
                disabled={saving}
                style={{ width: '100%', padding: '12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}
              >
                {saving ? 'Procesando...' : 'Confirmar Pedido a Bodega'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TallerInventario;
