import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Trash2,
} from 'lucide-react';
import Modal from './Modal';
import {
  deleteRecord,
  fetchTableStructure,
  fetchTables,
  fetchUniquenessRules,
  formatColumnName,
  formatTableName,
  insertRecord,
  updateRecord,
} from '../utils/api';

const emptyForm = {
  id_regla: null,
  codigo_regla: '',
  modulo: '',
  tabla: '',
  columnas_unicas: [],
  columnas_ambito: [],
  alcance: 'global',
  mensaje_error: '',
  descripcion: '',
  activo: true,
};

const scopeOptions = [
  { value: 'global', label: 'Global' },
  { value: 'tenant', label: 'Por cliente' },
  { value: 'tenant_finca', label: 'Por cliente y finca' },
  { value: 'tenant_nucleo', label: 'Por cliente y núcleo' },
  { value: 'custom', label: 'Personalizado' },
];

function normalizeRule(row) {
  return {
    ...row,
    columnas_unicas: Array.isArray(row.columnas_unicas) ? row.columnas_unicas : [],
    columnas_ambito: Array.isArray(row.columnas_ambito) ? row.columnas_ambito : [],
    activo: Boolean(row.activo),
  };
}

export default function UnicidadReglasAdmin() {
  const [rules, setRules] = useState([]);
  const [tables, setTables] = useState([]);
  const [tableStructure, setTableStructure] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingTables, setLoadingTables] = useState(true);
  const [loadingStructure, setLoadingStructure] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [tableFilter, setTableFilter] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('add');
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const loadRules = async () => {
    setLoading(true);
    try {
      const result = await fetchUniquenessRules();
      setRules((result.data || []).map(normalizeRule));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadTables = async () => {
    setLoadingTables(true);
    try {
      const result = await fetchTables();
      setTables(Array.isArray(result) ? result : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingTables(false);
    }
  };

  useEffect(() => {
    loadRules();
    loadTables();
  }, []);

  useEffect(() => {
    const loadStructure = async () => {
      if (!form.tabla) {
        setTableStructure(null);
        return;
      }
      setLoadingStructure(true);
      try {
        const result = await fetchTableStructure(form.tabla);
        setTableStructure(result);
      } catch (err) {
        setTableStructure(null);
        setError(err.message);
      } finally {
        setLoadingStructure(false);
      }
    };

    if (formOpen) {
      loadStructure();
    }
  }, [form.tabla, formOpen]);

  const visibleRules = useMemo(() => {
    return rules.filter((rule) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        rule.codigo_regla?.toLowerCase().includes(q) ||
        rule.modulo?.toLowerCase().includes(q) ||
        rule.tabla?.toLowerCase().includes(q) ||
        rule.mensaje_error?.toLowerCase().includes(q);
      const matchesTable = !tableFilter || rule.tabla === tableFilter;
      const matchesModule = !moduleFilter || rule.modulo === moduleFilter;
      return matchesSearch && matchesTable && matchesModule;
    });
  }, [rules, search, tableFilter, moduleFilter]);

  const modules = useMemo(() => {
    return Array.from(new Set(rules.map((r) => r.modulo).filter(Boolean))).sort();
  }, [rules]);

  const openCreate = () => {
    setFormMode('add');
    setForm({
      ...emptyForm,
      modulo: 'RRHH',
      alcance: 'global',
      activo: true,
    });
    setTableStructure(null);
    setFormOpen(true);
    setError('');
  };

  const openEdit = (rule) => {
    setFormMode('edit');
    setForm({
      id_regla: rule.id_regla,
      codigo_regla: rule.codigo_regla || '',
      modulo: rule.modulo || '',
      tabla: rule.tabla || '',
      columnas_unicas: [...(rule.columnas_unicas || [])],
      columnas_ambito: [...(rule.columnas_ambito || [])],
      alcance: rule.alcance || 'global',
      mensaje_error: rule.mensaje_error || '',
      descripcion: rule.descripcion || '',
      activo: Boolean(rule.activo),
    });
    setFormOpen(true);
    setError('');
  };

  const closeForm = () => {
    setFormOpen(false);
    setSaving(false);
  };

  const toggleColumn = (field, column) => {
    setForm((prev) => {
      const list = prev[field] || [];
      const exists = list.includes(column);
      return {
        ...prev,
        [field]: exists ? list.filter((item) => item !== column) : [...list, column],
      };
    });
  };

  const handleSave = async () => {
    if (!form.codigo_regla || !form.modulo || !form.tabla || !form.mensaje_error) {
      setError('Completa código, módulo, tabla y mensaje de error.');
      return;
    }

    if ((form.columnas_unicas || []).length === 0) {
      setError('Selecciona al menos una columna única.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = {
        codigo_regla: form.codigo_regla.trim(),
        modulo: form.modulo.trim(),
        tabla: form.tabla.trim(),
        columnas_unicas: JSON.stringify(form.columnas_unicas || []),
        columnas_ambito: JSON.stringify(form.columnas_ambito || []),
        alcance: form.alcance,
        mensaje_error: form.mensaje_error.trim(),
        descripcion: form.descripcion || null,
        activo: form.activo ? 1 : 0,
      };

      if (formMode === 'edit' && form.id_regla) {
        await updateRecord('sys_unicidad_reglas', form.id_regla, payload);
      } else {
        await insertRecord('sys_unicidad_reglas', payload);
      }

      setFormOpen(false);
      await loadRules();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (rule) => {
    if (!window.confirm(`Eliminar la regla ${rule.codigo_regla}?`)) return;
    try {
      await deleteRecord('sys_unicidad_reglas', rule.id_regla);
      await loadRules();
    } catch (err) {
      setError(err.message);
    }
  };

  const tableColumns = useMemo(() => {
    if (!tableStructure?.columns) return [];
    return tableStructure.columns
      .filter((col) => !col.isAutoIncrement)
      .map((col) => col.name);
  }, [tableStructure]);

  const uniqueCount = rules.length;
  const activeCount = rules.filter((r) => r.activo).length;

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <Shield size={18} />
            <h2 style={{ margin: 0 }}>Administración de Unicidad</h2>
          </div>
          <div style={{ color: 'var(--text-secondary)', maxWidth: '780px' }}>
            Reglas visuales para definir qué campos no pueden duplicarse y cuál es su alcance por cliente, finca o núcleo.
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="btn btn-outline" onClick={loadRules}>
            <RefreshCw size={14} /> <span style={{ marginLeft: 6 }}>Refrescar</span>
          </button>
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={14} /> <span style={{ marginLeft: 6 }}>Nueva Regla</span>
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '14px' }}>
        <div style={{ minWidth: 240, flex: '1 1 240px' }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por código, tabla o mensaje..."
            style={{ width: '100%' }}
          />
        </div>
        <select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)}>
          <option value="">Todos los módulos</option>
          {modules.map((module) => (
            <option key={module} value={module}>{module}</option>
          ))}
        </select>
        <select value={tableFilter} onChange={(e) => setTableFilter(e.target.value)}>
          <option value="">Todas las tablas</option>
          {tables.map((t) => (
            <option key={t.TABLE_NAME} value={t.TABLE_NAME}>{t.TABLE_NAME}</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '16px' }}>
        <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '12px', background: 'var(--card-bg)' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Reglas totales</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{uniqueCount}</div>
        </div>
        <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '12px', background: 'var(--card-bg)' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Activas</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{activeCount}</div>
        </div>
        <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '12px', background: 'var(--card-bg)' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Tablas cubiertas</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{new Set(rules.map((r) => r.tabla)).size}</div>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: 12, padding: 12, border: '1px solid #ef4444', borderRadius: 8, color: '#b91c1c', background: '#fef2f2' }}>
          {error}
        </div>
      )}

      <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', background: 'var(--card-bg)' }}>
        <table className="data-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>Código</th>
              <th>Módulo</th>
              <th>Tabla</th>
              <th>Columnas únicas</th>
              <th>Ámbito</th>
              <th>Alcance</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: 24 }}>Cargando reglas...</td>
              </tr>
            ) : visibleRules.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: 24 }}>No hay reglas para mostrar.</td>
              </tr>
            ) : (
              visibleRules.map((rule) => (
                <tr key={rule.id_regla}>
                  <td><strong>{rule.codigo_regla}</strong></td>
                  <td>{rule.modulo}</td>
                  <td>{formatTableName(rule.tabla)}</td>
                  <td>{(rule.columnas_unicas || []).join(', ')}</td>
                  <td>{(rule.columnas_ambito || []).join(', ') || 'Global'}</td>
                  <td>{rule.alcance}</td>
                  <td>
                    <span style={{ padding: '4px 8px', borderRadius: 999, fontSize: 12, background: rule.activo ? '#dcfce7' : '#fee2e2', color: rule.activo ? '#166534' : '#991b1b' }}>
                      {rule.activo ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button className="btn btn-outline btn-sm" onClick={() => openEdit(rule)}>
                        <Pencil size={14} /> <span style={{ marginLeft: 6 }}>Editar</span>
                      </button>
                      <button className="btn btn-outline btn-sm btn-delete" onClick={() => handleDelete(rule)}>
                        <Trash2 size={14} /> <span style={{ marginLeft: 6 }}>Eliminar</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={formOpen}
        onClose={closeForm}
        title={formMode === 'edit' ? 'Editar regla de unicidad' : 'Nueva regla de unicidad'}
        footer={
          <>
            <button className="btn btn-outline" onClick={closeForm} disabled={saving}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
          <div>
            <label>Código de regla</label>
            <input value={form.codigo_regla} onChange={(e) => setForm((prev) => ({ ...prev, codigo_regla: e.target.value }))} />
          </div>
          <div>
            <label>Módulo</label>
            <input value={form.modulo} onChange={(e) => setForm((prev) => ({ ...prev, modulo: e.target.value }))} />
          </div>
          <div>
            <label>Tabla</label>
            <select
              value={form.tabla}
              onChange={(e) => setForm((prev) => ({ ...prev, tabla: e.target.value, columnas_unicas: [], columnas_ambito: [] }))}
              disabled={loadingTables}
            >
              <option value="">-- Selecciona --</option>
              {tables.map((t) => (
                <option key={t.TABLE_NAME} value={t.TABLE_NAME}>
                  {t.TABLE_NAME}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Alcance</label>
            <select value={form.alcance} onChange={(e) => setForm((prev) => ({ ...prev, alcance: e.target.value }))}>
              {scopeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label>Mensaje de error</label>
            <input value={form.mensaje_error} onChange={(e) => setForm((prev) => ({ ...prev, mensaje_error: e.target.value }))} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label>Descripción</label>
            <textarea rows={3} value={form.descripcion} onChange={(e) => setForm((prev) => ({ ...prev, descripcion: e.target.value }))} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={form.activo}
                onChange={(e) => setForm((prev) => ({ ...prev, activo: e.target.checked }))}
              />
              Regla activa
            </label>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Columnas únicas</div>
          {loadingStructure ? (
            <div>Cargando estructura de tabla...</div>
          ) : tableColumns.length === 0 ? (
            <div style={{ color: 'var(--text-secondary)' }}>Selecciona una tabla para ver sus columnas.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
              {tableColumns.map((col) => (
                <label key={col} style={{ display: 'flex', gap: 8, alignItems: 'center', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 10px' }}>
                  <input
                    type="checkbox"
                    checked={(form.columnas_unicas || []).includes(col)}
                    onChange={() => toggleColumn('columnas_unicas', col)}
                  />
                  {formatColumnName(col)}
                </label>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Columnas de ámbito</div>
          {tableColumns.length === 0 ? (
            <div style={{ color: 'var(--text-secondary)' }}>Opcional. Se usa cuando la unicidad depende de cliente, finca o núcleo.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
              {tableColumns.map((col) => (
                <label key={col} style={{ display: 'flex', gap: 8, alignItems: 'center', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 10px' }}>
                  <input
                    type="checkbox"
                    checked={(form.columnas_ambito || []).includes(col)}
                    onChange={() => toggleColumn('columnas_ambito', col)}
                  />
                  {formatColumnName(col)}
                </label>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
