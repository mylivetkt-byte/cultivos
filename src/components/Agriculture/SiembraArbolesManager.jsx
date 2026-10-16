import React, { useState, useEffect } from 'react';
import '../dashboard.css';
import { authFetch } from '../../utils/api';
import PremiumSelect from '../PremiumSelect';
import ExportButtons from '../ExportButtons';
import { useAuth } from '../../context/AuthContext';

const SiembraArbolesManager = () => {
  const { tenantId } = useAuth();
  const [loading, setLoading] = useState(true);
  
  // Catalogs for lookup and filtering
  const [lotes, setLotes] = useState([]);
  const [variedades, setVariedades] = useState([]);
  
  // Filters
  const [filters, setFilters] = useState({
    lote: '',
    estado_salud: '',
    variedad: '',
    codigo: ''
  });

  const [processedData, setProcessedData] = useState([]);
  const [hasProcessed, setHasProcessed] = useState(false);

  // Modal State para Novedades
  const [showModal, setShowModal] = useState(false);
  const [codigoBusqueda, setCodigoBusqueda] = useState('');
  const [buscandoArbol, setBuscandoArbol] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState('');
  
  const [selectedTree, setSelectedTree] = useState(null);
  
  // Casos Sanitarios State
  const [casos, setCasos] = useState([]);
  const [loadingCasos, setLoadingCasos] = useState(false);
  
  // Formulario Nueva Novedad
  const [showCasoForm, setShowCasoForm] = useState(false);
  const [newCaso, setNewCaso] = useState({
    problema_detectado: '',
    severidad: 'Media',
    tratamiento_formulado: '',
    estado_caso: 'En Tratamiento'
  });
  const [isSavingCaso, setIsSavingCaso] = useState(false);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    if (tenantId) {
      loadCatalogs();
    }
  }, [tenantId]);

  const loadCatalogs = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const resLotes = await authFetch(`/api/table/lotes/data?tenantId=${tenantId}&pageSize=500`, { headers });
      const resVariedades = await authFetch(`/api/table/variedades/data?pageSize=500`, { headers });
      
      const dataLotes = await resLotes.json();
      const dataVariedades = await resVariedades.json();

      setLotes(dataLotes.data || []);
      setVariedades(dataVariedades.data || []);
    } catch (err) {
      console.error('Error loading catalogs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      let url = `/api/table/siembra_arboles/data?tenantId=${tenantId}&pageSize=1000`;
      
      const response = await authFetch(url, { headers });
      const data = await response.json();
      let records = data.data || [];
      
      if (filters.lote) {
        const loteObj = lotes.find(l => l.nombre === filters.lote);
        if (loteObj) records = records.filter(r => r.id_lote === loteObj.id_lote);
      }
      if (filters.estado_salud) records = records.filter(r => r.estado_salud === filters.estado_salud);
      if (filters.variedad) records = records.filter(r => (r.variedad || '').toLowerCase().includes(filters.variedad.toLowerCase()));
      if (filters.codigo) records = records.filter(r => (r.codigo_arbol || '').toLowerCase().includes(filters.codigo.toLowerCase()));

      setProcessedData(records);
      setHasProcessed(true);
    } catch (err) {
      console.error('Error procesando arboles:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCasos = async (idArbol) => {
    try {
      setLoadingCasos(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const res = await authFetch(`/api/table/arboles_casos_sanitarios/data?tenantId=${tenantId}&pageSize=100`, { headers });
      const data = await res.json();
      const casosArbol = (data.data || []).filter(c => c.id_arbol === idArbol);
      setCasos(casosArbol);
    } catch (err) {
      console.error('Error loading casos:', err);
    } finally {
      setLoadingCasos(false);
    }
  };

  const openReportModal = () => {
    setCodigoBusqueda('');
    setSelectedTree(null);
    setCasos([]);
    setErrorBusqueda('');
    setShowCasoForm(false);
    setShowModal(true);
  };

  const openTreeDetails = (tree) => {
    setCodigoBusqueda(tree.codigo_arbol);
    setSelectedTree(tree);
    setErrorBusqueda('');
    setShowCasoForm(false);
    setImagePreview(null);
    setShowModal(true);
    loadCasos(tree.id_arbol);
  };

  const handleSearchTree = async (e) => {
    if (e) e.preventDefault();
    if (!codigoBusqueda.trim()) return;
    
    setBuscandoArbol(true);
    setErrorBusqueda('');
    
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      // Buscar en todos los arboles (podríamos hacer un endpoint de búsqueda específico, pero esto funciona)
      const url = `/api/table/siembra_arboles/data?tenantId=${tenantId}&pageSize=10000`;
      const response = await authFetch(url, { headers });
      const data = await response.json();
      const records = data.data || [];
      
      const term = codigoBusqueda.trim().toLowerCase();
      const found = records.find(r => 
        (r.codigo_arbol && r.codigo_arbol.toLowerCase() === term) || 
        (r.codigo_qr && r.codigo_qr.toLowerCase() === term)
      );
      
      if (found) {
        setSelectedTree(found);
        loadCasos(found.id_arbol);
      } else {
        setSelectedTree(null);
        setErrorBusqueda('No se encontró ningún árbol con esa Placa o Código QR.');
        setTimeout(() => setErrorBusqueda(''), 3500); // Desaparece solo en 3.5s
      }
    } catch (err) {
      console.error(err);
      setErrorBusqueda('Error de conexión al buscar el árbol.');
    } finally {
      setBuscandoArbol(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Check file size (max 5MB to avoid overwhelming the server/AI quickly)
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen es demasiado grande. Máximo 5MB.');
      return;
    }
    
    setIsAnalyzingImage(true);
    const reader = new FileReader();
    
    reader.onloadend = async () => {
      const base64String = reader.result;
      setImagePreview(base64String);
      
      try {
        const token = localStorage.getItem('token');
        const b64Data = base64String.split(',')[1];
        
        const res = await authFetch(`/api/ia/analizar_foto_novedad`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ image_base64: b64Data, mime_type: file.type })
        });
        
        const data = await res.json();
        if (data.success) {
          setNewCaso(prev => ({
            ...prev,
            problema_detectado: data.problema_detectado || prev.problema_detectado,
            severidad: data.severidad || 'Media',
            tratamiento_formulado: data.tratamiento_sugerido || prev.tratamiento_formulado
          }));
          // We can also store the scientific name locally if we want, but we'll let handleSaveCaso re-classify if needed
          // Or just save it in state to skip re-classification. For simplicity, we just use the UI fields.
        } else {
          alert('Error de IA: ' + data.error);
        }
      } catch (err) {
        console.error(err);
        alert('Error al analizar la imagen.');
      } finally {
        setIsAnalyzingImage(false);
      }
    };
    
    reader.readAsDataURL(file);
  };

  const handleSaveCaso = async () => {
    if (!newCaso.problema_detectado) return alert("El problema detectado es requerido");
    try {
      setIsSavingCaso(true);
      const token = localStorage.getItem('token');
      
      // 1. Llamar a la IA para clasificar científicamente
      let nombre_cientifico = null;
      try {
        const aiRes = await authFetch(`/api/ia/clasificar_plaga`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ diagnostico: newCaso.problema_detectado })
        });
        const aiData = await aiRes.json();
        if (aiData.success && aiData.nombre_cientifico) {
          nombre_cientifico = aiData.nombre_cientifico;
        }
      } catch (aiErr) {
        console.error('Error con IA:', aiErr);
      }

      // 2. Guardar el caso en BD
      const payload = {
        ...newCaso,
        id_tenant: tenantId,
        id_arbol: selectedTree.id_arbol,
        fecha_reporte: new Date().toISOString().split('T')[0],
        nombre_cientifico_ia: nombre_cientifico
      };
      
      await authFetch(`/api/table/arboles_casos_sanitarios`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      // 3. Update tree health status
      await authFetch(`/api/table/siembra_arboles/${selectedTree.id_arbol}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ estado_salud: 'Enfermo' })
      });
      
      setSelectedTree(prev => ({...prev, estado_salud: 'Enfermo'}));
      setShowCasoForm(false);
      setImagePreview(null);
      setNewCaso({
        problema_detectado: '',
        severidad: 'Media',
        tratamiento_formulado: '',
        estado_caso: 'En Tratamiento'
      });
      loadCasos(selectedTree.id_arbol);
      
      // Actualizar la grilla de fondo si está cargada
      if (hasProcessed) {
        handleProcess(); 
      }
      
      // 4. Disparar alerta de WhatsApp al equipo
      try {
        const username = localStorage.getItem('username') || 'Usuario Sistema';
        await authFetch(`/api/whatsapp/alertar-novedad-equipo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ 
            lote: getLoteName(selectedTree.id_lote),
            codigo_arbol: selectedTree.codigo_arbol,
            diagnostico: newCaso.problema_detectado,
            nombre_cientifico: nombre_cientifico,
            tratamiento: newCaso.tratamiento_formulado,
            reportado_por: username
          })
        });
      } catch (waErr) {
        console.error('Error enviando alerta WA:', waErr);
      }

    } catch (err) {
      console.error(err);
      alert('Error al crear el caso: ' + err.message);
    } finally {
      setIsSavingCaso(false);
    }
  };

  const handleDeleteTree = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar este árbol permanentemente?')) return;
    try {
      const token = localStorage.getItem('token');
      await authFetch(`/api/table/siembra_arboles/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      handleProcess();
    } catch (err) {
      console.error(err);
      alert('Error al eliminar');
    }
  };

  const getLoteName = (id) => {
    const l = lotes.find(l => l.id_lote === id);
    return l ? l.nombre : id;
  };
  
  const getEdad = (fecha_siembra, ano_siembra) => {
    if (fecha_siembra) {
        const d1 = new Date(fecha_siembra);
        const d2 = new Date();
        let diff = (d2.getTime() - d1.getTime()) / 1000;
        diff /= (60 * 60 * 24 * 365.25);
        return Math.abs(Math.round(diff * 10) / 10) + ' años';
    }
    if (ano_siembra) {
        return (new Date().getFullYear() - ano_siembra) + ' años';
    }
    return 'Desconocida';
  };

  const exportColumns = [
    { header: 'Código Árbol', getter: a => a.codigo_arbol },
    { header: 'Lote', getter: a => getLoteName(a.id_lote) },
    { header: 'Variedad', getter: a => a.variedad || 'N/A' },
    { header: 'Fecha Siembra', getter: a => a.fecha_siembra ? new Date(a.fecha_siembra).toLocaleDateString() : (a.ano_siembra || 'N/A') },
    { header: 'Estado de Salud', getter: a => a.estado_salud || 'Desconocido' },
    { header: 'Coordenadas (GPS)', getter: a => {
        if (!a.gps_punto) return 'No registrado';
        if (typeof a.gps_punto === 'object' && a.gps_punto.coordinates) return `${a.gps_punto.coordinates[0]}, ${a.gps_punto.coordinates[1]}`;
        if (typeof a.gps_punto === 'string') return a.gps_punto;
        return 'No registrado';
    }}
  ];

  return (
    <div className="dashboard-container">
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Control de Salud por Arbol</h1>
          <p style={{ color: '#9CA3AF', fontSize: '1.05em' }}>Inventario y seguimiento de estado de salud por individuo</p>
        </div>
        <button className="btn btn-primary" onClick={openReportModal} style={{ padding: '10px 20px', fontSize: '1.1em', fontWeight: 'bold' }}>
          + REPORTAR NOVEDAD
        </button>
      </div>

      <div className="card" style={{ marginBottom: '25px', padding: '0', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
        <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '15px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.2em' }}>🔍</span>
          <h4 style={{ margin: 0, color: '#93C5FD', fontSize: '1.1em' }}>Buscador de Árboles</h4>
        </div>
        
        <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', background: 'rgba(0,0,0,0.15)' }}>
          <div>
            <label style={{ fontSize: '0.95em', fontWeight: 'bold', color: '#F3F4F6', marginBottom: '8px', display: 'block' }}>Lote de Siembra</label>
            <PremiumSelect
              options={lotes.map(l => ({ value: l.nombre, label: l.nombre }))}
              value={filters.lote}
              onChange={e => setFilters({...filters, lote: e.target.value})}
              placeholder="-- Todos los Lotes --"
            />
          </div>
          <div>
            <label style={{ fontSize: '0.95em', fontWeight: 'bold', color: '#F3F4F6', marginBottom: '8px', display: 'block' }}>Estado de Salud</label>
            <PremiumSelect
              options={[
                { value: 'Sano', label: 'Sano' },
                { value: 'Enfermo', label: 'Enfermo' },
                { value: 'Tratamiento', label: 'En Tratamiento' },
                { value: 'Muerto', label: 'Muerto' },
                { value: 'Desaparecido', label: 'Desaparecido' }
              ]}
              value={filters.estado_salud}
              onChange={e => setFilters({...filters, estado_salud: e.target.value})}
              placeholder="-- Todos los Estados --"
            />
          </div>
          <div>
            <label style={{ fontSize: '0.95em', fontWeight: 'bold', color: '#F3F4F6', marginBottom: '8px', display: 'block' }}>Variedad</label>
            <PremiumSelect
              options={variedades.map(v => ({ value: v.nombre, label: v.nombre }))}
              value={filters.variedad}
              onChange={e => setFilters({...filters, variedad: e.target.value})}
              placeholder="-- Todas las Variedades --"
            />
          </div>
          <div>
            <label style={{ fontSize: '0.95em', fontWeight: 'bold', color: '#F3F4F6', marginBottom: '8px', display: 'block' }}>Placa o Código del Árbol</label>
            <div style={{ position: 'relative' }}>
              <input 
                type="text" 
                className="form-control" 
                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '10px 10px 10px 35px', fontSize: '1rem', borderRadius: '6px', width: '100%' }} 
                placeholder="Escanee QR o digite..."
                value={filters.codigo} 
                onChange={e => setFilters({...filters, codigo: e.target.value})} 
              />
              <span style={{ position: 'absolute', left: '10px', top: '10px', opacity: 0.5 }}>📷</span>
            </div>
          </div>
        </div>
        
        <div style={{ padding: '15px 20px', background: 'rgba(0,0,0,0.25)', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <ExportButtons data={processedData} columns={exportColumns} filename="Reporte_Arboles" />
          </div>
          <button className="btn btn-primary" onClick={handleProcess} style={{ padding: '10px 25px', fontSize: '1.05em', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
            {loading ? 'Procesando...' : '⚙️ Procesar Consulta'}
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Código Árbol</th>
              <th>Lote</th>
              <th>Variedad</th>
              <th>Fecha Siembra</th>
              <th>Estado de Salud</th>
              <th>Geolocalización (GPS)</th>
              <th style={{ width: '120px', textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {!hasProcessed ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  Presione 'Procesar Consulta' para cargar los registros.
                </td>
              </tr>
            ) : processedData.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  No se encontraron árboles con los filtros seleccionados.
                </td>
              </tr>
            ) : (
              processedData.map(a => {
                let statusColor = '#34D399'; // Sano
                if (a.estado_salud === 'Enfermo') statusColor = '#F87171';
                else if (a.estado_salud === 'Tratamiento') statusColor = '#FBBF24';
                else if (a.estado_salud === 'Muerto' || a.estado_salud === 'Desaparecido') statusColor = '#9CA3AF';
                
                let coordStr = 'No registrado';
                if (a.gps_punto) {
                   if (typeof a.gps_punto === 'object' && a.gps_punto.coordinates) {
                      coordStr = `${a.gps_punto.coordinates[0]}, ${a.gps_punto.coordinates[1]}`;
                   } else if (typeof a.gps_punto === 'string') {
                      coordStr = a.gps_punto;
                   }
                }

                return (
                  <tr key={a.id_arbol}>
                    <td><strong>{a.codigo_arbol}</strong></td>
                    <td style={{ color: '#60A5FA' }}>{getLoteName(a.id_lote)}</td>
                    <td>{a.variedad || 'N/A'}</td>
                    <td>{a.fecha_siembra ? new Date(a.fecha_siembra).toLocaleDateString() : (a.ano_siembra || 'N/A')}</td>
                    <td>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.85em',
                        fontWeight: 'bold',
                        background: `${statusColor}33`,
                        color: statusColor,
                        border: `1px solid ${statusColor}66`
                      }}>
                        {a.estado_salud || 'Desconocido'}
                      </span>
                    </td>
                    <td>
                      {coordStr !== 'No registrado' ? (
                        <span style={{ fontSize: '0.9em', color: '#9CA3AF' }}>📍 {coordStr}</span>
                      ) : (
                        <span style={{ fontSize: '0.9em', color: 'var(--text-muted)' }}>-</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button className="btn-icon" onClick={() => openTreeDetails(a)} style={{ background: 'rgba(59,130,246,0.2)', color: '#60A5FA', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer' }} title="Ficha Técnica / Reportar Novedad">📋</button>
                        <button className="btn-icon" onClick={() => handleDeleteTree(a.id_arbol)} style={{ background: 'rgba(239,68,68,0.2)', color: '#F87171', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer' }} title="Eliminar Árbol">🗑️</button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '800px', width: '95%' }}>
            <div className="modal-header">
              <h2>Reportar Novedad Fitosanitaria</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            
            <div className="modal-body">
              {/* Buscador de Árbol en el Modal */}
              <form onSubmit={handleSearchTree} style={{ display: 'flex', gap: '10px', marginBottom: '20px', background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '8px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <input 
                    type="text" 
                    className="form-control" 
                    autoFocus
                    required
                    style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid #3B82F6', color: '#fff', padding: '12px 12px 12px 40px', fontSize: '1.1rem', borderRadius: '6px', width: '100%' }} 
                    placeholder="Escanee láser o digite la Placa / Código QR del árbol..."
                    value={codigoBusqueda} 
                    onChange={e => {
                      setCodigoBusqueda(e.target.value);
                      if (errorBusqueda) setErrorBusqueda('');
                    }} 
                  />
                  <span style={{ position: 'absolute', left: '12px', top: '12px', fontSize: '1.2rem' }}>📷</span>
                </div>
                <button type="submit" className="btn btn-primary" style={{ padding: '0 25px', fontWeight: 'bold' }}>
                  {buscandoArbol ? 'Buscando...' : '🔍 Buscar'}
                </button>
              </form>

              {errorBusqueda && (
                <div style={{ padding: '15px', background: 'rgba(239,68,68,0.2)', color: '#FCA5A5', borderRadius: '8px', marginBottom: '20px', textAlign: 'center', border: '1px solid #EF4444' }}>
                  {errorBusqueda}
                </div>
              )}

              {/* Ficha Técnica del Árbol */}
              {selectedTree && (
                <div style={{ animation: 'fadeIn 0.3s ease-in' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', background: 'linear-gradient(to right, rgba(59,130,246,0.15), rgba(16,185,129,0.15))', padding: '15px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '20px' }}>
                    <div>
                      <h3 style={{ margin: '0 0 5px 0', color: '#fff', fontSize: '1.4em' }}>Árbol {selectedTree.codigo_arbol}</h3>
                      <div style={{ display: 'flex', gap: '15px', color: '#9CA3AF', fontSize: '0.9em' }}>
                        <span>📍 Lote: <strong style={{color: '#60A5FA'}}>{getLoteName(selectedTree.id_lote)}</strong></span>
                        <span>🌱 Variedad: <strong>{selectedTree.variedad || 'N/A'}</strong></span>
                        <span>⏳ Edad: <strong>{getEdad(selectedTree.fecha_siembra, selectedTree.ano_siembra)}</strong></span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{
                        padding: '6px 12px', borderRadius: '20px', fontSize: '0.9em', fontWeight: 'bold',
                        background: selectedTree.estado_salud === 'Sano' ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.2)',
                        color: selectedTree.estado_salud === 'Sano' ? '#34D399' : '#F87171',
                        border: `1px solid ${selectedTree.estado_salud === 'Sano' ? '#34D399' : '#F87171'}`
                      }}>
                        {selectedTree.estado_salud || 'Desconocido'}
                      </span>
                    </div>
                  </div>

                  {/* Acciones e Historial */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h3 style={{ margin: 0, color: '#F3F4F6' }}>Historial Fitosanitario</h3>
                    {!showCasoForm && (
                      <button className="btn btn-primary" onClick={() => setShowCasoForm(true)} style={{ background: '#10B981', borderColor: '#10B981' }}>
                        + REGISTRAR NOVEDAD ACTUAL
                      </button>
                    )}
                  </div>
                  
                  {/* Formulario de Nueva Novedad */}
                  {showCasoForm && (
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '20px', borderRadius: '8px', border: '1px solid #10B981', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                        <h4 style={{ margin: 0, color: '#34D399' }}>🌿 Nuevo Diagnóstico / Reporte en Campo</h4>
                        <button className="btn-icon" onClick={() => { setShowCasoForm(false); setImagePreview(null); }} style={{ color: '#9CA3AF' }}>&times; Cancelar</button>
                      </div>
                      
                      {/* Opcional: Análisis con Imagen IA */}
                      <div style={{ padding: '15px', background: 'rgba(59,130,246,0.1)', borderRadius: '8px', border: '1px dashed #3B82F6', marginBottom: '15px', display: 'flex', gap: '15px', alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: 'block', color: '#93C5FD', fontWeight: 'bold', marginBottom: '5px' }}>📸 Auto-Diagnóstico con IA (Opcional)</label>
                          <p style={{ margin: '0 0 10px 0', fontSize: '0.85em', color: '#9CA3AF' }}>Sube la foto que tomó el empleado en campo y la IA completará este formulario por ti.</p>
                          <input type="file" accept="image/*" onChange={handleImageUpload} disabled={isAnalyzingImage} style={{ color: '#fff' }} />
                          {isAnalyzingImage && <span style={{ color: '#34D399', fontSize: '0.9em', marginLeft: '10px' }}>Analizando imagen... 🤖</span>}
                        </div>
                        {imagePreview && (
                          <img src={imagePreview} alt="Preview" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '2px solid #3B82F6' }} />
                        )}
                      </div>
                      
                      <div className="form-group" style={{ marginBottom: '15px' }}>
                        <label style={{ color: '#F3F4F6' }}>Problema Detectado (Descripción del síntoma o plaga)</label>
                        <input type="text" className="form-control" value={newCaso.problema_detectado} onChange={e => setNewCaso({...newCaso, problema_detectado: e.target.value})} placeholder="Ej. El agrónomo reporta hojas amarillas con bordes necrosados..." />
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                        <div className="form-group">
                          <label style={{ color: '#F3F4F6' }}>Severidad</label>
                          <select className="form-control" value={newCaso.severidad} onChange={e => setNewCaso({...newCaso, severidad: e.target.value})}>
                            <option value="Baja">Baja</option>
                            <option value="Media">Media</option>
                            <option value="Alta">Alta</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label style={{ color: '#F3F4F6' }}>Acción Inmediata</label>
                          <select className="form-control" value={newCaso.estado_caso} onChange={e => setNewCaso({...newCaso, estado_caso: e.target.value})}>
                            <option value="Abierto">Solo Reportar (Dejar Abierto)</option>
                            <option value="En Tratamiento">Iniciar Tratamiento (Formular Receta)</option>
                          </select>
                        </div>
                      </div>
                      
                      {newCaso.estado_caso === 'En Tratamiento' && (
                        <div className="form-group" style={{ marginBottom: '15px' }}>
                          <label style={{ color: '#F3F4F6' }}>Tratamiento Formulado (Receta Médica)</label>
                          <textarea className="form-control" rows="2" value={newCaso.tratamiento_formulado} onChange={e => setNewCaso({...newCaso, tratamiento_formulado: e.target.value})} placeholder="Ej. Aplicar 100ml de Fungicida Z y realizar poda foliar..."></textarea>
                        </div>
                      )}
                      
                      <div style={{ background: 'rgba(59,130,246,0.1)', padding: '10px', borderRadius: '6px', borderLeft: '3px solid #3B82F6', marginBottom: '15px', fontSize: '0.9em', color: '#93C5FD' }}>
                        <strong>✨ Auditoría IA Inteligente:</strong> Al guardar, el motor de Inteligencia Artificial analizará su reporte y asignará silenciosamente el <em>Nombre Científico</em> oficial de la plaga o patología a la base de datos para futuras auditorías ICA/GlobalGAP.
                      </div>

                      <button className="btn btn-primary" style={{ width: '100%', fontWeight: 'bold', padding: '12px', background: '#3B82F6', fontSize: '1.1em' }} onClick={handleSaveCaso} disabled={isSavingCaso}>
                        {isSavingCaso ? 'Procesando con IA y Guardando...' : '💾 GUARDAR REPORTE'}
                      </button>
                    </div>
                  )}

                  {/* Historial Timeline */}
                  {loadingCasos ? (
                    <div style={{ textAlign: 'center', padding: '20px' }}><div className="loading-spinner" style={{margin:'0 auto'}}></div></div>
                  ) : casos.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#9CA3AF', padding: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                      Este árbol no tiene historial clínico registrado. ¡Está impecable!
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '400px', overflowY: 'auto', paddingRight: '5px' }}>
                      {casos.map(c => (
                        <div key={c.id_caso} style={{ padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', borderLeft: `4px solid ${c.estado_caso === 'Cerrado' ? '#9CA3AF' : '#F87171'}`, position: 'relative' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <strong style={{ fontSize: '1.1em', color: '#fff' }}>{c.problema_detectado}</strong>
                            <span style={{ fontSize: '0.85em', background: c.estado_caso === 'Cerrado' ? '#4B5563' : '#B91C1C', padding: '2px 8px', borderRadius: '4px', color: '#fff' }}>{c.estado_caso}</span>
                          </div>
                          
                          {c.nombre_cientifico_ia && c.nombre_cientifico_ia !== 'Indeterminado' && (
                            <div style={{ display: 'inline-block', background: 'rgba(16,185,129,0.15)', color: '#34D399', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8em', marginBottom: '8px', border: '1px solid rgba(16,185,129,0.3)' }}>
                              🧬 {c.nombre_cientifico_ia}
                            </div>
                          )}

                          <p style={{ margin: '0 0 5px 0', fontSize: '0.9em', color: '#9CA3AF' }}>Reportado: {new Date(c.fecha_reporte).toLocaleDateString()} | Severidad: {c.severidad}</p>
                          
                          {c.tratamiento_formulado && (
                            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '4px', fontSize: '0.9em', marginTop: '10px', borderLeft: '2px solid #60A5FA' }}>
                              <strong style={{ color: '#60A5FA' }}>📋 Fórmula Asignada:</strong> {c.tratamiento_formulado}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SiembraArbolesManager;
