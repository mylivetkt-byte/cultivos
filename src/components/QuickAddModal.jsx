import React, { useState, useEffect, useCallback } from 'react';
import Select from 'react-select';
import AsyncSelect from 'react-select/async';
import Modal from './Modal';
import {
  fetchTableStructure,
  insertRecord,
  updateRecord,
  fetchTableData,
  fetchFKLookup,
  checkUniqueValue,
  formatColumnName,
  formatTableName
} from '../utils/api';
import { calcularDV } from '../utils/dian';
import { authFetch } from '../utils/api';

function QuickAddModal({ isOpen, onClose, tableName, tenantId, fincaId, nucleoId, onSuccess, defaultValues = {}, mode = 'add', pkValue = null }) {
  const [structure, setStructure] = useState(null);
  const [formData, setFormData] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [documentoChecking, setDocumentoChecking] = useState(false);

  const [fkOptions, setFkOptions] = useState({});
  const [fkLoading, setFkLoading] = useState({});

  useEffect(() => {
    if (!isOpen || !tableName) return;
    
    setLoading(true);
    setError(null);
    fetchTableStructure(tableName)
      .then((s) => {
        setStructure(s);
        // Initialize form data
        const initial = { ...defaultValues };
        for (const col of s.columns) {
          if (col.isAutoIncrement) continue;
          if (!(col.name in initial)) {
            initial[col.name] = col.defaultValue !== null ? col.defaultValue : (col.displayType === 'boolean' ? false : '');
          }
        }
        if (tenantId) initial['id_tenant'] = tenantId;
        if (fincaId) initial['id_finca'] = fincaId;
        if (nucleoId) initial['id_nucleo'] = nucleoId;
        
        setFormData(initial);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [isOpen, tableName, tenantId, fincaId, nucleoId]); // Removed defaultValues to prevent infinite loop

  const loadFkOptions = useCallback(async () => {
    if (!structure) return;
    const fkCols = structure.columns.filter((c) => c.isForeignKey);
    for (const col of fkCols) {
      setFkLoading((prev) => ({ ...prev, [col.name]: true }));
      try {
        const lookup = await fetchFKLookup(tableName, col.name, { tenantId, fincaId, nucleoId });
        setFkOptions((prev) => ({ ...prev, [col.name]: lookup.options }));
      } catch (err) {
        console.error(`Error loading FK options for ${col.name}:`, err);
      } finally {
        setFkLoading((prev) => ({ ...prev, [col.name]: false }));
      }
    }
  }, [structure, tableName, tenantId, fincaId, nucleoId]);

  useEffect(() => {
    if (structure && isOpen) {
      loadFkOptions();
    }
  }, [structure, loadFkOptions, isOpen]);

  useEffect(() => {
    if (!isOpen || !structure) return undefined;

    const docColumn = structure.columns.find((col) => col.name === 'documento' || col.name === 'documento_identidad');
    if (!docColumn) return undefined;

    const rawValue = formData[docColumn.name];
    const value = typeof rawValue === 'string' ? rawValue.trim() : String(rawValue || '').trim();

    if (!value) {
      setDocumentoChecking(false);
      setFormErrors((prev) => {
        if (!prev[docColumn.name]) return prev;
        const next = { ...prev };
        delete next[docColumn.name];
        return next;
      });
      return undefined;
    }

    let cancelled = false;
    setDocumentoChecking(true);

    const timeout = window.setTimeout(async () => {
      try {
        const result = await checkUniqueValue(
          tableName,
          docColumn.name,
          value,
          mode === 'edit' ? pkValue : ''
        );

        if (cancelled) return;

        setFormErrors((prev) => {
          const current = prev[docColumn.name];
          if (result.exists) {
            return { ...prev, [docColumn.name]: 'La cédula ya existe para otro empleado.' };
          }
          if (current === 'La cédula ya existe para otro empleado.') {
            const next = { ...prev };
            delete next[docColumn.name];
            return next;
          }
          return prev;
        });
      } catch (err) {
        if (!cancelled) {
          console.error('Error validating documento:', err);
        }
      } finally {
        if (!cancelled) setDocumentoChecking(false);
      }
    }, 450);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [isOpen, structure, formData.documento, formData.documento_identidad, tableName, mode, pkValue]);

  const handleFormChange = (colName, value) => {
    setFormData((prev) => {
      const updated = { ...prev, [colName]: value };
      
      // Auto-clear subgroup if group changes
      if (tableName === 'insumos' && colName === 'id_grupo') {
        updated.id_subgrupo = null;
      }

      // DIAN Auto-calculate DV
      if ((colName === 'documento' || colName === 'documento_identidad') && value) {
        updated.dv = calcularDV(value);
      }
      
      return updated;
    });
    setFormErrors((prev) => ({ ...prev, [colName]: undefined }));
  };

  const handleSubmit = async () => {
    if (!structure) return;

    // Validate required fields
    const errors = {};
    for (const col of structure.columns) {
      if (col.isAutoIncrement) continue;
      if (!col.isNullable && formData[col.name] === '' && col.defaultValue === null) {
        errors[col.name] = 'Este campo es requerido';
      }
    }
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const docColumn = structure.columns.find((col) => col.name === 'documento' || col.name === 'documento_identidad');
    if (docColumn) {
      const rawValue = formData[docColumn.name];
      const value = typeof rawValue === 'string' ? rawValue.trim() : String(rawValue || '').trim();
      if (!value) {
        errors[docColumn.name] = 'Este campo es requerido';
        setFormErrors(errors);
        return;
      }

      try {
        const result = await checkUniqueValue(tableName, docColumn.name, value, mode === 'edit' ? pkValue : '');
        if (result.exists) {
          setFormErrors((prev) => ({ ...prev, [docColumn.name]: 'La cédula ya existe para otro empleado.' }));
          return;
        }
      } catch (err) {
        setError(err.message);
        return;
      }
    }

    setSubmitting(true);
    try {
      const submitData = { ...formData };
      for (const col of structure.columns) {
        if (submitData[col.name] === '' && col.isNullable) {
          submitData[col.name] = null;
        }
        if ((col.name === 'documento' || col.name === 'documento_identidad') && typeof submitData[col.name] === 'string') {
          submitData[col.name] = submitData[col.name].trim();
        }
        if (col.displayType === 'boolean') {
          submitData[col.name] = submitData[col.name] ? 1 : 0;
        }
      }

      let newId;
      if (mode === 'edit' && pkValue) {
        await updateRecord(tableName, pkValue, submitData);
        newId = pkValue;
      } else {
        const res = await insertRecord(tableName, submitData);
        newId = res.insertId || res.id || res[structure.primaryKey];
      }
      
      if (onSuccess) {
        onSuccess(newId);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const renderFormField = (col) => {
    const value = formData[col.name];
    const errorMsg = formErrors[col.name];

    if (col.isAutoIncrement) return null;

    if (col.isForeignKey) {
      let options = fkOptions[col.name] || [];
      if (tableName === 'insumos' && col.name === 'id_subgrupo' && formData.id_grupo) {
        options = options.filter(opt => String(opt.id_grupo) === String(formData.id_grupo));
      }
      const isFkLoading = fkLoading[col.name];
      const reactSelectOptions = options.map(opt => ({
        value: opt.id,
        label: opt.display || String(opt.id)
      }));
      const currentSelected = reactSelectOptions.find(o => String(o.value) === String(value)) || null;

      return (
        <div key={col.name} className="form-group">
          <label>
            {formatColumnName(col.name)}
            {!col.isNullable && <span className="required">*</span>}
          </label>
          <Select
            placeholder="-- Buscar... --"
            options={reactSelectOptions}
            value={currentSelected}
            onChange={(selected) => handleFormChange(col.name, selected ? selected.value : null)}
            isDisabled={isFkLoading}
            isClearable={col.isNullable}
            menuPortalTarget={document.body}
            styles={{
              menuPortal: base => ({ ...base, zIndex: 9999 }),
              control: (base) => ({ ...base, background: 'var(--card-bg)', borderColor: 'var(--border)', color: 'var(--text)' }),
              menu: (base) => ({ ...base, background: 'var(--card-bg)', color: 'var(--text)' }),
              option: (base, state) => ({ ...base, background: state.isFocused ? 'var(--primary-light)' : 'transparent', color: 'var(--text)' }),
              singleValue: (base) => ({ ...base, color: 'var(--text)' })
            }}
          />
          {isFkLoading && <span className="fk-loading">Cargando opciones...</span>}
          {errorMsg && <span className="form-error">{errorMsg}</span>}
        </div>
      );
    }

    if (col.enumValues) {
      return (
        <div key={col.name} className="form-group">
          <label>
            {formatColumnName(col.name)}
            {!col.isNullable && <span className="required">*</span>}
          </label>
          <select value={value || ''} onChange={(e) => handleFormChange(col.name, e.target.value)}>
            <option value="">-- Seleccionar --</option>
            {col.enumValues.map((v) => (
              <option key={v} value={v}>
                {v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </option>
            ))}
          </select>
          {errorMsg && <span className="form-error">{errorMsg}</span>}
        </div>
      );
    }

    if (col.displayType === 'boolean') {
      return (
        <div key={col.name} className="form-group checkbox-group">
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => handleFormChange(col.name, e.target.checked)}
          />
          <label style={{ marginBottom: 0 }}>
            {formatColumnName(col.name)}
          </label>
          {errorMsg && <span className="form-error">{errorMsg}</span>}
        </div>
      );
    }

    if (col.displayType === 'textarea') {
      return (
        <div key={col.name} className="form-group full-width">
          <label>
            {formatColumnName(col.name)}
            {!col.isNullable && <span className="required">*</span>}
          </label>
          <textarea
            value={value || ''}
            onChange={(e) => handleFormChange(col.name, e.target.value)}
            rows={3}
          />
          {errorMsg && <span className="form-error">{errorMsg}</span>}
        </div>
      );
    }

    if (col.displayType === 'date' || col.displayType === 'datetime' || col.displayType === 'time') {
      const typeMap = { 'date': 'date', 'datetime': 'datetime-local', 'time': 'time' };
      const valSlice = col.displayType === 'date' ? 10 : (col.displayType === 'datetime' ? 16 : undefined);
      return (
        <div key={col.name} className="form-group">
          <label>
            {formatColumnName(col.name)}
            {!col.isNullable && <span className="required">*</span>}
          </label>
          <input
            type={typeMap[col.displayType]}
            value={value ? (valSlice ? value.toString().slice(0, valSlice).replace(' ', 'T') : value) : ''}
            onChange={(e) => handleFormChange(col.name, e.target.value)}
          />
          {errorMsg && <span className="form-error">{errorMsg}</span>}
        </div>
      );
    }

    if (col.displayType === 'number' || col.displayType === 'decimal') {
      const isCurrency = /costo|precio|valor|total|salario|pago|monto|tarifa/i.test(col.name);
      return (
        <div key={col.name} className="form-group">
          <label>
            {formatColumnName(col.name)}
            {!col.isNullable && <span className="required">*</span>}
          </label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            {isCurrency && <span style={{ position: 'absolute', left: '12px', color: '#64748b' }}>$</span>}
            <input
              type="number"
              value={value || ''}
              onChange={(e) => handleFormChange(col.name, e.target.value)}
              step={col.displayType === 'decimal' ? (1 / Math.pow(10, col.numericScale || 2)) : "1"}
              style={{ paddingLeft: isCurrency ? '28px' : '12px' }}
            />
          </div>
          {errorMsg && <span className="form-error">{errorMsg}</span>}
        </div>
      );
    }

    if (col.name === 'codigo_municipio') {
      const loadOptions = async (inputValue) => {
        if (!inputValue || inputValue.length < 2) return [];
        try {
          const res = await authFetch(`/api/municipios?q=${encodeURIComponent(inputValue)}`);
          const data = await res.json();
          return data.map(m => ({
            value: m.codigo_dane,
            label: `${m.codigo_dane} - ${m.municipio}, ${m.departamento}`
          }));
        } catch {
          return [];
        }
      };
      return (
        <div key={col.name} className="form-group">
          <label>
            {formatColumnName(col.name)} (DIAN)
            {!col.isNullable && <span className="required">*</span>}
          </label>
          <AsyncSelect
            cacheOptions
            defaultOptions={false}
            loadOptions={loadOptions}
            onChange={(selected) => handleFormChange(col.name, selected ? selected.value : null)}
            placeholder="Buscar ciudad o código..."
            menuPortalTarget={document.body}
            styles={{
              menuPortal: base => ({ ...base, zIndex: 9999 }),
              control: (base) => ({ ...base, background: 'var(--card-bg)', borderColor: 'var(--border)', color: 'var(--text)' }),
              menu: (base) => ({ ...base, background: 'var(--card-bg)', color: 'var(--text)' }),
              option: (base, state) => ({ ...base, background: state.isFocused ? 'var(--primary-light)' : 'transparent', color: 'var(--text)' }),
              singleValue: (base) => ({ ...base, color: 'var(--text)' })
            }}
          />
          {errorMsg && <span className="form-error">{errorMsg}</span>}
        </div>
      );
    }

    // Default text input
    return (
      <div key={col.name} className="form-group">
        <label>
          {formatColumnName(col.name)}
          {!col.isNullable && <span className="required">*</span>}
        </label>
        <input
          type="text"
          value={value || ''}
          onChange={(e) => handleFormChange(col.name, e.target.value)}
          maxLength={col.maxLength || undefined}
          readOnly={col.name === 'dv'}
          style={col.name === 'dv' ? { backgroundColor: 'var(--bg)', color: 'var(--text-muted)' } : {}}
        />
        {errorMsg && <span className="form-error">{errorMsg}</span>}
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${mode === 'edit' ? 'Editar' : 'Creación Rápida'} — ${formatTableName(tableName || '')}`}
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose} disabled={submitting}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting || loading}>
            {submitting ? 'Guardando...' : '✓ Guardar'}
          </button>
        </>
      }
    >
      {loading ? (
        <div className="loading-container" style={{ padding: '40px' }}>
          <div className="spinner" />
          <span className="loading-text">Cargando formulario...</span>
        </div>
      ) : error ? (
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <div className="error-message">Error cargando formulario</div>
          <div className="error-detail">{error}</div>
        </div>
      ) : structure ? (
        <div className="form-grid">
          {structure.columns
            .filter((col) => !col.isAutoIncrement && col.name !== 'id_tenant' && col.name !== 'id_finca' && col.name !== 'id_nucleo' && col.name !== 'fotografia' && col.name !== 'poligono_gps' && col.name !== 'centro_gps')
            .map((col) => renderFormField(col))}
          {documentoChecking && (
            <div className="form-group full-width">
              <span className="form-error">Validando cédula...</span>
            </div>
          )}
        </div>
      ) : null}
    </Modal>
  );
}

export default QuickAddModal;
