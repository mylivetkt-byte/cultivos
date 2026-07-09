import React, { useState, useEffect } from 'react';
import { Table, Select, DatePicker, Button, Modal, notification, Row, Col, Typography, Space, Input } from 'antd';
import { DownloadOutlined, FilePdfOutlined, EyeOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { fetchTableData, API_BASE, authFetch } from '../utils/api';
import NuevoTrasladoModal from './NuevoTrasladoModal';

const { RangePicker } = DatePicker;
const { Title } = Typography;
const { Option } = Select;

export default function TrasladosBodegas({ tenantId }) {
  const [traslados, setTraslados] = useState([]);
  const [fincas, setFincas] = useState([]);
  const [bodegas, setBodegas] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [filtroFinca, setFiltroFinca] = useState(null);
  const [filtroBodega, setFiltroBodega] = useState(null);
  const [filtroFechas, setFiltroFechas] = useState(null);

  // Modal Details
  const [modalVisible, setModalVisible] = useState(false);
  const [detalles, setDetalles] = useState([]);
  const [loadingDetalles, setLoadingDetalles] = useState(false);
  const [selectedTraslado, setSelectedTraslado] = useState(null);

  // Candado Digital (Recibir)
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pinValue, setPinValue] = useState('');
  const [receiving, setReceiving] = useState(false);

  // Nuevo Traslado Modal
  const [nuevoModalVisible, setNuevoModalVisible] = useState(false);

  useEffect(() => {
    if (tenantId) {
      fetchFincasYBodegas();
      fetchTraslados();
    } else {
      setTraslados([]);
      setFincas([]);
      setBodegas([]);
    }
  }, [tenantId]);

  const fetchFincasYBodegas = async () => {
    try {
      const resFincas = await fetchTableData('fincas', { tenantId, pageSize: 100 });
      setFincas(resFincas.data || []);

      const resBodegas = await fetchTableData('bod_bodegas', { tenantId, pageSize: 100 });
      setBodegas(resBodegas.data || []);
    } catch (error) {
      console.error('Error fetching fincas/bodegas:', error);
    }
  };

  const fetchTraslados = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      let url = `${API_BASE}/traslados?id_tenant=${tenantId}`;
      if (filtroFinca) url += `&id_finca=${filtroFinca}`;
      if (filtroBodega) url += `&id_bodega=${filtroBodega}`;
      if (filtroFechas && filtroFechas.length === 2) {
        url += `&fecha_inicio=${filtroFechas[0].format('YYYY-MM-DD')}&fecha_fin=${filtroFechas[1].format('YYYY-MM-DD')}`;
      }

      const res = await authFetch(url);
      const data = await res.json();
      setTraslados(data || []);
    } catch (error) {
      console.error('Error fetching traslados:', error);
      notification.error({ message: 'Error', description: 'No se pudieron cargar los traslados' });
    } finally {
      setLoading(false);
    }
  };

  const handleVerDetalles = async (record) => {
    setSelectedTraslado(record);
    setModalVisible(true);
    setLoadingDetalles(true);
    try {
      const res = await authFetch(`${API_BASE}/traslados/${record.id_transferencia}/detalles`);
      const data = await res.json();
      setDetalles(data || []);
    } catch (error) {
      notification.error({ message: 'Error', description: 'No se pudieron cargar los detalles' });
    } finally {
      setLoadingDetalles(false);
    }
  };

  const exportExcel = () => {
    if (traslados.length === 0) {
      notification.warning({ message: 'No hay datos para exportar' });
      return;
    }
    const dataToExport = traslados.map(t => ({
      'ID Traslado': t.id_transferencia,
      'Fecha Solicitud': t.fecha_solicitud ? dayjs(t.fecha_solicitud).format('YYYY-MM-DD HH:mm') : '',
      'Estado': t.estado,
      'Bodega Origen': t.bodega_origen,
      'Finca Origen': t.finca_origen,
      'Bodega Destino': t.bodega_destino,
      'Finca Destino': t.finca_destino
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Traslados');
    XLSX.writeFile(workbook, `Traslados_Bodegas_${dayjs().format('YYYYMMDD')}.xlsx`);
  };

  const exportPDF = () => {
    if (traslados.length === 0) {
      notification.warning({ message: 'No hay datos para exportar' });
      return;
    }
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Reporte de Traslados de Bodegas', 14, 20);
    doc.setFontSize(10);
    doc.text(`Generado: ${dayjs().format('YYYY-MM-DD HH:mm')}`, 14, 28);
    
    let filtersText = [];
    if (filtroFinca) filtersText.push(`Finca: ${fincas.find(f => f.id_finca === filtroFinca)?.nombre || ''}`);
    if (filtroBodega) filtersText.push(`Bodega: ${bodegas.find(b => b.id_bodega === filtroBodega)?.nombre || ''}`);
    if (filtroFechas) filtersText.push(`Desde: ${filtroFechas[0].format('YYYY-MM-DD')} Hasta: ${filtroFechas[1].format('YYYY-MM-DD')}`);
    
    if (filtersText.length > 0) {
      doc.text(`Filtros -> ${filtersText.join(' | ')}`, 14, 34);
    }

    const tableColumn = ["ID", "Fecha", "Bod. Origen", "Finca Origen", "Bod. Destino", "Finca Destino", "Estado"];
    const tableRows = [];

    traslados.forEach(t => {
      tableRows.push([
        t.id_transferencia,
        t.fecha_solicitud ? dayjs(t.fecha_solicitud).format('YYYY-MM-DD') : '',
        t.bodega_origen || '',
        t.finca_origen || '',
        t.bodega_destino || '',
        t.finca_destino || '',
        t.estado || ''
      ]);
    });

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: filtersText.length > 0 ? 40 : 34,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [46, 125, 50] }
    });

    doc.save(`Traslados_Bodegas_${dayjs().format('YYYYMMDD')}.pdf`);
  };

  const handleSuccessTraslado = () => {
    setNuevoModalVisible(false);
    fetchTraslados(); // refresh
  };

  const handleRecibir = (record) => {
    setSelectedTraslado(record);
    setPinValue('');
    setPinModalVisible(true);
  };

  const confirmRecibir = async () => {
    if (!pinValue || pinValue.trim() === '') {
      return notification.warning({ message: 'Debe ingresar el PIN' });
    }
    setReceiving(true);
    try {
      const res = await authFetch(`${API_BASE}/traslados/${selectedTraslado.id_transferencia}/recibir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinValue })
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al validar PIN');
      }
      
      notification.success({ message: 'Recepción exitosa', description: 'Inventario actualizado correctamente.' });
      setPinModalVisible(false);
      fetchTraslados(); // Refresh the table
    } catch (error) {
      notification.error({ message: 'Error de seguridad', description: error.message });
    } finally {
      setReceiving(false);
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id_transferencia', key: 'id_transferencia', width: 80 },
    { title: 'Fecha Solicitud', dataIndex: 'fecha_solicitud', key: 'fecha_solicitud', render: val => val ? dayjs(val).format('YYYY-MM-DD HH:mm') : '' },
    { title: 'Bodega Origen', dataIndex: 'bodega_origen', key: 'bodega_origen', render: (val, record) => <span><b>{val}</b><br/><small>{record.finca_origen}</small></span> },
    { title: 'Bodega Destino', dataIndex: 'bodega_destino', key: 'bodega_destino', render: (val, record) => <span><b>{val}</b><br/><small>{record.finca_destino}</small></span> },
    { title: 'Estado', dataIndex: 'estado', key: 'estado', render: val => {
        let color = val === 'En_Transito' ? 'orange' : (val === 'Recibida' ? 'green' : 'gray');
        return <span style={{ color, fontWeight: 'bold' }}>{val.replace('_', ' ')}</span>
    }},
    {
      title: 'Acciones',
      key: 'acciones',
      render: (_, record) => (
        <Space>
          <Button type="default" icon={<EyeOutlined />} size="small" onClick={() => handleVerDetalles(record)}>
            Ver
          </Button>
          {record.estado === 'En_Transito' && (
            <Button type="primary" size="small" style={{ background: '#f59e0b', borderColor: '#f59e0b' }} onClick={() => handleRecibir(record)}>
              Recibir
            </Button>
          )}
        </Space>
      )
    }
  ];

  const columnsDetalle = [
    { title: 'Insumo / Producto', dataIndex: 'insumo_producto', key: 'insumo_producto' },
    { title: 'Cantidad', dataIndex: 'cantidad', key: 'cantidad' },
    { title: 'Estado Línea', dataIndex: 'estado_linea', key: 'estado_linea' }
  ];

  if (!tenantId) {
    return <div style={{ padding: 24, textAlign: 'center' }}>Por favor seleccione un Cliente en la barra superior.</div>;
  }

  return (
    <div style={{ padding: '24px', background: '#fff', borderRadius: '8px', minHeight: '80vh' }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={3} style={{ margin: 0, color: '#2e7d32' }}>🔄 Traslados Entre Bodegas</Title>
        </Col>
        <Col>
          <Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setNuevoModalVisible(true)} style={{ background: '#2e7d32', borderColor: '#2e7d32' }}>
              Nuevo Traslado
            </Button>
            <Button icon={<DownloadOutlined />} onClick={exportExcel} style={{ borderColor: '#388e3c', color: '#388e3c' }}>
              Excel
            </Button>
            <Button icon={<FilePdfOutlined />} onClick={exportPDF} danger>
              PDF
            </Button>
          </Space>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 24, background: '#f8fafc', padding: '16px', borderRadius: '8px' }}>
        <Col span={6}>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Finca:</label>
          <Select 
            style={{ width: '100%' }} 
            placeholder="Todas las Fincas" 
            allowClear
            value={filtroFinca}
            onChange={val => { setFiltroFinca(val); setFiltroBodega(null); }}
          >
            {fincas.map(f => <Option key={f.id_finca} value={f.id_finca}>{f.nombre}</Option>)}
          </Select>
        </Col>
        <Col span={6}>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Bodega:</label>
          <Select 
            style={{ width: '100%' }} 
            placeholder="Todas las Bodegas" 
            allowClear
            value={filtroBodega}
            onChange={setFiltroBodega}
          >
            {bodegas
              .filter(b => !filtroFinca || b.id_finca === filtroFinca)
              .map(b => <Option key={b.id_bodega} value={b.id_bodega}>{b.nombre}</Option>)}
          </Select>
        </Col>
        <Col span={8}>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Rango de Fechas:</label>
          <RangePicker style={{ width: '100%' }} value={filtroFechas} onChange={setFiltroFechas} />
        </Col>
        <Col span={4} style={{ display: 'flex', alignItems: 'flex-end' }}>
          <Button type="primary" onClick={fetchTraslados} style={{ width: '100%' }}>
            Buscar
          </Button>
        </Col>
      </Row>

      <Table 
        columns={columns} 
        dataSource={traslados} 
        rowKey="id_transferencia"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title={selectedTraslado ? `Detalles del Traslado #${selectedTraslado.id_transferencia}` : 'Detalles'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[<Button key="close" onClick={() => setModalVisible(false)}>Cerrar</Button>]}
        width={700}
      >
        {selectedTraslado && (
          <div style={{ marginBottom: 16, padding: 12, background: '#f1f5f9', borderRadius: 8 }}>
            <p style={{ margin: 0 }}><b>Origen:</b> {selectedTraslado.bodega_origen} ({selectedTraslado.finca_origen})</p>
            <p style={{ margin: 0 }}><b>Destino:</b> {selectedTraslado.bodega_destino} ({selectedTraslado.finca_destino})</p>
            <p style={{ margin: 0 }}><b>Fecha:</b> {selectedTraslado.fecha_solicitud ? dayjs(selectedTraslado.fecha_solicitud).format('YYYY-MM-DD HH:mm') : ''}</p>
          </div>
        )}
        <Table 
          columns={columnsDetalle} 
          dataSource={detalles} 
          rowKey="id_trans_det"
          loading={loadingDetalles}
          pagination={false}
          size="small"
        />
      </Modal>

      <Modal
        title="🔐 Candado Digital de Seguridad"
        open={pinModalVisible}
        onOk={confirmRecibir}
        onCancel={() => setPinModalVisible(false)}
        confirmLoading={receiving}
        okText="Validar y Recibir"
        okButtonProps={{ style: { background: '#2e7d32', borderColor: '#2e7d32' } }}
      >
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <p>Ingrese el <b>Código de Seguridad (PIN)</b> entregado por el transportador para autorizar el ingreso de esta mercancía a la bodega destino.</p>
          <Input.Password 
            placeholder="Ej: 8492" 
            value={pinValue}
            onChange={e => setPinValue(e.target.value)}
            style={{ width: 150, textAlign: 'center', fontSize: 24, letterSpacing: 4 }}
            maxLength={6}
          />
        </div>
      </Modal>

      {nuevoModalVisible && (
        <NuevoTrasladoModal 
          tenantId={tenantId}
          fincas={fincas}
          bodegas={bodegas}
          onClose={() => setNuevoModalVisible(false)}
          onSuccess={handleSuccessTraslado}
        />
      )}
    </div>
  );
}
