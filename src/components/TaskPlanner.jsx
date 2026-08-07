import React, { useState, useEffect } from 'react';
import { 
  fetchLabores, createLabor, autoGenerateLabores, evaluateLabor, sendLaborReport,
  fetchTableData, fetchTrees
} from '../utils/api';

const CATEGORIES = [
  { value: 'Personal', label: '👥 Personal & Jornales', color: '#6366f1' },
  { value: 'Cultivos', label: '🌱 Manejo de Cultivos', color: '#10b981' },
  { value: 'Lotes', label: '🗺️ Actividades en Lotes', color: '#14b8a6' },
  { value: 'Arboles', label: '🌴 Fitosanitario Árboles', color: '#22c55e' },
  { value: 'Riegos', label: '💧 Irrigación y Humedad', color: '#3b82f6' },
  { value: 'Maquinas_Vehiculos', label: '🚜 Operación Maquinaria', color: '#f59e0b' },
  { value: 'Talleres', label: '🔧 Mantenimiento Talleres', color: '#ec4899' },
  { value: 'Semilleros', label: '🌱 Control en Semilleros', color: '#84cc16' },
  { value: 'Abonos', label: '🍂 Producción de Abonos', color: '#a16207' },
  { value: 'Cosecha', label: '🧺 Recolección & Cosecha', color: '#eab308' }
];

function TaskPlanner({ tenantId, fincaId, nucleoId }) {
  // Filters
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Lists
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [potreros, setPotreros] = useState([]);
  const [viveros, setViveros] = useState([]);
  const [bodegas, setBodegas] = useState([]);
  const [estanques, setEstanques] = useState([]);
  const [caminos, setCaminos] = useState([]);
  const [trees, setTrees] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [machines, setMachines] = useState([]);
  const [insumosList, setInsumosList] = useState([]);

  // UIs & Forms
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [auditingTask, setAuditingTask] = useState(null);
  const [emailPreviewContent, setEmailPreviewContent] = useState(null);

  // New Labor Form State
  const [newCategory, setNewCategory] = useState('Personal');
  const [newDescription, setNewDescription] = useState('');
  const [newEmpId, setNewEmpId] = useState('');
  const [locationType, setLocationType] = useState('Lote');
  const [newLoteId, setNewLoteId] = useState('');
  const [newPotreroId, setNewPotreroId] = useState('');
  const [newViveroId, setNewViveroId] = useState('');
  const [newBodegaId, setNewBodegaId] = useState('');
  const [newEstanqueId, setNewEstanqueId] = useState('');
  const [newCaminoId, setNewCaminoId] = useState('');
  const [newArbolId, setNewArbolId] = useState('');
  const [newVehId, setNewVehId] = useState('');
  const [newMaqId, setNewMaqId] = useState('');

  // Audit Form State
  const [auditStatus, setAuditStatus] = useState('Completada');
  const [auditObs, setAuditObs] = useState('');
  const [auditEvaluator, setAuditEvaluator] = useState('Ing. Principal');
  const [auditInsumos, setAuditInsumos] = useState([]);

  // Load Initial Lookups
  useEffect(() => {
    async function loadLookups() {
      try {
        const empsRes = await fetchTableData('rrhh_empleados', { tenantId, pageSize: 150 });
        const lotesRes = await fetchTableData('lotes', { tenantId, fincaId, nucleoId, pageSize: 150 });
        const potrerosRes = await fetchTableData('ganado_potreros', { tenantId, pageSize: 150 });
        const viverosRes = await fetchTableData('viveros', { tenantId, pageSize: 150 });
        const bodegasRes = await fetchTableData('bod_bodegas', { tenantId, pageSize: 150 });
        const estanquesRes = await fetchTableData('acuicola_estanques', { tenantId, pageSize: 150 });
        const caminosRes = await fetchTableData('caminos_calles', { tenantId, pageSize: 150 });
        const vehRes = await fetchTableData('vehiculos', { tenantId, pageSize: 150 });
        const maqRes = await fetchTableData('maquinaria', { tenantId, pageSize: 150 });
        const insRes = await fetchTableData('insumos', { tenantId, pageSize: 500 });

        setEmployees(empsRes.data || []);
        setLotes(lotesRes.data || []);
        setPotreros(potrerosRes.data || []);
        setViveros(viverosRes.data || []);
        setBodegas(bodegasRes.data || []);
        setEstanques(estanquesRes.data || []);
        setCaminos(caminosRes.data || []);
        setVehicles(vehRes.data || []);
        setMachines(maqRes.data || []);
        setInsumosList(insRes.data || []);
      } catch (err) {
        console.error('Error loading lookups for TaskPlanner:', err);
      }
    }
    loadLookups();
  }, [tenantId, fincaId, nucleoId]);

  // Load Trees when selected lote in form changes
  useEffect(() => {
    async function loadLoteTrees() {
      if (!newLoteId) {
        setTrees([]);
        return;
      }
      try {
        const data = await fetchTrees({ tenantId, loteId: newLoteId });
        setTrees(data);
      } catch (err) {
        console.error('Error loading trees for lote:', err);
      }
    }
    loadLoteTrees();
  }, [newLoteId, tenantId]);

  // Load Tasks
  const loadTasksList = async () => {
    setLoading(true);
    try {
      const data = await fetchLabores({
        tenantId,
        date: selectedDate,
        categoria: filterCategory,
        estado: filterStatus
      });
      setTasks(data);
    } catch (err) {
      console.error('Error loading labors list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasksList();
  }, [selectedDate, filterCategory, filterStatus, tenantId, fincaId, nucleoId]);

  // Handle Manual Task Creation
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newDescription.trim()) return;

    try {
      await createLabor({
        tenantId,
        categoria: newCategory,
        descripcion_labor: newDescription,
        fecha_planificada: selectedDate,
        id_empleado: newEmpId || null,
        id_lote: locationType === 'Lote' ? (newLoteId || null) : null,
        id_potrero: locationType === 'Potrero' ? (newPotreroId || null) : null,
        id_vivero: locationType === 'Vivero' ? (newViveroId || null) : null,
        id_bodega: locationType === 'Bodega' ? (newBodegaId || null) : null,
        id_estanque: locationType === 'Estanque' ? (newEstanqueId || null) : null,
        id_camino: locationType === 'Via' ? (newCaminoId || null) : null,
        id_arbol: newArbolId || null,
        id_vehiculo: newVehId || null,
        id_maquinaria: newMaqId || null
      });

      setNewDescription('');
      setNewEmpId('');
      setNewLoteId('');
      setNewPotreroId('');
      setNewViveroId('');
      setNewBodegaId('');
      setNewEstanqueId('');
      setNewCaminoId('');
      setNewArbolId('');
      setNewVehId('');
      setNewMaqId('');
      setShowAddForm(false);
      loadTasksList();
      alert('¡Nueva labor diaria planificada con éxito!');
    } catch (err) {
      alert(`Error al planificar labor: ${err.message}`);
    }
  };

  // Handle Automated Suggestions Rule Engine
  const handleAutoGenerate = async () => {
    setLoading(true);
    try {
      const res = await autoGenerateLabores({
        tenantId,
        date: selectedDate
      });
      loadTasksList();
      alert(`¡Generador Inteligente activo! Se han sugerido y creado ${res.count} labores recomendadas para hoy basadas en el estado del cultivo y maquinaria.`);
    } catch (err) {
      alert(`Error al autogenerar labores: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle Compliance Audit Evaluation
  const handleAuditSubmit = async (e) => {
    e.preventDefault();
    if (!auditingTask) return;

    try {
      await evaluateLabor(auditingTask.id_labor, {
        estado: auditStatus,
        observaciones: auditObs,
        evaluador: auditEvaluator,
        insumos_utilizados: auditInsumos.filter(i => i.id_insumo && i.cantidad > 0)
      });

      setAuditingTask(null);
      setAuditObs('');
      setAuditInsumos([]);
      loadTasksList();
      alert(`Labor calificada correctamente como "${auditStatus}".`);
    } catch (err) {
      alert(`Error al auditar labor: ${err.message}`);
    }
  };

  // Handle Official Report Dispatch
  const handleSendReport = async (task) => {
    try {
      const res = await sendLaborReport(task.id_labor);
      setEmailPreviewContent(res.emailPreview);
      loadTasksList();
    } catch (err) {
      alert(`Error al enviar reporte: ${err.message}`);
    }
  };

  return (
    <div className="task-planner-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
      {/* Top Filter and Command Panel */}
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2>Control de Tareas y Labores Diarias</h2>
          <p>Planificación de trabajos de campo, riegos, maquinaria, cosecha y auditoría de cumplimiento.</p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            type="date"
            className="form-control"
            style={{ width: '160px', background: 'var(--card-bg)', border: '1px solid var(--border)', color: '#fff', padding: '8px 12px' }}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />

          <button
            onClick={handleAutoGenerate}
            className="btn"
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: '#fff', padding: '8px 16px', fontWeight: 'bold' }}
          >
            ⚡ Generador Inteligente IA
          </button>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn"
            style={{ background: '#3b82f6', border: 'none', color: '#fff', padding: '8px 16px', fontWeight: 'bold' }}
          >
            {showAddForm ? '✕ Cerrar Formulario' : '＋ Planificar Labor'}
          </button>
        </div>
      </div>

      {/* Manual Task Creator Form */}
      {showAddForm && (
        <form onSubmit={handleCreateTask} style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '20px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
          boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
        }}>
          <div style={{ gridColumn: 'span 2' }}>
            <h3 style={{ margin: 0, fontSize: '15px', color: '#3b82f6', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
              📝 Planificar Nuevo Trabajo de Campo
            </h3>
          </div>

          <div className="form-group">
            <label className="form-label">Categoría de la Labor</label>
            <select
              className="form-control"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
            >
              {CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Descripción Técnica del Trabajo</label>
            <input
              type="text"
              required
              className="form-control"
              placeholder="Ej: Deshierbe lote 3, aplicación fertilización..."
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Operario Asignado</label>
            <select
              className="form-control"
              value={newEmpId}
              onChange={(e) => setNewEmpId(e.target.value)}
            >
              <option value="">-- Ninguno / Sin asignar --</option>
              {employees.map(emp => (
                <option key={emp.id_empleado} value={emp.id_empleado}>{emp.nombres} {emp.apellidos} ({emp.cargo})</option>
              ))}
            </select>
          </div>

          
          <div className="form-group">
            <label className="form-label">Tipo de Ubicación</label>
            <select className="form-control" value={locationType} onChange={(e) => setLocationType(e.target.value)}>
              <option value="Lote">🌿 Lote / Campo</option>
              <option value="Potrero">🐄 Potrero (Ganadería)</option>
              <option value="Estanque">🐟 Estanque (Piscícola)</option>
              <option value="Vivero">🌱 Vivero</option>
              <option value="Bodega">🏭 Bodega / Taller</option>
              <option value="Via">🛣️ Vía / Camino</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Ubicación Específica</label>
            {locationType === 'Lote' && (
              <select className="form-control" value={newLoteId} onChange={(e) => setNewLoteId(e.target.value)}>
                <option value="">-- Campo / Área General --</option>
                {lotes.map(l => <option key={l.id_lote} value={l.id_lote}>{l.nombre}</option>)}
              </select>
            )}
            {locationType === 'Potrero' && (
              <select className="form-control" value={newPotreroId} onChange={(e) => setNewPotreroId(e.target.value)}>
                <option value="">-- General --</option>
                {potreros.map(l => <option key={l.id_potrero} value={l.id_potrero}>{l.nombre}</option>)}
              </select>
            )}
            {locationType === 'Estanque' && (
              <select className="form-control" value={newEstanqueId} onChange={(e) => setNewEstanqueId(e.target.value)}>
                <option value="">-- General --</option>
                {estanques.map(l => <option key={l.id_estanque} value={l.id_estanque}>{l.nombre}</option>)}
              </select>
            )}
            {locationType === 'Vivero' && (
              <select className="form-control" value={newViveroId} onChange={(e) => setNewViveroId(e.target.value)}>
                <option value="">-- General --</option>
                {viveros.map(l => <option key={l.id_vivero} value={l.id_vivero}>{l.nombre}</option>)}
              </select>
            )}
            {locationType === 'Bodega' && (
              <select className="form-control" value={newBodegaId} onChange={(e) => setNewBodegaId(e.target.value)}>
                <option value="">-- General --</option>
                {bodegas.map(l => <option key={l.id_bodega} value={l.id_bodega}>{l.nombre}</option>)}
              </select>
            )}
            {locationType === 'Via' && (
              <select className="form-control" value={newCaminoId} onChange={(e) => setNewCaminoId(e.target.value)}>
                <option value="">-- General --</option>
                {caminos.map(l => <option key={l.id_camino} value={l.id_camino}>{l.nombre}</option>)}
              </select>
            )}
          </div>


          {newLoteId && (
            <div className="form-group">
              <label className="form-label">Árbol Individual (Opcional)</label>
              <select
                className="form-control"
                value={newArbolId}
                onChange={(e) => setNewArbolId(e.target.value)}
              >
                <option value="">-- Lote Completo --</option>
                {trees.map(t => (
                  <option key={t.id_arbol} value={t.id_arbol}>{t.codigo_arbol} ({t.estado_salud})</option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Vehículo / Tractor Requerido</label>
            <select
              className="form-control"
              value={newVehId}
              onChange={(e) => setNewVehId(e.target.value)}
            >
              <option value="">-- Ninguno --</option>
              {vehicles.map(v => (
                <option key={v.id_vehiculo} value={v.id_vehiculo}>{v.marca} {v.modelo} - Placa: {v.placa}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ gridColumn: newLoteId ? 'auto' : 'span 2' }}>
            <label className="form-label">Maquinaria / Accesorio de Campo</label>
            <select
              className="form-control"
              value={newMaqId}
              onChange={(e) => setNewMaqId(e.target.value)}
            >
              <option value="">-- Ninguno --</option>
              {machines.map(m => (
                <option key={m.id_maquinaria} value={m.id_maquinaria}>{m.nombre} - Serial: {m.numero_serie}</option>
              ))}
            </select>
          </div>

          <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <button type="button" className="btn btn-outline" onClick={() => setShowAddForm(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary" style={{ background: '#3b82f6', border: 'none', color: '#fff' }}>
              ✓ Guardar y Asignar Labor
            </button>
          </div>
        </form>
      )}

      {/* Main Grid: Left filters and tasks catalog, right Auditor or preview panel */}
      <div style={{ display: 'grid', gridTemplateColumns: auditingTask ? '1fr 400px' : '1fr', gap: '20px', flex: 1 }}>
        {/* Left Side: Tasks Catalog */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Quick Filters */}
          <div style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '12px 16px',
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}>
            <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Filtros Rápidos:</span>
            <select
              className="form-control"
              style={{ width: '200px', padding: '6px 10px', background: '#0f172a', border: '1px solid var(--border)', color: '#fff' }}
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="">-- Todas las Categorías --</option>
              {CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>

            <select
              className="form-control"
              style={{ width: '180px', padding: '6px 10px', background: '#0f172a', border: '1px solid var(--border)', color: '#fff' }}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">-- Todos los Estados --</option>
              <option value="Planificada">Planificada</option>
              <option value="En Progreso">En Progreso</option>
              <option value="Completada">✓ Completadas (Cumplidas)</option>
              <option value="Incumplida">🚨 Incumplidas</option>
            </select>
          </div>

          {/* Task list container */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', background: 'var(--card-bg)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
              <div className="spinner" style={{ margin: '0 auto 10px' }} />
              <p>Consultando calendario de labores diarias...</p>
            </div>
          ) : tasks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px', background: 'var(--card-bg)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '48px', marginBottom: '10px' }}>🗓️</div>
              <h4 style={{ margin: 0, color: '#fff' }}>No hay labores planificadas para hoy</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', maxWidth: '400px', margin: '6px auto 14px' }}>
                Puedes registrar un nuevo trabajo manual con el botón "Planificar Labor" o autogenerar la agenda diaria usando la inteligencia del sistema.
              </p>
              <button onClick={handleAutoGenerate} className="btn btn-outline" style={{ border: '1px solid #10b981', color: '#10b981' }}>
                ⚡ Auto-generar Tareas Recomendadas
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {tasks.map(task => {
                const categoryDef = CATEGORIES.find(c => c.value === task.categoria) || { label: task.categoria, color: '#475569' };
                
                return (
                  <div key={task.id_labor} style={{
                    background: 'var(--card-bg)',
                    border: '1px solid var(--border)',
                    borderLeft: `5px solid ${categoryDef.color}`,
                    borderRadius: 'var(--radius)',
                    padding: '16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '16px',
                    transition: 'transform 0.2s',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    setAuditingTask(task);
                    setAuditStatus(task.estado === 'Planificada' || task.estado === 'En Progreso' ? 'Completada' : task.estado);
                    setAuditObs(task.cumplimiento_observaciones || '');
                    setAuditInsumos([]);
                  }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 'bold',
                          color: '#fff',
                          background: categoryDef.color,
                          padding: '2px 8px',
                          borderRadius: '4px'
                        }}>
                          {categoryDef.label}
                        </span>

                        <span style={{
                          fontSize: '10px',
                          fontWeight: 'bold',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          background: task.estado === 'Completada' ? 'rgba(16, 185, 129, 0.15)' : (task.estado === 'Incumplida' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)'),
                          color: task.estado === 'Completada' ? '#10b981' : (task.estado === 'Incumplida' ? '#ef4444' : '#3b82f6'),
                          border: '1px solid currentColor'
                        }}>
                          {task.estado}
                        </span>

                        {task.reporte_enviado === 1 && (
                          <span style={{ fontSize: '10px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            ✉️ Reporte Enviado a Jefes
                          </span>
                        )}
                      </div>

                      <h4 style={{ margin: '4px 0', fontSize: '15px', color: '#fff' }}>{task.descripcion_labor}</h4>
                      
                      {/* Linked Metadata Icons */}
                      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '12px', color: 'var(--text-muted)' }}>
                        {task.empleado_nombre && <span>👤 <b>Asignado:</b> {task.empleado_nombre}</span>}
                        {task.lote_nombre && <span>🗺️ <b>Lote:</b> {task.lote_nombre}</span>}
                        {task.codigo_arbol && <span>🌴 <b>Árbol:</b> {task.codigo_arbol}</span>}
                        {task.vehiculo_placa && <span>🚚 <b>Placa:</b> {task.vehiculo_placa}</span>}
                        {task.maquinaria_nombre && <span>🚜 <b>Equipo:</b> {task.maquinaria_nombre}</span>}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          setAuditingTask(task);
                          setAuditStatus(task.estado === 'Planificada' || task.estado === 'En Progreso' ? 'Completada' : task.estado);
                          setAuditObs(task.cumplimiento_observaciones || '');
                          setAuditInsumos([]);
                        }}
                        className="btn btn-outline"
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                      >
                        ⚙️ Auditar
                      </button>

                      {task.estado !== 'Planificada' && task.estado !== 'En Progreso' && (
                        <button
                          onClick={() => handleSendReport(task)}
                          className="btn"
                          style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            background: task.reporte_enviado === 1 ? '#047857' : '#10b981',
                            color: '#fff',
                            border: 'none'
                          }}
                        >
                          ✉️ Despachar Reporte
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Audit compliance panel */}
        {auditingTask && (
          <div style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            maxHeight: 'calc(100vh - 200px)',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
              <div>
                <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Panel de Cumplimiento</span>
                <h3 style={{ margin: 0, fontSize: '15px', color: '#fff' }}>Labor #{auditingTask.id_labor}</h3>
              </div>
              <button onClick={() => setAuditingTask(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '18px', cursor: 'pointer' }}>×</button>
            </div>

            <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
              <b>Trabajo:</b> {auditingTask.descripcion_labor}
            </p>

            <form onSubmit={handleAuditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Resultado de Auditoría</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    style={{
                      padding: '10px',
                      borderRadius: 'var(--radius)',
                      border: '1px solid #10b981',
                      background: auditStatus === 'Completada' ? 'rgba(16,185,129,0.15)' : 'transparent',
                      color: '#10b981',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                    onClick={() => setAuditStatus('Completada')}
                  >
                    ✓ CUMPLIÓ
                  </button>

                  <button
                    type="button"
                    style={{
                      padding: '10px',
                      borderRadius: 'var(--radius)',
                      border: '1px solid #ef4444',
                      background: auditStatus === 'Incumplida' ? 'rgba(239,68,68,0.15)' : 'transparent',
                      color: '#ef4444',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                    onClick={() => setAuditStatus('Incumplida')}
                  >
                    🚨 NO CUMPLIÓ
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Evaluador / Supervisor</label>
                <input
                  type="text"
                  required
                  className="form-control"
                  value={auditEvaluator}
                  onChange={(e) => setAuditEvaluator(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Observaciones y Detalles de Verificación</label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="Comentarios sobre el rendimiento de la labor, justificación del incumplimiento, etc."
                  value={auditObs}
                  onChange={(e) => setAuditObs(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Insumos Aplicados / Descuento de Inventario</label>
                <p style={{fontSize: '11px', color: 'var(--text-muted)', margin: '0 0 8px 0'}}>Asocie los insumos usados para descontar el stock del Kardex y costear la trazabilidad del lote.</p>
                {auditInsumos.map((ai, i) => (
                  <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                    <select className="form-control" style={{ flex: 2 }} value={ai.id_insumo} onChange={(e) => {
                      const newAi = [...auditInsumos];
                      newAi[i].id_insumo = parseInt(e.target.value);
                      setAuditInsumos(newAi);
                    }}>
                      <option value="">Seleccione Insumo (Bodega)...</option>
                      {insumosList.map(ins => (
                        <option key={ins.id_insumo} value={ins.id_insumo}>{ins.nombre} ({ins.unidad_medida} | Stock: {ins.stock_actual})</option>
                      ))}
                    </select>
                    <input type="number" className="form-control" style={{ flex: 1 }} min="0.01" step="0.01" placeholder="Cantidad" value={ai.cantidad} onChange={(e) => {
                      const newAi = [...auditInsumos];
                      newAi[i].cantidad = parseFloat(e.target.value);
                      setAuditInsumos(newAi);
                    }} />
                    <button type="button" className="btn btn-outline" style={{ border: '1px solid #ef4444', color: '#ef4444', padding: '4px 8px' }} onClick={() => {
                      setAuditInsumos(auditInsumos.filter((_, idx) => idx !== i));
                    }}>✕</button>
                  </div>
                ))}
                <button type="button" className="btn btn-outline" style={{ fontSize: '12px', marginTop: '4px' }} onClick={() => setAuditInsumos([...auditInsumos, { id_insumo: '', cantidad: '' }])}>
                  + Reportar Consumo de Insumo
                </button>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setAuditingTask(null)}>
                  Cerrar
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  ✓ Guardar Auditoría
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Simulated Email Report Preview Overlay */}
      {emailPreviewContent && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15,23,42,0.85)',
          zIndex: 10000,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            maxWidth: '650px',
            width: '100%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
          }}>
            <div style={{
              background: '#10b981',
              color: '#fff',
              padding: '16px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ margin: 0, fontSize: '15px' }}>✉️ Correo de Notificación Enviado con Éxito</h3>
              <button
                onClick={() => setEmailPreviewContent(null)}
                style={{ background: 'none', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                ✕
              </button>
            </div>

            {/* Email Body Scrollable wrapper */}
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1, background: '#f8fafc' }}>
              <div style={{ border: '1px solid #cbd5e1', borderRadius: '4px', background: '#f1f5f9', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#334155' }}>
                <div><b>Para:</b> jefes.area@sasagricolas.com, administrador@finca.com</div>
                <div><b>Asunto:</b> 🚨 SAS Agrícolas - Notificación de Auditoría de Labor Diaria</div>
              </div>

              {/* Render the backend pre-formatted high-fidelity template */}
              <div dangerouslySetInnerHTML={{ __html: emailPreviewContent }} />
            </div>

            <div style={{ padding: '14px 20px', borderTop: '1px solid #e2e8f0', background: '#f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setEmailPreviewContent(null)} className="btn" style={{ background: '#475569', color: '#fff', border: 'none', padding: '8px 16px' }}>
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TaskPlanner;
