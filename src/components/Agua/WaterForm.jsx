// src/components/Agua/WaterForm.jsx
import React, { useState, useEffect } from 'react';
import { createWaterRecord, updateWaterRecord, fetchWaterOptions } from '../../services/waterApi.js';

export default function WaterForm({ onSuccess, initialData = null, tenantId, fincaId }) {
  const [options, setOptions] = useState([]);
  const [form, setForm] = useState({
    id_finca: fincaId || '',
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

  useEffect(() => {
    fetchWaterOptions().then(setOptions).catch(console.error);
    if (initialData) {
      setForm({ ...initialData });
    } else if (fincaId) {
      setForm(prev => ({ ...prev, id_finca: fincaId }));
    }
  }, [initialData, fincaId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const isLagoOrAlgibe = form.waterOption === 'lagos' || form.waterOption === 'algibes';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = { ...form, tenantId };
      if (initialData) {
        await updateWaterRecord(form.id, payload);
      } else {
        await createWaterRecord(payload);
      }
      onSuccess();
    } catch (err) {
      if (err.response && err.response.status === 409) {
        setError('Ya existe un registro con este rango de fechas para la finca y tipo de agua.');
      } else {
        setError('Error inesperado al guardar el registro.');
        console.error(err);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="water-form glass" onSubmit={handleSubmit}>
      {error && <div className="error-alert">{error}</div>}
      <div className="form-row">
        <label>Finca</label>
        <input name="id_finca" value={form.id_finca} onChange={handleChange} required />
      </div>
      <div className="form-row">
        <label>Lote</label>
        <input name="id_lote" value={form.id_lote} onChange={handleChange} />
      </div>
      <div className="form-row">
        <label>Semillero</label>
        <input name="id_semillero" value={form.id_semillero} onChange={handleChange} />
      </div>
      <div className="form-row">
        <label>Tipo de Agua</label>
        <select name="waterOption" value={form.waterOption} onChange={handleChange} required>
          <option value="">-- Seleccione --</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
      <div className="form-row">
        <label>Fecha inicio</label>
        <input type="date" name="fecha_inicio" value={form.fecha_inicio} onChange={handleChange} required />
      </div>
      <div className="form-row">
        <label>Fecha fin</label>
        <input type="date" name="fecha_fin" value={form.fecha_fin} onChange={handleChange} required />
      </div>
      {isLagoOrAlgibe && (
        <>
          <div className="form-row">
            <label>Nivel</label>
            <input name="nivel" value={form.nivel} onChange={handleChange} required />
          </div>
          <div className="form-row">
            <label>Capacidad</label>
            <input name="capacidad" value={form.capacidad} onChange={handleChange} required />
          </div>
          <div className="form-row">
            <label>Ubicación</label>
            <input name="ubicacion" value={form.ubicacion} onChange={handleChange} required />
          </div>
        </>
      )}
      <div className="form-row">
        <label>Observaciones</label>
        <textarea name="observaciones" value={form.observaciones} onChange={handleChange} />
      </div>
      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? 'Guardando…' : initialData ? 'Actualizar' : 'Crear'}
      </button>
    </form>
  );
}
