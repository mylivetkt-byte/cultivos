import React, { useState, useEffect } from 'react';
import { 
  Wrench, Plus, CheckCircle, Clock, Truck, 
  AlertTriangle, DollarSign, Package, User, 
  Search, Eye, Printer, Send 
} from 'lucide-react';
import { Select, Input, List } from 'antd';
import { fetchApi } from '../../utils/api';
import '../../styles/PreliquidacionTaller.css';

const { Option } = Select;
const { Search: AntSearch } = Input;

export default function PreliquidacionTaller() {
  const [preliquidaciones, setPreliquidaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('dashboard'); // dashboard | wizard | detail
  const [selectedItem, setSelectedItem] = useState(null);

  // Wizard state
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    tipo_equipo: 'Maquinaria',
    id_equipo: '',
    nombre_equipo: '',
    falla_reportada: '',
    diagnostico_tecnico: '',
    id_mecanico: '',
    tipo_mecanico: 'Interno',
    detalles: []
  });

  // Inventario y Catálogos Reales
  const [repuestos, setRepuestos] = useState([]);
  const [mecanicos, setMecanicos] = useState([]);
  const [equipos, setEquipos] = useState([]);
  
  // Search filters
  const [searchMecanicos, setSearchMecanicos] = useState('');
  const [searchRepuestos, setSearchRepuestos] = useState('');

  const [sugerencias, setSugerencias] = useState([]);
  const [modalProveedor, setModalProveedor] = useState(false);
  const [nuevoProveedor, setNuevoProveedor] = useState({ tipo_documento: 'NIT', documento: '', dv: '', nombre_completo: '', telefono: '', direccion: '' });
  const [modalRepuesto, setModalRepuesto] = useState(false);
  const [nuevoRepuesto, setNuevoRepuesto] = useState({ nombre: '', precio_estimado: 0 });


  
  const handleSelectEquipo = async (value) => {
    const eq = equipos.find(x => x.id === value);
    setFormData({...formData, id_equipo: value, nombre_equipo: eq?.nombre, tipo_equipo: eq?.tipo});
    try {
      const res = await fetchApi('/taller/preliquidacion/sugerencias/' + value);
      setSugerencias(res || []);
    } catch (e) {
      setSugerencias([]);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetchApi('/taller/preliquidacion');
      setPreliquidaciones(Array.isArray(res) ? res : []);
      
      const cat = await fetchApi('/taller/preliquidacion/catalogo');
      if (cat) {
        setEquipos(cat.equipos || []);
        setMecanicos(cat.mecanicos || []);
        setRepuestos(cat.repuestos || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async () => {
    try {
      setLoading(true);
      const res = await fetchApi('/taller/preliquidacion', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      if (res.success) {
        alert('Cotización creada exitosamente');
        setView('dashboard');
        loadData();
      }
    } catch (err) {
      alert('Error creando cotización');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id, estado) => {
    try {
      setLoading(true);
      await fetchApi(`/taller/preliquidacion/${id}/estado`, {
        method: 'PUT',
        body: JSON.stringify({ estado })
      });
      loadData();
    } catch (err) {
      alert('Error actualizando estado');
    } finally {
      setLoading(false);
    }
  };

  
  const handleSaveProveedor = async () => {
    if (!nuevoProveedor.documento || !nuevoProveedor.nombre_completo) {
      alert("Documento y Nombre son requeridos");
      return;
    }
    setLoading(true);
    try {
      const res = await fetchApi('/taller/preliquidacion/proveedor-rapido', {
        method: 'POST',
        body: JSON.stringify(nuevoProveedor)
      });
      if (res && res.id) {
        setMecanicos([...mecanicos, res]);
        setModalProveedor(false);
        setNuevoProveedor({ tipo_documento: 'NIT', documento: '', dv: '', nombre_completo: '', telefono: '', direccion: '' });
      }
    } catch (e) {
      alert("Error guardando proveedor");
    }
    setLoading(false);
  };

  const handleSaveRepuestoFantasma = () => {
    if (!nuevoRepuesto.nombre) return;
    setFormData({
      ...formData,
      detalles: [...formData.detalles, {
        tipo_item: 'Repuesto',
        id_referencia: null,
        descripcion: nuevoRepuesto.nombre + ' (NO CATALOGADO)',
        cantidad: 1,
        costo_unitario_estimado: nuevoRepuesto.precio_estimado || 0,
        requiere_compra: true
      }]
    });
    setModalRepuesto(false);
    setNuevoRepuesto({ nombre: '', precio_estimado: 0 });
  };

  const addItemToWizard = (tipo, refItem) => {
    if (tipo === 'Repuesto') {
      const isMissing = refItem.stock <= 0;
      setFormData({
        ...formData,
        detalles: [...formData.detalles, {
          tipo_item: 'Repuesto',
          id_referencia: refItem.id,
          descripcion: refItem.nombre,
          cantidad: 1,
          costo_unitario_estimado: refItem.precio,
          requiere_compra: isMissing
        }]
      });
    } else if (tipo === 'Mano_Obra') {
      setFormData({
        ...formData,
        id_mecanico: refItem.id,
        tipo_mecanico: refItem.tipo,
        detalles: [...formData.detalles, {
          tipo_item: 'Mano_Obra',
          id_referencia: refItem.id,
          descripcion: `Mano de obra: ${refItem.nombre}`,
          cantidad: 1,
          costo_unitario_estimado: refItem.valor_hora,
          requiere_compra: false
        }]
      });
    }
  };

  return (
    <div className="taller-container">
      <div className="taller-header">
        <div>
          <h2><Wrench className="icon-title" /> Centro de Control: Taller</h2>
          <p>Cotización, diagnóstico y preliquidación inteligente de reparaciones</p>
        </div>
        {view === 'dashboard' ? (
          <button className="btn-glass" onClick={() => { setStep(1); setFormData({...formData, detalles: []}); setView('wizard'); }}>
            <Plus size={18} /> Nueva Cotización
          </button>
        ) : (
          <button className="btn-glass" onClick={() => setView('dashboard')}>
            Volver al Dashboard
          </button>
        )}
      </div>

      {view === 'dashboard' && (
        <div className="dashboard-content">
          <div className="metrics-grid">
            <div className="metric-card cyan">
              <Clock className="bg-icon" />
              <h3>{preliquidaciones.filter(p => p.estado === 'Pendiente_Aprobacion').length}</h3>
              <p>Por Aprobar</p>
            </div>
            <div className="metric-card orange">
              <Package className="bg-icon" />
              <h3>{preliquidaciones.filter(p => p.estado === 'Esperando_Repuestos').length}</h3>
              <p>Esperando Repuestos</p>
            </div>
            <div className="metric-card green">
              <CheckCircle className="bg-icon" />
              <h3>{preliquidaciones.filter(p => p.estado === 'En_Ejecucion').length}</h3>
              <p>En Ejecución</p>
            </div>
          </div>

          <div className="glass-panel">
            <h3>Historial Reciente</h3>
            {loading ? <p>Cargando...</p> : (
              <table className="glass-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Equipo</th>
                    <th>Estado</th>
                    <th>Total Estimado</th>
                    <th>Fecha</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {preliquidaciones.map(p => (
                    <tr key={p.id_preliquidacion}>
                      <td>#{p.id_preliquidacion}</td>
                      <td>{p.nombre_equipo}</td>
                      <td>
                        <span className={`status-badge ${p.estado.toLowerCase()}`}>
                          {p.estado.replace('_', ' ')}
                        </span>
                      </td>
                      <td>${Number(p.total_general).toLocaleString()}</td>
                      <td>{new Date(p.creado_en).toLocaleDateString()}</td>
                      <td>
                        <button className="action-btn" onClick={() => { setSelectedItem(p); setView('detail'); }} title="Ver Detalle">
                          <Eye size={16} />
                        </button>
                        {p.estado === 'Pendiente_Aprobacion' && (
                          <button className="action-btn text-green" onClick={() => handleUpdateStatus(p.id_preliquidacion, 'Aprobada')} title="Aprobar Reparación">
                            <CheckCircle size={16} />
                          </button>
                        )}
                        {p.estado === 'Aprobada' && (
                          <button className="action-btn text-blue" onClick={() => handleUpdateStatus(p.id_preliquidacion, 'En_Ejecucion')} title="Iniciar Trabajo">
                            <Wrench size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {view === 'wizard' && (
        <div className="wizard-container">
          <div className="wizard-steps">
            <div className={`step ${step >= 1 ? 'active' : ''}`}>1. Equipo y Falla</div>
            <div className={`step ${step >= 2 ? 'active' : ''}`}>2. Repuestos y Mano de Obra</div>
            <div className={`step ${step >= 3 ? 'active' : ''}`}>3. Resumen Final</div>
          </div>

          <div className="glass-panel wizard-content">
            {step === 1 && (
              <div className="form-grid">
                <div className="form-group">
                  <label>Equipo a Reparar</label>
                  <Select
                    showSearch
                    placeholder="Busque y seleccione un equipo..."
                    optionFilterProp="children"
                    style={{ width: '100%' }}
                    value={formData.id_equipo || undefined}
                    onChange={handleSelectEquipo}
                    filterOption={(input, option) =>
                      (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                  >
                    {equipos.map(eq => (
                      <Option key={eq.id} value={eq.id}>{eq.tipo} - {eq.nombre}</Option>
                    ))}
                  </Select>
                </div>
                <div className="form-group full-width">
                  <label>Falla Reportada</label>
                  <textarea 
                    rows="3" 
                    value={formData.falla_reportada}
                    onChange={e => setFormData({...formData, falla_reportada: e.target.value})}
                    placeholder="El operador reporta que la máquina pierde fuerza al acelerar..."
                  />
                </div>
                <div className="form-group full-width">
                  <label>Diagnóstico Técnico (Jefe Taller)</label>
                  <textarea 
                    rows="3" 
                    value={formData.diagnostico_tecnico}
                    onChange={e => setFormData({...formData, diagnostico_tecnico: e.target.value})}
                    placeholder="Revisión revela fugas en la bomba de inyección y desgaste en correas."
                  />
                </div>
                <div className="form-actions">
                  <button className="btn-primary" onClick={() => setStep(2)} disabled={!formData.id_equipo}>Continuar <ChevronRight /></button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="split-view">
                <div className="catalog-side">
                  <h4>Catálogo</h4>
                  
                  <div className="catalog-section">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h5 style={{ margin: 0 }}>Mecánicos</h5>
                      <button className="btn-glass" style={{padding: "4px 8px", fontSize: "12px"}} onClick={() => setModalProveedor(true)}>+ Nuevo Taller Externo</button>
                      <AntSearch 
                        placeholder="Buscar mecánico..." 
                        style={{ width: 200 }} 
                        onChange={e => setSearchMecanicos(e.target.value)} 
                        allowClear
                      />
                    </div>
                    <div className="items-list custom-list-pagination">
                      <List
                        itemLayout="horizontal"
                        dataSource={mecanicos.filter(m => m.nombre.toLowerCase().includes(searchMecanicos.toLowerCase()))}
                        pagination={{ pageSize: 5, simple: true }}
                        renderItem={m => (
                          <div key={m.id} className="catalog-item" onClick={() => addItemToWizard('Mano_Obra', m)}>
                            <div>
                              <strong>{m.nombre}</strong> <span className="badge">{m.tipo}</span>
                            </div>
                            <div>${Number(m.valor_hora).toLocaleString()}/hr</div>
                          </div>
                        )}
                      />
                    </div>
                  </div>

                  <div className="catalog-section mt-4">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h5 style={{ margin: 0 }}>Inventario de Repuestos</h5>
                      <button className="btn-glass" style={{padding: "4px 8px", fontSize: "12px"}} onClick={() => setModalRepuesto(true)}>+ Solicitar Fuera de Catálogo</button>
                      <AntSearch 
                        placeholder="Buscar repuesto..." 
                        style={{ width: 200 }} 
                        onChange={e => setSearchRepuestos(e.target.value)} 
                        allowClear
                      />
                    </div>
                    <div className="items-list custom-list-pagination">
                      <List
                        itemLayout="horizontal"
                        dataSource={repuestos.filter(r => r.nombre.toLowerCase().includes(searchRepuestos.toLowerCase()))}
                        pagination={{ pageSize: 5, simple: true }}
                        renderItem={r => (
                          <div key={r.id} className="catalog-item" onClick={() => addItemToWizard('Repuesto', r)}>
                            <div>
                              <strong>{r.nombre}</strong>
                              {r.stock > 0 
                                ? <span className="stock-badge green">Stock: {r.stock}</span> 
                                : <span className="stock-badge red">Agotado (Comprar)</span>
                              }
                            </div>
                            <div>${Number(r.precio).toLocaleString()}</div>
                          </div>
                        )}
                      />
                    </div>
                  </div>
                </div>

                <div className="selection-side">
                  <h4>Ítems Agregados</h4>
                  <table className="glass-table small">
                    <thead>
                      <tr>
                        <th>Descripción</th>
                        <th>Cant.</th>
                        <th>Costo U.</th>
                        <th>Total</th>
                        <th>Alertas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.detalles.map((d, i) => (
                        <tr key={i}>
                          <td>{d.descripcion}</td>
                          <td>
                            <input 
                              type="number" 
                              value={d.cantidad} 
                              onChange={e => {
                                const newDet = [...formData.detalles];
                                newDet[i].cantidad = parseFloat(e.target.value) || 0;
                                setFormData({...formData, detalles: newDet});
                              }}
                              style={{ width: '60px', background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}
                            />
                          </td>
                          <td>${d.costo_unitario_estimado}</td>
                          <td>${d.cantidad * d.costo_unitario_estimado}</td>
                          <td>
                            {d.requiere_compra && <AlertTriangle size={14} color="#f59e0b" title="Requiere compra externa" />}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="form-actions mt-4">
                    <button className="btn-glass" onClick={() => setStep(1)}>Atrás</button>
                    <button className="btn-primary" onClick={() => setStep(3)}>Revisar Cotización</button>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="summary-view">
                <div className="receipt">
                  <div className="receipt-header">
                    <h2>AGROPACCIOLI S.A.S</h2>
                    <h3>Cotización de Taller (Preliquidación)</h3>
                  </div>
                  <div className="receipt-info">
                    <p><strong>Equipo:</strong> {formData.nombre_equipo}</p>
                    <p><strong>Mecánico Asignado:</strong> {mecanicos.find(m => m.id === formData.id_mecanico)?.nombre || 'No asignado'}</p>
                    <p><strong>Falla Reportada:</strong> {formData.falla_reportada}</p>
                  </div>
                  
                  <table className="receipt-table">
                    <thead>
                      <tr>
                        <th>Ítem</th>
                        <th>Cantidad</th>
                        <th>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.detalles.map((d, i) => (
                        <tr key={i}>
                          <td>{d.descripcion} {d.requiere_compra ? '(Orden Compra)' : ''}</td>
                          <td>{d.cantidad}</td>
                          <td>${(d.cantidad * d.costo_unitario_estimado).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan="2" style={{ textAlign: 'right', fontWeight: 'bold' }}>Total Estimado:</td>
                        <td style={{ fontWeight: 'bold', color: '#10b981' }}>
                          ${formData.detalles.reduce((acc, d) => acc + (d.cantidad * d.costo_unitario_estimado), 0).toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>

                  {formData.detalles.some(d => d.requiere_compra) && (
                    <div className="alert-box warning">
                      <Truck size={18} />
                      Al confirmar, el sistema solicitará automáticamente a compras los repuestos faltantes.
                    </div>
                  )}

                  <div className="form-actions">
                    <button className="btn-glass" onClick={() => setStep(2)}>Atrás</button>
                    <button className="btn-primary" onClick={handleCreate} disabled={loading}>
                      <Send size={16} style={{marginRight: '8px'}} /> Generar y Solicitar Aprobación
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {view === 'detail' && selectedItem && (
        <div className="glass-panel detail-view">
          <h3>Detalle de Preliquidación #{selectedItem.id_preliquidacion}</h3>
          <p><strong>Equipo:</strong> {selectedItem.nombre_equipo}</p>
          <p><strong>Diagnóstico:</strong> {selectedItem.diagnostico_tecnico}</p>
          <p><strong>Estado:</strong> <span className={`status-badge ${selectedItem.estado.toLowerCase()}`}>{selectedItem.estado}</span></p>
          
          <button className="btn-primary mt-4" onClick={() => window.print()}>
            <Printer size={16} style={{marginRight: '8px'}}/> Imprimir PDF
          </button>
        </div>
      )}
    </div>
  );
}

// Simple icon component helper
function ChevronRight() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>;
}
