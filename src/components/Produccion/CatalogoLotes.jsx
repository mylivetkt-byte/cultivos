import React, { useState, useEffect } from 'react';
import { authFetch, fetchTableData } from '../../utils/api';
import { ConfigProvider, theme, Tabs, Table, Select, Card, Row, Col, Typography, Tag, Space, Button, DatePicker } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined, HistoryOutlined, DownloadOutlined, FileExcelOutlined, FilePdfOutlined, WhatsAppOutlined } from '@ant-design/icons';
import TableRenderer from '../TableRenderer';
import { exportReporteGerencialLotes } from '../../utils/exportReporteGerencialLotes';
import { exportReporteGerencialLotesExcel } from '../../utils/exportReporteGerencialLotesExcel';
import { exportReporteDetalladoLote } from '../../utils/exportReporteDetalladoLote';
import { exportReporteDetalladoLoteExcel } from '../../utils/exportReporteDetalladoLoteExcel';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;
const { RangePicker } = DatePicker;

export default function CatalogoLotes({ tenantId, selectedFinca, selectedNucleo }) {
  const [activeTab, setActiveTab] = useState('1');
  const [lotesAvanzado, setLotesAvanzado] = useState([]);
  const [loadingLotes, setLoadingLotes] = useState(false);
  const [selectedLote, setSelectedLote] = useState(null);
  
  // Tab states
  const [historicoData, setHistoricoData] = useState(null);
  const [cosechasData, setCosechasData] = useState([]);
  const [laboresData, setLaboresData] = useState([]);
  const [insumosData, setInsumosData] = useState([]);
  const [loadingTab, setLoadingTab] = useState(false);
  const [historyDateRange, setHistoryDateRange] = useState(null);

  const getFilteredData = (data, dateField) => {
    if (!historyDateRange || historyDateRange.length !== 2) return data;
    const start = historyDateRange[0].startOf('day').valueOf();
    const end = historyDateRange[1].endOf('day').valueOf();
    return data.filter(item => {
      const val = item[dateField] || item.fecha_planificada;
      if (!val) return false;
      const itemTime = new Date(val).getTime();
      return itemTime >= start && itemTime <= end;
    });
  };

  const [fincasList, setFincasList] = useState([]);
  const [nucleosList, setNucleosList] = useState([]);
  
  const [filterFinca, setFilterFinca] = useState(selectedFinca || null);
  const [filterNucleo, setFilterNucleo] = useState(selectedNucleo || null);
  const [filterDateRange, setFilterDateRange] = useState(null);

  useEffect(() => {
    const loadFiltersData = async () => {
      try {
        const [resFincas, resNucleos] = await Promise.all([
          fetchTableData('fincas', { tenantId, pageSize: 100 }),
          fetchTableData('nucleos', { tenantId, pageSize: 500 })
        ]);
        setFincasList(resFincas.data || []);
        setNucleosList(resNucleos.data || []);
      } catch (e) {
        console.error(e);
      }
    };
    loadFiltersData();
  }, [tenantId]);

  useEffect(() => {
    if (activeTab === '1') {
      fetchLotesAvanzado();
    }
  }, [activeTab, tenantId]);

  useEffect(() => {
    if (selectedLote) {
      fetchHistoricoData();
      if (activeTab === '2') fetchCosechas();
      else if (activeTab === '3') fetchLabores();
      else if (activeTab === '4') fetchLabores();
      else if (activeTab === '5') fetchInsumos();
    }
  }, [selectedLote, activeTab]);

  const fetchHistoricoData = async () => {
    try {
      const res = await authFetch(`/api/produccion/lotes/${selectedLote}/historico`);
      if (res.ok) {
        const json = await res.json();
        setHistoricoData(json.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchLotesAvanzado = async () => {
    setLoadingLotes(true);
    try {
      let url = `/api/produccion/lotes/avanzado?id_tenant=${tenantId}`;
      if (filterFinca) url += `&id_finca=${filterFinca}`;
      if (filterNucleo) url += `&id_nucleo=${filterNucleo}`;
      if (filterDateRange && filterDateRange.length === 2) {
        url += `&fecha_inicio=${filterDateRange[0].format('YYYY-MM-DD')}&fecha_fin=${filterDateRange[1].format('YYYY-MM-DD')}`;
      }
      
      const res = await authFetch(url);
      if (res.ok) {
        const json = await res.json();
        setLotesAvanzado(json.data || []);
      }
    } catch (e) {
      console.error(e);
    }
    setLoadingLotes(false);
  };

  const fetchCosechas = async () => {
    setLoadingTab(true);
    try {
      const res = await authFetch(`/api/produccion/lotes/${selectedLote}/cosechas_historial`);
      if (res.ok) {
        const json = await res.json();
        const data = json.data || [];
        
        // Calcular acumulado histórico desde la más antigua a la más nueva (el array viene DESC)
        let acumulado = 0;
        for (let i = data.length - 1; i >= 0; i--) {
          acumulado += Number(data[i].produccion_total_kg || 0);
          data[i].acumulado_kg = acumulado;
        }
        
        setCosechasData(data);
      }
    } catch (e) { console.error(e); }
    setLoadingTab(false);
  };

  const fetchLabores = async () => {
    setLoadingTab(true);
    try {
      const res = await authFetch(`/api/produccion/lotes/${selectedLote}/labores_historial`);
      if (res.ok) {
        const json = await res.json();
        setLaboresData(json.data || []);
      }
    } catch (e) { console.error(e); }
    setLoadingTab(false);
  };

  const fetchInsumos = async () => {
    setLoadingTab(true);
    try {
      const res = await authFetch(`/api/produccion/lotes/${selectedLote}/insumos_historial`);
      if (res.ok) {
        const json = await res.json();
        setInsumosData(json.data || []);
      }
    } catch (e) { console.error(e); }
    setLoadingTab(false);
  };

  const handleDownloadLoteReport = async (type) => {
    if (!historicoData || !historicoData.lote) return;
    
    // Si la data no está cargada (el usuario no ha hecho click en las pestañas), la forzamos a cargar:
    let cosechas = cosechasData;
    let labores = laboresData;
    let insumos = insumosData;
    
    try {
      if (cosechas.length === 0) {
        const res = await authFetch(`/api/produccion/lotes/${selectedLote}/cosechas_historial`);
        if (res.ok) {
          const json = await res.json();
          let data = json.data || [];
          let acumulado = 0;
          for (let i = data.length - 1; i >= 0; i--) {
            acumulado += Number(data[i].produccion_total_kg || 0);
            data[i].acumulado_kg = acumulado;
          }
          cosechas = data;
          setCosechasData(data);
        }
      }
      if (labores.length === 0) {
        const res = await authFetch(`/api/produccion/lotes/${selectedLote}/labores_historial`);
        if (res.ok) { const json = await res.json(); labores = json.data || []; setLaboresData(labores); }
      }
      if (insumos.length === 0) {
        const res = await authFetch(`/api/produccion/lotes/${selectedLote}/insumos_historial`);
        if (res.ok) { const json = await res.json(); insumos = json.data || []; setInsumosData(insumos); }
      }
      
      const metadata = { empresa: 'Agropecuaria Llanos Orientales S.A.S.' };
      
      if (type === 'pdf') {
        await exportReporteDetalladoLote(historicoData, cosechas, labores, insumos, metadata);
      } else if (type === 'excel') {
        exportReporteDetalladoLoteExcel(historicoData, cosechas, labores, insumos, metadata);
      }
    } catch(e) {
      console.error(e);
      alert('Error cargando datos para el reporte.');
    }
  };

  const handleWhatsAppLote = async () => {
    if (!historicoData || !historicoData.lote) return;
    
    let labores = laboresData;
    let insumos = insumosData;
    
    try {
      if (labores.length === 0) {
        const res = await authFetch(`/api/produccion/lotes/${selectedLote}/labores_historial`);
        if (res.ok) { const json = await res.json(); labores = json.data || []; setLaboresData(labores); }
      }
      if (insumos.length === 0) {
        const res = await authFetch(`/api/produccion/lotes/${selectedLote}/insumos_historial`);
        if (res.ok) { const json = await res.json(); insumos = json.data || []; setInsumosData(insumos); }
      }
      
      const totalCostoLabores = labores.reduce((sum, l) => sum + Number(l.costo_mano_obra || 0), 0);
      const totalCostoInsumos = insumos.reduce((sum, i) => sum + Number(i.costo_total || 0), 0);
      
      const { lote, produccionAcumulada } = historicoData;
      let msg = `*Reporte Gerencial del Lote: ${lote.codigo}*\n\n`;
      msg += `📍 *Ubicación*: Finca ${lote.finca_nombre || ''}\n`;
      msg += `📐 *Área*: ${lote.hectareas} Hectáreas\n`;
      msg += `🌾 *Producción Acumulada*: ${produccionAcumulada ? Number(produccionAcumulada).toLocaleString() + ' Kg' : '0 Kg'}\n\n`;
      msg += `*Resumen de Costos*\n`;
      msg += `👷‍♂️ Nómina y Labores: $${Number(totalCostoLabores).toLocaleString()}\n`;
      msg += `🧪 Insumos Aplicados: $${Number(totalCostoInsumos).toLocaleString()}\n`;
      msg += `💰 *Costo Total Lote*: $${Number(totalCostoLabores + totalCostoInsumos).toLocaleString()}\n\n`;
      msg += `Se ha generado el reporte detallado en sistema.`;
      
      const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
      window.open(url, '_blank');
    } catch(e) {
      console.error(e);
    }
  };

  const exportToExcel = (data, columns, filename) => {
    const excelData = [columns.map(c => c.title)];
    data.forEach(row => {
      excelData.push(columns.map(c => {
        if (c.render && !['Acciones'].includes(c.title)) {
          // Attempt to extract string from simple renders
          const rendered = c.render(row[c.dataIndex], row);
          if (typeof rendered === 'string' || typeof rendered === 'number') return rendered;
          if (rendered && rendered.props && rendered.props.children) {
              if (typeof rendered.props.children === 'string' || typeof rendered.props.children === 'number') return rendered.props.children;
          }
        }
        return row[c.dataIndex] || '';
      }));
    });
    const ws = XLSX.utils.aoa_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Datos');
    XLSX.writeFile(wb, `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Export handlers
  const handleExportExcel = () => {
    exportReporteGerencialLotesExcel(lotesAvanzado, { finca: filterFinca, nucleo: filterNucleo, fechas: filterDateRange });
  };

  const handleExportPDF = () => {
    exportReporteGerencialLotes(lotesAvanzado, { finca: filterFinca, nucleo: filterNucleo, fechas: filterDateRange });
  };

  const handleWhatsAppLotes = () => {
    if (!lotesAvanzado || lotesAvanzado.length === 0) return;
    const totales = lotesAvanzado.reduce((acc, l) => ({
      hectareas: acc.hectareas + Number(l.hectareas || 0),
      estimada: acc.estimada + Number(l.produccion_estimada_ton || 0),
      recolectada: acc.recolectada + Number(l.recolectado_ton || 0)
    }), { hectareas: 0, estimada: 0, recolectada: 0 });

    let msg = `*Reporte Gerencial de Lotes*\n`;
    msg += `Total Lotes: ${lotesAvanzado.length}\n`;
    msg += `Total Hectáreas: ${totales.hectareas.toFixed(2)}\n`;
    msg += `Prod. Estimada (Ton): ${totales.estimada.toFixed(2)}\n`;
    msg += `Prod. Recolectada (Ton): ${totales.recolectada.toFixed(2)}\n\n`;
    msg += `Top 10 Lotes (por área):\n`;
    [...lotesAvanzado].sort((a,b) => Number(b.hectareas) - Number(a.hectareas)).slice(0,10).forEach(l => {
      msg += `- ${l.codigo} (${l.hectareas} ha)\n`;
    });
    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  // Renderers para las tablas
  const renderInventario = () => {
    const inventarioColumns = [
      { title: 'ID', dataIndex: 'id_lote', key: 'id_lote', width: 60, render: id => <b>#{id}</b> },
      { title: 'Finca', dataIndex: 'finca_nombre', key: 'finca_nombre' },
      { title: 'Núcleo', dataIndex: 'nucleo_nombre', key: 'nucleo_nombre' },
      { title: 'Código', dataIndex: 'codigo', key: 'codigo' },
      { title: 'Nombre', dataIndex: 'nombre', key: 'nombre' },
      { title: 'Hectáreas', dataIndex: 'hectareas', key: 'hectareas' },
      { 
        title: 'Árboles Sembrados', 
        dataIndex: 'arboles_sembrados', 
        key: 'arboles_sembrados',
        render: (val) => <Tag color="green">{val}</Tag>
      },
      {
        title: 'Acciones',
        key: 'acciones',
        render: (_, record) => (
          <Space>
            <Button type="primary" size="small" icon={<HistoryOutlined />} onClick={() => { setSelectedLote(record.id_lote); setActiveTab('2'); }}>Histórico</Button>
          </Space>
        )
      }
    ];

    return (
      <div>
        <Card style={{ marginBottom: 16 }} bodyStyle={{ padding: '12px 16px', background: '#141414' }}>
          <Row gutter={16} align="middle">
            <Col span={6}>
              <Select showSearch style={{ width: '100%' }} placeholder="Filtrar por Finca" value={filterFinca} onChange={setFilterFinca} allowClear optionFilterProp="children">
                {fincasList.map(f => <Option key={f.id_finca || f.id} value={f.id_finca || f.id}>{f.codigo} - {f.nombre}</Option>)}
              </Select>
            </Col>
            <Col span={6}>
              <Select showSearch style={{ width: '100%' }} placeholder="Filtrar por Núcleo" value={filterNucleo} onChange={setFilterNucleo} allowClear optionFilterProp="children">
                {nucleosList.filter(n => !filterFinca || n.id_finca === filterFinca || n.id_finca === parseInt(filterFinca)).map(n => <Option key={n.id_nucleo || n.id} value={n.id_nucleo || n.id}>{n.codigo} - {n.nombre}</Option>)}
              </Select>
            </Col>
            <Col span={8}>
              <RangePicker style={{ width: '100%' }} placeholder={['Siembra desde', 'Siembra hasta']} value={filterDateRange} onChange={setFilterDateRange} />
            </Col>
            <Col span={4}>
              <Button type="primary" onClick={fetchLotesAvanzado} block>Procesar</Button>
            </Col>
          </Row>
        </Card>
        
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: 16 }}>
          <Button icon={<FileExcelOutlined />} style={{ background: '#237A3B', color: 'white', borderColor: '#237A3B' }} onClick={handleExportExcel}>Excel</Button>
          <Button icon={<WhatsAppOutlined />} style={{ background: '#25D366', color: 'white', borderColor: '#25D366' }} onClick={handleWhatsAppLotes}>WhatsApp</Button>
          <Button icon={<FilePdfOutlined />} style={{ background: '#E3242B', color: 'white', borderColor: '#E3242B' }} onClick={handleExportPDF}>PDF Gerencial</Button>
        </div>

        <Table columns={inventarioColumns} dataSource={lotesAvanzado} rowKey="id_lote" loading={loadingLotes} pagination={{ pageSize: 10 }} />
      </div>
    );
  };

  const renderCosechas = () => {
    const filteredCosechas = getFilteredData(cosechasData, 'fecha_cosecha');
    const cols = [
      { title: 'Fecha Cosecha', dataIndex: 'fecha_cosecha', render: v => v ? new Date(v).toLocaleDateString() : '-' },
      { title: 'Fecha Siembra Asoc.', dataIndex: 'fecha_siembra', render: v => v ? new Date(v).toLocaleDateString() : '-' },
      { title: 'Producción Total (Kg)', dataIndex: 'produccion_total_kg', render: v => <Tag color="blue">{v} Kg</Tag> },
      { title: 'Acumulado a la fecha (Kg)', dataIndex: 'acumulado_kg', render: v => <strong>{Number(v).toLocaleString()} Kg</strong> },
      { title: 'Rendimiento (Kg/Ha)', dataIndex: 'rendimiento_obtenido_kg_ha' }
    ];
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <Title level={4}>Historial de Cosechas</Title>
          <Button className="btn-action-base btn-excel" icon={<DownloadOutlined />} onClick={() => exportToExcel(filteredCosechas, cols, 'Cosechas_Lote')}>Exportar Excel</Button>
        </div>
        <Table columns={cols} dataSource={filteredCosechas} rowKey="id_cosecha" loading={loadingTab} size="small" />
      </div>
    );
  };

  const renderNomina = () => {
    const filteredLabores = getFilteredData(laboresData, 'fecha_completado');
    const cols = [
      { title: 'Fecha Completado', dataIndex: 'fecha_completado', render: (v, r) => v ? new Date(v).toLocaleDateString() : (r.fecha_planificada ? new Date(r.fecha_planificada).toLocaleDateString() : '-') },
      { title: 'Labor', dataIndex: 'labor_nombre' },
      { title: 'Categoría', dataIndex: 'labor_categoria' },
      { title: 'Empleado', key: 'empleado', render: (_, r) => `${r.empleado_nombres || ''} ${r.empleado_apellidos || ''}` },
      { title: 'Horas', dataIndex: 'horas_trabajadas' },
      { title: 'Costo (Mano Obra)', dataIndex: 'costo_mano_obra', render: v => v ? `$${Number(v).toLocaleString()}` : '-' }
    ];
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <Title level={4}>Historial de Nómina y Labores</Title>
          <Button className="btn-action-base btn-excel" icon={<DownloadOutlined />} onClick={() => exportToExcel(filteredLabores, cols, 'Nomina_Lote')}>Exportar Excel</Button>
        </div>
        <Table columns={cols} dataSource={filteredLabores} rowKey="id_labor" loading={loadingTab} size="small" />
      </div>
    );
  };

  const renderMaquinaria = () => {
    // Show only records that have machinery or vehicle
    const filteredLabores = getFilteredData(laboresData, 'fecha_completado').filter(l => l.maquinaria_nombre || l.vehiculo_placa);
    
    const cols = [
      { title: 'Fecha Completado', dataIndex: 'fecha_completado', render: (v, r) => v ? new Date(v).toLocaleDateString() : (r.fecha_planificada ? new Date(r.fecha_planificada).toLocaleDateString() : '-') },
      { title: 'Labor', dataIndex: 'labor_nombre' },
      { title: 'Categoría', dataIndex: 'labor_categoria' },
      { title: 'Maquinaria / Vehículo', key: 'maquinaria', render: (_, r) => r.maquinaria_nombre ? `${r.maquinaria_nombre} (${r.maquinaria_tipo})` : r.vehiculo_placa ? `Vehículo: ${r.vehiculo_placa}` : 'N/A' },
      { title: 'Operador', key: 'operador', render: (_, r) => `${r.empleado_nombres || ''} ${r.empleado_apellidos || ''}` },
      { title: 'Horas Uso', dataIndex: 'horas_trabajadas' }
    ];
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <Title level={4}>Historial de Maquinaria y Equipos</Title>
          <Button className="btn-action-base btn-excel" icon={<DownloadOutlined />} onClick={() => exportToExcel(filteredLabores, cols, 'Maquinaria_Lote')}>Exportar Excel</Button>
        </div>
        <Table columns={cols} dataSource={filteredLabores} rowKey={(record) => `maq_${record.id_labor}`} loading={loadingTab} size="small" />
      </div>
    );
  };

  const renderInsumos = () => {
    const filteredInsumos = getFilteredData(insumosData, 'fecha_completado');
    const cols = [
      { title: 'Fecha Aplicación', dataIndex: 'fecha_completado', render: (v, r) => v ? new Date(v).toLocaleDateString() : (r.fecha_planificada ? new Date(r.fecha_planificada).toLocaleDateString() : '-') },
      { title: 'Insumo (Código)', dataIndex: 'insumo_codigo' },
      { title: 'Insumo (Nombre)', dataIndex: 'insumo_nombre' },
      { title: 'Labor Asociada', dataIndex: 'labor_nombre' },
      { title: 'Cantidad', dataIndex: 'cantidad_aplicada', render: (v, r) => `${v} ${r.unidad_medida || ''}` },
      { title: 'Costo Unit.', dataIndex: 'costo_unitario', render: v => v ? `$${Number(v).toLocaleString()}` : '-' },
      { title: 'Costo Total', dataIndex: 'costo_total', render: v => <Tag color="red">{v ? `$${Number(v).toLocaleString()}` : '-'}</Tag> }
    ];
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <Title level={4}>Historial de Insumos Aplicados</Title>
          <Button className="btn-action-base btn-excel" icon={<DownloadOutlined />} onClick={() => exportToExcel(filteredInsumos, cols, 'Insumos_Lote')}>Exportar Excel</Button>
        </div>
        <Table columns={cols} dataSource={filteredInsumos} rowKey="id_labor_insumo" loading={loadingTab} size="small" />
      </div>
    );
  };

  const renderLoteSummary = () => {
    if (!historicoData || !historicoData.lote) return null;
    const { lote, siembra, ultimaCosecha, edadMeses, proximaCosecha, produccionAcumulada } = historicoData;
    const labelStyle = { color: 'rgba(255,255,255,0.8)', fontSize: '15px' };
    const valueStyle = { fontSize: '15px' };
    
    return (
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: 12 }}>
          <Button icon={<FileExcelOutlined />} style={{ background: '#237A3B', color: 'white', borderColor: '#237A3B' }} onClick={() => handleDownloadLoteReport('excel')}>Excel Detallado</Button>
          <Button icon={<WhatsAppOutlined />} style={{ background: '#25D366', color: 'white', borderColor: '#25D366' }} onClick={handleWhatsAppLote}>Resumen WhatsApp</Button>
          <Button icon={<FilePdfOutlined />} style={{ background: '#E3242B', color: 'white', borderColor: '#E3242B' }} onClick={() => handleDownloadLoteReport('pdf')}>PDF Detallado</Button>
        </div>
        <Row gutter={[16, 16]}>
        <Col span={8}>
          <Card size="small" style={{ background: 'linear-gradient(145deg, #1f1c2c 0%, #928DAB 100%)', borderColor: 'transparent', borderRadius: '12px', color: '#fff', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }}>
            <Title level={4} style={{ color: '#fff', marginTop: 0, marginBottom: '12px' }}>Datos Generales</Title>
            <div style={{ marginBottom: '6px' }}><Text style={labelStyle}>Finca:</Text> <strong style={valueStyle}>{lote.finca_nombre || 'N/A'}</strong></div>
            <div style={{ marginBottom: '6px' }}><Text style={labelStyle}>Núcleo:</Text> <strong style={valueStyle}>{lote.nucleo_nombre || 'N/A'}</strong></div>
            <div style={{ marginBottom: '6px' }}><Text style={labelStyle}>Código:</Text> <strong style={valueStyle}>{lote.codigo}</strong></div>
            <div style={{ marginBottom: '6px' }}><Text style={labelStyle}>Nombre:</Text> <strong style={valueStyle}>{lote.nombre}</strong></div>
            <div><Text style={labelStyle}>Hectáreas:</Text> <strong style={valueStyle}>{lote.hectareas}</strong></div>
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" style={{ background: 'linear-gradient(145deg, #134E5E 0%, #71B280 100%)', borderColor: 'transparent', borderRadius: '12px', color: '#fff', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }}>
            <Title level={4} style={{ color: '#fff', marginTop: 0, marginBottom: '12px' }}>Cultivo Actual</Title>
            <div style={{ marginBottom: '6px' }}><Text style={labelStyle}>Cultivo:</Text> <strong style={valueStyle}>{siembra ? siembra.cultivo_nombre || 'N/A' : 'Sin Siembra'}</strong></div>
            <div style={{ marginBottom: '6px' }}><Text style={labelStyle}>Fecha Siembra:</Text> <strong style={valueStyle}>{siembra ? new Date(siembra.fecha_siembra).toLocaleDateString() : 'N/A'}</strong></div>
            <div style={{ marginBottom: '6px' }}><Text style={labelStyle}>Edad:</Text> <strong style={valueStyle}>{edadMeses !== null ? `${edadMeses} meses` : 'N/A'}</strong></div>
            <div><Text style={labelStyle}>Árboles/Plantas:</Text> <strong style={valueStyle}>{siembra ? siembra.cantidad_plantas : '0'}</strong></div>
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" style={{ background: 'linear-gradient(145deg, #B24592 0%, #F15F79 100%)', borderColor: 'transparent', borderRadius: '12px', color: '#fff', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }}>
            <Title level={4} style={{ color: '#fff', marginTop: 0, marginBottom: '12px' }}>Cosechas</Title>
            <div style={{ marginBottom: '6px' }}><Text style={labelStyle}>Última Cosecha:</Text> <strong style={valueStyle}>{ultimaCosecha ? new Date(ultimaCosecha.fecha_cosecha).toLocaleDateString() : 'Ninguna'}</strong></div>
            <div style={{ marginBottom: '6px' }}><Text style={labelStyle}>Próxima Estimada:</Text> <strong style={valueStyle}>{proximaCosecha ? new Date(proximaCosecha).toLocaleDateString() : 'N/A'}</strong></div>
            <div><Text style={labelStyle}>Producción Total:</Text> <strong style={valueStyle}>{produccionAcumulada ? `${Number(produccionAcumulada).toLocaleString()} Kg` : '0 Kg'}</strong></div>
          </Card>
        </Col>
      </Row>
      </div>
    );
  };

  const isHistoricalTab = ['2', '3', '4', '5'].includes(activeTab);

  return (
    <ConfigProvider theme={{ algorithm: theme.darkAlgorithm }}>
      <div style={{ padding: '20px', color: 'var(--text-primary)', background: 'var(--bg-main)', borderRadius: '8px' }}>
        <Title level={2} style={{ marginBottom: 20 }}>Módulo de Lotes</Title>
        
        <div style={{ display: isHistoricalTab ? 'block' : 'none' }}>
          <Card size="small" style={{ marginBottom: 20, background: '#141414', border: '1px solid #303030' }}>
            <Row gutter={16} align="middle">
              <Col span={12}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <Text strong style={{ marginRight: 16, whiteSpace: 'nowrap' }}>Lote Activo para el Historial:</Text>
                  <Select 
                    showSearch
                    style={{ flex: 1 }} 
                    placeholder="Seleccione un lote para ver su historial" 
                    value={selectedLote}
                    onChange={setSelectedLote}
                    optionFilterProp="children"
                  >
                    {lotesAvanzado.map(l => (
                      <Option key={l.id_lote} value={l.id_lote}>{l.codigo} - {l.nombre} ({l.finca_nombre})</Option>
                    ))}
                  </Select>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <Text strong style={{ marginRight: 16, whiteSpace: 'nowrap' }}>Filtrar por Fechas:</Text>
                  <RangePicker 
                    style={{ flex: 1 }} 
                    value={historyDateRange} 
                    onChange={setHistoryDateRange} 
                    placeholder={['Desde', 'Hasta']}
                  />
                </div>
              </Col>
            </Row>
          </Card>
        </div>

        {isHistoricalTab && renderLoteSummary()}

        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="Inventario de Lotes" key="1">
            {renderInventario()}
          </TabPane>
          <TabPane tab="Cosechas" key="2">
            {!selectedLote ? <div style={{ textAlign: 'center', padding: 50 }}><Text type="secondary">Seleccione un lote arriba para ver el historial</Text></div> : renderCosechas()}
          </TabPane>
          <TabPane tab="Nómina" key="3">
            {!selectedLote ? <div style={{ textAlign: 'center', padding: 50 }}><Text type="secondary">Seleccione un lote arriba para ver el historial</Text></div> : renderNomina()}
          </TabPane>
          <TabPane tab="Maquinaria y Equipos" key="4">
            {!selectedLote ? <div style={{ textAlign: 'center', padding: 50 }}><Text type="secondary">Seleccione un lote arriba para ver el historial</Text></div> : renderMaquinaria()}
          </TabPane>
          <TabPane tab="Insumos Aplicados" key="5">
            {!selectedLote ? <div style={{ textAlign: 'center', padding: 50 }}><Text type="secondary">Seleccione un lote arriba para ver el historial</Text></div> : renderInsumos()}
          </TabPane>
          <TabPane tab="Gestión CRUD (Avanzada)" key="6">
            <TableRenderer selectedTable="lotes" tenantId={tenantId} selectedFinca={selectedFinca} selectedNucleo={selectedNucleo} />
          </TabPane>
        </Tabs>
      </div>
    </ConfigProvider>
  );
}
