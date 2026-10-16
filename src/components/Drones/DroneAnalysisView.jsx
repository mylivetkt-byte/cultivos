import React from 'react';

export default function DroneAnalysisView() {
  return (
    <div style={{ padding: '24px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
      <h3 style={{ margin: '0 0 16px 0', color: '#1e293b' }}>Visualizador de Análisis Multiespectral</h3>
      <p style={{ color: '#64748b', marginBottom: '24px' }}>
        Las capas de NDVI y otros índices se mostrarán aquí utilizando Leaflet y las geometrías de <code>dron_analisis</code>.
      </p>
      
      <div style={{ height: '400px', background: '#f1f5f9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗺️</div>
        <div style={{ fontWeight: '500', color: '#475569' }}>[Espacio reservado para mapa de calor GeoJSON]</div>
      </div>
    </div>
  );
}
