import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import './ConfiguracionBasculas.css';

const TIPOS_CONEXION = ['manual', 'serial', 'bluetooth', 'tcp_ip', 'usb'];

const PRESETS = {
  continua: {
    label: 'GENERICA',
    tipo_conexion: 'serial',
    baud_rate: 9600,
    data_bits: 8,
    paridad: 'none',
    stop_bits: 1,
    inicio_lectura: 1,
    longitud_lectura: 6,
  },
  cas: {
    label: 'CAS',
    tipo_conexion: 'serial',
    baud_rate: 9600,
    data_bits: 8,
    paridad: 'none',
    stop_bits: 1,
    inicio_lectura: 6,
    longitud_lectura: 8,
  },
  magallan: {
    label: 'MAGALLAN',
    tipo_conexion: 'serial',
    baud_rate: 9600,
    data_bits: 8,
    paridad: 'none',
    stop_bits: 1,
    inicio_lectura: 0,
    longitud_lectura: 10,
  },
  torrey: {
    label: 'TORREY',
    tipo_conexion: 'serial',
    baud_rate: 9600,
    data_bits: 8,
    paridad: 'none',
    stop_bits: 1,
    inicio_lectura: 0,
    longitud_lectura: 9,
  },
  personalizado: {
    label: 'PERSONALIZADO',
    tipo_conexion: 'serial',
    baud_rate: 9600,
    data_bits: 8,
    paridad: 'none',
    stop_bits: 1,
    inicio_lectura: 0,
    longitud_lectura: 10,
  },
};

const emptyForm = {
  codigo: '',
  nombre: '',
  ubicacion: 'Principal',
  capacidad_maxima: '0',
  precision_kg: '0',
  unidad: 'kg',
  tipo_conexion: 'serial',
  codigo_sensor: 'COM4',
  fecha_calibracion: '',
  inicio_lectura: '1',
  longitud_lectura: '6',
  protocolo: 'continua',
  baud_rate: '9600',
  data_bits: '8',
  paridad: 'none',
  stop_bits: '1',
  buffer_entrada: '20',
  buffer_salida: '4095',
  timeout: '1000 ms',
  activa: true,
  // New fields for reading mode and command
  modo_lectura: 'continua', // 'continua' or 'peticion'
  comando_peticion: '', // e.g., 'ENQ'
};

const ConfiguracionBasculas = ({ tenantId, onSelectTable }) => {
  const [basculas, setBasculas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const fetchBasculas = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const { data } = await axios.get('/api/basculas', { params: { tenantId } });
      setBasculas(data);
    } catch (err) {
      console.error(err);
      alert('Error al cargar básculas');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchBasculas();
  }, [fetchBasculas]);

  const applyPreset = (protocolo) => {
    const preset = PRESETS[protocolo];
    if (!preset) return;
    setForm(prev => ({
      ...prev,
      protocolo,
      tipo_conexion: preset.tipo_conexion,
      baud_rate: String(preset.baud_rate),
      data_bits: String(preset.data_bits),
      paridad: preset.paridad,
      stop_bits: String(preset.stop_bits),
      inicio_lectura: String(preset.inicio_lectura),
      longitud_lectura: String(preset.longitud_lectura),
    }));
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    
    if (name === 'protocolo') {
      applyPreset(value);
    } else if (name === 'nombre') {
      setForm(prev => ({ ...prev, nombre: val, codigo: val }));
    } else {
      setForm(prev => ({ ...prev, [name]: val }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Build payload with fields matching DB schema
      const dbFields = {
        codigo: form.codigo || form.nombre,
        nombre: form.nombre,
        ubicacion: form.ubicacion,
        capacidad_maxima: form.capacidad_maxima,
        precision_kg: form.precision_kg,
        unidad: form.unidad,
        tipo_conexion: 'serial',
        codigo_sensor: form.codigo_sensor,
        fecha_calibracion: form.fecha_calibracion || null,
        inicio_lectura: form.inicio_lectura,
        longitud_lectura: form.longitud_lectura,
        protocolo: form.protocolo,
        baud_rate: form.baud_rate,
        data_bits: form.data_bits,
        paridad: form.paridad,
        stop_bits: form.stop_bits,
        activa: form.activa ? 1 : 0,
        modo_lectura: form.modo_lectura,
        comando_peticion: form.comando_peticion || null,
        id_tenant: tenantId,
      };

      const payload = editingId
        ? Object.fromEntries(Object.entries(dbFields).filter(([_, v]) => v !== '' && v !== undefined))
        : dbFields;

      // Send request
      if (editingId) {
        await axios.put(`/api/basculas/${editingId}`, payload);
      } else {
        await axios.post('/api/basculas', payload);
      }

      // Reset form on success
      setForm(emptyForm);
      setEditingId(null);
      setSelectedId(null);
      setShowForm(false);
      fetchBasculas();
      } catch (err) {
        console.error('Error guardando báscula:', err);
        const serverMsg = err?.response?.data?.error || err.message;
        alert(`Error al guardar la báscula: ${serverMsg}`);
      }
  };

  const handleNew = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  };

  const handleEdit = () => {
    if (!selectedId) {
      alert('Por favor, selecciona una báscula de la lista para modificar.');
      return;
    }
    const b = basculas.find(x => x.id_bascula === selectedId);
    if (!b) return;

      setForm({
        codigo: b.codigo || '',
        nombre: b.nombre || '',
        ubicacion: b.ubicacion || 'Principal',
        capacidad_maxima: b.capacidad_maxima || '0',
        precision_kg: b.precision_kg || '0',
        unidad: b.unidad || 'kg',
        tipo_conexion: b.tipo_conexion || 'serial',
        codigo_sensor: b.codigo_sensor || 'COM4',
        fecha_calibracion: b.fecha_calibracion ? b.fecha_calibracion.split('T')[0] : '',
        inicio_lectura: String(b.inicio_lectura ?? '1'),
        longitud_lectura: String(b.longitud_lectura ?? '6'),
        protocolo: b.protocolo || 'continua',
        baud_rate: String(b.baud_rate ?? '9600'),
        data_bits: String(b.data_bits ?? '8'),
        paridad: b.paridad || 'none',
        stop_bits: String(b.stop_bits ?? '1'),
        buffer_entrada: b.buffer_entrada || '20',
        buffer_salida: b.buffer_salida || '4095',
        timeout: b.timeout || '1000 ms',
        activa: !!b.activa,
        // New fields
        modo_lectura: b.modo_lectura || 'continua',
        comando_peticion: b.comando_peticion || '',
      });
    setEditingId(b.id_bascula);
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (!selectedId) {
      alert('Por favor, selecciona una báscula de la lista para borrar.');
      return;
    }
    if (!confirm('¿Seguro que deseas desactivar esta báscula?')) return;
    try {
      await axios.delete(`/api/basculas/${selectedId}`);
      setSelectedId(null);
      fetchBasculas();
    } catch (err) {
      console.error(err);
      alert('Error al desactivar la báscula');
    }
  };

  const handleTest = () => {
    if (onSelectTable) {
      onSelectTable('basculas-pruebas');
    } else {
      alert('Módulo de simulación no disponible en este momento.');
    }
  };

  const handleClose = () => {
    if (onSelectTable) {
      onSelectTable(null);
    }
  };

  const handleCancel = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  };

  return (
    <div className="configuracion-basculas-wrapper">
      <div className="configuracion-basculas-header">
        <h2>⚖️ CONFIGURACIÓN DE BÁSCULAS</h2>
      </div>

      <div className="basculas-layout-grid">
        {/* Tabla Izquierda */}
        <div className="basculas-table-container">
          <div className="basculas-table-scroll">
            <table className="basculas-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Nombre</th>
                  <th>Tipo</th>
                  <th>Modo</th>
                  <th>Puerto COM</th>
                  <th>Baud Rate</th>
                  <th>Paridad</th>
                  <th>Bits Datos</th>
                  <th>Stop Bits</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="10" style={{ textAlign: 'center', padding: '20px' }}>Cargando básculas...</td>
                  </tr>
                ) : basculas.length === 0 ? (
                  <tr>
                    <td colSpan="10" style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
                      No hay básculas registradas. Haz clic en '+ Nuevo' para crear una.
                    </td>
                  </tr>
                ) : (
                  basculas.map((b, index) => (
                    <tr 
                      key={b.id_bascula} 
                      onClick={() => setSelectedId(b.id_bascula)}
                      className={selectedId === b.id_bascula ? 'selected' : ''}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>{index + 1}</td>
                      <td><strong>{b.nombre}</strong></td>
                      <td>{PRESETS[b.protocolo]?.label || b.protocolo?.toUpperCase()}</td>
                      <td>{b.tipo_conexion === 'serial' ? 'continuo' : b.tipo_conexion}</td>
                      <td>{b.codigo_sensor || '—'}</td>
                      <td>{b.baud_rate ?? 9600}</td>
                      <td>
                        {b.paridad === 'none' ? 'Ninguna (N)' : b.paridad === 'even' ? 'Par (E)' : b.paridad === 'odd' ? 'Impar (O)' : b.paridad}
                      </td>
                      <td>{b.data_bits ?? 8}</td>
                      <td>{b.stop_bits ?? 1}</td>
                      <td>
                        <span className={`status-badge ${b.activa ? 'active' : 'inactive'}`}>
                          {b.activa ? 'Activa' : 'Inactiva'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Botones Derecha */}
        <div className="basculas-actions-sidebar">
          <button className="bascula-action-btn new" onClick={handleNew}>
            <span>➕</span> Nuevo
          </button>
          <button className="bascula-action-btn edit" onClick={handleEdit}>
            <span>👁</span> Modificar
          </button>
          <button className="bascula-action-btn delete" onClick={handleDelete}>
            <span>🗑️</span> Borrar
          </button>
          <button className="bascula-action-btn test" onClick={handleTest}>
            <span>🧪</span> TEST
          </button>
        </div>
      </div>

      {/* MODAL DE FORMULARIO DE BÁSCULA */}
      {showForm && (
        <div className="bascula-modal-overlay">
          <div className="bascula-modal">
            <div className="bascula-modal-header">
              <h3 className="bascula-modal-title">⚖️ CONFIGURACIÓN DE BÁSCULA</h3>
              <button className="bascula-modal-close-icon" onClick={handleCancel}>✖</button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="bascula-modal-body">
                
                {/* Nombre báscula */}
                <div className="bascula-form-row">
                  <label className="bascula-form-label">Nombre báscula:</label>
                  <input 
                    name="nombre" 
                    value={form.nombre} 
                    onChange={handleChange} 
                    required 
                    className="bascula-form-input"
                  />
                </div>

                {/* Tipo báscula */}
                <div className="bascula-form-row">
                  <label className="bascula-form-label">Tipo báscula:</label>
                  <select 
                    name="protocolo" 
                    value={form.protocolo} 
                    onChange={handleChange} 
                    className="bascula-form-select"
                  >
                    {Object.entries(PRESETS).map(([id, p]) => (
                      <option key={id} value={id}>{p.label}</option>
                    ))}
                  </select>
                </div>

                  {/* Modo Lectura */}
                  <div className="bascula-form-row">
                    <label className="bascula-form-label">Modo Lectura:</label>
                    <select 
                      name="modo_lectura"
                      value={form.modo_lectura}
                      onChange={handleChange}
                      className="bascula-form-select"
                    >
                      <option value="continua">Continua</option>
                      <option value="peticion">Petición</option>
                    </select>
                  </div>
                  {/* Comando Petición (solo si modo es peticion) */}
                  {form.modo_lectura === 'peticion' && (
                    <div className="bascula-form-row">
                      <label className="bascula-form-label">Comando Petición:</label>
                      <input 
                        name="comando_peticion"
                        value={form.comando_peticion}
                        onChange={handleChange}
                        placeholder="Ej: ENQ"
                        className="bascula-form-input"
                      />
                    </div>
                  )}

                {/* Puerto COM */}
                <div className="bascula-form-row">
                  <label className="bascula-form-label">Puerto COM:</label>
                  <select 
                    name="codigo_sensor" 
                    value={form.codigo_sensor} 
                    onChange={handleChange} 
                    className="bascula-form-select"
                  >
                    {Array.from({ length: 16 }, (_, i) => `COM${i + 1}`).map(com => (
                      <option key={com} value={com}>{com}</option>
                    ))}
                  </select>
                </div>

                {/* Baud Rate */}
                <div className="bascula-form-row">
                  <label className="bascula-form-label">Baud Rate:</label>
                  <select 
                    name="baud_rate" 
                    value={form.baud_rate} 
                    onChange={handleChange} 
                    className="bascula-form-select"
                  >
                    {[300, 1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200].map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                {/* Paridad */}
                <div className="bascula-form-row">
                  <label className="bascula-form-label">Paridad:</label>
                  <select 
                    name="paridad" 
                    value={form.paridad} 
                    onChange={handleChange} 
                    className="bascula-form-select"
                  >
                    <option value="none">Ninguna (N)</option>
                    <option value="even">Par (E)</option>
                    <option value="odd">Impar (O)</option>
                  </select>
                </div>

                {/* Bits datos */}
                <div className="bascula-form-row">
                  <label className="bascula-form-label">Bits datos:</label>
                  <select 
                    name="data_bits" 
                    value={form.data_bits} 
                    onChange={handleChange} 
                    className="bascula-form-select"
                  >
                    <option value="8">8</option>
                    <option value="7">7</option>
                  </select>
                </div>

                {/* Stop Bits */}
                <div className="bascula-form-row">
                  <label className="bascula-form-label">Stop Bits:</label>
                  <select 
                    name="stop_bits" 
                    value={form.stop_bits} 
                    onChange={handleChange} 
                    className="bascula-form-select"
                  >
                    <option value="1">1</option>
                    <option value="2">2</option>
                  </select>
                </div>

                {/* Buffer Entrada / Salida */}
                <div className="bascula-form-row double">
                  <label className="bascula-form-label">Buffer Entrada:</label>
                  <input 
                    name="buffer_entrada" 
                    type="number"
                    value={form.buffer_entrada} 
                    onChange={handleChange} 
                    className="bascula-form-input"
                  />
                  <label className="bascula-form-label sub-label">Salida:</label>
                  <input 
                    name="buffer_salida" 
                    type="number"
                    value={form.buffer_salida} 
                    onChange={handleChange} 
                    className="bascula-form-input"
                  />
                </div>

                {/* Posicion inicial / Cant. Caracteres */}
                <div className="bascula-form-row double">
                  <label className="bascula-form-label">Posición inicial:</label>
                  <input 
                    name="inicio_lectura" 
                    type="number"
                    min="0"
                    value={form.inicio_lectura} 
                    onChange={handleChange} 
                    className="bascula-form-input"
                  />
                  <label className="bascula-form-label sub-label">Cant. Caracteres:</label>
                  <input 
                    name="longitud_lectura" 
                    type="number"
                    min="1"
                    value={form.longitud_lectura} 
                    onChange={handleChange} 
                    className="bascula-form-input"
                  />
                </div>

                {/* Timeout */}
                <div className="bascula-form-row">
                  <label className="bascula-form-label">Timeout:</label>
                  <select 
                    name="timeout" 
                    value={form.timeout} 
                    onChange={handleChange} 
                    className="bascula-form-select"
                  >
                    <option value="500 ms">500 ms</option>
                    <option value="1000 ms">1000 ms</option>
                    <option value="2000 ms">2000 ms</option>
                    <option value="5000 ms">5000 ms</option>
                  </select>
                </div>

                {/* Activo checkbox */}
                <div className="bascula-form-row checkbox-row">
                  <label className="bascula-form-label">Activo:</label>
                  <input 
                    name="activa" 
                    type="checkbox"
                    checked={form.activa} 
                    onChange={handleChange} 
                    className="bascula-form-checkbox"
                  />
                </div>

              </div>

              <div className="bascula-modal-footer">
                <button type="submit" className="bascula-modal-btn save">
                  ✔ Guardar
                </button>
                <button type="button" className="bascula-modal-btn cancel" onClick={handleCancel}>
                  ✖ Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConfiguracionBasculas;
