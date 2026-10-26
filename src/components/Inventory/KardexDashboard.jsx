import React, { useState, useEffect } from 'react';
import { Tabs, Select, Card, Row, Col, Table, Button, DatePicker, Tag, Space, notification, Divider, Typography } from 'antd';
import { SearchOutlined, FileExcelOutlined, FilePdfOutlined, InfoCircleOutlined, FilterOutlined } from '@ant-design/icons';
import { fetchTableData } from '../../utils/api';
import * as XLSX from 'xlsx';
import { downloadExcelWorkbook } from '../../utils/exportExcel';
import { getJsPDFConstructor, runAutoTable, downloadPdfDoc } from '../../utils/exportPdf';

import { authFetch } from '../../utils/api';

const { Option } = Select;
const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

export default function KardexDashboard({ tenantId }) {
  const [activeTab, setActiveTab] = useState('1');
  const [insumos, setInsumos] = useState([]);
  
  // Tab 1: Kárdex por Producto
  const [selectedInsumo, setSelectedInsumo] = useState(null);
  const [kardexDates, setKardexDates] = useState(null);
  const [kardexData, setKardexData] = useState(null);
  const [loadingKardex, setLoadingKardex] = useState(false);

  // Tab 2: Búsqueda Global
  const [globalLoading, setGlobalLoading] = useState(false);
  const [globalData, setGlobalData] = useState([]);
  const [filters, setFilters] = useState({});
  const [catalogs, setCatalogs] = useState({
    fincas: [], bodegas: [], empleados: [], vehiculos: [], maquinaria: [], lotes: []
  });

  useEffect(() => {
    // Cargar insumos
    fetchTableData('insumos', { tenantId, pageSize: 1000 }).then(res => setInsumos(res.data || []));

    // Cargar catálogos para filtros
    Promise.all([
      fetchTableData('fincas', { tenantId }),
      fetchTableData('bod_bodegas', { tenantId }),
      fetchTableData('rrhh_empleados', { tenantId }),
      fetchTableData('vehiculos', { tenantId }),
      fetchTableData('maquinaria', { tenantId }),
      fetchTableData('lotes', { tenantId })
    ]).then(([resFin, resBod, resEmp, resVeh, resMaq, resLot]) => {
      setCatalogs({
        fincas: resFin.data || [],
        bodegas: resBod.data || [],
        empleados: resEmp.data || [],
        vehiculos: resVeh.data || [],
        maquinaria: resMaq.data || [],
        lotes: resLot.data || []
      });
    });
  }, [tenantId]);

  // ---- Funciones Tab 1 (Kárdex Clásico) ----
  const fetchKardex = (insumoId, dates = kardexDates) => {
    setSelectedInsumo(insumoId);
    if (!insumoId) {
      setKardexData(null);
      return;
    }
    setLoadingKardex(true);
    let url = `/api/kardex/kardex/${insumoId}?tenantId=${tenantId}`;
    if (dates && dates.length === 2) {
      url += `&fechaInicio=${dates[0].format('YYYY-MM-DD')}&fechaFin=${dates[1].format('YYYY-MM-DD')}`;
    }
    authFetch(url)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setKardexData(data);
        }
      })
      .finally(() => setLoadingKardex(false));
  };

  const exportKardexExcel = () => {
    if (!kardexData) return;
    const dataToExport = kardexData.movimientos.map(m => ({
      Fecha: new Date(m.fecha_documento).toLocaleDateString(),
      Documento: `${m.tipo_documento} #${m.id_documento}`,
      Bodega: m.bodega,
      Naturaleza: m.naturaleza,
      Cantidad: Number(m.cantidad),
      Costo_Unitario: Number(m.costo_unitario),
      Total: Number(m.cantidad) * Number(m.costo_unitario),
      Responsable: m.persona_reclama || '',
      Maquina: m.id_maquina || ''
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Kardex");
    downloadExcelWorkbook(wb, `Kardex_${kardexData.insumo.codigo}.xlsx`);
  };

  const exportKardexPDF = () => {
    if (!kardexData) return;
    const doc = new (getJsPDFConstructor())();
    doc.text(`Kárdex Oficial: ${kardexData.insumo.nombre}`, 14, 15);
    const tableColumn = ["Fecha", "Documento", "Naturaleza", "Bodega", "Cantidad", "Costo U."];
    const tableRows = kardexData.movimientos.map(m => [
      new Date(m.fecha_documento).toLocaleDateString(),
      `${m.tipo_documento} #${m.id_documento}`,
      m.naturaleza,
      m.bodega,
      Number(m.cantidad).toLocaleString('es-CO'),
      `$${Number(m.costo_unitario).toLocaleString('es-CO')}`
    ]);
    runAutoTable(doc, { head: [tableColumn], body: tableRows, startY: 25 });
    downloadPdfDoc(doc, `Kardex_${kardexData.insumo.codigo}.pdf`);
  };

  // ---- Funciones Tab 2 (Rastreo Global) ----
  const handleSearchGlobal = () => {
    setGlobalLoading(true);
    const params = new URLSearchParams({ tenantId });
    if (filters.fincaId) params.append('fincaId', filters.fincaId);
    if (filters.bodegaId) params.append('bodegaId', filters.bodegaId);
    if (filters.insumoId) params.append('insumoId', filters.insumoId);
    if (filters.empleadoId) params.append('empleadoId', filters.empleadoId);
    if (filters.vehiculoId) params.append('vehiculoId', filters.vehiculoId);
    if (filters.maquinaId) params.append('maquinaId', filters.maquinaId);
    if (filters.loteId) params.append('loteId', filters.loteId);
    if (filters.dates && filters.dates.length === 2) {
      params.append('fechaInicio', filters.dates[0].format('YYYY-MM-DD'));
      params.append('fechaFin', filters.dates[1].format('YYYY-MM-DD'));
    }

    authFetch(`/api/kardex/movimientos/avanzados?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setGlobalData(data.data);
          if(data.data.length === 0) notification.info({ message: 'No se encontraron movimientos con estos filtros' });
        }
      })
      .catch(() => notification.error({ message: 'Error buscando movimientos' }))
      .finally(() => setGlobalLoading(false));
  };

  const exportGlobalExcel = () => {
    const dataToExport = globalData.map(m => ({
      Fecha: new Date(m.fecha_movimiento).toLocaleString(),
      Tipo: m.tipo_movimiento,
      Insumo: `${m.insumo_codigo} - ${m.insumo}`,
      Cantidad: Number(m.cantidad),
      Costo_Unitario: Number(m.costo_unitario),
      Bodega: m.bodega,
      Finca: m.finca,
      Responsable: m.emp_nombres ? `${m.emp_nombres} ${m.emp_apellidos}` : '',
      Vehiculo: m.vehiculo_placa || '',
      Maquina: m.maquina_nombre || '',
      Lote: m.lote_nombre || '',
      Ref: m.documento_referencia || ''
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Movimientos");
    downloadExcelWorkbook(wb, `Rastreo_Inventario_${new Date().getTime()}.xlsx`);
  };

  const exportGlobalPDF = () => {
    const doc = new (getJsPDFConstructor())('landscape');
    doc.text("Reporte de Rastreo Global de Inventario", 14, 15);
    const tableColumn = ["Fecha", "Tipo", "Insumo", "Cant", "Bodega", "Responsable", "Lote/Maq"];
    const tableRows = globalData.map(m => [
      new Date(m.fecha_movimiento).toLocaleDateString(),
      m.tipo_movimiento,
      m.insumo || 'N/A',
      Number(m.cantidad).toLocaleString('es-CO'),
      m.bodega || 'N/A',
      m.emp_nombres ? `${m.emp_nombres}` : 'N/A',
      m.lote_nombre || m.maquina_nombre || m.vehiculo_placa || 'N/A'
    ]);
    runAutoTable(doc, { head: [tableColumn], body: tableRows, startY: 25, styles: { fontSize: 8 } });
    downloadPdfDoc(doc, `Rastreo_Inventario_${new Date().getTime()}.pdf`);
  };

  // ---- Definición de Columnas ----
  const columnsKardex = [
    { title: 'Fecha', dataIndex: 'fecha_documento', render: v => new Date(v).toLocaleDateString() },
    { title: 'Doc', dataIndex: 'tipo_documento', render: (v, r) => `${v} #${r.id_documento}` },
    { title: 'Naturaleza', dataIndex: 'naturaleza', render: v => (
      <Tag color={v === 'Entrada' ? 'green' : v === 'Salida' ? 'orange' : 'blue'}>{v}</Tag>
    )},
    { title: 'Bodega', dataIndex: 'bodega' },
    { title: 'Cant.', dataIndex: 'cantidad', render: v => Number(v).toLocaleString('es-CO') },
    { title: 'Costo U.', dataIndex: 'costo_unitario', render: v => `$${Number(v).toLocaleString('es-CO')}` },
    { title: 'Total', key: 'total', render: (_, r) => `$${(Number(r.cantidad) * Number(r.costo_unitario)).toLocaleString('es-CO')}` }
  ];

  const columnsGlobal = [
    { title: 'Fecha', dataIndex: 'fecha_movimiento', render: v => new Date(v).toLocaleString() },
    { title: 'Tipo', dataIndex: 'tipo_movimiento', render: v => (
      <Tag color={v === 'Entrada' ? 'green' : v === 'Salida' ? 'orange' : v === 'Ajuste' ? 'blue' : 'default'}>{v}</Tag>
    )},
    { title: 'Insumo', dataIndex: 'insumo', render: (v, r) => <b>{r.insumo_codigo} - {v}</b> },
    { title: 'Cant.', dataIndex: 'cantidad', render: v => Number(v).toLocaleString('es-CO') },
    { title: 'Ubicación', dataIndex: 'bodega', render: (v, r) => <><Text type="secondary">{r.finca}</Text><br/>{v}</> },
    { title: 'Destino/Consumo', key: 'destino', render: (_, r) => (
      <div>
        {r.lote_nombre && <Tag color="green">Lote: {r.lote_nombre}</Tag>}
        {r.maquina_nombre && <Tag color="gold">Máq: {r.maquina_nombre}</Tag>}
        {r.vehiculo_placa && <Tag color="purple">Veh: {r.vehiculo_placa}</Tag>}
        {!r.lote_nombre && !r.maquina_nombre && !r.vehiculo_placa && <Text type="secondary">N/A</Text>}
      </div>
    )},
    { title: 'Responsable', key: 'responsable', render: (_, r) => r.emp_nombres ? `${r.emp_nombres} ${r.emp_apellidos}` : 'N/A' },
  ];

  return (
    <div style={{ padding: 24, background: 'var(--bg-main)', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={2} style={{ margin: 0, color: '#1f1f1f' }}>Centro de Comando: Kárdex y Rastreo</Title>
          <Text type="secondary">Análisis multidimensional de inventarios, existencias y costos.</Text>
        </div>
      </div>

      <Card style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          type="card"
          items={[
            {
              key: '1',
              label: 'Kárdex por Producto (Clásico)',
              children: (
                <div style={{ paddingTop: 16 }}>
                  <Row gutter={16}>
                    <Col span={8}>
                      <Text strong>Seleccione Insumo/Producto:</Text>
                      <Select
                        showSearch
                        style={{ width: '100%', marginTop: 8 }}
                        placeholder="Buscar por código o nombre..."
                        optionFilterProp="children"
                        onChange={(v) => fetchKardex(v, kardexDates)}
                        value={selectedInsumo}
                      >
                        {insumos.map(i => <Option key={i.id_insumo} value={i.id_insumo}>{i.codigo} - {i.nombre}</Option>)}
                      </Select>
                    </Col>
                    <Col span={6}>
                      <Text strong>Rango de Fechas (Opcional):</Text>
                      <RangePicker 
                        style={{ width: '100%', marginTop: 8 }} 
                        onChange={(v) => {
                          setKardexDates(v);
                          if (selectedInsumo) fetchKardex(selectedInsumo, v);
                        }} 
                      />
                    </Col>
                    {kardexData && (
                      <Col span={10} style={{ textAlign: 'right', paddingTop: 30 }}>
                        <Space>
                          <Button icon={<FileExcelOutlined />} style={{ background: '#107c41', color: 'white' }} onClick={exportKardexExcel}>
                            Excel Oficial
                          </Button>
                          <Button icon={<FilePdfOutlined />} danger type="primary" onClick={exportKardexPDF}>
                            PDF Oficial
                          </Button>
                        </Space>
                      </Col>
                    )}
                  </Row>

                  <Divider />

                  {kardexData && (
                    <>
                      <Row gutter={24}>
                        <Col span={8}>
                          <Card type="inner" title={<><InfoCircleOutlined/> Info del Producto</>} style={{ background: '#fafafa' }}>
                            <p><b>Código:</b> {kardexData.insumo.codigo}</p>
                            <p><b>Nombre:</b> {kardexData.insumo.nombre}</p>
                            <p><b>U. Medida:</b> {kardexData.insumo.unidad_medida}</p>
                            <p><b>Clasificación:</b> {kardexData.insumo.tipo_item}</p>
                          </Card>
                        </Col>
                        <Col span={16}>
                          <Card type="inner" title="Saldos Multibodega" style={{ background: '#fafafa' }}>
                            <Table 
                              dataSource={kardexData.saldos} 
                              rowKey="bodega"
                              pagination={false} 
                              size="small"
                              columns={[
                                { title: 'Bodega', dataIndex: 'bodega' },
                                { title: 'Ubicación', key: 'ubi', render: (_, r) => r.estanteria ? `${r.estanteria}-${r.nivel}` : 'N/A' },
                                { title: 'Stock Actual', dataIndex: 'stock_actual', render: v => <b>{Number(v).toLocaleString('es-CO')}</b> }
                              ]}
                            />
                          </Card>
                        </Col>
                      </Row>

                      <Card type="inner" title="Historial Contable de Movimientos" style={{ marginTop: 24 }}>
                        <Table 
                          dataSource={kardexData.movimientos} 
                          columns={columnsKardex} 
                          rowKey="id_documento"
                          size="small"
                          loading={loadingKardex}
                        />
                      </Card>
                    </>
                  )}
                </div>
              )
            },
            {
              key: '2',
              label: 'Rastreador Multidimensional Global',
              children: (
                <div style={{ paddingTop: 16 }}>
                  <Card size="small" style={{ background: '#f0f5ff', border: '1px solid #adc6ff', marginBottom: 24 }}>
                    <Row gutter={[16, 16]}>
                      <Col span={6}>
                        <Text strong>Finca</Text>
                        <Select style={{ width: '100%' }} allowClear placeholder="Todas las Fincas" onChange={v => setFilters({...filters, fincaId: v})}>
                          {catalogs.fincas.map(f => <Option key={f.id_finca} value={f.id_finca}>{f.nombre}</Option>)}
                        </Select>
                      </Col>
                      <Col span={6}>
                        <Text strong>Bodega</Text>
                        <Select style={{ width: '100%' }} allowClear placeholder="Todas las Bodegas" onChange={v => setFilters({...filters, bodegaId: v})}>
                          {catalogs.bodegas.map(b => <Option key={b.id_bodega} value={b.id_bodega}>{b.nombre}</Option>)}
                        </Select>
                      </Col>
                      <Col span={6}>
                        <Text strong>Insumo / Producto</Text>
                        <Select showSearch optionFilterProp="children" style={{ width: '100%' }} allowClear placeholder="Todos los Insumos" onChange={v => setFilters({...filters, insumoId: v})}>
                          {insumos.map(i => <Option key={i.id_insumo} value={i.id_insumo}>{i.codigo} - {i.nombre}</Option>)}
                        </Select>
                      </Col>
                      <Col span={6}>
                        <Text strong>Empleado / Responsable</Text>
                        <Select showSearch optionFilterProp="children" style={{ width: '100%' }} allowClear placeholder="Todos" onChange={v => setFilters({...filters, empleadoId: v})}>
                          {catalogs.empleados.map(e => <Option key={e.id_empleado} value={e.id_empleado}>{e.documento} - {e.nombres} {e.apellidos}</Option>)}
                        </Select>
                      </Col>

                      <Col span={6}>
                        <Text strong>Maquinaria</Text>
                        <Select style={{ width: '100%' }} allowClear placeholder="Cualquiera" onChange={v => setFilters({...filters, maquinaId: v})}>
                          {catalogs.maquinaria.map(m => <Option key={m.id_maquina} value={m.id_maquina}>{m.nombre}</Option>)}
                        </Select>
                      </Col>
                      <Col span={6}>
                        <Text strong>Vehículo</Text>
                        <Select style={{ width: '100%' }} allowClear placeholder="Cualquiera" onChange={v => setFilters({...filters, vehiculoId: v})}>
                          {catalogs.vehiculos.map(v => <Option key={v.id_vehiculo} value={v.id_vehiculo}>{v.placa} - {v.marca}</Option>)}
                        </Select>
                      </Col>
                      <Col span={6}>
                        <Text strong>Lote</Text>
                        <Select style={{ width: '100%' }} allowClear placeholder="Cualquiera" onChange={v => setFilters({...filters, loteId: v})}>
                          {catalogs.lotes.map(l => <Option key={l.id_lote} value={l.id_lote}>{l.nombre}</Option>)}
                        </Select>
                      </Col>
                      <Col span={6}>
                        <Text strong>Rango de Fechas</Text>
                        <RangePicker style={{ width: '100%' }} onChange={v => setFilters({...filters, dates: v})} />
                      </Col>

                      <Col span={24} style={{ textAlign: 'right' }}>
                        <Space>
                          <Button icon={<SearchOutlined />} type="primary" onClick={handleSearchGlobal} loading={globalLoading}>
                            Ejecutar Rastreo
                          </Button>
                          <Button icon={<FileExcelOutlined />} style={{ background: '#107c41', color: 'white' }} onClick={exportGlobalExcel} disabled={globalData.length === 0}>
                            Exportar a Excel
                          </Button>
                          <Button icon={<FilePdfOutlined />} danger type="primary" onClick={exportGlobalPDF} disabled={globalData.length === 0}>
                            Exportar a PDF
                          </Button>
                        </Space>
                      </Col>
                    </Row>
                  </Card>

                  <Table 
                    dataSource={globalData} 
                    columns={columnsGlobal} 
                    rowKey="id_movimiento"
                    size="small"
                    loading={globalLoading}
                    locale={{ emptyText: 'Aplica los filtros y haz clic en "Ejecutar Rastreo"' }}
                  />
                </div>
              )
            }
          ]}
        />
      </Card>
    </div>
  );
}
