import React, { useState, useEffect } from 'react';
import { fetchApi, authFetch } from '../../../utils/api';
import { Table, Button, Tag, Space, message, DatePicker, AutoComplete, Dropdown } from 'antd';
import { WhatsAppOutlined, CheckCircleOutlined, FileExcelOutlined, FilePdfOutlined, SearchOutlined, DownloadOutlined, DownOutlined } from '@ant-design/icons';
import { exportToExcel } from '../../../utils/exportExcel';
import { exportToPdf } from '../../../utils/exportPdf';
import ModalNuevoPedido from './ModalNuevoPedido';

function TabPedidos({ fincaId, fincas }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [exportableData, setExportableData] = useState([]);
  const [searchTool, setSearchTool] = useState('');
  const [searchResp, setSearchResp] = useState('');
  const [dates, setDates] = useState(null);
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

  const fetchPedidos = async () => {
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
      q.append('_t', new Date().getTime());
      const res = await fetchApi(`/acuicola_herramientas/pedidos?${q.toString()}`);
      setData(res.data || []);
      setExportableData(res.data || []);
    } catch (e) {
      console.error(e);
      message.error('Error al cargar pedidos');
    } finally {
      setLoading(false);
    }
  };

  const handleTableChange = (pagination, filters, sorter, extra) => {
    setExportableData(extra.currentDataSource);
  };

  useEffect(() => {
    // El usuario solicitó no cargar datos automáticamente al iniciar,
    // sino esperar a que se presione el botón "Procesar".
  }, [fincaId]);

  const marcarEntregado = async (id_pedido) => {
    try {
      const res = await authFetch(`/api/acuicola_herramientas/pedidos/${id_pedido}/estado`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'Entregado' })
      });
      if (res.ok) {
        message.success('Pedido marcado como entregado');
        fetchPedidos();
      } else {
        message.error('Error al actualizar');
      }
    } catch (e) {
      console.error(e);
      message.error('Error al actualizar estado');
    }
  };

  const notifyWhatsApp = (record) => {
    const text = `Hola! Tu pedido #${record.id_pedido} a bodega central ha llegado a la finca ${record.finca_nombre}. Por favor pasar a retirarlo.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const getExportData = () => {
    return exportableData.map(p => ({
      'ID Pedido': p.id_pedido,
      'Fecha Solicitud': new Date(p.fecha_pedido).toLocaleString(),
      'Finca Solicitante': p.finca_nombre,
      'Bodega Destino': p.bodega_destino_nombre || 'Central',
      'Responsable': p.solicitante,
      'Estado': p.estado,
      'Detalles Requeridos': p.detalles_json ? p.detalles_json.map(d => `${d.cant}x ${d.desc}`).join(', ') : ''
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
      reportName: 'Pedidos de Herramientas Acuícolas'
    };
  };

  const handleExportExcel = () => {
    const d = getExportData();
    exportToExcel('Pedidos_Acuicola', Object.keys(d[0] || {}).map(k => ({ name: k })), d, getMetadata());
  };

  const handleExportPdf = async () => {
    const d = getExportData();
    await exportToPdf('Pedidos_Acuicola', Object.keys(d[0] || {}).map(k => ({ name: k })), d, getMetadata());
  };

  const handleExportWA = () => {
    const text = `Reporte de Pedidos (${data.length} registros):\n` + data.slice(0, 30).map(p => `• Pedido #${p.id_pedido} - ${p.finca_nombre}: ${p.estado}`).join('\n') + (data.length > 30 ? '\n... (ver sistema)' : '');
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const columns = [
    { title: 'ID Pedido', dataIndex: 'id_pedido', key: 'id', sorter: (a, b) => a.id_pedido - b.id_pedido, defaultSortOrder: 'descend', render: id => <b>{id}</b> },
    { title: 'Fecha Solicitud', dataIndex: 'fecha_pedido', key: 'fecha', render: date => new Date(date).toLocaleDateString() },
    { title: 'Finca Solicitante', dataIndex: 'finca_nombre', key: 'finca' },
    { title: 'Bodega Destino', dataIndex: 'bodega_destino_nombre', key: 'bodega', render: b => b || <span style={{color: '#94a3b8'}}>Central</span> },
    { title: 'Responsable', dataIndex: 'solicitante', key: 'solicitante' },
    { title: 'Estado', dataIndex: 'estado', key: 'estado', render: e => (
      <Tag color={e === 'Pendiente' ? 'warning' : 'success'}>{e}</Tag>
    )},
    { title: 'Detalles Requeridos', dataIndex: 'detalles_json', key: 'detalles', render: j => (
      <div style={{ fontSize: '12px' }}>
        {j ? j.map((d, i) => <div key={i}>- {d.cant}x {d.desc}</div>) : 'Sin detalles'}
      </div>
    )},
    { title: 'Acciones', key: 'actions', render: (_, record) => (
      <Space>
        {record.estado === 'Pendiente' && (
          <Button size="small" type="primary" style={{ background: '#10b981', borderColor: '#10b981' }} icon={<CheckCircleOutlined />} onClick={() => marcarEntregado(record.id_pedido)}>
            Recibido
          </Button>
        )}
        <Button size="small" icon={<WhatsAppOutlined />} onClick={() => notifyWhatsApp(record)} style={{ color: '#25D366', borderColor: '#25D366' }}>
          Notificar
        </Button>
      </Space>
    )}
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
          <Button type="primary" onClick={fetchPedidos} icon={<SearchOutlined />} style={{ background: '#0ea5e9' }}>Procesar</Button>
        </Space>
        
        <Space>
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

          <button onClick={() => setShowModal(true)} style={{ padding: '8px 15px', background: 'linear-gradient(to right, #f59e0b, #d97706)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 6px -1px rgba(217, 119, 6, 0.4)' }}>
            + Solicitar Insumos a Central
          </button>
        </Space>
      </div>

      <ModalNuevoPedido isOpen={showModal} onClose={() => setShowModal(false)} onRefresh={fetchPedidos} fincaId={fincaId} fincas={fincas} />

      <Table 
        columns={columns} 
        dataSource={data} 
        rowKey="id_pedido" 
        loading={loading}
        onChange={handleTableChange}
        pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: ['10', '20', '50'] }}
        size="middle"
      />
    </div>
  );
}

export default TabPedidos;
