import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authFetch } from '../../utils/api';
import { Monitor, Plus, Edit, Trash2, FileText, Download, Save, X, Unlock, Link, Unlink } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { useSortableData } from '../../hooks/useSortableData';
import Pagination from '../Pagination';
import 'jspdf-autotable';

export default function POSCajas() {
  const { tenantId } = useAuth();
  const [cajas, setCajas] = useState([]);
  const [basculas, setBasculas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [resoluciones, setResoluciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  
  const [boundCajaId, setBoundCajaId] = useState(localStorage.getItem('pos_terminal_caja_id') || null);

  const handleLinkTerminal = (caja) => {
    if (window.confirm(`¿Estás seguro de vincular este computador físicamente a la caja "${caja.nombre}"?\n\nEsto significa que desde este equipo web solo se podrá facturar en esta caja.`)) {
      localStorage.setItem('pos_terminal_caja_id', caja.id_caja);
      localStorage.setItem('pos_terminal_caja_nombre', caja.nombre);
      setBoundCajaId(caja.id_caja.toString());
      alert(`Equipo vinculado correctamente a ${caja.nombre}.`);
    }
  };

  const handleUnlinkTerminal = () => {
    if (window.confirm('¿Deseas desvincular este equipo?')) {
      localStorage.removeItem('pos_terminal_caja_id');
      localStorage.removeItem('pos_terminal_caja_nombre');
      setBoundCajaId(null);
      alert('Equipo desvinculado.');
    }
  };

  const { items: sortedCajas, requestSort, getSortClass, getSortIndicator } = useSortableData(cajas, { key: 'consecutivo', direction: 'ascending' });

  const [formData, setFormData] = useState({
    nombre: '',
    id_bodega: 1,
    id_bascula: '',
    impresora: '',
    lector_codigo_barras: '',
    segunda_pantalla: false,
    activa: true,
    consecutivo: '',
    id_cajero: '',
    clave_cajero: '',
    cambiar_clave: false,
    id_resolucion: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setCurrentPage(1);
    try {
      const [resC, resB, resU, resR] = await Promise.all([
        authFetch(`/api/pos/cajas?tenantId=${tenantId || 1}`),
        authFetch(`/api/pos/basculas?tenantId=${tenantId || 1}`),
        authFetch(`/api/table/usuarios/data?tenantId=${tenantId || 1}&pageSize=500`),
        authFetch(`/api/sistemas/tenant/${tenantId || 1}/resoluciones`)
      ]);
      const dataC = await resC.json();
      const dataB = await resB.json();
      const dataU = await resU.json();
      const dataR = await resR.json();
      if (dataC.success) setCajas(dataC.data);
      if (dataB.success) setBasculas(dataB.data);
      if (dataU.data) setUsuarios(dataU.data);
      if (dataR.data) setResoluciones(dataR.data.filter(r => r.estado === 'Activa'));
    } catch (e) {
      console.error(e);
      alert('Error cargando datos de cajas');
    }
    setLoading(false);
  };

  const handleOpenModal = (caja = null) => {
    if (caja) {
      setEditingId(caja.id_caja);
      setFormData({
        nombre: caja.nombre || '',
        id_bodega: caja.id_bodega || 1,
        id_bascula: caja.id_bascula || '',
        impresora: caja.impresora || '',
        lector_codigo_barras: caja.lector_codigo_barras || '',
        dispositivo_pago: caja.dispositivo_pago || '',
        segunda_pantalla: caja.segunda_pantalla === 1,
        activa: caja.activa === 1,
        consecutivo: caja.consecutivo || '',
        id_cajero: caja.id_cajero || '',
        clave_cajero: '',
        cambiar_clave: caja.cambiar_clave === 1,
        id_resolucion: caja.id_resolucion || ''
      });
    } else {
      setEditingId(null);
      setFormData({
        nombre: '', id_bodega: 1, id_bascula: '', impresora: '', lector_codigo_barras: '', dispositivo_pago: '', segunda_pantalla: false, activa: true, consecutivo: '', id_cajero: '', clave_cajero: '', cambiar_clave: false, id_resolucion: ''
      });
    }
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData, tenantId: tenantId || 1 };
      const url = editingId ? `/api/pos/cajas/${editingId}` : '/api/pos/cajas';
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
        alert('Error guardando caja');
      }
    } catch (e) {
      console.error(e);
      alert('Error de red');
    }
  };

  const handleUnlock = async (id) => {
    if (!window.confirm('¿Desbloquear esta caja? Esto reseteará los intentos fallidos a 0.')) return;
    try {
      const response = await authFetch(`/api/pos/cajas/${id}/desbloquear`, { method: 'POST' });
      const res = await response.json();
      if (res.success) {
        alert('Caja desbloqueada correctamente');
        loadData();
      } else {
        alert(res.error || 'Error desbloqueando caja');
      }
    } catch (e) {
      console.error(e);
      alert('Error desbloqueando caja');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar esta caja?')) return;
    try {
      const response = await authFetch(`/api/pos/cajas/${id}`, { method: 'DELETE' });
      const res = await response.json();
      if (res.success) loadData();
    } catch (e) {
      console.error(e);
      alert('Error eliminando caja');
    }
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(cajas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cajas");
    XLSX.writeFile(wb, "cajas_pos.xlsx");
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Reporte de Cajas POS", 14, 15);
    const tableData = cajas.map(c => [c.nombre, c.bascula_nombre || 'N/A', c.impresora || 'N/A', c.lector_codigo_barras || 'N/A', c.segunda_pantalla ? 'Sí' : 'No', c.activa ? 'Sí' : 'No']);
    doc.autoTable({
      head: [['Nombre', 'Báscula Asignada', 'Impresora', 'Lector', 'Display Secundario', 'Activa']],
      body: tableData,
      startY: 20,
    });
    doc.save("cajas_pos.pdf");
  };

  return (
    <div style={{ padding: '20px', color: '#fff', background: '#0f172a', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
          <Monitor className="text-violet-400" /> Configuración de Cajas (POS)
        </h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={exportPDF} style={{ padding: '8px 12px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <FileText size={16}/> PDF
          </button>
          <button onClick={exportExcel} style={{ padding: '8px 12px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Download size={16}/> Excel
          </button>
          <button onClick={() => handleOpenModal()} style={{ padding: '8px 12px', background: '#38bdf8', color: '#0f172a', fontWeight: 'bold', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Plus size={16}/> Nueva Caja
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '20px' }}>Cargando cajas...</div>
      ) : (
        <div style={{ background: '#1e293b', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#0f172a', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <th onClick={() => requestSort('consecutivo')} className={`cursor-pointer select-none p-3 hover:text-white ${getSortClass('consecutivo')}`}># {getSortIndicator('consecutivo')}</th>
                <th onClick={() => requestSort('nombre')} className={`cursor-pointer select-none p-3 hover:text-white ${getSortClass('nombre')}`}>Nombre Caja {getSortIndicator('nombre')}</th>
                <th onClick={() => requestSort('cajero_nombre')} className={`cursor-pointer select-none p-3 hover:text-white ${getSortClass('cajero_nombre')}`}>Cajero {getSortIndicator('cajero_nombre')}</th>
                <th onClick={() => requestSort('bascula_nombre')} className={`cursor-pointer select-none p-3 hover:text-white ${getSortClass('bascula_nombre')}`}>Báscula Asignada {getSortIndicator('bascula_nombre')}</th>
                <th onClick={() => requestSort('impresora')} className={`cursor-pointer select-none p-3 hover:text-white ${getSortClass('impresora')}`}>Impresora TKT {getSortIndicator('impresora')}</th>
                <th onClick={() => requestSort('lector_codigo_barras')} className={`cursor-pointer select-none p-3 hover:text-white ${getSortClass('lector_codigo_barras')}`}>Lector Barcode {getSortIndicator('lector_codigo_barras')}</th>
                <th onClick={() => requestSort('dispositivo_pago')} className={`cursor-pointer select-none p-3 hover:text-white ${getSortClass('dispositivo_pago')}`}>Datáfono {getSortIndicator('dispositivo_pago')}</th>
                <th onClick={() => requestSort('segunda_pantalla')} className={`cursor-pointer select-none p-3 hover:text-white ${getSortClass('segunda_pantalla')}`}>Doble Pantalla {getSortIndicator('segunda_pantalla')}</th>
                <th onClick={() => requestSort('activa')} className={`cursor-pointer select-none p-3 hover:text-white ${getSortClass('activa')}`}>Estado {getSortIndicator('activa')}</th>
                <th style={{ padding: '12px' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sortedCajas.length === 0 ? (
                <tr><td colSpan="9" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>No hay cajas configuradas</td></tr>
              ) : sortedCajas.slice((currentPage - 1) * 20, currentPage * 20).map(c => (
                <tr key={c.id_caja} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }} className="hover:bg-sky-500/5 transition-colors">
                  <td style={{ padding: '12px', fontWeight: 'bold', color: '#38bdf8' }}>{c.consecutivo || '-'}</td>
                  <td style={{ padding: '12px', fontWeight: 'bold' }}>{c.nombre}</td>
                  <td style={{ padding: '12px' }}>{c.cajero_nombre ? `${c.cajero_nombre} ${c.cajero_apellidos || ''}` : <span style={{color: '#64748b'}}>Sin cajero</span>}</td>
                  <td style={{ padding: '12px' }}>{c.bascula_nombre || <span style={{color: '#64748b'}}>Sin báscula</span>}</td>
                  <td style={{ padding: '12px' }}>{c.impresora || '-'}</td>
                  <td style={{ padding: '12px', fontSize: '13px' }}>{c.lector_codigo_barras || '-'}</td>
                  <td style={{ padding: '12px', fontSize: '13px' }}>{c.dispositivo_pago || '-'}</td>
                  <td style={{ padding: '12px' }}>{c.segunda_pantalla ? 'Sí' : 'No'}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '12px', background: c.activa ? 'rgba(22,163,74,0.2)' : 'rgba(220,38,38,0.2)', color: c.activa ? '#4ade80' : '#f87171' }}>
                      {c.activa ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td style={{ padding: '12px', display: 'flex', gap: '10px' }}>
                    <button onClick={() => handleOpenModal(c)} style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer' }} title="Editar Caja"><Edit size={18} /></button>
                    {!!c.bloqueada && (
                      <button onClick={() => handleUnlock(c.id_caja)} style={{ background: 'none', border: 'none', color: '#f59e0b', cursor: 'pointer' }} title="Desbloquear Caja"><Unlock size={18} /></button>
                    )}
                    {boundCajaId === c.id_caja.toString() ? (
                      <button onClick={handleUnlinkTerminal} style={{ background: 'rgba(16,185,129,0.2)', border: '1px solid #10b981', color: '#10b981', cursor: 'pointer', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }} title="Equipo vinculado a esta caja. Clic para desvincular.">
                        <Unlink size={14} /> Equipo Vinculado
                      </button>
                    ) : (
                      <button onClick={() => handleLinkTerminal(c)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }} title="Vincular este computador a esta caja"><Link size={18} /></button>
                    )}
                    <button onClick={() => handleDelete(c.id_caja)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }} title="Eliminar Caja"><Trash2 size={18} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {sortedCajas.length > 0 && (
            <Pagination 
              currentPage={currentPage}
              totalItems={sortedCajas.length}
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
              <h3 style={{ margin: 0, color: '#fff' }}>{editingId ? 'Editar Caja' : 'Nueva Caja POS'}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20}/></button>
            </div>
            <form onSubmit={handleSave} style={{ padding: '20px' }}>
              <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', color: '#cbd5e1', marginBottom: '5px' }}>Impresora TKT</label>
                  <input type="text" list="impresoras_list" value={formData.impresora} onChange={e => setFormData({...formData, impresora: e.target.value})} placeholder="Ej: POS-80, LPT1, Generic" style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px' }}/>
                  <datalist id="impresoras_list">
                    <option value="Generic / Text Only" />
                    <option value="POS-80" />
                    <option value="POS-58" />
                    <option value="Zebra ZD420" />
                    <option value="Microsoft Print to PDF" />
                  </datalist>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', color: '#cbd5e1', marginBottom: '5px' }}>Lector Barcode (Puerto/Nombre)</label>
                  <input type="text" list="lectores_list" value={formData.lector_codigo_barras} onChange={e => setFormData({...formData, lector_codigo_barras: e.target.value})} placeholder="Ej: COM1, USB, Teclado" style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px' }}/>
                  <datalist id="lectores_list">
                    <option value="Emulador de Teclado (USB)" />
                    <option value="COM1" />
                    <option value="COM2" />
                    <option value="COM3" />
                    <option value="COM4" />
                  </datalist>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', color: '#cbd5e1', marginBottom: '5px' }}>Consecutivo *</label>
                  <input required type="number" value={formData.consecutivo} onChange={e => setFormData({...formData, consecutivo: e.target.value})} placeholder="Ej: 1" style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px' }}/>
                </div>
                <div style={{ flex: 2 }}>
                  <label style={{ display: 'block', fontSize: '13px', color: '#cbd5e1', marginBottom: '5px' }}>Nombre (Identificador Lógico) *</label>
                  <input required type="text" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} placeholder="Ej: Caja Principal" style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px' }}/>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', color: '#cbd5e1', marginBottom: '5px' }}>Cajero Asignado</label>
                  <select value={formData.id_cajero} onChange={e => setFormData({...formData, id_cajero: e.target.value})} style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px' }}>
                    <option value="">Ninguno</option>
                    {usuarios.map(u => (
                      <option key={u.id_usuario} value={u.id_usuario}>{u.username} - {u.nombres} {u.apellidos}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', color: '#cbd5e1', marginBottom: '5px' }}>Clave de Acceso al POS</label>
                  <input type="password" value={formData.clave_cajero} onChange={e => setFormData({...formData, clave_cajero: e.target.value})} placeholder={editingId ? "Dejar vacío para no cambiar" : "PIN o Contraseña"} style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px' }}/>
                </div>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#cbd5e1', fontSize: '13px' }}>
                  <input type="checkbox" checked={formData.cambiar_clave} onChange={e => setFormData({...formData, cambiar_clave: e.target.checked})} />
                  Forzar al cajero a cambiar esta clave en su próximo inicio de sesión
                </label>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#cbd5e1', marginBottom: '5px' }}>Resolución DIAN</label>
                <select value={formData.id_resolucion} onChange={e => setFormData({...formData, id_resolucion: e.target.value})} style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px' }}>
                  <option value="">Ninguna (Facturación POS Interna)</option>
                  {resoluciones.map(r => (
                    <option key={r.id_resolucion} value={r.id_resolucion}>{r.prefijo} - {r.numero_resolucion}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#cbd5e1', marginBottom: '5px' }}>Báscula Asignada</label>
                <select value={formData.id_bascula} onChange={e => setFormData({...formData, id_bascula: e.target.value})} style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px' }}>
                  <option value="">Ninguna</option>
                  {basculas.filter(b => b.activa).map(b => (
                    <option key={b.id_bascula} value={b.id_bascula}>{b.nombre} ({b.modelo_nombre || 'Genérica'})</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#cbd5e1', marginBottom: '5px' }}>Dispositivo para Pago (Datáfono)</label>
                <select value={formData.dispositivo_pago} onChange={e => setFormData({...formData, dispositivo_pago: e.target.value})} style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px' }}>
                  <option value="">Ninguno</option>
                  <option value="Bold">Bold</option>
                  <option value="SumUp">SumUp</option>
                  <option value="Credibanco">Credibanco</option>
                  <option value="Redeban">Redeban</option>
                  <option value="Mercado Pago (Point)">Mercado Pago (Point)</option>
                  <option value="Treinta">Treinta</option>
                  <option value="Nequi / DaviPlata (QR)">Nequi / DaviPlata (QR)</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#e2e8f0', cursor: 'pointer' }}>
                  <input type="checkbox" checked={formData.segunda_pantalla} onChange={e => setFormData({...formData, segunda_pantalla: e.target.checked})} style={{ width: '16px', height: '16px' }}/>
                  Activar 2da Pantalla (Publi)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#e2e8f0', cursor: 'pointer' }}>
                  <input type="checkbox" checked={formData.activa} onChange={e => setFormData({...formData, activa: e.target.checked})} style={{ width: '16px', height: '16px' }}/>
                  Caja Activa
                </label>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#cbd5e1', borderRadius: '4px', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ padding: '8px 16px', background: '#38bdf8', color: '#0f172a', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Save size={16}/> Guardar Caja
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
