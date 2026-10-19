import React, { useState, useEffect } from 'react';
import { fetchApi, authFetch } from '../../../utils/api';
import { Table, Tag, DatePicker, Button, Space, AutoComplete, Dropdown } from 'antd';
import { FileExcelOutlined, FilePdfOutlined, WhatsAppOutlined, SearchOutlined, DownloadOutlined, DownOutlined } from '@ant-design/icons';
import { exportToExcel } from '../../../utils/exportExcel';
import { exportToPdf } from '../../../utils/exportPdf';
import ModalNuevoMovimiento from './ModalNuevoMovimiento';
import ManualitoCampesinoModal from '../../Common/ManualitoCampesinoModal';

const guiaHerramientas = {
  titulo: '🌾 ¿Cómo entregar y devolver herramientas en el almacén?',
  subtitulo: 'Reglas para el control de inventario, cuidado de herramientas y custodia responsable.',
  pasos: [
    {
      paso: '1. Escoger la Herramienta',
      icono: '🪓',
      descripcion: 'Busque la herramienta por código o nombre (machete, lima, bomba de espalda, pala o tijera). El sistema le mostrará cuánto stock disponible queda en la bodega.'
    },
    {
      paso: '2. Tipo de Movimiento (Préstamo o Devolución)',
      icono: '🔄',
      descripcion: 'Si el jornalero se la lleva al campo, marque "Préstamo". Cuando la regrese a la bodega limpia y en buen estado, márquela como "Devolución" o "Entrada". Si se rompió o quebró, regístrela como "Baja / Daño".'
    },
    {
      paso: '3. Operario Responsable y Lote',
      icono: '✍️',
      descripcion: 'Anote el nombre del trabajador que recibe el equipo y el lote o lago donde va a laborar. En observaciones describa si la herramienta va afilada o con accesorios.'
    }
  ]
};

function TabMovimientos({ fincaId, fincas }) {
  const [manualitoVisible, setManualitoVisible] = useState(false);
  const [data, setData] = useState([]);
  const [searchTool, setSearchTool] = useState('');
  const [searchResp, setSearchResp] = useState('');
  const [dates, setDates] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [exportableData, setExportableData] = useState([]);

  const [inventario, setInventario] = useState([]);
  const [empleados, setEmpleados] = useState([]);

  useEffect(() => {
    fetchApi('/acuicola_herramientas/inventario')
      .then(res => setInventario(res.data || []))
      .catch(console.error);

    authFetch('/api/rrhh/empleados?tenantId=1')
      .then(res => res.json())
      .then(d => {
        const arr = d.data || d || [];
        setEmpleados(arr.map(e => ({ 
          value: e.nombre_completo || (e.nombres ? `${e.nombres} ${e.apellidos || ''}`.trim() : null) || e.nombre 
        })).filter(o => o.value));
      })
      .catch(console.error);
  }, []);

  const fetchMovimientos = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (fincaId) q.append('id_finca', fincaId);
      if (searchTool) q.append('herramienta', searchTool);
      if (searchResp) q.append('responsable', searchResp);
      if (dates && dates[0] && dates[1]) {
        q.append('fecha_inicio', dates[0].format('YYYY-MM-DD'));
        q.append('fecha_fin', dates[1].format('YYYY-MM-DD'));
      }
      q.append('_t', new Date().getTime()); // Evitar caché
      const res = await fetchApi(`/acuicola_herramientas/movimientos?${q.toString()}`);
      setData(res.data || []);
      setExportableData(res.data || []);
    } catch (e) {
      console.error(e);
      message.error('Error al cargar movimientos');
    } finally {
      setLoading(false);
    }
  };

  const handleTableChange = (pagination, filters, sorter, extra) => {
    setExportableData(extra.currentDataSource);
  };

  useEffect(() => {
    fetchMovimientos();
  }, [fincaId]);

  const getColorPorTipo = (tipo) => {
    switch (tipo) {
      case 'Entrada': return 'success';
      case 'Salida': return 'error';
      case 'Prestamo': return 'warning';
      case 'Traslado': return 'processing';
      case 'Baja_Daño': return 'default';
      default: return 'default';
    }
  };

  const getExportData = () => {
    return exportableData.map(m => ({
      Fecha: new Date(m.fecha).toLocaleString(),
      Herramienta: m.herramienta_nombre,
      Codigo: m.codigo,
      'Tipo Mov': m.tipo_movimiento,
      Cantidad: `${m.cantidad} ${m.unidad_medida}`,
      Ubicacion: m.origen_destino,
      Responsable: m.responsable,
      Observaciones: m.observaciones
    }));
  };

  const getMetadata = () => {
    const extraFiltros = [];
    if (searchTool) extraFiltros.push({ label: 'Herramienta', value: searchTool });
    if (searchResp) extraFiltros.push({ label: 'Responsable', value: searchResp });

    return {
      empresa: 'AgroPaccioli',
      finca: fincaId ? fincas?.find(f => String(f.id_finca) === String(fincaId))?.nombre : 'Todas las Fincas',
      fechaDesde: dates && dates[0] ? dates[0].format('YYYY-MM-DD') : '',
      fechaHasta: dates && dates[1] ? dates[1].format('YYYY-MM-DD') : '',
      extraFiltros,
      usuario: JSON.parse(localStorage.getItem('user') || '{}')?.nombre || 'Administrador',
      reportName: 'Movimientos de Herramientas Acuícolas'
    };
  };

  const handleExportExcel = () => {
    const d = getExportData();
    exportToExcel('Movimientos_Acuicola', Object.keys(d[0] || {}).map(k => ({ name: k })), d, getMetadata());
  };

  const handleExportPdf = async () => {
    const d = getExportData();
    await exportToPdf('Movimientos_Acuicola', Object.keys(d[0] || {}).map(k => ({ name: k })), d, getMetadata());
  };

  const handleExportWA = () => {
    const text = `Reporte de Movimientos Acuícolas (${data.length} registros):\n` + data.slice(0, 30).map(m => `• ${m.codigo} - ${m.herramienta_nombre}: ${m.tipo_movimiento} de ${m.cantidad} ${m.unidad_medida} (${m.origen_destino || 'N/A'})`).join('\n') + (data.length > 30 ? '\n... (ver sistema para más)' : '');
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const columns = [
    { 
      title: 'Fecha', 
      dataIndex: 'fecha', 
      key: 'fecha', 
      render: d => <span style={{fontSize: '13px', color: '#64748b'}}>{new Date(d).toLocaleString()}</span> 
    },
    { 
      title: 'Herramienta', 
      key: 'herramienta', 
      render: (_, m) => (
        <div>
          <strong style={{color: '#1e293b'}}>{m.herramienta_nombre}</strong><br/>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>{m.codigo}</span>
        </div>
      ) 
    },
    { 
      title: 'Tipo Mov.', 
      dataIndex: 'tipo_movimiento', 
      key: 'tipo', 
      render: t => <Tag color={getColorPorTipo(t)}>{t}</Tag> 
    },
    { 
      title: 'Cantidad', 
      key: 'cantidad', 
      render: (_, m) => <b>{m.cantidad} {m.unidad_medida}</b> 
    },
    { 
      title: 'Ubicación (Lago/Bodega)', 
      dataIndex: 'origen_destino', 
      key: 'origen', 
      render: val => <b style={{color: '#0ea5e9'}}>{val || '---'}</b> 
    },
    { 
      title: 'Responsable (Operario)', 
      dataIndex: 'responsable', 
      key: 'responsable',
      render: val => <span style={{color: '#475569'}}>{val || '---'}</span>
    },
    { 
      title: 'Observaciones', 
      key: 'observaciones', 
      render: (_, m) => (
        <span style={{ fontSize: '12px', color: '#64748b', maxWidth: '200px', display: 'inline-block' }}>
          {m.estado === 'Anulado' ? <strong style={{color:'red'}}>[ANULADO] </strong> : null}
          {m.observaciones || ''}
        </span>
      ) 
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <Space style={{ flexWrap: 'wrap' }}>
          <AutoComplete
            options={inventario.map(i => ({ value: `${i.codigo} - ${i.nombre}` }))}
            placeholder="🔍 Buscar herramienta..."
            value={searchTool}
            onChange={val => setSearchTool(val)}
            allowClear
            style={{ width: '320px', minWidth: '220px' }}
            filterOption={(inputValue, option) =>
              option.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
            }
          />
          <AutoComplete
            options={empleados}
            placeholder="👤 Buscar responsable..."
            value={searchResp}
            onChange={val => setSearchResp(val)}
            allowClear
            style={{ width: '250px', minWidth: '180px' }}
            filterOption={(inputValue, option) =>
              option.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
            }
          />
          <DatePicker.RangePicker onChange={val => setDates(val)} style={{ padding: '4px 12px' }} />
          <Button type="primary" onClick={fetchMovimientos} icon={<SearchOutlined />} style={{ background: '#0ea5e9' }}>Procesar</Button>
        </Space>
        
        <Space>
          <button 
            type="button" 
            onClick={() => setManualitoVisible(true)}
            style={{
              padding: '8px 14px',
              background: '#047857',
              color: '#ecfdf5',
              border: '1px solid #10b981',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
            }}
          >
            🌾 ¿Cómo custodiar herramientas?
          </button>

          <Dropdown menu={{
            items: [
              { key: 'excel', icon: <FileExcelOutlined style={{color: '#16a34a'}}/>, label: 'Exportar a Excel', onClick: handleExportExcel },
              { key: 'pdf', icon: <FilePdfOutlined style={{color: '#ef4444'}}/>, label: 'Exportar a PDF', onClick: handleExportPdf },
              { key: 'whatsapp', icon: <WhatsAppOutlined style={{color: '#25d366'}}/>, label: 'Enviar por WhatsApp', onClick: handleExportWA },
            ]
          }}>
            <Button type="primary" icon={<DownloadOutlined />} style={{ background: '#3b82f6', borderColor: '#3b82f6', boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.4)', borderRadius: '6px', fontWeight: 'bold' }}>
              Exportar Reporte <DownOutlined />
            </Button>
          </Dropdown>

          <button onClick={() => setShowModal(true)} style={{ padding: '8px 15px', background: 'linear-gradient(to right, #10b981, #059669)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.4)' }}>
            + Registrar Movimiento
          </button>
        </Space>
      </div>
      
      <ModalNuevoMovimiento 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
        onRefresh={fetchMovimientos} 
        fincaId={fincaId} 
        fincas={fincas} 
      />

      {/* Manualito Campesino Guía en 3 Pasos */}
      <ManualitoCampesinoModal
        isOpen={manualitoVisible}
        onClose={() => setManualitoVisible(false)}
        guia={guiaHerramientas}
      />

      <Table 
        columns={columns} 
        dataSource={data} 
        rowKey="id_movimiento" 
        loading={loading}
        onChange={handleTableChange}
        pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: ['10', '20', '50'] }}
        size="middle"
        rowClassName={record => record.estado === 'Anulado' ? 'row-anulado' : ''}
      />
    </div>
  );
}

export default TabMovimientos;
