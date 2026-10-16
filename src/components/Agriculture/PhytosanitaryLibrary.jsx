import React, { useState, useEffect } from 'react';
import '../dashboard.css'; // Reusing standard styles
import { authFetch } from '../../utils/api';

const PhytosanitaryLibrary = () => {
  const [library, setLibrary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    fetchLibrary();
  }, []);

  const fetchLibrary = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await authFetch('/api/applications/ica', { headers });
      if (!response.ok) throw new Error('Error fetching library');
      const data = await response.json();
      setLibrary(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredLibrary = library.filter(item => 
    item.nombre_comun?.toLowerCase()?.includes(searchTerm.toLowerCase()) || 
    item.nombre_cientifico?.toLowerCase()?.includes(searchTerm.toLowerCase()) ||
    item.agente_causal?.toLowerCase()?.includes(searchTerm.toLowerCase())
  );

  const getRiesgoColor = (riesgo) => {
    switch(riesgo) {
      case 'Bajo': return '#10B981';
      case 'Medio': return '#F59E0B';
      case 'Alto': return '#EF4444';
      case 'Cuarentenario': return '#8B5CF6';
      default: return '#6B7280';
    }
  };

  if (loading) return <div className="loading">Cargando Biblioteca ICA...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="dashboard-container">
      <div className="dashboard-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <img src="https://www.ica.gov.co/getattachment/5f80b985-78e8-4663-bd43-2c1b820fb726/logo-ica.png.aspx" alt="ICA" style={{ height: '40px', background: 'var(--bg-card)', padding: '5px', borderRadius: '8px' }} />
            Biblioteca Fitosanitaria (ICA)
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>Catálogo Técnico de Plagas, Enfermedades y Agentes Causales</p>
        </div>
        <div className="header-actions">
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}>🔍</span>
            <input 
              type="text" 
              placeholder="Buscar plaga, enfermedad o agente..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-control"
              style={{ width: '350px', paddingLeft: '35px', background: 'rgba(0,0,0,0.2)' }}
            />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', height: 'calc(100vh - 120px)' }}>
        {/* Lista Lateral */}
        <div className="card" style={{ width: '350px', overflowY: 'auto' }}>
          <h3>Catálogo ({filteredLibrary.length})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
            {filteredLibrary.map(item => (
              <div 
                key={item.id_enfermedad_plaga}
                onClick={() => setSelectedItem(item)}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  border: `1px solid ${selectedItem?.id_enfermedad_plaga === item.id_enfermedad_plaga ? 'var(--primary)' : 'var(--border)'}`,
                  background: selectedItem?.id_enfermedad_plaga === item.id_enfermedad_plaga ? 'rgba(0, 240, 255, 0.1)' : 'var(--card-bg)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <strong style={{ color: 'var(--primary-light)', fontSize: '1.1em' }}>{item.nombre_comun}</strong>
                  <span style={{ 
                    fontSize: '0.7em', 
                    padding: '2px 6px', 
                    borderRadius: '4px',
                    background: item.tipo === 'Plaga' ? '#F59E0B' : '#EC4899',
                    color: '#fff'
                  }}>
                    {item.tipo}
                  </span>
                </div>
                <div style={{ fontSize: '0.9em', color: 'var(--text-muted)', marginTop: '4px', fontStyle: 'italic' }}>
                  {item.nombre_cientifico}
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <span style={{ fontSize: '0.8em', color: getRiesgoColor(item.nivel_riesgo), border: `1px solid ${getRiesgoColor(item.nivel_riesgo)}`, padding: '2px 6px', borderRadius: '4px' }}>
                    Riesgo: {item.nivel_riesgo}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detalle Central */}
        <div className="card" style={{ flex: 1, overflowY: 'auto', position: 'relative', padding: '30px' }}>
          {selectedItem ? (
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ borderBottom: '2px solid var(--border)', paddingBottom: '20px', marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                    <span style={{ background: selectedItem.tipo === 'Plaga' ? '#F59E0B' : '#EC4899', color: '#fff', padding: '4px 10px', borderRadius: '20px', fontSize: '0.85em', fontWeight: 'bold', textTransform: 'uppercase' }}>
                      {selectedItem.tipo}
                    </span>
                    <span style={{ color: getRiesgoColor(selectedItem.nivel_riesgo), border: `1px solid ${getRiesgoColor(selectedItem.nivel_riesgo)}`, padding: '3px 10px', borderRadius: '20px', fontSize: '0.85em', fontWeight: 'bold' }}>
                      Nivel de Riesgo: {selectedItem.nivel_riesgo}
                    </span>
                  </div>
                  <h2 style={{ color: 'var(--primary)', margin: '10px 0 5px 0', fontSize: '2.5em' }}>{selectedItem.nombre_comun}</h2>
                  <p style={{ margin: 0, fontSize: '1.2em', color: 'var(--text-muted)', fontStyle: 'italic' }}>{selectedItem.nombre_cientifico}</p>
                </div>
                <div style={{ textAlign: 'right', background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '8px' }}>
                  <p style={{ margin: '0 0 5px 0', color: 'var(--text-muted)', fontSize: '0.9em' }}>Cultivo Principal</p>
                  <strong style={{ fontSize: '1.1em', color: '#fff' }}>{selectedItem.cultivo}</strong>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
                <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '20px', borderRadius: '12px', borderLeft: '4px solid #EF4444' }}>
                  <h4 style={{ color: '#F87171', margin: '0 0 15px 0', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2em' }}>
                    <span>🦠</span> Síntomas y Daños
                  </h4>
                  <div style={{ marginBottom: '15px' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.9em', display: 'block', marginBottom: '4px' }}>Agente Causal</span>
                    <strong style={{ fontSize: '1.1em' }}>{selectedItem.agente_causal}</strong>
                  </div>
                  <div style={{ marginBottom: '15px' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.9em', display: 'block', marginBottom: '4px' }}>Síntomas</span>
                    <p style={{ margin: 0, lineHeight: '1.5' }}>{selectedItem.sintomas}</p>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.9em', display: 'block', marginBottom: '4px' }}>Daños Ocasionados</span>
                    <p style={{ margin: 0, lineHeight: '1.5' }}>{selectedItem.danos_ocasionados}</p>
                  </div>
                </div>

                <div style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '20px', borderRadius: '12px', borderLeft: '4px solid #10B981' }}>
                  <h4 style={{ color: '#34D399', margin: '0 0 15px 0', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2em' }}>
                    <span>🛡️</span> Medidas de Control
                  </h4>
                  <div style={{ marginBottom: '15px', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '6px' }}>
                    <span style={{ color: '#FCD34D', fontSize: '0.9em', display: 'block', marginBottom: '4px' }}>Umbral Económico de Intervención</span>
                    <strong style={{ fontSize: '1.2em', color: '#FCD34D' }}>{selectedItem.umbral_economico_pct}% de incidencia</strong>
                  </div>
                  <div style={{ marginBottom: '15px' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.9em', display: 'block', marginBottom: '4px' }}>Prevención</span>
                    <p style={{ margin: 0, lineHeight: '1.5' }}>{selectedItem.medidas_preventivas}</p>
                  </div>
                  <div style={{ marginBottom: '15px' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.9em', display: 'block', marginBottom: '4px' }}>Control Biológico</span>
                    <p style={{ margin: 0, lineHeight: '1.5' }}>{selectedItem.control_biologico}</p>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.9em', display: 'block', marginBottom: '4px' }}>Control Químico</span>
                    <p style={{ margin: 0, lineHeight: '1.5' }}>{selectedItem.control_quimico}</p>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '25px', padding: '20px', background: 'linear-gradient(90deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.05) 100%)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '12px' }}>
                <h4 style={{ color: '#60A5FA', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2em' }}>
                  <img src="https://www.ica.gov.co/getattachment/5f80b985-78e8-4663-bd43-2c1b820fb726/logo-ica.png.aspx" alt="ICA" style={{ height: '24px', background: 'var(--bg-card)', padding: '2px', borderRadius: '4px' }} />
                  Recomendaciones Oficiales del Instituto Colombiano Agropecuario
                </h4>
                <p style={{ margin: 0, lineHeight: '1.6', color: '#E5E7EB', fontSize: '1.05em' }}>{selectedItem.recomendaciones_ica}</p>
              </div>

            </div>
          ) : (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', opacity: 0.5 }}>
              <img src="https://www.ica.gov.co/getattachment/5f80b985-78e8-4663-bd43-2c1b820fb726/logo-ica.png.aspx" alt="ICA" style={{ height: '120px', background: 'var(--bg-card)', padding: '15px', borderRadius: '20px', marginBottom: '20px', filter: 'grayscale(100%)' }} />
              <h2 style={{ margin: '0 0 10px 0' }}>Biblioteca Técnica Fitosanitaria</h2>
              <p style={{ fontSize: '1.1em' }}>Selecciona una plaga o enfermedad del catálogo lateral para ver su ficha técnica detallada.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PhytosanitaryLibrary;
