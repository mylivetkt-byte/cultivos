import React, { useState, useEffect } from 'react';
import { Table, Button, Card, Typography, Select, Row, Col, Space, Input, message, Tag, Modal } from 'antd';
import { FileExcelOutlined, FilePdfOutlined, SearchOutlined, WhatsAppOutlined } from '@ant-design/icons';
import { fetchTableData, authFetch } from '../../utils/api';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const { Title, Text } = Typography;
const { Option } = Select;

export default function InventarioMovimientosReport({ tenantId }) {
  const [fincas, setFincas] = useState([]);
  const [bodegas, setBodegas] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [vehiculos, setVehiculos] = useState([]);
  const [maquinas, setMaquinas] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [viveros, setViveros] = useState([]);
  
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal WhatsApp
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [selectedEmpleadoWs, setSelectedEmpleadoWs] = useState(null);
  const [sendingWs, setSendingWs] = useState(false);

  // Filtros
  const [filtros, setFiltros] = useState({
    fincaId: 'Todas',
    bodegaId: 'Todas',
    empleadoId: 'Todos',
    vehiculoId: 'Todos',
    maquinaId: 'Todas',
    loteId: 'Todos',
    viveroId: 'Todos',
    tipoMovimiento: 'Todos',
    buscarProducto: ''
  });

  useEffect(() => {
    if (tenantId) {
      // Load filter options (fincas, bodegas, etc.) on mount
      // The actual movements are fetched only when the user clicks "Consultar"
      loadFilters();
    }
  }, [tenantId]);

  const loadFilters = async () => {
    try {
      const [resFincas, resBodegas, resEmp, resVeh, resMaq, resLotes, resViveros] = await Promise.all([
        authFetch(`/api/table/fincas/data?tenantId=${tenantId}`).then(r => r.json()),
        authFetch(`/api/table/bod_bodegas/data?tenantId=${tenantId}`).then(r => r.json()),
        authFetch(`/api/table/rrhh_empleados/data?tenantId=${tenantId}`).then(r => r.json()),
        authFetch(`/api/table/vehiculos/data?tenantId=${tenantId}`).then(r => r.json()),
        authFetch(`/api/table/agroind_maquinaria_equipo/data?tenantId=${tenantId}`).then(r => r.json()),
        authFetch(`/api/table/lotes/data?tenantId=${tenantId}`).then(r => r.json()),
        authFetch(`/api/table/viveros/data?tenantId=${tenantId}`).then(r => r.json())
      ]);
      if (resFincas.data) setFincas([{ id_finca: 'Todas', nombre: 'Todas las fincas' }, ...resFincas.data]);
      if (resBodegas.data) setBodegas([{ id_bodega: 'Todas', nombre: 'Todas las bodegas' }, ...resBodegas.data]);
      if (resEmp.data) setEmpleados([{ id_empleado: 'Todos', nombres: 'Todos', apellidos: 'los empleados', documento: '', telefono: '' }, ...resEmp.data]);
      if (resVeh.data) setVehiculos([{ id_vehiculo: 'Todos', placa: 'Todos los vehículos' }, ...resVeh.data]);
      if (resMaq.data) setMaquinas([{ id_maq_agro: 'Todas', marca_modelo: 'Todas las máquinas' }, ...resMaq.data]);
      if (resLotes.data) setLotes([{ id_lote: 'Todos', nombre: 'Todos los lotes' }, ...resLotes.data]);
      if (resViveros.data) setViveros([{ id_vivero: 'Todos', nombre: 'Todos los viveros' }, ...resViveros.data]);
    } catch (err) {
      console.error('Error loading filters', err);
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      // Usamos el estado actual si no lo llamamos directamente, pero en el montaje usa el estado inicial
      const params = new URLSearchParams({
        tenantId,
        fincaId: filtros.fincaId,
        bodegaId: filtros.bodegaId,
        empleadoId: filtros.empleadoId,
        vehiculoId: filtros.vehiculoId,
        maquinaId: filtros.maquinaId,
        loteId: filtros.loteId,
        viveroId: filtros.viveroId,
        tipoMovimiento: filtros.tipoMovimiento,
        buscarProducto: filtros.buscarProducto
      });

      const response = await authFetch(`/api/reports/inventario/movimientos?${params}`);
      const result = await response.json();
      if (result.success) {
        setMovimientos(result.data);
      } else {
        message.error('Error: ' + result.error);
      }
    } catch (error) {
      message.error('Error al consultar movimientos');
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    if (movimientos.length === 0) return message.warning('No hay datos para exportar');
    const data = movimientos.map(s => ({
      'Fecha': dayjs(s.fecha_movimiento).format('YYYY-MM-DD HH:mm'),
      'Tipo': s.tipo_movimiento,
      'Finca': s.finca_nombre || 'N/A',
      'Bodega': s.bodega_nombre || 'N/A',
      'Cód': s.codigo,
      'Insumo': s.insumo_nombre,
      'Cantidad': Number(s.cantidad),
      'Costo Uni': Number(s.costo_unitario),
      'Destino': s.destino,
      'Observaciones': s.observaciones
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Movimientos');
    XLSX.writeFile(wb, `Movimientos_Inv_${dayjs().format('YYYYMMDD')}.xlsx`);
  };

  const generatePDFBase64 = () => {
    const doc = new jsPDF('landscape');
    doc.setFontSize(16);
    doc.text(`Reporte de Movimientos de Inventario - ${dayjs().format('YYYY-MM-DD')}`, 14, 20);
    const tableColumn = ["Fecha", "Tipo", "Bodega", "Insumo", "Cant", "Destino"];
    const tableRows = movimientos.map(s => [
      dayjs(s.fecha_movimiento).format('DD/MM/YYYY'),
      s.tipo_movimiento,
      s.bodega_nombre?.substring(0,15) || 'N/A',
      s.insumo_nombre?.substring(0,30),
      Number(s.cantidad).toFixed(2),
      s.destino?.substring(0,25)
    ]);
    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 30,
      styles: { fontSize: 8 },
    });
    return doc.output('datauristring');
  };

  const exportToPDF = () => {
    if (movimientos.length === 0) return message.warning('No hay datos para exportar');
    const doc = new jsPDF('landscape');
    doc.setFontSize(16);
    doc.text(`Reporte de Movimientos de Inventario - ${dayjs().format('YYYY-MM-DD')}`, 14, 20);
    const tableColumn = ["Fecha", "Tipo", "Bodega", "Insumo", "Cant", "Destino"];
    const tableRows = movimientos.map(s => [
      dayjs(s.fecha_movimiento).format('DD/MM/YYYY HH:mm'),
      s.tipo_movimiento,
      s.bodega_nombre || 'N/A',
      s.insumo_nombre,
      Number(s.cantidad).toFixed(2),
      s.destino
    ]);
    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 30,
    });
    doc.save(`Movimientos_Inv_${dayjs().format('YYYYMMDD')}.pdf`);
  };

  const handleSendWhatsApp = async () => {
    if (!selectedEmpleadoWs) return message.warning('Seleccione un empleado');
    const emp = empleados.find(e => e.id_empleado === selectedEmpleadoWs);
    if (!emp || !emp.telefono) return message.error('El empleado seleccionado no tiene un número de teléfono registrado.');

    setSendingWs(true);
    try {
      const pdfBase64 = generatePDFBase64();
      const base64Data = pdfBase64.split('base64,')[1];
      
      const payload = {
        number: emp.telefono,
        message: `Hola ${emp.nombres}, te adjuntamos el Reporte de Movimientos de Inventario solicitado.`,
        media: base64Data,
        mimetype: 'application/pdf',
        fileName: `Reporte_Movimientos_${dayjs().format('YYYYMMDD')}.pdf`
      };

      const res = await authFetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (data.success) {
        message.success('Reporte enviado por WhatsApp correctamente.');
        setShowWhatsAppModal(false);
      } else {
        message.error('Error al enviar WhatsApp: ' + data.error);
      }
    } catch (error) {
      console.error(error);
      message.error('Error de red al intentar enviar el mensaje.');
    } finally {
      setSendingWs(false);
    }
  };

  const columns = [
    { title: 'Fecha', dataIndex: 'fecha_movimiento', render: d => dayjs(d).format('DD/MM/YYYY HH:mm') },
    { title: 'Finca / Bodega', dataIndex: 'bodega_nombre', render: (t, r) => <div><Text strong>{r.finca_nombre}</Text><br/><Text type="secondary">{t}</Text></div> },
    { title: 'Tipo', dataIndex: 'tipo_movimiento', render: t => <Tag color={t === 'Entrada' ? 'green' : t === 'Salida' ? 'red' : 'blue'}>{t}</Tag> },
    { title: 'Insumo', dataIndex: 'insumo_nombre', render: (t, r) => <div><Text type="secondary" style={{fontSize: '0.8em'}}>{r.codigo}</Text><br/>{t}</div> },
    { title: 'Cant', dataIndex: 'cantidad', align: 'right', render: v => <b>{Number(v).toFixed(2)}</b> },
    { title: 'Destino', dataIndex: 'destino', render: d => <Text strong style={{ color: '#1890ff' }}>{d}</Text> },
  ];

  return (
    <div style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
      <Card bordered={false} style={{ marginBottom: 24, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <Title level={3} style={{ margin: 0, color: '#001529' }}>📋 Auditoría de Movimientos de Inventario</Title>
            <Text type="secondary">Rastrea entradas y salidas conociendo exactamente a qué empleado, vehículo o lote fueron asignadas.</Text>
          </div>
          <Space>
            <Button icon={<WhatsAppOutlined />} onClick={() => {
              if (movimientos.length === 0) return message.warning('Consulte primero los datos antes de enviarlos.');
              setShowWhatsAppModal(true);
            }} style={{ background: '#25D366', color: 'white', borderColor: '#25D366' }}>Enviar por WhatsApp</Button>
            <Button icon={<FileExcelOutlined />} onClick={exportToExcel} style={{ color: '#52c41a', borderColor: '#52c41a' }}>Excel</Button>
            <Button icon={<FilePdfOutlined />} onClick={exportToPDF} danger>PDF</Button>
          </Space>
        </div>

        <Row gutter={[16, 16]}>
          <Col xs={24} md={6}>
            <Text strong>Finca</Text>
            <Select style={{ width: '100%', marginTop: 4 }} value={filtros.fincaId} onChange={v => setFiltros({ ...filtros, fincaId: v })}>
              {fincas.map(f => <Option key={f.id_finca} value={f.id_finca}>{f.nombre}</Option>)}
            </Select>
          </Col>
          <Col xs={24} md={6}>
            <Text strong>Bodega</Text>
            <Select style={{ width: '100%', marginTop: 4 }} value={filtros.bodegaId} onChange={v => setFiltros({ ...filtros, bodegaId: v })}>
              {bodegas.map(b => <Option key={b.id_bodega} value={b.id_bodega}>{b.nombre}</Option>)}
            </Select>
          </Col>
          <Col xs={24} md={6}>
            <Text strong>Buscar Insumo</Text>
            <Input placeholder="Código o nombre..." style={{ width: '100%', marginTop: 4 }} value={filtros.buscarProducto} onChange={e => setFiltros({ ...filtros, buscarProducto: e.target.value })} onPressEnter={handleSearch} />
          </Col>
          <Col xs={24} md={6}>
            <Text strong>Tipo de Movimiento</Text>
            <Select style={{ width: '100%', marginTop: 4 }} value={filtros.tipoMovimiento} onChange={v => setFiltros({ ...filtros, tipoMovimiento: v })}>
              <Option value="Todos">Todos los Movimientos</Option>
              <Option value="Entrada">Entrada (Compras/Ajustes)</Option>
              <Option value="Salida">Salida (Consumos/Despachos)</Option>
              <Option value="Traslado">Traslados Internos</Option>
            </Select>
          </Col>

          {/* Fila de Destinos */}
          <Col xs={24} md={4}>
            <Text strong>Destino: Empleado</Text>
            <Select showSearch optionFilterProp="children" style={{ width: '100%', marginTop: 4 }} value={filtros.empleadoId} onChange={v => setFiltros({ ...filtros, empleadoId: v })}>
              {empleados.map(e => <Option key={e.id_empleado} value={e.id_empleado}>{e.id_empleado === 'Todos' ? 'Todos los empleados' : `${e.documento} - ${e.nombres} ${e.apellidos}`}</Option>)}
            </Select>
          </Col>
          <Col xs={24} md={4}>
            <Text strong>Destino: Vehículo</Text>
            <Select showSearch optionFilterProp="children" style={{ width: '100%', marginTop: 4 }} value={filtros.vehiculoId} onChange={v => setFiltros({ ...filtros, vehiculoId: v })}>
              {vehiculos.map(v => <Option key={v.id_vehiculo} value={v.id_vehiculo}>{v.placa}</Option>)}
            </Select>
          </Col>
          <Col xs={24} md={4}>
            <Text strong>Destino: Máquina</Text>
            <Select showSearch optionFilterProp="children" style={{ width: '100%', marginTop: 4 }} value={filtros.maquinaId} onChange={v => setFiltros({ ...filtros, maquinaId: v })}>
              {maquinas.map(m => <Option key={m.id_maq_agro} value={m.id_maq_agro}>{m.marca_modelo}</Option>)}
            </Select>
          </Col>
          <Col xs={24} md={4}>
            <Text strong>Destino: Lote</Text>
            <Select showSearch optionFilterProp="children" style={{ width: '100%', marginTop: 4 }} value={filtros.loteId} onChange={v => setFiltros({ ...filtros, loteId: v })}>
              {lotes.map(l => <Option key={l.id_lote} value={l.id_lote}>{l.nombre}</Option>)}
            </Select>
          </Col>
          <Col xs={24} md={4}>
            <Text strong>Destino: Vivero</Text>
            <Select showSearch optionFilterProp="children" style={{ width: '100%', marginTop: 4 }} value={filtros.viveroId} onChange={v => setFiltros({ ...filtros, viveroId: v })}>
              {viveros.map(vi => <Option key={vi.id_vivero} value={vi.id_vivero}>{vi.nombre}</Option>)}
            </Select>
          </Col>
          <Col xs={24} md={4} style={{ display: 'flex', alignItems: 'flex-end' }}>
            <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch} style={{ width: '100%' }}>Consultar</Button>
          </Col>
        </Row>
      </Card>

      <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <Table 
          columns={columns}
          dataSource={movimientos}
          rowKey="id_movimiento"
          loading={loading}
          pagination={{ pageSize: 50 }}
          bordered
        />
      </Card>

      <Modal
        title={<span><WhatsAppOutlined style={{ color: '#25D366', marginRight: 8 }} /> Enviar Reporte de Movimientos por WhatsApp</span>}
        visible={showWhatsAppModal}
        onCancel={() => setShowWhatsAppModal(false)}
        footer={[
          <Button key="cancel" onClick={() => setShowWhatsAppModal(false)}>Cancelar</Button>,
          <Button key="send" type="primary" style={{ background: '#25D366', borderColor: '#25D366' }} loading={sendingWs} onClick={handleSendWhatsApp}>Enviar PDF por WhatsApp</Button>
        ]}
      >
        <div style={{ padding: '20px 0' }}>
          <Text>Seleccione el empleado al que desea enviarle el resumen de los <b>{movimientos.length}</b> movimientos listados en la tabla actual:</Text>
          <div style={{ marginTop: 20 }}>
            <Text strong>Empleado Destino:</Text>
            <Select
              showSearch
              optionFilterProp="children"
              style={{ width: '100%', marginTop: 8 }}
              placeholder="Buscar empleado..."
              value={selectedEmpleadoWs}
              onChange={v => setSelectedEmpleadoWs(v)}
            >
              {empleados.filter(e => e.id_empleado !== 'Todos' && e.telefono).map(e => (
                <Option key={e.id_empleado} value={e.id_empleado}>{e.nombres} {e.apellidos} ({e.telefono})</Option>
              ))}
            </Select>
            <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: 8 }}>
              Solo se muestran empleados con número de teléfono registrado.
            </Text>
          </div>
        </div>
      </Modal>
    </div>
  );
}
