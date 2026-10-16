import React, { useEffect, useState } from 'react';
import { Card, Typography, Alert } from 'antd';
import { io } from 'socket.io-client';

const { Title, Text } = Typography;

export default function MapaEnVivo() {
  const [positions, setPositions] = useState([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Nos conectamos al servidor en el mismo puerto y host (o vía proxy de vite)
    const socket = io();

    socket.on('connect', () => {
      setConnected(true);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('gps_location_update', (data) => {
      setPositions((prev) => {
        // Actualizamos o agregamos el marcador
        const idx = prev.findIndex(p => p.id === data.id);
        if (idx >= 0) {
          const newPos = [...prev];
          newPos[idx] = data;
          return newPos;
        } else {
          return [...prev, data];
        }
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <Title level={2}>Telemetría y Rastreo GPS en Vivo</Title>
      
      {connected ? (
        <Alert message="Conectado al servidor de Telemetría (Socket.io)" type="success" showIcon style={{ marginBottom: 16 }} />
      ) : (
        <Alert message="Desconectado del servidor de Telemetría" type="error" showIcon style={{ marginBottom: 16 }} />
      )}

      <Card style={{ height: '500px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#141414' }}>
        {/* Aquí iría el componente de react-leaflet o react-mapbox-gl */}
        <div style={{ textAlign: 'center' }}>
          <Text type="secondary" style={{ fontSize: '18px' }}>
            [Área reservada para inicialización del Mapa (Leaflet/Mapbox)]<br/>
            SRID: 4326
          </Text>
          <div style={{ marginTop: 20 }}>
            {positions.map(p => (
              <div key={p.id} style={{ color: '#00ff00' }}>
                📍 Rastreador {p.id}: {p.lat}, {p.lng}
              </div>
            ))}
            {positions.length === 0 && <Text type="secondary">Esperando señales GPS...</Text>}
          </div>
        </div>
      </Card>
    </div>
  );
}
