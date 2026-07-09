import React, { useState, useEffect } from 'react';
import { Table, Tabs, Button, Card, Tag, Typography, message, Row, Col, Modal, Form, Input, Select, DatePicker, Statistic, Space, Checkbox } from 'antd';
import { ExperimentOutlined, GoldOutlined, ShoppingCartOutlined, AppstoreAddOutlined, ExportOutlined, CheckCircleOutlined, EditOutlined, DeleteOutlined, PlusOutlined, DatabaseOutlined, MinusCircleOutlined, FilterOutlined } from '@ant-design/icons';
import { fetchApi } from '../../utils/api';

const { TabPane } = Tabs;
const { Title, Text } = Typography;

export default function AcuicolaMolino({ tenantId }) {
  const [insumos, setInsumos] = useState([]);
  const [formulas, setFormulas] = useState([]);
  const [produccion, setProduccion] = useState([]);
  const [salidas, setSalidas] = useState([]);
  const [kardex, setKardex] = useState([]);
  const [kardexProduccion, setKardexProduccion] = useState([]);
  const [estanques, setEstanques] = useState([]);
  const [loading, setLoading] = useState(true);

  // States for filters
  const [filtersProduccion, setFiltersProduccion] = useState({ dateRange: null, formula: null, responsable: '' });
  const [filteredProduccion, setFilteredProduccion] = useState([]);

  const [filtersSalidas, setFiltersSalidas] = useState({ dateRange: null, tipo_salida: null, lago: '', cliente: '' });
  const [filteredSalidas, setFilteredSalidas] = useState([]);

  const [filtersKardex, setFiltersKardex] = useState({ dateRange: null, insumo: null });
  const [filteredKardex, setFilteredKardex] = useState([]);

  const [filtersKardexProd, setFiltersKardexProd] = useState({ dateRange: null, formula: null });
  const [filteredKardexProd, setFilteredKardexProd] = useState([]);
  
  const [isProdModalVisible, setIsProdModalVisible] = useState(false);
  const [isSalidaModalVisible, setIsSalidaModalVisible] = useState(false);
  const [isCompraModalVisible, setIsCompraModalVisible] = useState(false);
  const [isEntradaModalVisible, setIsEntradaModalVisible] = useState(false);
  const [isSimuladorModalVisible, setIsSimuladorModalVisible] = useState(false);
  const [isFormulaModalVisible, setIsFormulaModalVisible] = useState(false);
  const [isManualOutVisible, setIsManualOutVisible] = useState(false);
  const [isFormulaCreateVisible, setIsFormulaCreateVisible] = useState(false);
  const [isEntradaExternaVisible, setIsEntradaExternaVisible] = useState(false);
  const [editingFormula, setEditingFormula] = useState(null);
  
  const [simuladorResult, setSimuladorResult] = useState(null);

  const [formProd] = Form.useForm();
  const [formSalida] = Form.useForm();
  const [formCompra] = Form.useForm();
  const [formEntrada] = Form.useForm();
  const [formSimulador] = Form.useForm();
  const [formFormula] = Form.useForm();
  const [formManualOut] = Form.useForm();
  const [formFormulaCreate] = Form.useForm();
  const [formEntradaExterna] = Form.useForm();
  
  const [esExternoWatch, setEsExternoWatch] = useState(false);
  
  const [tipoSalida, setTipoSalida] = useState('Consumo Interno');
  
  // Observar cambios en ingredientes para actualizar el total %
  const ingredientesWatch = Form.useWatch('ingredientes', formFormula);

  useEffect(() => {
    loadData();
  }, [tenantId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [resIns, resFor, resProd, resSal, resEstanques, resKardex, resKardexProd] = await Promise.all([
        fetchApi('/acuicola_molino/insumos').catch(() => ({ data: [] })),
        fetchApi('/acuicola_molino/formulas').catch(() => ({ data: [] })),
        fetchApi('/acuicola_molino/produccion').catch(() => ({ data: [] })),
        fetchApi('/acuicola_molino/salidas').catch(() => ({ data: [] })),
        fetchApi('/acuicola_molino/estanques').catch(() => ({ data: [] })),
        fetchApi('/acuicola_molino/kardex').catch(() => ({ data: [] })),
        fetchApi('/acuicola_molino/kardex_produccion').catch(() => ({ data: [] }))
      ]);
      setInsumos(resIns.data || []);
      setFormulas(resFor.data || []);
      setProduccion(resProd.data || []);
      setFilteredProduccion(resProd.data || []);
      setSalidas(resSal.data || []);
      setFilteredSalidas(resSal.data || []);
      setEstanques(resEstanques.data || []);
      setKardex(resKardex.data || []);
      setFilteredKardex(resKardex.data || []);
      setKardexProduccion(resKardexProd.data || []);
      setFilteredKardexProd(resKardexProd.data || []);
    } catch (err) {
      console.error(err);
      message.error("Error cargando los datos.");
    } finally {
      setLoading(false);
    }
  };

  const isWithinDateRange = (dateString, dateRange) => {
    if (!dateRange || !dateRange[0] || !dateRange[1]) return true;
    const date = new Date(dateString);
    const start = dateRange[0].startOf('day').toDate();
    const end = dateRange[1].endOf('day').toDate();
    return date >= start && date <= end;
  };

  const handleFilterProduccion = () => {
    let result = produccion;
    if (filtersProduccion.dateRange) result = result.filter(item => isWithinDateRange(item.fecha, filtersProduccion.dateRange));
    if (filtersProduccion.formula) result = result.filter(item => item.id_formula === filtersProduccion.formula);
    if (filtersProduccion.responsable) result = result.filter(item => (item.responsable || '').toLowerCase().includes(filtersProduccion.responsable.toLowerCase()));
    setFilteredProduccion(result);
  };

  const handleFilterSalidas = () => {
    let result = salidas;
    if (filtersSalidas.dateRange) result = result.filter(item => isWithinDateRange(item.fecha, filtersSalidas.dateRange));
    if (filtersSalidas.tipo_salida) result = result.filter(item => item.tipo_salida === filtersSalidas.tipo_salida);
    
    if (filtersSalidas.lago) {
      const term = filtersSalidas.lago.toLowerCase();
      result = result.filter(item => {
        const codigo = (item.estanque_codigo || '').toLowerCase();
        // Intentar buscar también por el nombre del estanque si estuviera en la tabla (usualmente item.estanque_nombre)
        const nombre = (item.estanque_nombre || '').toLowerCase();
        return codigo.includes(term) || nombre.includes(term);
      });
    }
    
    if (filtersSalidas.cliente) {
      result = result.filter(item => (item.cliente_tercero || '').toLowerCase().includes(filtersSalidas.cliente.toLowerCase()));
    }
    
    setFilteredSalidas(result);
  };

  const handleFilterKardex = () => {
    let result = kardex;
    if (filtersKardex.dateRange) result = result.filter(item => isWithinDateRange(item.fecha, filtersKardex.dateRange));
    if (filtersKardex.insumo) result = result.filter(item => item.id_insumo === filtersKardex.insumo);
    setFilteredKardex(result);
  };

  const handleFilterKardexProd = () => {
    let result = kardexProduccion;
    if (filtersKardexProd.dateRange) result = result.filter(item => isWithinDateRange(item.fecha, filtersKardexProd.dateRange));
    if (filtersKardexProd.formula) result = result.filter(item => item.id_formula === filtersKardexProd.formula);
    setFilteredKardexProd(result);
  };

  const handleCreateProd = async (values) => {
    try {
      const payload = { ...values };
      if (payload.fecha && payload.fecha.format) payload.fecha = payload.fecha.format('YYYY-MM-DD');
      await fetchApi('/acuicola_molino/produccion', { method: 'POST', body: JSON.stringify(payload) });
      message.success('Producción registrada con éxito.');
      setIsProdModalVisible(false);
      formProd.resetFields();
      loadData();
    } catch (err) {
      message.error(err.error || err.message || 'Error al guardar producción.');
    }
  };

  const handleCreateSalida = async (values) => {
    try {
      const payload = { ...values };
      if (payload.fecha && payload.fecha.format) payload.fecha = payload.fecha.format('YYYY-MM-DD');
      await fetchApi('/acuicola_molino/salidas', { method: 'POST', body: JSON.stringify(payload) });
      message.success('Salida/Venta registrada e integrada con contabilidad.');
      setIsSalidaModalVisible(false);
      formSalida.resetFields();
      loadData();
    } catch (err) {
      message.error(err.error || err.message || 'Error al registrar la salida.');
    }
  };

  const handleCreateFormula = async (values) => {
    try {
      const payload = {
        tenantId,
        nombre: values.nombre,
        fase_recomendada: values.fase_recomendada,
        proteina_pct: values.proteina_pct || 0,
        detalles_json: values.es_externo ? [] : (values.ingredientes || []),
        es_externo: values.es_externo ? 1 : 0
      };
      
      const res = await fetchApi('/acuicola/molino/formula', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.error) throw new Error(res.error);
      
      message.success('Producto / Fórmula creado exitosamente');
      setIsFormulaCreateVisible(false);
      formFormulaCreate.resetFields();
      loadData();
    } catch(err) {
      message.error(err.message || 'Error al crear fórmula');
    }
  };

  const handleCreateEntradaExterna = async (values) => {
    try {
      const payload = {
        tenantId,
        id_formula: values.id_formula,
        fecha: values.fecha.format('YYYY-MM-DD'),
        cantidad_kg: parseFloat(values.cantidad_kg),
        tipo_entrada: values.tipo_entrada,
        proveedor: values.proveedor,
        costo_total: parseFloat(values.costo_total || 0),
        notas: values.notas,
        responsable: 'Admin'
      };
      
      const res = await fetchApi('/acuicola/molino/entrada_externa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.error) throw new Error(res.error);
      
      message.success('Entrada externa registrada exitosamente');
      setIsEntradaExternaVisible(false);
      formEntradaExterna.resetFields();
      loadData();
    } catch(err) {
      message.error(err.message || 'Error al registrar entrada');
    }
  };

  const handleSaveFormula = async (values) => {
    try {
      await fetchApi(`/acuicola_molino/formulas/${editingFormula.id_formula}`, { 
        method: 'PUT', 
        body: JSON.stringify({ detalles_json: JSON.stringify(values.ingredientes) }) 
      });
      message.success('Fórmula actualizada correctamente.');
      setIsFormulaModalVisible(false);
      setEditingFormula(null);
      formFormula.resetFields();
      loadData();
    } catch (err) {
      message.error(err.error || err.message || 'Error al actualizar fórmula.');
    }
  };

  const handleCreateManualOut = async (values) => {
    try {
      await fetchApi('/acuicola_molino/insumos/salida_manual', { method: 'POST', body: JSON.stringify({ ...values, usuario: 'Admin' }) });
      message.success('Salida registrada en Kardex exitosamente.');
      setIsManualOutVisible(false);
      formManualOut.resetFields();
      loadData();
    } catch (err) {
      message.error(err.error || err.message || 'Error al registrar salida.');
    }
  };

  const handleCreateCompra = async (values) => {
    try {
      const payload = { ...values };
      if (payload.fecha && payload.fecha.format) payload.fecha = payload.fecha.format('YYYY-MM-DD');
      await fetchApi('/acuicola_molino/compras', { method: 'POST', body: JSON.stringify(payload) });
      message.success('Compra registrada e integrada con contabilidad.');
      setIsCompraModalVisible(false);
      formCompra.resetFields();
      loadData();
    } catch (err) {
      message.error(err.error || err.message || 'Error al registrar compra.');
    }
  };

  const handleCreateEntrada = async (values) => {
    try {
      const payload = { ...values };
      if (payload.fecha && payload.fecha.format) payload.fecha = payload.fecha.format('YYYY-MM-DD');
      await fetchApi('/acuicola_molino/entradas', { method: 'POST', body: JSON.stringify(payload) });
      message.success('Entrada registrada con éxito.');
      setIsEntradaModalVisible(false);
      formEntrada.resetFields();
      loadData();
    } catch (err) {
      message.error(err.error || err.message || 'Error al registrar entrada.');
    }
  };

  const handleSimularProduccion = () => {
    const values = formSimulador.getFieldsValue();
    if (!values.id_formula || !values.cantidad_kg) return;
    
    const formula = formulas.find(f => f.id_formula === values.id_formula);
    if (!formula) return;
    
    let detalles = [];
    try {
      detalles = typeof formula.detalles_json === 'string' ? JSON.parse(formula.detalles_json) : formula.detalles_json;
    } catch(e) {}
    
    const result = detalles.map(det => {
      const insumo = insumos.find(i => i.id_insumo === det.id_insumo);
      const kgRequeridos = (values.cantidad_kg * det.pct) / 100;
      const stockActual = parseFloat(insumo?.cantidad_actual || 0);
      return {
        id_insumo: det.id_insumo,
        nombre: insumo?.nombre || 'Desconocido',
        requerido: kgRequeridos,
        stock: stockActual,
        deficit: stockActual < kgRequeridos ? kgRequeridos - stockActual : 0
      };
    });
    setSimuladorResult({ formula: formula.nombre, cantidad: values.cantidad_kg, detalles: result });
  };

  const handleSolicitarPedido = async () => {
    if (!simuladorResult) return;
    const itemsFaltantes = simuladorResult.detalles.filter(d => d.deficit > 0).map(d => ({
      id_insumo: d.id_insumo,
      cantidad_solicitada: Math.ceil(d.deficit) // Redondear hacia arriba para pedido
    }));
    
    if (itemsFaltantes.length === 0) {
      message.info("No hay déficit de insumos.");
      return;
    }

    try {
      // 1 represents bodegas principales or we can pass a specific ID
      await fetchApi('/pedidos_internos', {
        method: 'POST',
        body: JSON.stringify({
          tenantId,
          id_bodega_provee: 1, // Default Bodega Principal
          tipo_origen: 'Produccion Molino',
          nombre_solicitante: 'Molino Automático',
          observaciones: `Pedido automático por déficit en Simulador de Producción. Fórmula: ${simuladorResult.formula}, Lote: ${simuladorResult.cantidad}kg`,
          items: itemsFaltantes,
          fecha_requerida: new Date().toISOString().split('T')[0]
        })
      });
      message.success("Pedido de insumos enviado a Bodega Principal.");
      setIsSimuladorModalVisible(false);
      setSimuladorResult(null);
      formSimulador.resetFields();
    } catch (err) {
      message.error(err.error || err.message || 'Error al enviar pedido.');
    }
  };

  const salidasCols = [
    { title: 'Doc #', dataIndex: 'id_salida', width: 80 },
    { title: 'Fecha', dataIndex: 'fecha', render: d => new Date(d).toISOString().split('T')[0] },
    { title: 'Fórmula', dataIndex: 'formula_nombre', render: t => <Tag color="blue">{t}</Tag> },
    { title: 'Cantidad (kg)', dataIndex: 'cantidad_kg', render: q => <strong>{q} kg</strong> },
    { title: 'Tipo de Salida', dataIndex: 'tipo_salida', render: t => <Tag color={t === 'Venta Externa' ? 'green' : 'orange'}>{t}</Tag> },
    { title: 'Lago Destino', dataIndex: 'estanque_codigo' },
    { title: 'Cliente (Venta)', dataIndex: 'cliente_tercero' },
    { title: 'Valor Venta', dataIndex: 'valor_venta', render: v => v ? `$${parseFloat(v).toLocaleString()}` : '-' }
  ];

  const prodCols = [
    { title: 'Lote #', dataIndex: 'id_produccion', width: 80 },
    { title: 'Fecha', dataIndex: 'fecha', render: d => new Date(d).toISOString().split('T')[0] },
    { title: 'Fórmula', dataIndex: 'formula_nombre' },
    { title: 'Total (kg)', dataIndex: 'cantidad_producida_kg', render: q => <strong>{q} kg</strong> },
    { title: 'Presentación', render: (_, r) => r.cantidad_bultos ? `${r.cantidad_bultos} bultos de ${r.peso_bulto_kg}kg` : '-' },
    { title: 'Costo Total', dataIndex: 'costo_total', render: c => `$${parseFloat(c).toLocaleString()}` },
    { title: 'Resp.', dataIndex: 'responsable' }
  ];

  const insumoCols = [
    { title: 'ID', dataIndex: 'id_insumo', width: 80 },
    { title: 'Código', dataIndex: 'codigo' },
    { title: 'Nombre', dataIndex: 'nombre', render: t => <strong>{t}</strong> },
    { title: 'Stock Actual (kg)', dataIndex: 'cantidad_actual', render: q => <Tag color={q > 500 ? 'green' : 'red'}>{q} kg</Tag> },
    { title: 'Costo Unit.', dataIndex: 'costo_unitario', render: c => `$${parseFloat(c).toLocaleString()}` },
    { title: 'Acción', render: (_, record) => (
      <Button 
        type="dashed" 
        danger 
        size="small" 
        onClick={() => {
          formManualOut.setFieldsValue({ id_insumo: record.id_insumo, insumo_nombre: record.nombre });
          setIsManualOutVisible(true);
        }}
      >
        Ajuste / Salida
      </Button>
    )}
  ];

  const kardexCols = [
    { title: 'Doc', dataIndex: 'id_movimiento', width: 60 },
    { title: 'Fecha', dataIndex: 'fecha', render: d => new Date(d).toISOString().split('T')[0] },
    { title: 'Insumo', dataIndex: 'insumo_nombre', render: t => <strong>{t}</strong> },
    { title: 'Tipo', dataIndex: 'tipo', render: t => <Tag color={t === 'Entrada' ? 'green' : 'red'}>{t}</Tag> },
    { title: 'Concepto', dataIndex: 'concepto' },
    { title: 'Cantidad', dataIndex: 'cantidad_kg', render: (q, record) => <span style={{ color: record.tipo === 'Entrada' ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>{record.tipo === 'Entrada' ? '+' : '-'}{q} kg</span> },
    { title: 'Costo Unit.', dataIndex: 'costo_unitario', render: c => c ? `$${parseFloat(c).toLocaleString()}` : '-' },
    { title: 'Usuario', dataIndex: 'usuario' }
  ];

  const kardexProdCols = [
    { title: 'Doc', dataIndex: 'id_movimiento', width: 60 },
    { title: 'Fecha', dataIndex: 'fecha', render: d => new Date(d).toISOString().split('T')[0] },
    { title: 'Fórmula', dataIndex: 'formula_nombre', render: t => <strong>{t}</strong> },
    { title: 'Tipo', dataIndex: 'tipo', render: t => <Tag color={t === 'ENTRADA' ? 'green' : 'red'}>{t}</Tag> },
    { title: 'Concepto', dataIndex: 'concepto' },
    { title: 'Bultos/Kg', dataIndex: 'cantidad_kg', render: (q, record) => <span style={{ color: record.tipo === 'ENTRADA' ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>{record.tipo === 'ENTRADA' ? '+' : '-'}{q} kg</span> },
    { title: 'Referencia', dataIndex: 'referencia_id', render: r => `Doc #${r}` },
    { title: 'Usuario', dataIndex: 'usuario' }
  ];


  const formulasCols = [
    { title: 'Fórmula ID', dataIndex: 'id_formula', width: 100 },
    { title: 'Nombre Fórmula / Producto', dataIndex: 'nombre', render: (t, record) => <strong>{t} {record.es_externo ? <Tag color="orange">Externo</Tag> : ''}</strong> },
    { title: 'Fase', dataIndex: 'fase_recomendada', render: t => <Tag color="purple">{t}</Tag> },
    { title: 'Proteína %', dataIndex: 'proteina_pct', render: p => `${p}%` },
    { title: 'Ingredientes', dataIndex: 'detalles_json', render: j => {
      try { 
        const arr = typeof j === 'string' ? JSON.parse(j) : j;
        return Array.isArray(arr) ? `${arr.length} componentes` : '0 componentes'; 
      } catch(e){ return '0 componentes'; }
    }},
    { title: 'Acción', render: (_, record) => (
        <Button 
          type="text" 
          icon={<EditOutlined style={{ color: '#fbbf24' }} />} 
          onClick={() => {
             let details = [];
             try { details = typeof record.detalles_json === 'string' ? JSON.parse(record.detalles_json) : record.detalles_json; } catch(e){}
             setEditingFormula(record);
             formFormula.setFieldsValue({ ingredientes: details || [] });
             setIsFormulaModalVisible(true);
          }}
        >
          Editar
        </Button>
      )
    }
  ];

  const glassCardStyle = {
    background: '#fff',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    overflow: 'hidden',
    marginBottom: '24px'
  };

  const metricCardStyle = {
    background: '#fff',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    padding: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  };

  const totalProduccion = produccion.reduce((acc, curr) => acc + parseFloat(curr.cantidad_producida_kg || 0), 0);
  const totalSalidas = salidas.reduce((acc, curr) => acc + parseFloat(curr.cantidad_kg || 0), 0);
  const totalInventario = insumos.reduce((acc, curr) => acc + parseFloat(curr.cantidad_actual || 0), 0);

  return (
    <div style={{ padding: 24, background: '#f0f2f5', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <Title level={2} style={{ color: '#001529', margin: 0, fontWeight: 700, letterSpacing: '-0.5px' }}>
            <ExperimentOutlined style={{ color: '#1890ff', marginRight: '12px' }} />
            Planta de Alimentos (Molino)
          </Title>
          <Text type="secondary" style={{ fontSize: '15px' }}>Fórmulas, Producción, Comercialización y Kardex</Text>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Button type="default" size="large" icon={<ExperimentOutlined />} style={{ borderRadius: '8px' }} onClick={() => setIsSimuladorModalVisible(true)}>
            Simulador
          </Button>
          <Button type="primary" size="large" icon={<ExportOutlined />} style={{ borderRadius: '8px', background: '#10b981', border: 'none', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)' }} onClick={() => setIsSalidaModalVisible(true)}>
            Despachar / Vender
          </Button>
          <Button type="primary" size="large" icon={<AppstoreAddOutlined />} style={{ borderRadius: '8px', background: '#f59e0b', border: 'none', boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)' }} onClick={() => setIsProdModalVisible(true)}>
            Registrar Producción
          </Button>
          <Button type="primary" size="large" icon={<PlusOutlined />} style={{ borderRadius: '8px', background: '#3b82f6', border: 'none', boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)' }} onClick={() => setIsEntradaModalVisible(true)}>
            Entrada M. Prima
          </Button>
        </div>
      </div>

      <Row gutter={[24, 24]} style={{ marginBottom: '32px' }}>
        <Col span={8}>
          <div style={metricCardStyle}>
            <div>
              <Text type="secondary" style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>TOTAL PRODUCIDO (HISTÓRICO)</Text>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#001529', marginTop: '4px' }}>
                {totalProduccion.toLocaleString()} <span style={{ fontSize: '18px', color: '#8c8c8c' }}>kg</span>
              </div>
            </div>
            <ExperimentOutlined style={{ fontSize: '48px', color: '#e6f7ff', WebkitTextStroke: '1px #1890ff' }} />
          </div>
        </Col>
        <Col span={8}>
          <div style={metricCardStyle}>
            <div>
              <Text type="secondary" style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>ALIMENTO EN BODEGA (NETO)</Text>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#001529', marginTop: '4px' }}>
                {(totalProduccion - totalSalidas).toLocaleString()} <span style={{ fontSize: '18px', color: '#8c8c8c' }}>kg</span>
              </div>
            </div>
            <AppstoreAddOutlined style={{ fontSize: '48px', color: '#f6ffed', WebkitTextStroke: '1px #52c41a' }} />
          </div>
        </Col>
        <Col span={8}>
          <div style={metricCardStyle}>
            <div>
              <Text type="secondary" style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>INVENTARIO MATERIA PRIMA</Text>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#001529', marginTop: '4px' }}>
                {totalInventario.toLocaleString()} <span style={{ fontSize: '18px', color: '#8c8c8c' }}>kg</span>
              </div>
            </div>
            <CheckCircleOutlined style={{ fontSize: '48px', color: '#fff1f0', WebkitTextStroke: '1px #f5222d' }} />
          </div>
        </Col>
      </Row>

      <div style={glassCardStyle}>
        <Tabs defaultActiveKey="1" tabBarStyle={{ padding: '0 24px', margin: 0 }}>
          <TabPane tab={<span style={{ fontSize: '15px' }}><GoldOutlined /> 1. Catálogo Materia Prima</span>} key="1">
            <div style={{ padding: '24px' }}>
              <Table dataSource={insumos} columns={insumoCols} rowKey="id_insumo" loading={loading} pagination={{ pageSize: 10 }} rowClassName={() => ''} />
            </div>
          </TabPane>
          <TabPane tab={<span style={{ fontSize: '15px' }}><GoldOutlined /> 2. Catálogo Productos y Fórmulas</span>} key="2">
            <div style={{ padding: '24px' }}>
              <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsFormulaCreateVisible(true)}>Nuevo Producto / Fórmula</Button>
              </div>
              <Table dataSource={formulas} columns={formulasCols} rowKey="id_formula" loading={loading} pagination={{ pageSize: 10 }} />
            </div>
          </TabPane>
          <TabPane tab={<span style={{ fontSize: '15px' }}><ExperimentOutlined /> 3. Producción de Alimento</span>} key="3">
            <div style={{ padding: '24px' }}>
              <div style={{ marginBottom: '16px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <DatePicker.RangePicker onChange={(dates) => setFiltersProduccion({...filtersProduccion, dateRange: dates})} />
                <Select placeholder="Fórmula" style={{ width: 200 }} allowClear onChange={(v) => setFiltersProduccion({...filtersProduccion, formula: v})}>
                  {formulas.map(f => <Select.Option key={f.id_formula} value={f.id_formula}>{f.nombre}</Select.Option>)}
                </Select>
                <Input placeholder="Responsable (Nombre)" allowClear style={{ width: 200 }} onChange={(e) => setFiltersProduccion({...filtersProduccion, responsable: e.target.value})} />
                <Button type="primary" icon={<FilterOutlined />} onClick={handleFilterProduccion}>Procesar</Button>
              </div>
              <div style={{ marginBottom: '16px', color: '#cbd5e1' }}>Haz clic en el icono [+] para ver la trazabilidad de consumo de materia prima (Auditoría).</div>
              <Table 
                dataSource={filteredProduccion} 
                columns={prodCols} 
                rowKey="id_produccion" 
                loading={loading} 
                pagination={{ pageSize: 10 }} 
                rowClassName={() => ''} 
                expandable={{
                  expandedRowRender: record => {
                    let detalles = [];
                    try {
                      if (record.detalles_consumo_json) detalles = JSON.parse(record.detalles_consumo_json);
                    } catch(e) {}
                    if (detalles.length === 0) return <Text style={{color: '#94a3b8'}}>Sin trazabilidad detallada registrada.</Text>;
                    return (
                      <div style={{ padding: '16px', background: '#fafafa', borderRadius: '8px' }}>
                        <Text strong style={{ color: '#1890ff', display: 'block', marginBottom: '8px' }}>Consumo Real de Materia Prima:</Text>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: '#595959' }}>
                          {detalles.map((d, i) => (
                            <li key={i} style={{ marginBottom: '4px' }}>• {d.insumo}: <strong>{d.kg.toFixed(2)} kg</strong> (${d.costo.toFixed(2)})</li>
                          ))}
                        </ul>
                      </div>
                    );
                  }
                }}
              />
            </div>
          </TabPane>
          <TabPane tab={<span style={{ fontSize: '15px' }}><ExportOutlined /> 4. Salidas y Ventas</span>} key="4">
            <div style={{ padding: '24px' }}>
              <div style={{ marginBottom: '16px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <DatePicker.RangePicker onChange={(dates) => setFiltersSalidas({...filtersSalidas, dateRange: dates})} />
                <Select placeholder="Tipo de Salida" style={{ width: 200 }} allowClear onChange={(v) => setFiltersSalidas({...filtersSalidas, tipo_salida: v})}>
                  <Select.Option value="Consumo Interno">Consumo Interno</Select.Option>
                  <Select.Option value="Venta Externa">Venta Externa</Select.Option>
                </Select>
                {(!filtersSalidas.tipo_salida || filtersSalidas.tipo_salida === 'Consumo Interno') && (
                  <Select placeholder="Lago (Código o Desc)" allowClear showSearch optionFilterProp="children" style={{ width: 200 }} onChange={(v) => setFiltersSalidas({...filtersSalidas, lago: v})}>
                    {estanques.map(e => (
                      <Select.Option key={e.id_estanque} value={e.codigo}>{e.codigo} - {e.finca_nombre}</Select.Option>
                    ))}
                  </Select>
                )}
                {(!filtersSalidas.tipo_salida || filtersSalidas.tipo_salida === 'Venta Externa') && (
                  <Select placeholder="Cliente (Nombre o NIT)" allowClear showSearch optionFilterProp="children" style={{ width: 200 }} onChange={(v) => setFiltersSalidas({...filtersSalidas, cliente: v})}>
                    {Array.from(new Set(salidas.filter(s => s.tipo_salida === 'Venta Externa' && s.cliente_tercero).map(s => s.cliente_tercero))).map(c => (
                      <Select.Option key={c} value={c}>{c}</Select.Option>
                    ))}
                  </Select>
                )}
                <Button type="primary" icon={<FilterOutlined />} onClick={handleFilterSalidas}>Procesar</Button>
              </div>
              <Table dataSource={filteredSalidas} columns={salidasCols} rowKey="id_salida" loading={loading} pagination={{ pageSize: 10 }} rowClassName={() => ''} />
            </div>
          </TabPane>
          <TabPane tab={<span style={{ fontSize: '15px' }}><DatabaseOutlined /> 5. Kardex Materia Prima</span>} key="5">
            <div style={{ padding: '24px' }}>
              <div style={{ marginBottom: '16px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <DatePicker.RangePicker onChange={(dates) => setFiltersKardex({...filtersKardex, dateRange: dates})} />
                <Select placeholder="Materia Prima (Insumo)" style={{ width: 250 }} allowClear showSearch optionFilterProp="children" onChange={(v) => setFiltersKardex({...filtersKardex, insumo: v})}>
                  {insumos.map(i => <Select.Option key={i.id_insumo} value={i.id_insumo}>{i.codigo} - {i.nombre}</Select.Option>)}
                </Select>
                <Button type="primary" icon={<FilterOutlined />} onClick={handleFilterKardex}>Procesar</Button>
              </div>
              <Table dataSource={filteredKardex} columns={kardexCols} rowKey="id_movimiento" loading={loading} pagination={{ pageSize: 15 }} rowClassName={() => ''} />
            </div>
          </TabPane>
          <TabPane tab={<span style={{ fontSize: '15px' }}><CheckCircleOutlined /> 6. Kardex Producción e Ingresos Externos</span>} key="6">
            <div style={{ padding: '24px' }}>
              <div style={{ marginBottom: '16px', display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <DatePicker.RangePicker onChange={(dates) => setFiltersKardexProd({...filtersKardexProd, dateRange: dates})} />
                  <Select placeholder="Fórmula" style={{ width: 250 }} allowClear onChange={(v) => setFiltersKardexProd({...filtersKardexProd, formula: v})}>
                    {formulas.map(f => <Select.Option key={f.id_formula} value={f.id_formula}>{f.nombre}</Select.Option>)}
                  </Select>
                  <Button type="primary" icon={<FilterOutlined />} onClick={handleFilterKardexProd}>Procesar</Button>
                </div>
                <Button type="primary" style={{ background: '#8b5cf6', borderColor: '#8b5cf6' }} icon={<PlusOutlined />} onClick={() => setIsEntradaExternaVisible(true)}>
                  Registrar Entrada Producto
                </Button>
              </div>
              <Table dataSource={filteredKardexProd} columns={kardexProdCols} rowKey="id_movimiento" loading={loading} pagination={{ pageSize: 15 }} rowClassName={() => ''} />
            </div>
          </TabPane>
        </Tabs>
      </div>

      {/* MODAL ENTRADA MATERIA PRIMA */}
      <Modal title="Entrada de Materia Prima" open={isEntradaModalVisible} onCancel={() => setIsEntradaModalVisible(false)} footer={null}>
        <Form form={formEntrada} layout="vertical" onFinish={handleCreateEntrada}>
          <Form.Item name="tipo_entrada" label="Tipo de Entrada" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="children">
              <Select.Option value="Compra">Compra / Factura</Select.Option>
              <Select.Option value="Traslado">Traslado desde Bodega Principal</Select.Option>
              <Select.Option value="Saldo Inicial">Saldo Inicial</Select.Option>
              <Select.Option value="Obsequio">Obsequio / Muestra</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="id_insumo" label="Insumo" rules={[{ required: true }]}>
             <Select showSearch optionFilterProp="children">
                {insumos.map(i => <Select.Option key={i.id_insumo} value={i.id_insumo}>{i.nombre}</Select.Option>)}
             </Select>
          </Form.Item>
          <Form.Item name="fecha" label="Fecha" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="cantidad_kg" label="Cantidad Ingresada (kg)" rules={[{ required: true }]}>
             <Input type="number" />
          </Form.Item>
          <Form.Item name="proveedor" label="Proveedor (Si aplica)">
             <Input />
          </Form.Item>
          <Form.Item name="costo_total" label="Costo Total ($) (Opcional)">
             <Input type="number" />
          </Form.Item>
          <Form.Item name="notas" label="Notas Adicionales">
             <Input.TextArea rows={2} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block style={{ background: '#3b82f6', borderColor: '#3b82f6' }}>
            Registrar Entrada
          </Button>
        </Form>
      </Modal>

      {/* MODAL SIMULADOR DE PRODUCCION */}
      <Modal title="Simulador de Producción" open={isSimuladorModalVisible} onCancel={() => { setIsSimuladorModalVisible(false); setSimuladorResult(null); formSimulador.resetFields(); }} footer={null} width={700}>
        <Form form={formSimulador} layout="vertical">
          <Row gutter={16}>
            <Col span={14}>
              <Form.Item name="id_formula" label="Fórmula a Simular" rules={[{ required: true }]}>
                <Select>
                  {formulas.map(f => <Select.Option key={f.id_formula} value={f.id_formula}>{f.nombre}</Select.Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="cantidad_kg" label="Bultos/Kg" rules={[{ required: true }]}>
                <Input type="number" />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Button type="primary" onClick={handleSimularProduccion} style={{ marginTop: '30px' }} block>Simular</Button>
            </Col>
          </Row>
        </Form>
        {simuladorResult && (
          <div style={{ marginTop: '20px', padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#333' }}>
            <Title level={5}>Resultados: {simuladorResult.formula} ({simuladorResult.cantidad} kg)</Title>
            <Table 
              dataSource={simuladorResult.detalles} 
              rowKey="id_insumo" 
              pagination={false} 
              size="small"
              columns={[
                { title: 'Insumo', dataIndex: 'nombre' },
                { title: 'Requerido (kg)', dataIndex: 'requerido', render: v => <strong>{v.toFixed(2)}</strong> },
                { title: 'En Bodega (kg)', dataIndex: 'stock', render: v => v.toFixed(2) },
                { title: 'Estado', render: (_, r) => r.deficit > 0 ? <Tag color="red">Déficit: {r.deficit.toFixed(2)} kg</Tag> : <Tag color="green">OK</Tag> }
              ]}
            />
            {simuladorResult.detalles.some(d => d.deficit > 0) && (
              <div style={{ marginTop: '16px', textAlign: 'right' }}>
                <Button type="primary" danger icon={<ShoppingCartOutlined />} onClick={handleSolicitarPedido}>
                  Solicitar Insumos a Bodega Principal
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* MODAL SALIDAS */}
      <Modal title="Despachar o Vender Alimento" open={isSalidaModalVisible} onCancel={() => setIsSalidaModalVisible(false)} footer={null}>
        <Form form={formSalida} layout="vertical" onFinish={handleCreateSalida} initialValues={{ tipo_salida: 'Consumo Interno' }}>
          <Form.Item name="tipo_salida" label="Tipo de Salida" rules={[{ required: true }]}>
            <Select onChange={(v) => setTipoSalida(v)}>
              <Select.Option value="Consumo Interno">Consumo Interno (Despacho a Lago)</Select.Option>
              <Select.Option value="Venta Externa">Venta a Cliente (Facturación)</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="id_formula" label="Fórmula" rules={[{ required: true }]}>
             <Select>
                {formulas.map(f => <Select.Option key={f.id_formula} value={f.id_formula}>{f.nombre}</Select.Option>)}
             </Select>
          </Form.Item>
          <Form.Item name="fecha" label="Fecha" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="cantidad_kg" label="Cantidad (kg)" rules={[{ required: true }]}>
             <Input type="number" />
          </Form.Item>

          {tipoSalida === 'Consumo Interno' && (
            <Form.Item name="id_estanque" label="Lago/Estanque Destino" rules={[{ required: true }]}>
              <Select showSearch optionFilterProp="children" placeholder="Buscar estanque por código o finca...">
                {estanques.map(e => (
                  <Select.Option key={e.id_estanque} value={e.id_estanque}>
                    {e.codigo} - {e.finca_nombre}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          )}

          {tipoSalida === 'Venta Externa' && (
             <>
               <Form.Item name="cliente_tercero" label="Cliente / NIT" rules={[{ required: true }]}>
                 <Input placeholder="Ej: 900123456" />
               </Form.Item>
               <Form.Item name="valor_venta" label="Valor Total Venta ($)" rules={[{ required: true }]}>
                 <Input type="number" placeholder="Ej: 1500000" />
               </Form.Item>
             </>
          )}

          <Form.Item name="notas" label="Notas">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block style={{ background: '#10b981', borderColor: '#10b981' }}>
            Confirmar Salida
          </Button>
        </Form>
      </Modal>

      {/* MODAL PRODUCCION */}
      <Modal title="Registrar Producción de Molino" open={isProdModalVisible} onCancel={() => setIsProdModalVisible(false)} footer={null}>
        <Form form={formProd} layout="vertical" onFinish={handleCreateProd}>
          <Form.Item name="id_formula" label="Fórmula a Producir" rules={[{ required: true }]}>
             <Select>
                {formulas.map(f => <Select.Option key={f.id_formula} value={f.id_formula}>{f.nombre}</Select.Option>)}
             </Select>
          </Form.Item>
          <Form.Item name="fecha" label="Fecha Producción" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="cantidad_bultos" label="Cantidad de Bultos" rules={[{ required: true }]}>
                <Input type="number" onChange={(e) => {
                  const bultos = e.target.value;
                  const peso = formProd.getFieldValue('peso_bulto_kg') || 0;
                  formProd.setFieldsValue({ cantidad_producida_kg: bultos * peso });
                }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="peso_bulto_kg" label="Peso por Bulto (kg)" rules={[{ required: true }]}>
                <Input type="number" onChange={(e) => {
                  const peso = e.target.value;
                  const bultos = formProd.getFieldValue('cantidad_bultos') || 0;
                  formProd.setFieldsValue({ cantidad_producida_kg: bultos * peso });
                }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="cantidad_producida_kg" label="Cantidad Total Producida (kg)" rules={[{ required: true }]}>
             <Input type="number" disabled style={{ color: '#000', fontWeight: 'bold' }} />
          </Form.Item>
          <Form.Item name="responsable" label="Operador Responsable">
             <Input />
          </Form.Item>
          <Button type="primary" htmlType="submit" block style={{ background: '#f59e0b', borderColor: '#f59e0b' }}>
            Registrar Producción
          </Button>
        </Form>
      </Modal>

      {/* MODAL FORMULAS */}
      <Modal 
        title={`Editar Fórmula: ${editingFormula?.nombre}`} 
        open={isFormulaModalVisible} 
        onCancel={() => { setIsFormulaModalVisible(false); setEditingFormula(null); formFormula.resetFields(); }}
        footer={null}
        width={700}
      >
        <div style={{ padding: '12px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '8px', marginBottom: '16px', color: '#b45309' }}>
          <strong>Importante:</strong> La suma de todos los porcentajes debe ser exactamente 100%. Si modificas componentes, ajusta los demás para compensar.
        </div>
        <Form form={formFormula} layout="vertical" onFinish={handleSaveFormula}>
          <Form.List name="ingredientes">
            {(fields, { add, remove }) => {
              const currentIngredientes = ingredientesWatch || formFormula.getFieldValue('ingredientes') || [];
              const totalPct = currentIngredientes.reduce((acc, curr) => acc + (parseFloat(curr?.pct) || 0), 0);
              const is100 = Math.abs(totalPct - 100) < 0.01;
              return (
                <>
                  {fields.map(({ key, name, ...restField }) => (
                    <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                      <Form.Item
                        {...restField}
                        name={[name, 'id_insumo']}
                        rules={[{ required: true, message: 'Falta insumo' }]}
                        style={{ width: '400px' }}
                      >
                        <Select placeholder="Selecciona un insumo" showSearch optionFilterProp="children">
                          {insumos.map(ins => <Select.Option key={ins.id_insumo} value={ins.id_insumo}>{ins.nombre} (Bodega: {ins.cantidad_actual}kg)</Select.Option>)}
                        </Select>
                      </Form.Item>
                      <Form.Item
                        {...restField}
                        name={[name, 'pct']}
                        rules={[{ required: true, message: 'Falta %' }]}
                      >
                        <Input type="number" placeholder="%" style={{ width: '100px' }} min={0.1} max={100} step="0.1" />
                      </Form.Item>
                      <span style={{ margin: '0 8px' }}>%</span>
                      <MinusCircleOutlined onClick={() => remove(name)} style={{ color: '#ef4444' }} />
                    </Space>
                  ))}
                  <Form.Item>
                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                      Añadir Ingrediente
                    </Button>
                  </Form.Item>
                  <div style={{ textAlign: 'right', fontSize: '16px', marginBottom: '16px', color: is100 ? '#10b981' : '#ef4444' }}>
                    <strong>Total Porcentaje: {totalPct.toFixed(2)}%</strong> {!is100 && '(Debe ser 100%)'}
                  </div>
                  <Form.Item>
                    <Button type="primary" htmlType="submit" block size="large" disabled={!is100} style={{ background: '#38bdf8', border: 'none' }}>
                      Guardar Cambios de Fórmula
                    </Button>
                  </Form.Item>
                </>
              );
            }}
          </Form.List>
        </Form>
      </Modal>

      {/* MODAL SALIDA MANUAL (AJUSTES) */}
      <Modal title="Ajuste / Salida Manual de Insumo" open={isManualOutVisible} onCancel={() => setIsManualOutVisible(false)} footer={null}>
        <div style={{ padding: '12px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', marginBottom: '16px', color: '#1e40af' }}>
          <strong>Info:</strong> Usa esta opción para descontar insumos de la bodega por conceptos como traslados a otras áreas de la finca, consumo de otros animales, o bajas por vencimiento.
        </div>
        <Form form={formManualOut} layout="vertical" onFinish={handleCreateManualOut}>
          <Form.Item name="id_insumo" hidden><Input /></Form.Item>
          <Form.Item name="insumo_nombre" label="Insumo Seleccionado">
            <Input disabled />
          </Form.Item>
          <Form.Item name="cantidad_kg" label="Cantidad a Retirar (kg)" rules={[{ required: true }]}>
            <Input type="number" step="0.01" />
          </Form.Item>
          <Form.Item name="concepto" label="Concepto (Razón del retiro)" rules={[{ required: true }]}>
            <Input placeholder="Ej. Retiro para alimentar caballos" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" danger block size="large">Registrar Salida de Bodega</Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* MODAL CREAR NUEVA FORMULA/PRODUCTO */}
      <Modal title="Crear Nuevo Producto / Fórmula" open={isFormulaCreateVisible} onCancel={() => setIsFormulaCreateVisible(false)} footer={null} width={700}>
        <Form form={formFormulaCreate} layout="vertical" onFinish={handleCreateFormula} initialValues={{ es_externo: false }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="nombre" label="Nombre del Producto/Fórmula" rules={[{ required: true }]}>
                <Input placeholder="Ej: Italcol Mojarra 32%" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="fase_recomendada" label="Fase" rules={[{ required: true }]}>
                <Input placeholder="Ej: Engorde" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="proteina_pct" label="% Proteína">
                <Input type="number" placeholder="32" />
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item name="es_externo" valuePropName="checked">
            <Checkbox onChange={(e) => setEsExternoWatch(e.target.checked)}>
              <strong>Es un producto terminado externo (Comprado)</strong> - No requiere formulación
            </Checkbox>
          </Form.Item>

          {!esExternoWatch && (
            <>
              <div style={{ padding: '12px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '8px', marginBottom: '16px', color: '#b45309' }}>
                Añade los ingredientes. La suma de los porcentajes debe ser 100%.
              </div>
              <Form.List name="ingredientes">
                {(fields, { add, remove }) => {
                  const items = formFormulaCreate.getFieldValue('ingredientes') || [];
                  const totalPct = items.reduce((acc, curr) => acc + (parseFloat(curr?.pct) || 0), 0);
                  const is100 = Math.abs(totalPct - 100) < 0.01;
                  return (
                    <>
                      {fields.map(({ key, name, ...restField }) => (
                        <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                          <Form.Item {...restField} name={[name, 'id_insumo']} rules={[{ required: true, message: 'Falta insumo' }]} style={{ width: '350px' }}>
                            <Select placeholder="Selecciona un insumo" showSearch optionFilterProp="children">
                              {insumos.map(ins => <Select.Option key={ins.id_insumo} value={ins.id_insumo}>{ins.nombre}</Select.Option>)}
                            </Select>
                          </Form.Item>
                          <Form.Item {...restField} name={[name, 'pct']} rules={[{ required: true, message: 'Falta %' }]}>
                            <Input type="number" placeholder="%" style={{ width: '100px' }} min={0.1} max={100} step="0.1" />
                          </Form.Item>
                          <MinusCircleOutlined onClick={() => remove(name)} style={{ color: '#ef4444' }} />
                        </Space>
                      ))}
                      <Form.Item>
                        <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>Añadir Ingrediente</Button>
                      </Form.Item>
                      <div style={{ textAlign: 'right', marginBottom: '16px', color: is100 ? '#10b981' : '#ef4444' }}>
                        <strong>Total: {totalPct.toFixed(2)}%</strong>
                      </div>
                    </>
                  );
                }}
              </Form.List>
            </>
          )}

          <Form.Item>
            <Button type="primary" htmlType="submit" block size="large">Crear Producto</Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* MODAL ENTRADA PRODUCTO EXTERNO */}
      <Modal title="Registrar Entrada de Producto Terminado" open={isEntradaExternaVisible} onCancel={() => setIsEntradaExternaVisible(false)} footer={null}>
        <Form form={formEntradaExterna} layout="vertical" onFinish={handleCreateEntradaExterna}>
          <Form.Item name="tipo_entrada" label="Tipo de Entrada" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="children">
              <Select.Option value="Compra">Compra Externa / Factura</Select.Option>
              <Select.Option value="Traslado">Traslado desde Bodega Principal</Select.Option>
              <Select.Option value="Saldo Inicial">Saldo Inicial</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="id_formula" label="Producto / Fórmula" rules={[{ required: true }]}>
             <Select showSearch optionFilterProp="children">
                {formulas.map(f => <Select.Option key={f.id_formula} value={f.id_formula}>{f.nombre} {f.es_externo ? '(Externo)' : '(Propio)'}</Select.Option>)}
             </Select>
          </Form.Item>
          <Form.Item name="fecha" label="Fecha" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="cantidad_kg" label="Cantidad Ingresada (kg)" rules={[{ required: true }]}>
             <Input type="number" />
          </Form.Item>
          <Form.Item name="proveedor" label="Proveedor / Origen (Si aplica)">
             <Input />
          </Form.Item>
          <Form.Item name="costo_total" label="Costo Total ($) (Opcional)">
             <Input type="number" />
          </Form.Item>
          <Form.Item name="notas" label="Notas Adicionales">
             <Input.TextArea rows={2} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block style={{ background: '#8b5cf6', borderColor: '#8b5cf6' }}>
            Registrar Entrada a Bodega
          </Button>
        </Form>
      </Modal>


    </div>
  );
}
