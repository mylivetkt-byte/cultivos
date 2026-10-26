import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authFetch } from '../../utils/api';
import { Scale, Plus, Edit, Trash2, FileText, Download, Save, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { downloadExcelWorkbook } from '../../utils/exportExcel';
import { getJsPDFConstructor, runAutoTable, downloadPdfDoc } from '../../utils/exportPdf';
import { useSortableData } from '../../hooks/useSortableData';
import Pagination from '../Pagination';

export default function POSBasculas() {
  const { tenantId } = useAuth();
  const [basculas, setBasculas] = useState([]);
  const [modelos, setModelos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const { items: sortedBasculas, requestSort, getSortClass, getSortIndicator } = useSortableData(basculas, { key: 'codigo', direction: 'ascending' });

  const [formData, setFormData] = useState({
    nombre: '',
    codigo: '',
    id_modelo: '',
    tipo_conexion: 'RS232',
    puerto_com: 'COM1',
    activa: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setCurrentPage(1);
    try {
      const [resB, resM] = await Promise.all([
        authFetch(`/api/pos/basculas?tenantId=${tenantId || 1}`).then(res => res.json()),
        authFetch('/api/pos/modelos-basculas').then(res => res.json())
      ]);
      if (resB.success) setBasculas(resB.data);
      if (resM.success) setModelos(resM.data);
    } catch (e) {
      console.error(e);
      alert('Error cargando básculas');
    }
    setLoading(false);
  };

  const handleOpenModal = (bascula = null) => {
    if (bascula) {
      setEditingId(bascula.id_bascula);
      setFormData({
        nombre: bascula.nombre || '',
        codigo: bascula.codigo || '',
        id_modelo: bascula.id_modelo || '',
        tipo_conexion: bascula.tipo_conexion || 'RS232',
        puerto_com: bascula.puerto_com || 'COM1',
        activa: bascula.activa === 1
      });
    } else {
      setEditingId(null);
      setFormData({
        nombre: '', codigo: '', id_modelo: '', tipo_conexion: 'RS232', puerto_com: 'COM1', activa: true
      });
    }
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData, tenantId: tenantId || 1 };
      const url = editingId ? `/api/pos/basculas/${editingId}` : '/api/pos/basculas';
      const method = editingId ? 'PUT' : 'POST';
      
      const response = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const res = await response.json();
      
      if (res.success) {
        setShowModal(false);
        loadData();
      } else {
        alert('Error guardando báscula');
      }
    } catch (e) {
      console.error(e);
      alert('Error de red');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar báscula?')) return;
    try {
      const response = await authFetch(`/api/pos/basculas/${id}`, { method: 'DELETE' });
      const res = await response.json();
      if (res.success) loadData();
    } catch (e) {
      console.error(e);
      alert('Error eliminando báscula');
    }
  };

  const exportExcel = () => {
    try {
      const ws = XLSX.utils.json_to_sheet(basculas);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Básculas");
      downloadExcelWorkbook(wb, "basculas_pos.xlsx");
    } catch (e) {
      console.error(e);
      alert('Error exportando Excel: ' + e.message);
    }
  };

  const exportPDF = () => {
    try {
      const PDFConstructor = getJsPDFConstructor();
      const doc = new PDFConstructor();
      doc.text("Reporte de Básculas POS", 14, 15);
      const tableData = basculas.map(b => [b.codigo, b.nombre, b.modelo_nombre || 'N/A', b.tipo_conexion, b.puerto_com, b.activa ? 'Sí' : 'No']);
      runAutoTable(doc, {
        head: [['Código', 'Nombre', 'Modelo', 'Conexión', 'Puerto', 'Activa']],
        body: tableData,
        startY: 20,
      });
      downloadPdfDoc(doc, "basculas_pos.pdf");
    } catch (e) {
      console.error(e);
      alert('Error exportando PDF: ' + e.message);
    }
  };

  return (
    <div style={{ padding: '20px', color: '#fff', background: '#0f172a', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
          <Scale className="text-blue-400" /> Configuración de Básculas
        </h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={exportPDF} style={{ padding: '8px 12px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <FileText size={16}/> PDF
          </button>
          <button onClick={exportExcel} style={{ padding: '8px 12px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Download size={16}/> Excel
          </button>
          <button onClick={() => handleOpenModal()} style={{ padding: '8px 12px', background: '#38bdf8', color: '#0f172a', fontWeight: 'bold', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Plus size={16}/> Nueva Báscula
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '20px' }}>Cargando básculas...</div>
      ) : (
        <div style={{ background: '#1e293b', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#0f172a', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <th onClick={() => requestSort('codigo')} className={`cursor-pointer select-none p-3 hover:text-white ${getSortClass('codigo')}`}>Código {getSortIndicator('codigo')}</th>
                <th onClick={() => requestSort('nombre')} className={`cursor-pointer select-none p-3 hover:text-white ${getSortClass('nombre')}`}>Nombre {getSortIndicator('nombre')}</th>
                <th onClick={() => requestSort('modelo_nombre')} className={`cursor-pointer select-none p-3 hover:text-white ${getSortClass('modelo_nombre')}`}>Modelo {getSortIndicator('modelo_nombre')}</th>
                <th onClick={() => requestSort('tipo_conexion')} className={`cursor-pointer select-none p-3 hover:text-white ${getSortClass('tipo_conexion')}`}>Conexión {getSortIndicator('tipo_conexion')}</th>
                <th onClick={() => requestSort('puerto_com')} className={`cursor-pointer select-none p-3 hover:text-white ${getSortClass('puerto_com')}`}>Puerto {getSortIndicator('puerto_com')}</th>
                <th onClick={() => requestSort('activa')} className={`cursor-pointer select-none p-3 hover:text-white ${getSortClass('activa')}`}>Estado {getSortIndicator('activa')}</th>
                <th style={{ padding: '12px' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sortedBasculas.length === 0 ? (
                <tr><td colSpan="7" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>No hay básculas configuradas</td></tr>
              ) : sortedBasculas.slice((currentPage - 1) * 20, currentPage * 20).map(b => (
                <tr key={b.id_bascula} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }} className="hover:bg-sky-500/5 transition-colors">
                  <td style={{ padding: '12px' }}>{b.codigo}</td>
                  <td style={{ padding: '12px' }}>{b.nombre}</td>
                  <td style={{ padding: '12px' }}>{b.modelo_nombre || 'Desconocido'}</td>
                  <td style={{ padding: '12px' }}>{b.tipo_conexion}</td>
                  <td style={{ padding: '12px' }}>{b.puerto_com}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '12px', background: b.activa ? 'rgba(22,163,74,0.2)' : 'rgba(220,38,38,0.2)', color: b.activa ? '#4ade80' : '#f87171' }}>
                      {b.activa ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td style={{ padding: '12px', display: 'flex', gap: '10px' }}>
                    <button onClick={() => handleOpenModal(b)} style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer' }}><Edit size={18} /></button>
                    <button onClick={() => handleDelete(b.id_bascula)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={18} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {sortedBasculas.length > 0 && (
            <Pagination 
              currentPage={currentPage}
              totalItems={sortedBasculas.length}
              pageSize={20}
              onPageChange={setCurrentPage}
            />
          )}
        </div>
      )}

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div style={{ background: '#1e293b', width: '500px', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ background: '#0f172a', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: '#fff' }}>{editingId ? 'Editar Báscula' : 'Nueva Báscula'}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20}/></button>
            </div>
            <form onSubmit={handleSave} style={{ padding: '20px' }}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#cbd5e1', marginBottom: '5px' }}>Código *</label>
                <input required type="text" value={formData.codigo} onChange={e => setFormData({...formData, codigo: e.target.value})} style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px' }}/>
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#cbd5e1', marginBottom: '5px' }}>Nombre / Ubicación *</label>
                <input required type="text" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px' }}/>
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#cbd5e1', marginBottom: '5px' }}>Modelo Preconfigurado *</label>
                <select required value={formData.id_modelo} onChange={e => setFormData({...formData, id_modelo: e.target.value})} style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px' }}>
                  <option value="">Seleccione un modelo...</option>
                  {modelos.map(m => (
                    <option key={m.id_modelo} value={m.id_modelo}>{m.marca} {m.modelo}</option>
                  ))}
                </select>
                <small style={{ color: '#94a3b8', fontSize: '11px', marginTop: '4px', display: 'block' }}>El modelo autoconfigurará el baudrate, paridad y comandos.</small>
              </div>
              <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', color: '#cbd5e1', marginBottom: '5px' }}>Tipo de Conexión</label>
                  <select value={formData.tipo_conexion} onChange={e => setFormData({...formData, tipo_conexion: e.target.value})} style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px' }}>
                    <option value="RS232">RS232 (Serial)</option>
                    <option value="USB">USB</option>
                    <option value="TCP/IP">TCP/IP</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', color: '#cbd5e1', marginBottom: '5px' }}>Puerto (Ej: COM1)</label>
                  <input type="text" value={formData.puerto_com} onChange={e => setFormData({...formData, puerto_com: e.target.value})} style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px' }}/>
                </div>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#e2e8f0', cursor: 'pointer' }}>
                  <input type="checkbox" checked={formData.activa} onChange={e => setFormData({...formData, activa: e.target.checked})} style={{ width: '16px', height: '16px' }}/>
                  Báscula Activa
                </label>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#cbd5e1', borderRadius: '4px', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ padding: '8px 16px', background: '#38bdf8', color: '#0f172a', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Save size={16}/> Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
