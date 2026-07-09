import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import '../styles/satelliteDashboard.css';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { authFetch } from '../utils/api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const SatelliteDashboard = () => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [fincas, setFincas] = useState([]);
  const [selectedLote, setSelectedLote] = useState(null);
  const [loteMetrics, setLoteMetrics] = useState(null);
  const [loteHistory, setLoteHistory] = useState([]);

  useEffect(() => {
    if (map.current) return; // initialize map only once
    
    // Configurar mapa de MapLibre con tiles de CartoDB Voyager (libres)
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'osm': {
            type: 'raster',
            tiles: [
              'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png'
            ],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
          }
        },
        layers: [
          {
            id: 'osm',
            type: 'raster',
            source: 'osm',
            minzoom: 0,
            maxzoom: 19
          }
        ]
      },
      center: [-74.0817, 4.6097], // Colombia
      zoom: 5
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    map.current.on('load', async () => {
      // Cargar fincas
      try {
        const res = await authFetch('/api/gis/fincas');
        const data = await res.json();
        
        map.current.addSource('fincas', {
          type: 'geojson',
          data: data
        });

        map.current.addLayer({
          id: 'fincas-fill',
          type: 'fill',
          source: 'fincas',
          paint: {
            'fill-color': '#4caf50',
            'fill-opacity': 0.3
          }
        });

        map.current.addLayer({
          id: 'fincas-line',
          type: 'line',
          source: 'fincas',
          paint: {
            'line-color': '#2e7d32',
            'line-width': 2
          }
        });

        // Al hacer click en una finca, cargar sus lotes
        map.current.on('click', 'fincas-fill', async (e) => {
          const fincaId = e.features[0].properties.id;
          cargarLotes(fincaId);
        });

        // Cambiar cursor
        map.current.on('mouseenter', 'fincas-fill', () => {
          map.current.getCanvas().style.cursor = 'pointer';
        });
        map.current.on('mouseleave', 'fincas-fill', () => {
          map.current.getCanvas().style.cursor = '';
        });
        
        // Hacer un zoom a la extensión si hay fincas
        if (data.features && data.features.length > 0) {
           const coords = data.features[0].geometry.coordinates[0][0];
           map.current.flyTo({ center: coords, zoom: 12 });
        }
      } catch (err) {
        console.error('Error cargando fincas:', err);
      }
    });

  }, []);

  const cargarLotes = async (fincaId) => {
    try {
      const res = await authFetch(`/api/gis/lotes/${fincaId}`);
      const data = await res.json();

      if (map.current.getSource('lotes')) {
        map.current.getSource('lotes').setData(data);
      } else {
        map.current.addSource('lotes', {
          type: 'geojson',
          data: data
        });

        map.current.addLayer({
          id: 'lotes-fill',
          type: 'fill',
          source: 'lotes',
          paint: {
            'fill-color': '#2196f3',
            'fill-opacity': 0.4
          }
        });

        map.current.addLayer({
          id: 'lotes-line',
          type: 'line',
          source: 'lotes',
          paint: {
            'line-color': '#1565c0',
            'line-width': 2
          }
        });

        map.current.on('click', 'lotes-fill', (e) => {
          const lote = e.features[0].properties;
          setSelectedLote(lote);
          cargarMetricasLote(lote.id);
        });

        map.current.on('mouseenter', 'lotes-fill', () => {
          map.current.getCanvas().style.cursor = 'pointer';
        });
        map.current.on('mouseleave', 'lotes-fill', () => {
          map.current.getCanvas().style.cursor = '';
        });
      }
    } catch (err) {
      console.error('Error cargando lotes:', err);
    }
  };

  const cargarMetricasLote = async (loteId) => {
    try {
      const [actualRes, historyRes] = await Promise.all([
        authFetch(`/api/gis/metrics/${loteId}`),
        authFetch(`/api/gis/metrics/${loteId}/history`)
      ]);
      const data = await actualRes.json();
      const history = await historyRes.json();
      setLoteMetrics(data);
      setLoteHistory(Array.isArray(history) ? history : []);
    } catch (err) {
      console.error('Error cargando métricas:', err);
    }
  };

  // Historial real de sat_metrics
  const chartData = {
    labels: loteHistory.map(item => item.fecha),
    datasets: [
      {
        label: 'Evolución NDVI',
        data: loteHistory.map(item => Number(item.ndvi || 0)),
        borderColor: '#4caf50',
        backgroundColor: 'rgba(76, 175, 80, 0.2)',
        fill: true,
        tension: 0.4
      }
    ]
  };

  return (
    <div className="satellite-dashboard">
      <div className="satellite-header">
        <h2>🌐 Centro de Mando Satelital y GIS</h2>
        <p>Monitoreo espacial en tiempo real y anomalías climáticas</p>
      </div>

      <div className="satellite-content">
        <div className="map-panel">
          <div ref={mapContainer} className="map-container" />
          <div className="map-overlay-controls">
            <button className="control-btn active">Índice Vigor (NDVI)</button>
            <button className="control-btn">Humedad (NDMI)</button>
            <button className="control-btn">Riesgo Climático</button>
          </div>
        </div>

        <div className="info-panel">
          <h3>Copiloto Agronómico IA</h3>
          {selectedLote ? (
            <div className="lote-details glass-card">
              <h4>Lote: {selectedLote.nombre}</h4>
              {loteMetrics && Object.keys(loteMetrics).length > 0 ? (
                <div className="metrics-grid">
                  <div className="metric-box">
                    <span className="metric-title">NDVI (Vigor)</span>
                    <span className="metric-value">{loteMetrics.ndvi ? parseFloat(loteMetrics.ndvi).toFixed(2) : 'N/A'}</span>
                  </div>
                  <div className="metric-box">
                    <span className="metric-title">NDMI (Humedad)</span>
                    <span className="metric-value">{loteMetrics.ndmi ? parseFloat(loteMetrics.ndmi).toFixed(2) : 'N/A'}</span>
                  </div>
                  <div className="metric-box">
                    <span className="metric-title">ET0 (Evapotranspiración)</span>
                    <span className="metric-value">{loteMetrics.et0 ? parseFloat(loteMetrics.et0).toFixed(2) : '0'} mm</span>
                  </div>
                </div>
              ) : (
                <p>Esperando la ingesta de métricas satelitales para este lote...</p>
              )}
              
              <div className="chart-container">
                <Line data={chartData} options={{ maintainAspectRatio: false }} />
              </div>

              <div className="ai-alerts">
                <h4>⚠️ Alertas Recientes</h4>
                <ul>
                  <li>💧 {loteMetrics && loteMetrics.ndmi && parseFloat(loteMetrics.ndmi) < 0.3 ? 'Estrés hídrico detectado, sugerimos riego profundo.' : 'Niveles de humedad estables.'}</li>
                  <li>🌡️ {loteMetrics && loteMetrics.temperatura ? `Temperatura registrada ${parseFloat(loteMetrics.temperatura).toFixed(1)}°C.` : 'Sin medición de temperatura disponible.'}</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <p>Selecciona una Finca y luego un Lote en el mapa para ver el análisis de IA.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SatelliteDashboard;
