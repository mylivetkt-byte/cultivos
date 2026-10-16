import React, { useState, useEffect } from 'react';
import { Table, Button, Card, Typography, Select, Row, Col, Space, Input, Tag, Modal, notification, Statistic } from 'antd';
import { PlusOutlined, MobileOutlined, AuditOutlined, CheckCircleOutlined, InfoCircleOutlined, ExclamationCircleOutlined, SearchOutlined, ScanOutlined, FilePdfOutlined, FileExcelOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { fetchTableData } from '../../utils/api';
import { authFetch } from '../../utils/api';

const { Title, Text } = Typography;
const { Option } = Select;
const { confirm } = Modal;

export default function TomaFisicaDashboard({ tenantId }) {
  const [tomas, setTomas] = useState([]);
  const [bodegas, setBodegas] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(false);

  // Vistas: 'list', 'create', 'count_mobile', 'auditory'
  const [currentView, setCurrentView] = useState('list');
  const [activeToma, setActiveToma] = useState(null);

  useEffect(() => {
    if (currentView === 'list') {
      loadTomas();
    }
  }, [currentView, tenantId]);

  useEffect(() => {
    fetchTableData('bod_bodegas', { tenantId }).then(res => setBodegas(res.data || []));
    fetchTableData('rrhh_empleados', { tenantId }).then(res => setEmpleados(res.data || []));
  }, [tenantId]);

  const loadTomas = () => {
    setLoading(true);
    authFetch(`/api/tomas-fisicas?tenantId=${tenantId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) setTomas(data.tomas);
      })
      .finally(() => setLoading(false));
  };

  // ---- CREACIÓN ----
  const [newForm, setNewForm] = useState({ id_bodega: null, responsable_id: null, observaciones: '' });
  
  const handleCreate = () => {
    if (!newForm.id_bodega) return notification.warning({ message: 'Seleccione una bodega' });
    setLoading(true);
    authFetch('/api/tomas-fisicas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId, ...newForm })
    }).then(res => res.json()).then(data => {
      if (data.success) {
        notification.success({ message: 'Toma Física Creada', description: 'El stock teórico ha sido congelado.' });
        setCurrentView('list');
      } else {
        notification.error({ message: 'Error', description: data.error });
      }
    }).finally(() => setLoading(false));
  };

  // ---- CONTEO MÓVIL (Operario) ----
  const [conteoItems, setConteoItems] = useState([]);
  const [searchItem, setSearchItem] = useState('');
  const [scannerActive, setScannerActive] = useState(false);
  const scannerRef = React.useRef(null);
  const [scannedItem, setScannedItem] = useState(null);

  const enterMobileCount = (toma) => {
    setActiveToma(toma);
    setLoading(true);
    authFetch(`/api/tomas-fisicas/${toma.id_toma}/detalles?modoConteo=true`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setConteoItems(data.detalles);
          setCurrentView('count_mobile');
        }
      })
      .finally(() => setLoading(false));
  };

  const startScanner = () => {
    setScannerActive(true);
    setTimeout(async () => {
      try {
        const { Html5QrcodeScanner } = await import('html5-qrcode');
        const scanner = new Html5QrcodeScanner(
          "reader",
          { fps: 10, qrbox: {width: 250, height: 150}, rememberLastUsedCamera: true },
          false
        );
        scanner.render(
          (decodedText) => {
            // Play a beep sound
            const audio = new Audio('https://www.soundjay.com/button/beep-07.wav');
            audio.play().catch(()=>{});
            
            handleScanSuccess(decodedText);
          },
          (error) => { /* handle error silently */ }
        );
        scannerRef.current = scanner;
      } catch (err) {
        console.error("Error cargando escáner", err);
        notification.error({ message: 'Error cargando escáner', description: err.message });
      }
    }, 100);
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(e => console.error(e));
      scannerRef.current = null;
    }
    setScannerActive(false);
  };

  const handleScanSuccess = (codigoEscanado) => {
    // Find item
    const item = conteoItems.find(i => i.codigo === codigoEscanado);
    if (item) {
      setScannedItem(item);
      stopScanner();
    } else {
      notification.warning({ message: 'Código no encontrado en esta Toma Física', description: codigoEscanado });
    }
  };

  const handleSaveCount = (idDetalle, stockFisico) => {
    if (stockFisico === null || stockFisico === '') return;
    
    // Optimistic UI update
    setConteoItems(prev => prev.map(i => i.id_detalle === idDetalle ? { ...i, stock_fisico: stockFisico, saving: true } : i));

    authFetch(`/api/tomas-fisicas/${activeToma.id_toma}/conteo/${idDetalle}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stock_fisico: stockFisico })
    }).then(() => {
      setConteoItems(prev => prev.map(i => i.id_detalle === idDetalle ? { ...i, saving: false } : i));
    });
  };

  // ---- AUDITORÍA / CONCILIACIÓN ----
  const [auditItems, setAuditItems] = useState([]);

  const enterAuditory = (toma) => {
    setActiveToma(toma);
    setLoading(true);
    authFetch(`/api/tomas-fisicas/${toma.id_toma}/detalles?modoConteo=false`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setAuditItems(data.detalles);
          setCurrentView('auditory');
        }
      })
      .finally(() => setLoading(false));
  };

  const handleConciliar = () => {
    confirm({
      title: '¿Generar Ajustes Automáticos?',
      icon: <ExclamationCircleOutlined />,
      content: 'Esta acción creará de forma automática Documentos de Entrada (Sobrantes) y de Salida (Faltantes). El Kárdex y los saldos reales se afectarán de inmediato. Esta acción es irreversible.',
      onOk() {
        setLoading(true);
        authFetch(`/api/tomas-fisicas/${activeToma.id_toma}/cierre`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenantId })
        }).then(res => res.json()).then(data => {
          if (data.success) {
            notification.success({ message: '¡Conciliación Exitosa!', description: 'Se han generado los documentos de ajuste correctamente.' });
            setCurrentView('list');
          } else {
            notification.error({ message: 'Error de Conciliación', description: data.error });
          }
        }).finally(() => setLoading(false));
      }
    });
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(auditItems.map(i => ({
      'Código': i.codigo,
      'Insumo': i.nombre,
      'Teórico (Sist.)': Number(i.stock_teorico),
      'Físico (Real)': i.stock_fisico !== null ? Number(i.stock_fisico) : 'Pendiente',
      'Diferencia': i.diferencia !== null ? Number(i.diferencia) : '-'
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Auditoría");
    XLSX.writeFile(wb, `Auditoria_Toma_${activeToma?.id_toma}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text(`Resultados de Auditoría: Toma Física #${activeToma?.id_toma} - ${activeToma?.bodega}`, 14, 15);
    
    const tableColumn = ["CÓDIGO", "INSUMO", "TEÓRICO", "FÍSICO", "DIFERENCIA"];
    const tableRows = auditItems.map(i => [
      i.codigo || '',
      i.nombre || '',
      i.stock_teorico,
      i.stock_fisico !== null ? i.stock_fisico : 'Pendiente',
      i.diferencia !== null ? i.diferencia : '-'
    ]);

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 20,
    });
    doc.save(`Auditoria_Toma_${activeToma?.id_toma}.pdf`);
  };

  // ---- RENDERIZADOS ----
  if (currentView === 'create') {
    return (
      <div style={{ padding: 24, maxWidth: 600, margin: '0 auto' }}>
        <Title level={3}>Iniciar Nueva Toma Física</Title>
        <Card>
          <Text strong>Bodega a Auditar</Text>
          <Select style={{ width: '100%', marginBottom: 16 }} onChange={v => setNewForm({...newForm, id_bodega: v})}>
            {bodegas.map(b => <Option key={b.id_bodega} value={b.id_bodega}>{b.nombre}</Option>)}
          </Select>
          
          <Text strong>Responsable del Conteo</Text>
          <Select style={{ width: '100%', marginBottom: 16 }} onChange={v => setNewForm({...newForm, responsable_id: v})}>
            {empleados.map(e => <Option key={e.id_empleado} value={e.id_empleado}>{e.nombres} {e.apellidos}</Option>)}
          </Select>

          <Text strong>Observaciones (Ej. Motivo de la toma)</Text>
          <Input.TextArea rows={3} style={{ width: '100%', marginBottom: 24 }} onChange={e => setNewForm({...newForm, observaciones: e.target.value})} />

          <Space>
            <Button type="primary" onClick={handleCreate} loading={loading}>Congelar Inventario e Iniciar</Button>
            <Button onClick={() => setCurrentView('list')}>Cancelar</Button>
          </Space>
        </Card>
      </div>
    );
  }

  if (currentView === 'count_mobile') {
    const filteredItems = conteoItems.filter(i => (i.nombre || '').toLowerCase().includes(searchItem.toLowerCase()) || (i.codigo || '').toLowerCase().includes(searchItem.toLowerCase()));
    
    // Modal to enter quantity after scanning
    const ScanInputModal = () => (
      <Modal
        title={`🔢 Ingresar Conteo: ${scannedItem?.nombre}`}
        open={!!scannedItem}
        footer={null}
        onCancel={() => { setScannedItem(null); startScanner(); }}
        maskClosable={false}
      >
        <div style={{ textAlign: 'center', padding: 20 }}>
          <Text type="secondary">Cód: {scannedItem?.codigo}</Text><br/>
          <Input
            autoFocus
            type="number"
            size="large"
            style={{ fontSize: 32, textAlign: 'center', margin: '20px 0', height: 60 }}
            placeholder="0"
            onPressEnter={(e) => {
              handleSaveCount(scannedItem.id_detalle, e.target.value);
              notification.success({ message: 'Conteo Guardado', duration: 1.5 });
              setScannedItem(null);
              startScanner(); // restart scanner
            }}
          />
          <Text type="secondary">Presiona "Enter" en el teclado numérico para guardar</Text>
        </div>
      </Modal>
    );

    return (
      <div style={{ background: '#f0f2f5', minHeight: '100vh', paddingBottom: 60 }}>
        {ScanInputModal()}
        <div style={{ background: '#001529', color: 'white', padding: 16, position: 'sticky', top: 0, zIndex: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Title level={4} style={{ color: 'white', margin: 0 }}>📱 Modo Conteo Láser</Title>
            <Button onClick={() => { stopScanner(); setCurrentView('list'); }} size="small">Salir</Button>
          </div>
          <div style={{ display: 'flex', width: '100%', gap: 8 }}>
            <Button type="primary" icon={<ScanOutlined />} size="large" onClick={scannerActive ? stopScanner : startScanner}>
              {scannerActive ? 'Apagar Cámara' : 'Lector Cámara / QR'}
            </Button>
            <Input 
              prefix={<SearchOutlined />} 
              placeholder="O Buscar Manual..." 
              size="large"
              value={searchItem}
              onChange={e => setSearchItem(e.target.value)}
              style={{ flex: 1 }}
            />
          </div>
        </div>

        {scannerActive && (
          <div style={{ padding: 16 }}>
            <Card bodyStyle={{ padding: 0, overflow: 'hidden', borderRadius: 8 }}>
              <div id="reader" style={{ width: '100%', minHeight: 300, background: '#000' }}></div>
            </Card>
          </div>
        )}

        <div style={{ padding: 16, display: scannerActive ? 'none' : 'block' }}>
          <Text type="secondary">Listado Manual de Ítems</Text>
          <div style={{ marginTop: 10 }}>
          {filteredItems.map(item => (
            <Card key={item.id_detalle} style={{ marginBottom: 16, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <Row align="middle">
                <Col span={14}>
                  <Text type="secondary">{item.codigo}</Text><br/>
                  <Text strong style={{ fontSize: 16 }}>{item.nombre}</Text>
                  <div style={{ marginTop: 4 }}>
                    {item.stock_fisico !== null ? <Tag color="green">Contado</Tag> : <Tag color="orange">Pendiente</Tag>}
                  </div>
                </Col>
                <Col span={10} style={{ textAlign: 'right' }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Conteo Físico ({item.unidad_medida})</Text>
                  <Input 
                    type="number" 
                    size="large"
                    style={{ 
                      fontSize: 24, textAlign: 'center', fontWeight: 'bold', 
                      background: item.stock_fisico !== null ? '#f6ffed' : 'white',
                      borderColor: item.stock_fisico !== null ? '#b7eb8f' : '#d9d9d9',
                    }}
                    value={item.stock_fisico !== null ? item.stock_fisico : ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setConteoItems(prev => prev.map(i => i.id_detalle === item.id_detalle ? { ...i, stock_fisico: val } : i));
                    }}
                    onBlur={(e) => handleSaveCount(item.id_detalle, e.target.value)}
                  />
                  {item.saving && <Text type="secondary" style={{ fontSize: 10 }}>Guardando...</Text>}
                </Col>
              </Row>
            </Card>
          ))}
          </div>
        </div>
      </div>
    );
  }

  if (currentView === 'auditory') {
    return (
      <div style={{ padding: 24, background: 'var(--bg-card)', minHeight: '100vh' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <Title level={2} style={{ margin: 0 }}>Mesa de Control y Conciliación</Title>
            <Text type="secondary">Toma Física #{activeToma?.id_toma} - {activeToma?.bodega}</Text>
          </div>
          <Space>
            <Button className="btn-action-base btn-excel" icon={<FileExcelOutlined />} onClick={exportToExcel}>Excel</Button>
            <Button className="btn-action-base btn-pdf" icon={<FilePdfOutlined />} onClick={exportToPDF}>PDF</Button>
            <Button onClick={() => setCurrentView('list')}>Volver</Button>
            {activeToma?.estado !== 'Conciliado' && (
              <Button type="primary" icon={<CheckCircleOutlined />} onClick={handleConciliar} loading={loading} style={{ background: '#52c41a' }}>
                Aprobar y Ajustar Inventario Automáticamente
              </Button>
            )}
          </Space>
        </div>

        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={8}>
            <Card>
              <Statistic title="Total Ítems" value={auditItems.length} />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic 
                title="Pendientes por contar" 
                value={auditItems.filter(i => i.stock_fisico === null).length} 
                valueStyle={{ color: '#cf1322' }} 
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic 
                title="Ítems con Diferencia" 
                value={auditItems.filter(i => i.diferencia !== null && Number(i.diferencia) !== 0).length} 
                valueStyle={{ color: '#faad14' }} 
              />
            </Card>
          </Col>
        </Row>

        <Table 
          dataSource={auditItems} 
          rowKey="id_detalle"
          loading={loading}
          pagination={false}
          columns={[
            { title: 'Cód.', dataIndex: 'codigo' },
            { title: 'Insumo', dataIndex: 'nombre', render: (v,r) => <b>{v} ({r.unidad_medida})</b> },
            { title: 'Teórico (Sist.)', dataIndex: 'stock_teorico', render: v => <Text type="secondary">{Number(v).toLocaleString('es-CO')}</Text> },
            { title: 'Físico (Real)', dataIndex: 'stock_fisico', render: v => v !== null ? <b>{Number(v).toLocaleString('es-CO')}</b> : <Tag color="red">Sin contar</Tag> },
            { title: 'Diferencia', dataIndex: 'diferencia', render: (v) => {
                if (v === null) return '-';
                const dif = Number(v);
                if (dif === 0) return <Tag color="green">Cuadrado</Tag>;
                if (dif > 0) return <Tag color="blue">Sobrante (+{dif})</Tag>;
                return <Tag color="orange">Faltante ({dif})</Tag>;
              }
            }
          ]}
        />
      </div>
    );
  }

  // ---- LISTADO (Default) ----
  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>Gestión de Tomas Físicas</Title>
          <Text type="secondary">Auditoría y conciliación de inventarios reales</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCurrentView('create')}>
          Iniciar Nueva Toma
        </Button>
      </div>

      <Table 
        dataSource={tomas} 
        rowKey="id_toma"
        loading={loading}
        columns={[
          { title: 'ID', dataIndex: 'id_toma', render: v => <b>#{v}</b> },
          { title: 'Fecha', dataIndex: 'fecha_creacion', render: v => new Date(v).toLocaleString() },
          { title: 'Bodega', dataIndex: 'bodega' },
          { title: 'Responsable', key: 'resp', render: (_, r) => r.resp_nombres ? `${r.resp_nombres} ${r.resp_apellidos}` : 'N/A' },
          { title: 'Avance', key: 'avance', render: (_, r) => `${r.contados || 0} / ${r.total_items || 0} contados` },
          { title: 'Estado', dataIndex: 'estado', render: v => (
            <Tag color={v === 'Borrador' ? 'default' : v === 'En Conteo' ? 'orange' : 'green'}>{v}</Tag>
          )},
          { title: 'Acciones', key: 'acc', render: (_, r) => (
            <Space>
              {r.estado !== 'Conciliado' && (
                <Button icon={<MobileOutlined />} onClick={() => enterMobileCount(r)}>Contar</Button>
              )}
              <Button type="primary" ghost icon={<AuditOutlined />} onClick={() => enterAuditory(r)}>
                {r.estado === 'Conciliado' ? 'Ver Resultado' : 'Conciliar'}
              </Button>
            </Space>
          )}
        ]}
      />
    </div>
  );
}
