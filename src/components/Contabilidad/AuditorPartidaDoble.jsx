import React, { useState, useEffect } from 'react';
import { Card, Table, Typography, Tag, Space, Alert } from 'antd';
import { CheckCircleOutlined, WarningOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';

const { Title, Text } = Typography;

export default function AuditorPartidaDoble() {
  const { authFetch } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Simularemos la carga de los asientos contables para demostrar la funcionalidad.
    setLoading(true);
    setTimeout(() => {
      setData([
        { id_asiento: 1, fecha: '2026-09-01', descripcion: 'Salida de Insumos Lote 1', debito: 150000, credito: 150000, estado: 'Cuadrado' },
        { id_asiento: 2, fecha: '2026-09-02', descripcion: 'Pago Nómina', debito: 500000, credito: 500000, estado: 'Cuadrado' },
        { id_asiento: 3, fecha: '2026-09-03', descripcion: 'Error de Sincronización Inventario', debito: 200000, credito: 0, estado: 'Descuadrado' },
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  const columns = [
    { title: 'ID Asiento', dataIndex: 'id_asiento', key: 'id_asiento' },
    { title: 'Fecha', dataIndex: 'fecha', key: 'fecha' },
    { title: 'Descripción', dataIndex: 'descripcion', key: 'descripcion' },
    { title: 'Total Débito', dataIndex: 'debito', key: 'debito', render: v => `$${v.toLocaleString()}` },
    { title: 'Total Crédito', dataIndex: 'credito', key: 'credito', render: v => `$${v.toLocaleString()}` },
    { 
      title: 'Estado (Partida Doble)', 
      key: 'estado', 
      render: (_, record) => {
        const esCuadrado = record.debito === record.credito;
        return (
          <Tag color={esCuadrado ? 'green' : 'red'} icon={esCuadrado ? <CheckCircleOutlined /> : <WarningOutlined />}>
            {esCuadrado ? 'Válido' : 'Descuadrado'}
          </Tag>
        );
      } 
    },
  ];

  const descuadres = data.filter(d => d.debito !== d.credito).length;

  return (
    <div style={{ padding: '20px' }}>
      <Title level={2}>Auditor de Partida Doble (Contabilidad NIIF)</Title>
      
      {descuadres > 0 ? (
        <Alert
          message="¡Alerta de Descuadre Detectada!"
          description={`Se han encontrado ${descuadres} comprobantes donde la suma de débitos no coincide con la suma de créditos. Revise los movimientos de inventario.`}
          type="error"
          showIcon
          style={{ marginBottom: 20 }}
        />
      ) : (
        <Alert
          message="Todo en orden"
          description="Todos los comprobantes contables cumplen con el principio de partida doble."
          type="success"
          showIcon
          style={{ marginBottom: 20 }}
        />
      )}

      <Card>
        <Table 
          columns={columns} 
          dataSource={data} 
          rowKey="id_asiento"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
}
