import React, { useState, useEffect } from 'react';
import { authFetch } from '../../../utils/api';
import { Search, FileText, Filter, WifiOff } from 'lucide-react';
import { Button, Select, DatePicker, Input, Table, Tag, Typography, message, Alert } from 'antd';
import dayjs from 'dayjs';

const { Option } = Select;
const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const TallerHistorialPedidos = ({ onBack, tenantId }) => {
  const [histData, setHistData] = useState(() => {
    const cached = localStorage.getItem('taller_hist_pedidos');
    return cached ? JSON.parse(cached) : [];
  });
  const [loading, setLoading] = useState(false);
  const [histMaquina, setHistMaquina] = useState(null);
  const [histEmpleado, setHistEmpleado] = useState(null);
  const [histDates, setHistDates] = useState([null, null]);
  const [histSearch, setHistSearch] = useState('');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  
  const [maquinas, setMaquinas] = useState(() => {
    const cached = localStorage.getItem('taller_maquinas_cache');
    return cached ? JSON.parse(cached) : [];
  });
  const [contactos, setContactos] = useState(() => {
    const cached = localStorage.getItem('taller_contactos_cache');
    return cached ? JSON.parse(cached) : [];
  });

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cargar filtros solo si hay internet o si no tenemos caché
    if (navigator.onLine) {
      loadFiltros();
    }
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
    // Quitamos loadHistorial() para que solo cargue al dar clic en Consultar
  }, []);

  const loadFiltros = async () => {
    try {
      const [resMaq, resCont] = await Promise.all([
        authFetch(`/api/taller/maquinas?tenantId=${tenantId}`),
        authFetch(`/api/taller/contactos?tenantId=${tenantId}`)
      ]);
      const dataMaq = await resMaq.json();
      const dataCont = await resCont.json();
      if(dataMaq.success) {
        setMaquinas(dataMaq.data);
        localStorage.setItem('taller_maquinas_cache', JSON.stringify(dataMaq.data));
      }
      if(dataCont.success) {
        setContactos(dataCont.data);
        localStorage.setItem('taller_contactos_cache', JSON.stringify(dataCont.data));
      }
    } catch (e) {
      console.error("Modo offline o error al cargar filtros:", e);
    }
  };

  const loadHistorial = async () => {
    if (!navigator.onLine) {
      message.warning('Estás sin conexión. Mostrando los últimos datos guardados.');
      return;
    }
    setLoading(true);
    try {
      let url = `/api/taller/pedidos-historial?tenantId=${tenantId}`;
      if (histMaquina) url += `&id_maquina=${histMaquina}`;
      if (histEmpleado) url += `&id_empleado=${histEmpleado}`;
      if (histDates && histDates[0] && histDates[1]) {
        url += `&startDate=${histDates[0].format('YYYY-MM-DD')}&endDate=${histDates[1].format('YYYY-MM-DD')}`;
      }
      if (histSearch) url += `&search=${encodeURIComponent(histSearch)}`;
      const res = await authFetch(url);
      const { success, data } = await res.json();
      if (success) {
        setHistData(data);
        localStorage.setItem('taller_hist_pedidos', JSON.stringify(data));
      }
    } catch (e) {
      console.error(e);
      message.error('Error cargando el historial, verifica tu conexión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', background: '#f8fafc', minHeight: '100%' }}>
      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', padding: 0, color: '#3b82f6' }}>←</button>
        <Title level={3} style={{ margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={24} color="#3b82f6" /> 
          Historial de Pedidos
        </Title>
      </div>

      {isOffline && (
        <Alert 
          message="Modo Sin Conexión" 
          description="Estás trabajando offline. Solo podrás ver los últimos pedidos y filtros guardados en tu dispositivo." 
          type="warning" 
          showIcon 
          icon={<WifiOff />}
          style={{ marginBottom: 15 }} 
        />
      )}

      <div style={{ background: 'white', padding: '15px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
        <h4 style={{ margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '5px' }}><Filter size={16}/> Filtros</h4>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <Select
            allowClear
            showSearch
            placeholder="Filtrar por Máquina / Equipo"
            style={{ width: '100%' }}
            value={histMaquina}
            onChange={v => setHistMaquina(v)}
            filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}
          >
            {maquinas.map(m => <Option key={m.id_maq_agro} value={m.id_maq_agro}>[{m.placa}] {m.marca_modelo}</Option>)}
          </Select>

          <Select
            allowClear
            showSearch
            placeholder="Filtrar por Empleado (Mecánico/Conductor)"
            style={{ width: '100%' }}
            value={histEmpleado}
            onChange={v => setHistEmpleado(v)}
            filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}
          >
            {contactos.map(c => <Option key={c.id} value={c.id}>{c.nombre}</Option>)}
          </Select>

          <RangePicker 
            value={histDates} 
            onChange={v => setHistDates(v)} 
            style={{ width: '100%' }}
            placeholder={['Fecha Inicial', 'Fecha Final']}
          />

          <Input 
            placeholder="Buscar por código o descripción del repuesto..."
            value={histSearch}
            onChange={e => setHistSearch(e.target.value)}
            prefix={<Search size={16} color="#64748b" />}
          />

          <Button type="primary" onClick={loadHistorial} loading={loading} style={{ width: '100%' }}>
            Consultar Historial
          </Button>
        </div>
      </div>

      <div style={{ overflowX: 'auto', background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <Table
          dataSource={histData.filter(d => 
            !histSearch || 
            (d.codigo && d.codigo.toLowerCase().includes(histSearch.toLowerCase())) ||
            (d.insumo_nombre && d.insumo_nombre.toLowerCase().includes(histSearch.toLowerCase()))
          )}
          rowKey="id_detalle"
          loading={loading}
          size="small"
          pagination={{ pageSize: 10 }}
          scroll={{ x: 'max-content' }}
          columns={[
            { title: 'Fecha', dataIndex: 'fecha_solicitud', width: 100, render: d => dayjs(d).format('DD/MM/YYYY') },
            { title: 'OT #', dataIndex: 'numero_orden', width: 80, render: o => o ? <b>{o}</b> : <Text type="secondary">N/A</Text> },
            { title: 'Máquina', width: 150, render: (_, r) => r.maquina_nombre ? `[${r.placa}] ${r.maquina_nombre}` : '-' },
            { title: 'Solicitante', width: 150, render: (_, r) => `${r.mecanico_nombre || ''} ${r.mecanico_apellido || ''}`.trim() || '-' },
            { title: 'Código', dataIndex: 'codigo', width: 100 },
            { title: 'Repuesto/Insumo', dataIndex: 'insumo_nombre', width: 220, render: t => <b>{t}</b> },
            { title: 'Solicitado', dataIndex: 'cantidad_solicitada', width: 110, align: 'right', render: (v, r) => `${parseFloat(v)} ${r.unidad_medida}` },
            { title: 'Estado', dataIndex: 'estado_pedido', width: 120, render: e => {
              let color = 'default';
              if (e === 'Aprobado' || e === 'Despachado' || e === 'Completado') color = 'green';
              if (e === 'Pendiente_Aprobacion') color = 'orange';
              if (e === 'Rechazado' || e === 'Cancelado') color = 'red';
              return <Tag color={color}>{e}</Tag>;
            }}
          ]}
        />
      </div>
    </div>
  );
};

export default TallerHistorialPedidos;
