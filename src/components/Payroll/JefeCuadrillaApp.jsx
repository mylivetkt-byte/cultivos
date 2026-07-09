import React, { useState, useEffect, useRef } from 'react';
import { message } from 'antd';
import Select from 'react-select';
import { authFetch } from '../../utils/api';

const API_URL = '/api';

const JefeCuadrillaApp = ({ tenantId }) => {
  const [cuadrillas, setCuadrillas] = useState([]);
  const [selectedCuadrilla, setSelectedCuadrilla] = useState('');
  const [labores, setLabores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('Todas');
  
  // Modal states
  const [selectedLabor, setSelectedLabor] = useState(null);
  const [actionType, setActionType] = useState(null); // 'Completada' | 'Incumplida'
  const [observaciones, setObservaciones] = useState('');
  const [photoPreview, setPhotoPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [horasTrabajadas, setHorasTrabajadas] = useState('');
  const [cantidadProducida, setCantidadProducida] = useState('');

  // Signature canvas
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // GPS Tracking State
  const [gpsActive, setGpsActive] = useState(false);
  const watchIdRef = useRef(null);

  // Assignment Modal states
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [recursos, setRecursos] = useState({ empleados: [], lotes: [], maquinaria: [] });
  const [assignData, setAssignData] = useState({
    categoria: 'Lotes',
    descripcion_labor: '',
    empleadosIds: [],
    id_lote: '',
    id_maquinaria: ''
  });

  useEffect(() => {
    authFetch(`${API_URL}/cuadrilla/list${tenantId ? `?tenantId=${tenantId}` : ''}`)
      .then(res => res.json())
      .then(data => {
        setCuadrillas(data);
        if (data.length > 0) {
          const first = data[0];
          const firstId = first.id ?? first.id_cuadrilla ?? Object.values(first)[0];
          setSelectedCuadrilla(first);
        }
      })
      .catch(console.error);
  }, [tenantId]);

  useEffect(() => {
    if (!selectedCuadrilla) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const cuadrillaId = typeof selectedCuadrilla === 'string' ? selectedCuadrilla : (selectedCuadrilla?.id ?? selectedCuadrilla?.id_cuadrilla);
    authFetch(`${API_URL}/cuadrilla/labores-hoy?cuadrilla=${cuadrillaId}${tenantId ? `&tenantId=${tenantId}` : ''}`)
      .then(res => res.json())
      .then(data => setLabores(data))
      .catch(console.error)
      .finally(() => setLoading(false));

    // Fetch recursos para asignar tareas
    authFetch(`${API_URL}/cuadrilla/recursos?cuadrilla=${cuadrillaId}${tenantId ? `&tenantId=${tenantId}` : ''}`)
      .then(res => res.json())
      .then(data => setRecursos(data))
      .catch(console.error);

    // Start GPS Tracking
    if (navigator.geolocation) {
      setGpsActive(true);
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, speed, heading } = position.coords;
          authFetch(`${API_URL}/tracking/ping`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              identificador_gps: `APP_${cuadrillaId}`,
              latitud: latitude,
              longitud: longitude,
              velocidad: speed || 0,
              direccion: heading || 0,
              auto_register: true,
              tipo_entidad: 'Empleado',
              tenantId
            })
          }).catch(console.error);
        },
        (error) => {
          console.error("GPS Error:", error);
          setGpsActive(false);
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
      );
    }

    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [selectedCuadrilla, tenantId]);

  const categories = [
    { value: 'Todas', label: 'Todas las labores' },
    // Agrícolas
    { value: 'Preparacion_Suelos', label: '🌾 Agrícola - Preparación de Suelos' },
    { value: 'Siembra', label: '🌾 Agrícola - Siembra y Transplante' },
    { value: 'Riego', label: '🌾 Agrícola - Riego y Drenaje' },
    { value: 'Abono', label: '🌾 Agrícola - Abono y Fertilización' },
    { value: 'Fumigacion', label: '🌾 Agrícola - Fumigación y Sanidad' },
    { value: 'Poda', label: '🌾 Agrícola - Poda y Mantenimiento' },
    { value: 'Cosecha', label: '🌾 Agrícola - Cosecha y Recolección' },
    // Ganadería
    { value: 'Ganaderia_Alimentacion', label: '🐄 Ganadería - Alimentación y Suplementación' },
    { value: 'Ganaderia_Sanidad', label: '🐄 Ganadería - Sanidad Animal' },
    { value: 'Ganaderia_Pasturas', label: '🐄 Ganadería - Manejo de Pasturas' },
    { value: 'Ganaderia_Ordeno', label: '🐄 Ganadería - Ordeño y Producción' },
    { value: 'Ganaderia_Reproduccion', label: '🐄 Ganadería - Reproducción y Cría' },
    // Acuicultura
    { value: 'Acuicola_Alimentacion', label: '🐟 Acuicultura - Alimentación' },
    { value: 'Acuicola_Agua', label: '🐟 Acuicultura - Control de Agua' },
    { value: 'Acuicola_Pesca', label: '🐟 Acuicultura - Pesca y Cosecha' },
    { value: 'Acuicola_Estanques', label: '🐟 Acuicultura - Mantenimiento Estanques' },
    // Operaciones
    { value: 'Talleres', label: '🏭 Operaciones - Talleres y Mantenimiento' },
    { value: 'Bodegas', label: '🏭 Operaciones - Bodegas y Acopio' },
    { value: 'Planta_Bioles', label: '🏭 Operaciones - Planta de Bioles' },
    { value: 'Produccion', label: '🏭 Operaciones - Producción Terminados' },
    { value: 'Personal', label: '🏭 Operaciones - Personal' },
    // Legado
    { value: 'Lotes', label: 'Antiguo - Lotes' },
    { value: 'Maquinas_Vehiculos', label: 'Antiguo - Máquinas y Vehículos' },
    { value: 'Semilleros', label: 'Antiguo - Semilleros' },
    { value: 'Viveros', label: 'Antiguo - Viveros' },
    { value: 'Ganadería', label: 'Antiguo - Ganadería' }
  ];
  
  const filteredLabores = activeCategory === 'Todas' 
    ? labores 
    : labores.filter(l => l.categoria === activeCategory);

  const stats = {
    total: labores.length,
    completadas: labores.filter(l => l.estado === 'Completada').length,
    pendientes: labores.filter(l => l.estado === 'Planificada' || l.estado === 'En Progreso').length,
    incumplidas: labores.filter(l => l.estado === 'Incumplida').length
  };

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const handlePhotoCapture = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    let signatureBase64 = null;
    const canvas = canvasRef.current;
    
    if (canvas) {
      // Check if canvas is actually drawn on (simple check: getting base64, if it's default blank it returns a specific short string, but we can just pass it anyway)
      signatureBase64 = canvas.toDataURL('image/png');
    }

    try {
        const cuadrillaName = typeof selectedCuadrilla === 'string' ? selectedCuadrilla : (selectedCuadrilla?.nombre ?? selectedCuadrilla?.nombre_cuadrilla ?? '');
      const res = await authFetch(`${API_URL}/cuadrilla/certificar/${selectedLabor.id_labor}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estado: actionType,
          observaciones,
          evidencia_foto: photoPreview,
          firma_digital: signatureBase64,
          evaluado_por: `Jefe de Cuadrilla: ${cuadrillaName}`,
          horas_trabajadas: horasTrabajadas ? parseFloat(horasTrabajadas) : null,
          cantidad_producida: cantidadProducida ? parseFloat(cantidadProducida) : null
        })
      });

      if (res.ok) {
        // Update local state
        setLabores(prev => prev.map(l => {
          if (l.id_labor === selectedLabor.id_labor) {
            return { ...l, estado: actionType, cumplimiento_observaciones: observaciones };
          }
          return l;
        }));
        closeModal();
      } else {
        const err = await res.json();
        message.error('Error: ' + err.error);
      }
    } catch (err) {
      message.error('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  const handleAssignSubmit = async () => {
    if (assignData.empleadosIds.length === 0) {
      message.error('Debe seleccionar al menos un empleado');
    }
    if (!assignData.descripcion_labor) {
      message.error('Debe escribir una descripción de la labor');
    }

    setSaving(true);
    try {
      const res = await authFetch(`${API_URL}/cuadrilla/asignar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          ...assignData
        })
      });

      if (res.ok) {
        setShowAssignModal(false);
        setAssignData({ categoria: 'Lotes', descripcion_labor: '', empleadosIds: [], id_lote: '', id_maquinaria: '' });
        // Refrescar labores
        const cuadrillaId = typeof selectedCuadrilla === 'string' ? selectedCuadrilla : (selectedCuadrilla?.id ?? selectedCuadrilla?.id_cuadrilla);
        authFetch(`${API_URL}/cuadrilla/labores-hoy?cuadrilla=${cuadrillaId}${tenantId ? `&tenantId=${tenantId}` : ''}`)
          .then(res => res.json())
          .then(data => setLabores(data));
      } else {
        const err = await res.json();
        message.error('Error asignando: ' + err.error);
      }
    } catch (err) {
      message.error('Error de conexión al asignar');
    } finally {
      setSaving(false);
    }
  };

  const closeModal = () => {
    setSelectedLabor(null);
    setActionType(null);
    setObservaciones('');
    setPhotoPreview(null);
    setIsDrawing(false);
    setHorasTrabajadas('');
    setCantidadProducida('');
  };

  const getStatusColor = (estado) => {
    switch(estado) {
      case 'Completada': return '#10b981'; // Green
      case 'Incumplida': return '#ef4444'; // Red
      case 'En Progreso': return '#f59e0b'; // Yellow
      default: return '#64748b'; // Gray
    }
  };

  return (
    <div className="jefe-cuadrilla-container" style={{
      maxWidth: '100%',
      minHeight: '100vh',
      background: '#f8fafc',
      padding: '16px',
      fontFamily: "'Inter', sans-serif"
    }}>
      {/* Header */}
      <div style={{ background: '#1e293b', color: 'white', padding: '20px', borderRadius: '16px', marginBottom: '20px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 'bold' }}>📱 Mi Cuadrilla</h2>
          {gpsActive && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', background: '#334155', padding: '4px 8px', borderRadius: '12px' }}>
              <span style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%', boxShadow: '0 0 8px #10b981', animation: 'pulse 1.5s infinite' }}></span>
              GPS Activo
            </div>
          )}
        </div>
        <div style={{ marginBottom: '16px', fontSize: '14px', color: '#94a3b8', textTransform: 'capitalize' }}>
          📅 {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
        <select
          value={typeof selectedCuadrilla === 'string' ? selectedCuadrilla : (selectedCuadrilla?.id ?? selectedCuadrilla?.id_cuadrilla ?? '')}
          onChange={e => {
            const sel = cuadrillas.find(c => String(typeof c === 'string' ? c : (c.id ?? c.id_cuadrilla)) === e.target.value);
            setSelectedCuadrilla(sel || '');
          }}
          style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', fontSize: '16px', fontWeight: 'bold', background: '#334155', color: 'white', outline: 'none' }}
        >
          {cuadrillas.length === 0 ? <option value="">No hay cuadrillas</option> : null}
          {cuadrillas.map(c => {
            const id = typeof c === 'string' ? c : (c.id ?? c.id_cuadrilla);
            const nombre = typeof c === 'string' ? c : (c.nombre ?? c.nombre_cuadrilla);
            return (
              <option key={id} value={id}>
                {nombre}
              </option>
            );
          })}
        </select>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
        <div style={{ background: 'white', padding: '16px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderBottom: '4px solid #3b82f6' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b' }}>{stats.total}</div>
          <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', marginTop: '4px' }}>Total Labores</div>
        </div>
        <div style={{ background: 'white', padding: '16px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderBottom: '4px solid #10b981' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>{stats.completadas}</div>
          <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', marginTop: '4px' }}>Completadas</div>
        </div>
        <div style={{ background: 'white', padding: '16px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderBottom: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>{stats.pendientes}</div>
          <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', marginTop: '4px' }}>Pendientes</div>
        </div>
        <div style={{ background: 'white', padding: '16px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderBottom: '4px solid #ef4444' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>{stats.incumplidas}</div>
          <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', marginTop: '4px' }}>Incumplidas</div>
        </div>
      </div>

      {/* Category Dropdown (Seccionador) */}
      <div style={{ marginBottom: '16px' }}>
        <select
          value={activeCategory}
          onChange={e => setActiveCategory(e.target.value)}
          style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '2px solid #3b82f6', fontSize: '16px', fontWeight: 'bold', background: 'white', color: '#1e293b', outline: 'none', cursor: 'pointer' }}
        >
          {categories.map(c => (
            <option key={c.value} value={c.value}>
              Filtrar por: {c.label}
            </option>
          ))}
        </select>
      </div>

      {/* Labor List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '100px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Cargando labores...</div>
        ) : filteredLabores.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>No hay labores asignadas.</div>
        ) : (
          filteredLabores.map(labor => (
            <div key={labor.id_labor} style={{ 
              background: 'white', 
              borderRadius: '16px', 
              padding: '20px', 
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              borderLeft: `6px solid ${getStatusColor(labor.estado)}`,
              position: 'relative'
            }}>
              <div style={{ position: 'absolute', top: '16px', right: '16px', background: getStatusColor(labor.estado) + '22', color: getStatusColor(labor.estado), padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
                {labor.estado}
              </div>
              
              <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#1e293b', paddingRight: '80px' }}>{labor.descripcion_labor}</h3>
              <p style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#64748b' }}>👤 {labor.empleado_nombre || 'Sin asignar'}</p>
              
              {labor.lote_nombre && <p style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#64748b' }}>📍 {labor.lote_nombre}</p>}
              {labor.maquinaria_nombre && <p style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#64748b' }}>🚜 {labor.maquinaria_nombre}</p>}
              
              {(labor.estado === 'Planificada' || labor.estado === 'En Progreso') && (
                <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                  <button 
                    onClick={() => { setSelectedLabor(labor); setActionType('Completada'); }}
                    style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', background: '#10b981', color: 'white', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}
                  >
                    ✔️ Completar
                  </button>
                  <button 
                    onClick={() => { setSelectedLabor(labor); setActionType('Incumplida'); }}
                    style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', background: '#ef4444', color: 'white', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}
                  >
                    ❌ Novedad
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Certify Modal */}
      {selectedLabor && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.8)', zIndex: 9999,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
        }}>
          <div style={{
            background: 'white', width: '100%', maxWidth: '600px', 
            borderTopLeftRadius: '24px', borderTopRightRadius: '24px',
            padding: '24px', maxHeight: '90vh', overflowY: 'auto',
            animation: 'slideUp 0.3s ease-out'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '20px', color: actionType === 'Completada' ? '#10b981' : '#ef4444' }}>
                {actionType === 'Completada' ? 'Certificar Labor' : 'Reportar Incumplimiento'}
              </h3>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', fontSize: '24px', color: '#94a3b8', cursor: 'pointer' }}>×</button>
            </div>

            <p style={{ margin: '0 0 16px 0', color: '#475569', fontWeight: '500' }}>
              {selectedLabor.descripcion_labor} - {selectedLabor.empleado_nombre}
            </p>

            {actionType === 'Completada' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#334155' }}>Horas Trabajadas (Si aplica)</label>
                  <input 
                    type="number" 
                    step="0.5"
                    value={horasTrabajadas}
                    onChange={e => setHorasTrabajadas(e.target.value)}
                    placeholder="Ej. 8"
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#334155' }}>Cantidad Producida (Destajo)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={cantidadProducida}
                    onChange={e => setCantidadProducida(e.target.value)}
                    placeholder="Ej. 1500 (Kilos/Metros)"
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#334155' }}>Observaciones / Novedades</label>
              <textarea 
                value={observaciones}
                onChange={e => setObservaciones(e.target.value)}
                placeholder="Escribe aquí si hubo algún problema, material faltante, etc..."
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', minHeight: '100px', resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#334155' }}>Evidencia Fotográfica (Opcional)</label>
              <input 
                type="file" 
                accept="image/*" 
                capture="environment" 
                onChange={handlePhotoCapture}
                style={{ display: 'none' }}
                id="camera-input"
              />
              <label htmlFor="camera-input" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                padding: '16px', background: '#f1f5f9', border: '2px dashed #cbd5e1', borderRadius: '12px',
                cursor: 'pointer', color: '#475569', fontWeight: 'bold'
              }}>
                📷 Tomar Foto
              </label>
              {photoPreview && (
                <div style={{ marginTop: '12px', textAlign: 'center' }}>
                  <img src={photoPreview} alt="Preview" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px' }} />
                  <button onClick={() => setPhotoPreview(null)} style={{ display: 'block', width: '100%', marginTop: '8px', padding: '8px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px' }}>Eliminar Foto</button>
                </div>
              )}
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#334155' }}>Firma Digital (Opcional)</label>
              <div style={{ border: '2px solid #cbd5e1', borderRadius: '12px', background: '#f8fafc', overflow: 'hidden' }}>
                <canvas 
                  ref={canvasRef}
                  width={350} 
                  height={150}
                  style={{ width: '100%', touchAction: 'none', display: 'block' }}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
              </div>
              <button onClick={clearSignature} style={{ marginTop: '8px', padding: '6px 12px', fontSize: '13px', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Limpiar Firma</button>
            </div>

            <button 
              onClick={handleSubmit}
              disabled={saving}
              style={{
                width: '100%', padding: '16px', borderRadius: '12px', border: 'none',
                background: actionType === 'Completada' ? '#10b981' : '#ef4444',
                color: 'white', fontWeight: 'bold', fontSize: '18px', cursor: 'pointer',
                opacity: saving ? 0.7 : 1
              }}
            >
              {saving ? 'Guardando...' : 'Confirmar Guardado'}
            </button>
          </div>
        </div>
      )}

      {/* Assign Task Modal */}
      {showAssignModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.8)', zIndex: 9999,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
        }}>
          <div style={{
            background: 'white', width: '100%', maxWidth: '600px', 
            borderTopLeftRadius: '24px', borderTopRightRadius: '24px',
            padding: '24px', maxHeight: '90vh', overflowY: 'auto',
            animation: 'slideUp 0.3s ease-out'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '20px', color: '#1e293b' }}>Nueva Asignación</h3>
              <button onClick={() => setShowAssignModal(false)} style={{ background: 'none', border: 'none', fontSize: '24px', color: '#94a3b8', cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#334155' }}>Categoría de Labor</label>
              <select 
                value={assignData.categoria}
                onChange={e => setAssignData({...assignData, categoria: e.target.value})}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              >
                {categories.filter(c => c.value !== 'Todas').map(c => (
                   <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#334155' }}>Descripción de la labor</label>
              <input 
                type="text" 
                value={assignData.descripcion_labor}
                onChange={e => setAssignData({...assignData, descripcion_labor: e.target.value})}
                placeholder="Ej. Macaneo lote central"
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#334155' }}>Seleccionar Empleados (Múltiple)</label>
              <Select
                isMulti
                placeholder="-- Buscar empleados --"
                value={recursos.empleados
                  .filter(emp => assignData.empleadosIds.includes(emp.id_empleado))
                  .map(emp => ({ value: emp.id_empleado, label: emp.nombre }))}
                options={recursos.empleados.map(emp => ({ value: emp.id_empleado, label: emp.nombre }))}
                onChange={(selectedOptions) => {
                  const values = selectedOptions ? selectedOptions.map(o => o.value) : [];
                  setAssignData({ ...assignData, empleadosIds: values });
                }}
                styles={{
                  control: (base) => ({ ...base, width: '100%', borderRadius: '8px', border: '1px solid #cbd5e1' }),
                  menu: (base) => ({ ...base, zIndex: 9999 })
                }}
              />
              <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0 0' }}>Puedes buscar por nombre o número de documento.</p>
            </div>

            {['Lotes', 'Cosecha', 'Riegos', 'Abonos'].includes(assignData.categoria) && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#334155' }}>Seleccionar Lote / Campo (Opcional)</label>
                <select 
                  value={assignData.id_lote}
                  onChange={e => setAssignData({...assignData, id_lote: e.target.value})}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                >
                  <option value="">-- Ninguno --</option>
                  {recursos.lotes.map(l => (
                    <option key={l.id_lote} value={l.id_lote}>{l.nombre}</option>
                  ))}
                </select>
              </div>
            )}

            {['Talleres', 'Maquinas_Vehiculos'].includes(assignData.categoria) && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#334155' }}>Seleccionar Maquinaria (Opcional)</label>
                <select 
                  value={assignData.id_maquinaria}
                  onChange={e => setAssignData({...assignData, id_maquinaria: e.target.value})}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                >
                  <option value="">-- Ninguno --</option>
                  {recursos.maquinaria.map(m => (
                    <option key={m.id_maquinaria} value={m.id_maquinaria}>{m.nombre}</option>
                  ))}
                </select>
              </div>
            )}

            <button 
              onClick={handleAssignSubmit}
              disabled={saving}
              style={{
                width: '100%', padding: '16px', borderRadius: '12px', border: 'none',
                background: '#3b82f6', color: 'white', fontWeight: 'bold', fontSize: '18px', cursor: 'pointer',
                opacity: saving ? 0.7 : 1,
                marginTop: '16px'
              }}
            >
              {saving ? 'Asignando...' : 'Asignar Labor'}
            </button>
          </div>
        </div>
      )}

      {/* Floating Action Button for New Assignment */}
      <button 
        onClick={() => setShowAssignModal(true)}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '64px',
          height: '64px',
          borderRadius: '32px',
          background: '#3b82f6',
          color: 'white',
          fontSize: '32px',
          border: 'none',
          boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99
        }}
      >
        +
      </button>
      
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes pulse {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default JefeCuadrillaApp;
