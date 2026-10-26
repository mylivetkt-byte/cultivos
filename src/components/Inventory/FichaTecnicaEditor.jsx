import React, { useState, useEffect } from 'react';
import DatePickerClaro from '../Common/DatePickerClaro';
import AsyncSelect from 'react-select/async';
import { authFetch } from '../../utils/api';

function FichaTecnicaEditor({ value, onChange }) {
  const [data, setData] = useState({
    capacidad_carter: '',
    ultima_fecha_cambio_aceite: '',
    horas_proximo_cambio_aceite: '',
    acumulado_costos_mantenimiento: '',
    notas: '',
    repuestos: [] // Array of { insumo_id, insumo_label, tipo_uso, es_alternativo, cantidad, frecuencia_horas }
  });

  useEffect(() => {
    if (value) {
      try {
        const parsed = typeof value === 'string' ? JSON.parse(value) : value;
        // Migrate legacy flat structure to dynamic array if needed
        let repuestos = parsed.repuestos || [];
        if (!parsed.repuestos) {
          // Convert legacy fields
          if (parsed.aceite_motor) repuestos.push({ insumo_id: parsed.aceite_motor.value || parsed.aceite_motor, insumo_label: parsed.aceite_motor.label || parsed.aceite_motor, tipo_uso: 'Aceite de Motor', es_alternativo: false, cantidad: 1, frecuencia_horas: parsed.horas_proximo_cambio_aceite || '' });
          if (parsed.filtro_aire_primario) repuestos.push({ insumo_id: parsed.filtro_aire_primario.value || parsed.filtro_aire_primario, insumo_label: parsed.filtro_aire_primario.label || parsed.filtro_aire_primario, tipo_uso: 'Filtro Aire Primario', es_alternativo: false, cantidad: 1, frecuencia_horas: '' });
          if (parsed.filtro_aire_secundario) repuestos.push({ insumo_id: parsed.filtro_aire_secundario.value || parsed.filtro_aire_secundario, insumo_label: parsed.filtro_aire_secundario.label || parsed.filtro_aire_secundario, tipo_uso: 'Filtro Aire Secundario', es_alternativo: false, cantidad: 1, frecuencia_horas: '' });
          if (parsed.lubricantes) repuestos.push({ insumo_id: parsed.lubricantes.value || parsed.lubricantes, insumo_label: parsed.lubricantes.label || parsed.lubricantes, tipo_uso: 'Lubricante General', es_alternativo: false, cantidad: 1, frecuencia_horas: '' });
          if (Array.isArray(parsed.filtros_aceite)) {
            parsed.filtros_aceite.forEach(f => {
              repuestos.push({ insumo_id: f.value || f, insumo_label: f.label || f, tipo_uso: 'Filtro de Aceite', es_alternativo: false, cantidad: 1, frecuencia_horas: '' });
            });
          }
        }

        setData({
          capacidad_carter: parsed.capacidad_carter || '',
          ultima_fecha_cambio_aceite: parsed.ultima_fecha_cambio_aceite || '',
          horas_proximo_cambio_aceite: parsed.horas_proximo_cambio_aceite || '',
          acumulado_costos_mantenimiento: parsed.acumulado_costos_mantenimiento || '',
          notas: parsed.notas || '',
          repuestos: repuestos
        });
      } catch (e) {
        console.error('Error parsing ficha_tecnica', e);
      }
    }
  }, [value]);

  const handleChange = (field, val) => {
    const updated = { ...data, [field]: val };
    setData(updated);
    onChange(updated);
  };

  const handleRepuestoChange = (index, field, val) => {
    const newRepuestos = [...data.repuestos];
    newRepuestos[index][field] = val;
    handleChange('repuestos', newRepuestos);
  };

  const addRepuesto = () => {
    handleChange('repuestos', [
      ...data.repuestos, 
      { insumo_id: null, insumo_label: '', tipo_uso: 'Filtro de Aceite', es_alternativo: false, cantidad: 1, frecuencia_horas: '' }
    ]);
  };

  const removeRepuesto = (index) => {
    const newRepuestos = [...data.repuestos];
    newRepuestos.splice(index, 1);
    handleChange('repuestos', newRepuestos);
  };

  const loadInsumos = async (inputValue) => {
    if (!inputValue) return [];
    try {
      const res = await authFetch(`/api/table/insumos/data?search=${encodeURIComponent(inputValue)}&pageSize=10`);
      const json = await res.json();
      return (json.data || []).map(insumo => ({
        value: insumo.id_insumo,
        label: `${insumo.codigo} - ${insumo.nombre}`,
        raw: insumo
      }));
    } catch (err) {
      console.error(err);
      return [];
    }
  };

  return (
    <div style={{ background: 'var(--bg)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)', width: '100%' }}>
      <h4 style={{ margin: '0 0 16px 0', color: 'var(--primary)', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
        🛠️ Ficha Técnica de Mantenimiento
      </h4>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        {/* ESTADISTICAS Y GENERALES */}
        <div className="form-group">
          <label>📏 Capacidad del Cárter</label>
          <input type="text" value={data.capacidad_carter || ''} onChange={e => handleChange('capacidad_carter', e.target.value)} placeholder="Ej: 15 Litros" />
        </div>
        <div className="form-group">
          <label>⏱️ Frecuencia Cambio Aceite (Horas)</label>
          <input type="number" value={data.horas_proximo_cambio_aceite || ''} onChange={e => handleChange('horas_proximo_cambio_aceite', Number(e.target.value))} placeholder="Ej: 250" />
        </div>
        <div className="form-group">
          <label>📅 Último Cambio de Aceite</label>
          <DatePickerClaro value={data.ultima_fecha_cambio_aceite || ''} onChange={e => handleChange('ultima_fecha_cambio_aceite', e.target.value)} />
        </div>
        <div className="form-group">
          <label>💰 Costos Acumulados Históricos</label>
          <input type="number" value={data.acumulado_costos_mantenimiento || ''} onChange={e => handleChange('acumulado_costos_mantenimiento', Number(e.target.value))} />
        </div>
        
        {/* NOTAS */}
        <div className="form-group full-width" style={{ gridColumn: '1 / -1' }}>
          <label>📝 Notas y Recomendaciones Adicionales</label>
          <textarea rows={3} value={data.notas || ''} onChange={e => handleChange('notas', e.target.value)} placeholder="Ej: Limpiar el prefiltro a diario..." />
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h5 style={{ margin: 0, color: 'var(--text)' }}>🧰 Catálogo de Insumos y Repuestos de la Máquina</h5>
          <button type="button" className="btn btn-sm btn-primary" onClick={addRepuesto}>+ Agregar Insumo</button>
        </div>

        {data.repuestos.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--card-bg)', borderRadius: '8px' }}>
            No hay insumos o repuestos configurados. Agrega filtros, aceites y lubricantes.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {data.repuestos.map((rep, idx) => (
              <div key={idx} style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px', position: 'relative', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <button 
                  type="button" 
                  onClick={() => removeRepuesto(idx)} 
                  style={{ position: 'absolute', top: '16px', right: '16px', background: 'var(--danger)', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                  title="Eliminar repuesto de la lista"
                >
                  X Eliminar
                </button>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '24px' }}>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: '12px', fontWeight: 'bold' }}>🔎 Buscar Insumo / Repuesto (Por Código o Nombre)</label>
                    <AsyncSelect 
                      cacheOptions defaultOptions={false} loadOptions={loadInsumos}
                      value={rep.insumo_id ? { value: rep.insumo_id, label: rep.insumo_label } : null}
                      onChange={(sel) => {
                        handleRepuestoChange(idx, 'insumo_id', sel ? sel.value : null);
                        handleRepuestoChange(idx, 'insumo_label', sel ? sel.label : '');
                      }}
                      placeholder="Ej: ACE-15W40 ó Filtro Donaldson..."
                      styles={{ menu: base => ({...base, zIndex: 9999}) }}
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ fontSize: '12px', fontWeight: 'bold' }}>⚙️ Sistema / Uso</label>
                    <select value={rep.tipo_uso} onChange={e => handleRepuestoChange(idx, 'tipo_uso', e.target.value)}>
                      <option value="Aceite de Motor">Aceite de Motor</option>
                      <option value="Aceite Hidráulico">Aceite Hidráulico</option>
                      <option value="Aceite Transmisión">Aceite Transmisión</option>
                      <option value="Filtro de Aceite">Filtro de Aceite</option>
                      <option value="Filtro de Aire">Filtro de Aire</option>
                      <option value="Filtro de Combustible">Filtro de Combustible</option>
                      <option value="Filtro Hidráulico">Filtro Hidráulico</option>
                      <option value="Lubricante General">Lubricante General</option>
                      <option value="Correa / Banda">Correa / Banda</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label style={{ fontSize: '12px', fontWeight: 'bold' }}>🔢 Cantidad Requerida</label>
                    <input type="number" value={rep.cantidad || ''} onChange={e => handleRepuestoChange(idx, 'cantidad', Number(e.target.value))} placeholder="Ej: 1" />
                  </div>

                  <div className="form-group">
                    <label style={{ fontSize: '12px', fontWeight: 'bold' }}>⏱️ Frecuencia (Horas)</label>
                    <input type="number" value={rep.frecuencia_horas || ''} onChange={e => handleRepuestoChange(idx, 'frecuencia_horas', Number(e.target.value))} placeholder="Opcional" />
                  </div>

                  <div className="form-group checkbox-group" style={{ alignSelf: 'center', marginTop: '10px' }}>
                    <input type="checkbox" id={`alt-${idx}`} checked={rep.es_alternativo} onChange={e => handleRepuestoChange(idx, 'es_alternativo', e.target.checked)} />
                    <label htmlFor={`alt-${idx}`} style={{ cursor: 'pointer', fontWeight: 'bold' }}>Es una pieza Alternativa / Homologada</label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

export default FichaTecnicaEditor;
