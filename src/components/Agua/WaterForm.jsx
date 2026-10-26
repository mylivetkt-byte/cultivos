// src/components/Agua/WaterForm.jsx
import React, { useState, useEffect } from 'react';
import DatePickerClaro from '../Common/DatePickerClaro';
import { createWaterRecord, updateWaterRecord, fetchWaterOptions } from '../../services/waterApi.js';
import { authFetch, API_BASE } from '../../utils/api.js';
import AyudaCampesina from '../Common/AyudaCampesina.jsx';
import ManualitoCampesinoModal from '../Common/ManualitoCampesinoModal.jsx';

export default function WaterForm({ onSuccess, initialData = null, tenantId, fincaId }) {
  const activeTenant = tenantId || localStorage.getItem('tenantId') || 1;

  const [options, setOptions] = useState([]);
  const [fincasList, setFincasList] = useState([]);
  const [lotesList, setLotesList] = useState([]);
  const [semillerosList, setSemillerosList] = useState([]);

  const [form, setForm] = useState({
    id_finca: fincaId ? String(fincaId) : '',
    id_lote: '',
    id_semillero: '',
    waterOption: '',
    fecha_inicio: '',
    fecha_fin: '',
    nivel: '',
    capacidad: '',
    ubicacion: '',
    observaciones: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Cargar catálogos
  useEffect(() => {
    fetchWaterOptions().then(setOptions).catch(console.error);

    authFetch(`${API_BASE}/tables/fincas?tenantId=${activeTenant}`)
      .then(res => res.json())
      .then(data => {
        const list = Array.isArray(data) ? data : (data.data || []);
        setFincasList(list);
      })
      .catch(console.error);

    authFetch(`${API_BASE}/tables/lotes?tenantId=${activeTenant}`)
      .then(res => res.json())
      .then(data => {
        const list = Array.isArray(data) ? data : (data.data || []);
        setLotesList(list);
      })
      .catch(console.error);

    authFetch(`${API_BASE}/tables/viveros?tenantId=${activeTenant}`)
      .then(res => res.json())
      .then(data => {
        const list = Array.isArray(data) ? data : (data.data || []);
        setSemillerosList(list);
      })
      .catch(console.error);
  }, [activeTenant]);

  // Cargar datos iniciales en edición o creación
  useEffect(() => {
    const formatDate = (d) => {
      if (!d) return '';
      if (typeof d === 'string' && d.includes('T')) return d.split('T')[0];
      if (d instanceof Date) return d.toISOString().split('T')[0];
      return String(d).substring(0, 10);
    };

    if (initialData) {
      setForm({
        id: initialData.id,
        id_finca: initialData.id_finca ? String(initialData.id_finca) : (fincaId ? String(fincaId) : ''),
        id_lote: initialData.id_lote ? String(initialData.id_lote) : '',
        id_semillero: initialData.id_semillero ? String(initialData.id_semillero) : '',
        waterOption: initialData.waterOption || initialData.water_option || '',
        fecha_inicio: formatDate(initialData.fecha_inicio),
        fecha_fin: formatDate(initialData.fecha_fin),
        nivel: initialData.nivel || '',
        capacidad: initialData.capacidad || '',
        ubicacion: initialData.ubicacion || '',
        observaciones: initialData.observaciones || ''
      });
    } else if (fincaId) {
      setForm(prev => ({ ...prev, id_finca: String(fincaId) }));
    }
  }, [initialData, fincaId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      // Si cambia de finca, resetear lote y vivero si ya no pertenecen a la nueva finca
      if (name === 'id_finca') {
        next.id_lote = '';
        next.id_semillero = '';
      }
      return next;
    });
  };

  const isLagoOrAlgibe = form.waterOption === 'lagos' || form.waterOption === 'algibes';

  // Lotes filtrados por la finca seleccionada
  const availableLotes = form.id_finca
    ? lotesList.filter(l => String(l.id_finca) === String(form.id_finca))
    : lotesList;

  // Semilleros filtrados por la finca seleccionada
  const availableSemilleros = form.id_finca
    ? semillerosList.filter(v => !v.id_finca || String(v.id_finca) === String(form.id_finca))
    : semillerosList;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.id_finca) {
      setError('Por favor seleccione una Finca.');
      return;
    }
    if (!form.waterOption) {
      setError('Por favor seleccione el Tipo de Agua.');
      return;
    }
    if (!form.fecha_inicio || !form.fecha_fin) {
      setError('Por favor ingrese las fechas de inicio y fin.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const payload = {
        ...form,
        waterOption: form.waterOption,
        water_option: form.waterOption,
        tenantId: activeTenant
      };
      if (initialData?.id) {
        await updateWaterRecord(initialData.id, payload);
      } else {
        await createWaterRecord(payload);
      }
      onSuccess();
    } catch (err) {
      if (err.response && err.response.status === 409) {
        setError('Ya existe un registro con este rango de fechas para la finca y tipo de agua.');
      } else {
        setError(err.response?.data?.error || 'Error al guardar el registro de agua.');
        console.error(err);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="water-form glass" onSubmit={handleSubmit}>
      {/* Cabecera amigable con botón de Guía Campesina */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '0.8rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.8rem' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#38bdf8' }}>
            {initialData ? '✏️ Actualizar Registro de Agua' : '💧 Nuevo Registro de Agua'}
          </h3>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
            Llene los campos o toque <b>🔊 Escuchar</b> para que el teléfono le hable.
          </span>
        </div>
        <ManualitoCampesinoModal modulo="Gestión de Agua y Riego" />
      </div>

      {error && <div className="error-alert" style={{ background: '#ef444422', border: '1px solid #ef4444', color: '#f87171', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem' }}>{error}</div>}
      
      <div className="form-row">
        <label>Finca *</label>
        <select name="id_finca" value={form.id_finca} onChange={handleChange} required>
          <option value="">-- Seleccione Finca ({fincasList.length} disponibles) --</option>
          {fincasList.map((f) => {
            const fid = String(f.id_finca || f.id);
            return (
              <option key={fid} value={fid}>
                {f.codigo ? `${f.codigo} - ${f.nombre}` : (f.nombre || fid)}
              </option>
            );
          })}
        </select>
        <AyudaCampesina campo="id_finca" />
      </div>

      <div className="form-row">
        <label>Lote</label>
        <select name="id_lote" value={form.id_lote || ''} onChange={handleChange}>
          <option value="">-- {form.id_finca ? `Seleccione Lote (${availableLotes.length})` : 'N/A'} --</option>
          {availableLotes.map((l) => {
            const lid = String(l.id_lote || l.id);
            return (
              <option key={lid} value={lid}>
                {l.codigo ? `${l.codigo} - ${l.nombre}` : (l.nombre || lid)}
              </option>
            );
          })}
        </select>
        <AyudaCampesina campo="id_lote" />
      </div>

      <div className="form-row">
        <label>Semillero / Vivero</label>
        <select name="id_semillero" value={form.id_semillero || ''} onChange={handleChange}>
          <option value="">-- {availableSemilleros.length > 0 ? `Seleccione Vivero (${availableSemilleros.length})` : 'N/A'} --</option>
          {availableSemilleros.map((v) => {
            const vid = String(v.id_vivero || v.id);
            return (
              <option key={vid} value={vid}>
                {v.codigo ? `${v.codigo} - ${v.nombre}` : (v.nombre || vid)}
              </option>
            );
          })}
        </select>
        <AyudaCampesina campo="id_semillero" />
      </div>

      <div className="form-row">
        <label>Tipo de Agua *</label>
        <select name="waterOption" value={form.waterOption} onChange={handleChange} required>
          <option value="">-- Seleccione Tipo de Agua --</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt.charAt(0).toUpperCase() + opt.slice(1)}
            </option>
          ))}
        </select>
        <AyudaCampesina campo="waterOption" />
      </div>

      <div className="form-row">
        <label>Fecha inicio *</label>
        <DatePickerClaro name="fecha_inicio" value={form.fecha_inicio} onChange={handleChange} required />
        <AyudaCampesina campo="fecha_inicio" />
      </div>

      <div className="form-row">
        <label>Fecha fin *</label>
        <DatePickerClaro name="fecha_fin" value={form.fecha_fin} onChange={handleChange} required />
        <AyudaCampesina campo="fecha_fin" />
      </div>

      {isLagoOrAlgibe && (
        <>
          <div className="form-row">
            <label>Nivel</label>
            <input name="nivel" placeholder="Ej: 85 m" value={form.nivel} onChange={handleChange} required />
            <AyudaCampesina campo="nivel" />
          </div>
          <div className="form-row">
            <label>Capacidad</label>
            <input name="capacidad" placeholder="Ej: 396 ML" value={form.capacidad} onChange={handleChange} required />
            <AyudaCampesina campo="capacidad" />
          </div>
          <div className="form-row">
            <label>Ubicación</label>
            <input name="ubicacion" placeholder="Sector o coordenadas" value={form.ubicacion} onChange={handleChange} required />
            <AyudaCampesina campo="ubicacion" />
          </div>
        </>
      )}

      <div className="form-row">
        <label>Observaciones</label>
        <textarea
          name="observaciones"
          placeholder="Observaciones de la labor hídrica..."
          value={form.observaciones}
          onChange={handleChange}
          rows={3}
        />
        <AyudaCampesina campo="observaciones" />
      </div>

      <button type="submit" className="submit-btn" disabled={loading} style={{ width: '100%', padding: '0.85rem', fontWeight: 600, fontSize: '1rem', cursor: loading ? 'not-allowed' : 'pointer' }}>
        {loading ? 'Guardando…' : initialData ? 'Actualizar Registro' : 'Ingresar Registro'}
      </button>
    </form>
  );
}
