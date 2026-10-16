import React, { useState, useEffect } from 'react';
import { Table, Button, Card, Typography, Select, Row, Col, Space, DatePicker, Input, message } from 'antd';
import { FileExcelOutlined, FilePdfOutlined, SearchOutlined } from '@ant-design/icons';
import { fetchTableData, authFetch } from '../../utils/api';
import dayjs from 'dayjs';
import { exportToPdf } from '../../utils/exportPdf';
import { exportToExcel } from '../../utils/exportExcel';
import { useAuth } from '../../context/AuthContext';

const { Title, Text } = Typography;
const { Option } = Select;

export default function InventarioSaldosReport({ tenantId }) {
  const [fincas, setFincas] = useState([]);
  const [bodegas, setBodegas] = useState([]);
  const [saldos, setSaldos] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  // Filtros
  const [filtros, setFiltros] = useState({
    fincaId: 'Todas',
    bodegaId: 'Todas',
    fechaCorte: dayjs(),
    buscarProducto: ''
  });

  useEffect(() => {
    if (tenantId) {
      loadFilters();
    }
  }, [tenantId]);

  const loadFilters = async () => {
    try {
      const [resFincas, resBodegas] = await Promise.all([
        authFetch(`/api/table/fincas/data?tenantId=${tenantId}`).then(r => r.json()),
        authFetch(`/api/table/bod_bodegas/data?tenantId=${tenantId}`).then(r => r.json())
      ]);
      if (resFincas.data) setFincas([{ id_finca: 'Todas', nombre: 'Todas las fincas' }, ...resFincas.data]);
      if (resBodegas.data) setBodegas([{ id_bodega: 'Todas', nombre: 'Todas las bodegas' }, ...resBodegas.data]);
    } catch (err) {
      console.error('Error loading filters', err);
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      const fDate = filtros.fechaCorte ? filtros.fechaCorte.format('YYYY-MM-DD') : '';
      const params = new URLSearchParams({
        tenantId,
        fincaId: filtros.fincaId,
        bodegaId: filtros.bodegaId,
        fechaCorte: fDate,
        buscarProducto: filtros.buscarProducto
      });

      const response = await authFetch(`/api/reports/inventario/saldos?${params}`);
      const result = await response.json();
      if (result.success) {
        setSaldos(result.data);
      } else {
        message.error('Error: ' + result.error);
      }
    } catch (error) {
      message.error('Error al consultar saldos');
    } finally {
      setLoading(false);
    }
  };

  const getMetadata = () => ({
    empresa: 'AgroPaccioli',
    finca: filtros.fincaId === 'Todas' ? 'Todas las fincas' : fincas.find(f => f.id_finca === filtros.fincaId)?.nombre,
    fechaHasta: filtros.fechaCorte.format('YYYY-MM-DD'),
    usuario: user?.nombre || user?.username || 'Usuario del Sistema',
    rol: user?.rol || 'No asignado',
    reportName: `Saldos de Inventario al ${filtros.fechaCorte.format('YYYY-MM-DD')}`
  });

  const exportData = saldos.map(s => ({
    'Finca': s.finca_nombre || 'Sin Asignar',
    'Bodega': s.bodega_nombre,
    'Código': s.codigo,
    'Descripción': s.insumo_nombre,
    'Saldo a la Fecha': Number(s.saldo)
  }));
  const exportColumns = [{ name: 'Finca' }, { name: 'Bodega' }, { name: 'Código' }, { name: 'Descripción' }, { name: 'Saldo a la Fecha' }];

  const handleExportExcel = () => {
    if (saldos.length === 0) return message.warning('No hay datos para exportar');
    exportToExcel(`Saldos_Corte_${dayjs().format('YYYYMMDD')}`, exportColumns, exportData, getMetadata());
  };

  const handleExportPDF = async () => {
    if (saldos.length === 0) return message.warning('No hay datos para exportar');
    await exportToPdf(`Saldos_Corte_${dayjs().format('YYYYMMDD')}`, exportColumns, exportData, getMetadata());
  };

  const columns = [
    { title: 'Finca', dataIndex: 'finca_nombre', render: t => <b>{t || 'Sin Finca'}</b> },
    { title: 'Bodega', dataIndex: 'bodega_nombre' },
    { title: 'Código', dataIndex: 'codigo' },
    { title: 'Descripción del Producto', dataIndex: 'insumo_nombre' },
    { title: 'Saldo a la Fecha', dataIndex: 'saldo', align: 'right', render: v => <span style={{ fontSize: '1.1em', fontWeight: 600, color: v < 0 ? 'red' : 'green' }}>{Number(v).toFixed(2)}</span> },
  ];

  return (
    <div style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
      <Card bordered={false} style={{ marginBottom: 24, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <Title level={3} style={{ margin: 0, color: '#001529' }}>📦 Saldos de Inventario a Fecha de Corte</Title>
            <Text type="secondary">Consulta el stock real de los productos hasta el día exacto que selecciones.</Text>
          </div>
          <Space>
            <Button icon={<FileExcelOutlined />} onClick={handleExportExcel} style={{ color: '#52c41a', borderColor: '#52c41a' }}>Excel</Button>
            <Button icon={<FilePdfOutlined />} onClick={handleExportPDF} danger>PDF</Button>
          </Space>
        </div>

        <Row gutter={[16, 16]}>
          <Col xs={24} md={6}>
            <Text strong>Finca</Text>
            <Select 
              style={{ width: '100%', marginTop: 4 }} 
              value={filtros.fincaId}
              onChange={v => setFiltros({ ...filtros, fincaId: v })}
            >
              {fincas.map(f => <Option key={f.id_finca} value={f.id_finca}>{f.nombre}</Option>)}
            </Select>
          </Col>
          <Col xs={24} md={6}>
            <Text strong>Bodega</Text>
            <Select 
              style={{ width: '100%', marginTop: 4 }} 
              value={filtros.bodegaId}
              onChange={v => setFiltros({ ...filtros, bodegaId: v })}
            >
              {bodegas.map(b => <Option key={b.id_bodega} value={b.id_bodega}>{b.nombre}</Option>)}
            </Select>
          </Col>
          <Col xs={24} md={5}>
            <Text strong>Fecha de Corte</Text>
            <DatePicker 
              style={{ width: '100%', marginTop: 4 }} 
              value={filtros.fechaCorte}
              onChange={v => setFiltros({ ...filtros, fechaCorte: v })}
              allowClear={false}
            />
          </Col>
          <Col xs={24} md={5}>
            <Text strong>Buscar Producto</Text>
            <Input 
              placeholder="Código o nombre..." 
              style={{ width: '100%', marginTop: 4 }}
              value={filtros.buscarProducto}
              onChange={e => setFiltros({ ...filtros, buscarProducto: e.target.value })}
              onPressEnter={handleSearch}
            />
          </Col>
          <Col xs={24} md={2} style={{ display: 'flex', alignItems: 'flex-end' }}>
            <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch} style={{ width: '100%' }}>Consultar</Button>
          </Col>
        </Row>
      </Card>

      <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <Table 
          columns={columns}
          dataSource={saldos}
          rowKey={record => `${record.id_bodega}-${record.id_insumo}`}
          loading={loading}
          pagination={{ pageSize: 50 }}
          bordered
        />
      </Card>
    </div>
  );
}
