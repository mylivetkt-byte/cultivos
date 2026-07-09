import React, { useState, useEffect } from 'react';
import { message } from 'antd';
import QuickAddModal from '../QuickAddModal';
import { authFetch } from '../../utils/api';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', background: 'white', color: 'red', border: '2px solid red', margin: '20px' }}>
          <h2>Algo salió mal en ConceptosNomina</h2>
          <pre>{this.state.error && this.state.error.toString()}</pre>
          <pre>{this.state.error && this.state.error.stack}</pre>
        </div>
      );
    }
    return this.props.children; 
  }
}

function ConceptosNominaInner() {
  const [conceptos, setConceptos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Todos');
  // Removed custom toast state; using Ant Design message instead

  
  const [modalState, setModalState] = useState({ isOpen: false, mode: 'add', pkValue: null, defaultValues: {} });
  const [sortConfig, setSortConfig] = useState({ key: 'codigo', direction: 'ascending' });

  const showToast = (msg) => {
    // Use Ant Design message based on prefix
    if (msg.startsWith('✅')) {
      message.success(msg);
    } else if (msg.startsWith('❌')) {
      message.error(msg);
    } else {
      message.info(msg);
    }
  };

  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  useEffect(() => {
    fetchConceptos();
  }, []);

  const fetchConceptos = async () => {
    try {
      const res = await authFetch('/api/rrhh/conceptos');
      const data = await res.json();
      setConceptos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching conceptos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar este concepto?')) return;
    try {
      const res = await authFetch(`/api/table/rrhh_conceptos_nomina/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('✅ Concepto eliminado');
        fetchConceptos();
      } else {
        showToast('❌ Error al eliminar');
      }
    } catch (err) {
      showToast('❌ Error de conexión al eliminar');
    }
  };

  const filtered = conceptos.filter(c => filter === 'Todos' ? true : c.tipo === filter);

  const sortedConceptos = React.useMemo(() => {
    let sortableItems = [...filtered];
    if (sortConfig && sortConfig.key) {
      sortableItems.sort((a, b) => {
        const aVal = a[sortConfig.key] || '';
        const bVal = b[sortConfig.key] || '';
        if (aVal < bVal) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aVal > bVal) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filtered, sortConfig]);

  if (loading) return <div className="loading-container"><div className="spinner"></div><span className="loading-text">Cargando catálogo...</span></div>;

  return (
    <div className="catalog-container">
      <div className="catalog-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>🏷️ Catálogo de Conceptos de Nómina</h2>
        <button 
          className="btn btn-primary" 
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          onClick={() => setModalState({ isOpen: true, mode: 'add', pkValue: null, defaultValues: {} })}
        >
          <span>+</span> Nuevo Concepto
        </button>
      </div>

      <div className="catalog-toolbar" style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
        <button onClick={() => setFilter('Todos')} className={`btn ${filter === 'Todos' ? 'btn-primary' : 'btn-outline'}`}>Todos</button>
        <button onClick={() => setFilter('Devengado')} className={`btn ${filter === 'Devengado' ? 'btn-primary' : 'btn-outline'}`} style={{ borderColor: 'var(--success)', color: filter === 'Devengado' ? '#fff' : 'var(--success)', backgroundColor: filter === 'Devengado' ? 'var(--success)' : 'transparent' }}>Devengados</button>
        <button onClick={() => setFilter('Deduccion')} className={`btn ${filter === 'Deduccion' ? 'btn-primary' : 'btn-outline'}`} style={{ borderColor: 'var(--danger)', color: filter === 'Deduccion' ? '#fff' : 'var(--danger)', backgroundColor: filter === 'Deduccion' ? 'var(--danger)' : 'transparent' }}>Deducciones</button>
      </div>

      <div className="table-container">
        {sortedConceptos.length === 0 ? (
          <p style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>No hay conceptos registrados para este filtro.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('codigo')} style={{ cursor: 'pointer' }}>
                  Código {sortConfig.key === 'codigo' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => handleSort('nombre')} style={{ cursor: 'pointer' }}>
                  Nombre del Concepto {sortConfig.key === 'nombre' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => handleSort('tipo')} style={{ cursor: 'pointer' }}>
                  Tipo {sortConfig.key === 'tipo' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => handleSort('naturaleza')} style={{ cursor: 'pointer' }}>
                  Naturaleza {sortConfig.key === 'naturaleza' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => handleSort('cuenta_contable')} style={{ cursor: 'pointer' }}>
                  Cta. Contable {sortConfig.key === 'cuenta_contable' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => handleSort('base_prestacional')} style={{ cursor: 'pointer' }}>
                  Base Prest. {sortConfig.key === 'base_prestacional' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                </th>
                <th style={{ textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sortedConceptos.map((c) => (
                <tr key={c.id_concepto}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{c.codigo}</td>
                  <td><strong>{c.nombre}</strong></td>
                  <td>
                    <span className={`badge ${c.tipo === 'Devengado' ? 'green' : 'red'}`}>
                      {c.tipo}
                    </span>
                  </td>
                  <td>{c.naturaleza}</td>
                  <td>{c.cuenta_contable}</td>
                  <td>{c.base_prestacional ? 'Sí' : 'No'}</td>
                  <td>
                    <div className="cell-actions" style={{ justifyContent: 'center' }}>
                      <button 
                        className="btn btn-outline btn-sm btn-edit" 
                        onClick={() => setModalState({ isOpen: true, mode: 'edit', pkValue: c.id_concepto, defaultValues: c })}
                        title="Editar"
                      >
                        ✏️ <span className="btn-text">Editar</span>
                      </button>
                      <button 
                        className="btn btn-outline btn-sm btn-delete" 
                        onClick={() => handleDelete(c.id_concepto)}
                        title="Eliminar"
                      >
                        🗑️ <span className="btn-text">Eliminar</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Quick Add/Edit Modal */}
      {modalState.isOpen && (
        <QuickAddModal
          isOpen={modalState.isOpen}
          onClose={() => setModalState({ ...modalState, isOpen: false })}
          tableName="rrhh_conceptos_nomina"
          mode={modalState.mode}
          pkValue={modalState.pkValue}
          defaultValues={modalState.defaultValues}
          onSuccess={() => {
            setModalState({ ...modalState, isOpen: false });
            fetchConceptos();
            showToast(`✅ Concepto ${modalState.mode === 'add' ? 'creado' : 'actualizado'}`);
          }}
        />
      )}

      {/* Toast UI removed; Ant Design message handles notifications */}
    </div>
  );
}

export default function ConceptosNomina() {
  return (
    <ErrorBoundary>
      <ConceptosNominaInner />
    </ErrorBoundary>
  );
}
