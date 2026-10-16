import React, { useState, useEffect, useMemo } from 'react';
import PremiumSelect from '../PremiumSelect';
import ExportButtons from '../ExportButtons';
import { authFetch } from '../../utils/api.js';
import { Modal, Form, InputNumber, Button, Select, message, ConfigProvider, theme, Popconfirm } from 'antd';
import { PlusOutlined, CaretUpOutlined, CaretDownOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import '../dashboard.css';

const { Option } = Select;

const CentroMezclas = ({ tenantId = 1 }) => {
  const [mezclas, setMezclas] = useState([]);
  const [filteredMezclas, setFilteredMezclas] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'id_preparacion', direction: 'desc' });
  
  const [fincas, setFincas] = useState([]);
  const [nucleos, setNucleos] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [bodegas, setBodegas] = useState([]);
  
  const [recetas, setRecetas] = useState({});
  const [operarios, setOperarios] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [filters, setFilters] = useState({
    finca: '',
    lote: '',
    responsable: ''
  });

  // Modal state
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const formFincaValue = Form.useWatch('finca_id', form);

  useEffect(() => {
    const loadDependencies = async () => {
      try {
        const [fincasRes, nucleosRes, lotesRes, recetasRes, empRes, tercerosRes, bodegasRes] = await Promise.all([
          authFetch(`/api/table/fincas/data?tenantId=1&pageSize=5000&sortCol=id_finca`),
          authFetch(`/api/table/nucleos/data?tenantId=1&pageSize=5000&sortCol=id_nucleo`),
          authFetch(`/api/table/lotes/data?tenantId=1&pageSize=5000&sortCol=id_lote`),
          authFetch(`/api/applications/recipes`),
          authFetch(`/api/table/rrhh_empleados/data?tenantId=1&pageSize=5000&sortCol=id_empleado`),
          authFetch(`/api/table/terceros/data?tenantId=1&pageSize=5000&sortCol=id_tercero`),
          authFetch(`/api/table/bod_bodegas/data?tenantId=1&pageSize=5000&sortCol=id_bodega`)
        ]);
        
        if (fincasRes.ok) setFincas((await fincasRes.json()).data || []);
        if (nucleosRes.ok) setNucleos((await nucleosRes.json()).data || []);
        if (lotesRes.ok) setLotes((await lotesRes.json()).data || []);
        if (bodegasRes.ok) setBodegas((await bodegasRes.json()).data || []);
        
        if (recetasRes.ok) {
          const rData = await recetasRes.json();
          const rMap = {};
          rData.forEach(r => rMap[r.id_receta] = r.nombre_receta);
          setRecetas(rMap);
        }

        let combined = [];
        if (empRes.ok) {
          const eData = await empRes.json();
          combined = combined.concat((eData.data || []).map(e => ({
            id: `E-${e.id_empleado}`,
            nombre: `${e.nombres} ${e.apellidos || ''}`.trim(),
            tipo: 'Empleado Interno',
            cargo: e.cargo || 'Operario'
          })));
        }
        if (tercerosRes.ok) {
          const tData = await tercerosRes.json();
          const contratistas = (tData.data || []).filter(t => t.es_proveedor).map(t => ({
            id: `T-${t.id_tercero}`,
            nombre: t.nombre_completo || t.nombre_comercial || `${t.primer_nombre} ${t.primer_apellido}`,
            tipo: 'Contratista',
            cargo: 'Proveedor de Servicio'
          }));
          combined = combined.concat(contratistas);
        }
        setOperarios(combined);
      } catch (err) {
        console.error(err);
      }
    };
    loadDependencies();
  }, []);

  const getLotesByFinca = (fincaId) => {
    if (!fincaId) return lotes;
    const nucleosFinca = nucleos.filter(n => String(n.id_finca) === String(fincaId)).map(n => String(n.id_nucleo));
    return lotes.filter(l => nucleosFinca.includes(String(l.id_nucleo)));
  };

  const dashboardLotes = useMemo(() => getLotesByFinca(filters.finca), [filters.finca, lotes, nucleos]);
  const modalLotes = useMemo(() => getLotesByFinca(formFincaValue), [formFincaValue, lotes, nucleos]);

  // Dictionary for quick lot name lookup in table
  const lotesMap = useMemo(() => {
    const map = {};
    lotes.forEach(l => map[l.id_lote] = l.nombre);
    return map;
  }, [lotes]);

  const handleProcess = async () => {
    setLoading(true);
    try {
      const mezclasRes = await authFetch(`/api/table/app_preparaciones_mezcla/data?tenantId=${tenantId}&pageSize=5000`);

      if (mezclasRes.ok) {
        const json = await mezclasRes.json();
        const mData = json.data || [];
        
        let result = mData;
        
        // Filter by Finca if selected
        if (filters.finca) {
          const validLotes = dashboardLotes.map(l => String(l.id_lote));
          result = result.filter(m => validLotes.includes(String(m.lote_id || m.id_lote)));
        }
        
        if (filters.lote) result = result.filter(m => String(m.id_lote) === String(filters.lote) || String(m.lote_id) === String(filters.lote));
        if (filters.responsable) result = result.filter(m => (m.responsable_mezcla || m.responsable || '').toLowerCase().includes(filters.responsable.toLowerCase()));
        
        setMezclas(mData);
        setFilteredMezclas(result);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedMezclas = useMemo(() => {
    let sortableItems = [...filteredMezclas];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        
        if (sortConfig.key === 'lote') {
          aVal = lotesMap[a.id_lote || a.lote_id] || a.lote_id || '';
          bVal = lotesMap[b.id_lote || b.lote_id] || b.lote_id || '';
        } else if (sortConfig.key === 'receta') {
          aVal = recetas[a.id_receta] || a.id_receta || '';
          bVal = recetas[b.id_receta] || b.id_receta || '';
        } else if (sortConfig.key === 'id_preparacion') {
          aVal = a.id_preparacion || a.id_mezcla || a.id || 0;
          bVal = b.id_preparacion || b.id_mezcla || b.id || 0;
        } else if (sortConfig.key === 'fecha_preparacion') {
          aVal = new Date(a.fecha_preparacion || 0).getTime();
          bVal = new Date(b.fecha_preparacion || 0).getTime();
        } else if (sortConfig.key === 'volumen_preparado') {
          aVal = a.volumen_preparado || a.cantidad_litros || 0;
          bVal = b.volumen_preparado || b.cantidad_litros || 0;
        } else if (sortConfig.key === 'responsable_mezcla') {
          aVal = a.responsable_mezcla || a.responsable || '';
          bVal = b.responsable_mezcla || b.responsable || '';
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [filteredMezclas, sortConfig, lotesMap, recetas]);

  const renderSortIcon = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === 'asc' ? <CaretUpOutlined style={{ color: '#10B981' }} /> : <CaretDownOutlined style={{ color: '#10B981' }} />;
    }
    return <span style={{ opacity: 0.3 }}>⇅</span>;
  };

  const handleEdit = (m) => {
    setEditingId(m.id_preparacion || m.id_mezcla || m.id);
    
    // Attempt to automatically select the Finca if we can derive it from the Lote
    const loteId = String(m.id_lote || m.lote_id);
    const loteObj = lotes.find(l => String(l.id_lote) === loteId);
    let fincaId = undefined;
    if (loteObj) {
        const nucleoObj = nucleos.find(n => String(n.id_nucleo) === String(loteObj.id_nucleo));
        if (nucleoObj) {
            fincaId = nucleoObj.id_finca;
        }
    }

    // We need to fetch the original mixture to know the bodega if it was saved, 
    // but the backend API currently doesn't return bodega for the grid. 
    // We'll set the default bodega for the finca.
    let defaultBodega = undefined;
    if (fincaId) {
       const b = bodegas.find(bd => String(bd.id_finca) === String(fincaId));
       if (b) defaultBodega = b.id_bodega;
    }

    form.setFieldsValue({
      id_receta: String(m.id_receta),
      finca_id: fincaId,
      lote_id: Number(loteId),
      id_bodega: defaultBodega,
      cantidad_litros: m.volumen_preparado || m.cantidad_litros,
      responsable_mezcla: m.responsable_mezcla || m.responsable
    });
    
    setIsModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      const res = await authFetch(`/api/applications/mezclas_transaccionales/${id}`, { method: 'DELETE' });
      if (res.ok) {
        message.success('Registro de mezcla eliminado con éxito');
        handleProcess(); // Reload table
      } else {
        message.error('Error al intentar eliminar');
      }
    } catch (e) {
      console.error(e);
      message.error('Error de red al eliminar');
    }
  };

  const handleCreateMezcla = async (values) => {
    setSubmitting(true);
    try {
      const payload = {
        id_tenant: tenantId,
        id_receta: values.id_receta,
        lote_id: values.lote_id,
        id_bodega: values.id_bodega,
        cantidad_litros: values.cantidad_litros,
        responsable_mezcla: values.responsable_mezcla,
        producto: recetas[values.id_receta] || 'Mezcla Fitosanitaria'
      };

      let res;
      if (editingId) {
        res = await authFetch(`/api/applications/mezclas_transaccionales/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await authFetch(`/api/applications/mezclas_transaccionales`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        message.success(`Preparación de mezcla ${editingId ? 'actualizada' : 'registrada'} exitosamente`);
        setIsModalVisible(false);
        setEditingId(null);
        form.resetFields();
        handleProcess(); // Reload table
      } else {
        const errData = await res.json();
        message.error('Error al guardar: ' + (errData.error || 'Desconocido'));
      }
    } catch (err) {
      console.error(err);
      message.error('Error de red al intentar guardar la mezcla.');
    } finally {
      setSubmitting(false);
    }
  };

  const exportColumns = [
    { header: 'ID Mezcla', key: 'id', getter: m => `MEZ-${m.id_preparacion || m.id_mezcla || m.id}` },
    { header: 'Fecha', key: 'fecha', getter: m => m.fecha_preparacion ? new Date(m.fecha_preparacion).toLocaleString() : 'N/A' },
    { header: 'Lote Destino', key: 'lote', getter: m => lotesMap[m.id_lote || m.lote_id] || m.lote_id || m.id_lote || 'General' },
    { header: 'Receta (Fórmula)', key: 'receta', getter: m => recetas[m.id_receta] || m.id_receta || 'Mezcla Manual' },
    { header: 'Volumen Total (Lts)', key: 'volumen', getter: m => `${m.volumen_preparado || m.cantidad_litros || 0} Lts` },
    { header: 'Responsable', key: 'responsable', getter: m => m.responsable_mezcla || m.responsable || 'No asignado' },
  ];

  const getSelectedFincaName = () => {
    if (!filters.finca) return 'Todas las Fincas';
    const f = fincas.find(f => String(f.id_finca) === String(filters.finca));
    return f ? f.nombre : 'Todas las Fincas';
  };

  if (loading && mezclas.length === 0) return <div className="loading">Cargando Centro de Mezclas...</div>;

  return (
    <div className="dashboard-container">
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Auditoría: Centro de Mezclas</h1>
          <p style={{ color: 'var(--text-muted)' }}>Registro de preparaciones de recetas fitosanitarias</p>
        </div>
        <div style={{ display: 'flex', gap: '15px' }}>
          <ExportButtons 
            data={sortedMezclas} 
            columns={exportColumns} 
            filename="Auditoria_Centro_Mezclas" 
            extraMetadata={{ finca: getSelectedFincaName() }}
          />
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            size="large" 
            onClick={() => {
              setEditingId(null);
              form.resetFields();
              setIsModalVisible(true);
            }}
            style={{ background: '#10B981', borderColor: '#10B981' }}
          >
            Nueva Preparación
          </Button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '25px', padding: '0', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
        <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '15px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.2em' }}>🔍</span>
          <h4 style={{ margin: 0, color: '#60A5FA' }}>Buscador Maestro de Centro de Mezclas</h4>
        </div>
        
        <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', background: 'rgba(0,0,0,0.15)' }}>
          <div>
            <label style={{ fontSize: '0.95em', fontWeight: 'bold', color: '#fff', marginBottom: '8px', display: 'block' }}>Filtrar por Finca</label>
            <PremiumSelect
              options={fincas.map((f) => ({ value: f.id_finca, label: f.nombre }))}
              value={filters.finca}
              onChange={e => {
                setFilters({...filters, finca: e.target.value, lote: ''}); // Reset lote
              }}
              placeholder="-- Todas las Fincas --"
            />
          </div>
          <div>
            <label style={{ fontSize: '0.95em', fontWeight: 'bold', color: '#fff', marginBottom: '8px', display: 'block' }}>Filtrar por Lote Destino</label>
            <PremiumSelect
              options={dashboardLotes.map((l) => ({ value: l.id_lote, label: l.nombre }))}
              value={filters.lote}
              onChange={e => setFilters({...filters, lote: e.target.value})}
              placeholder="-- Todos los Lotes --"
            />
          </div>
          <div>
            <label style={{ fontSize: '0.95em', fontWeight: 'bold', color: '#fff', marginBottom: '8px', display: 'block' }}>Responsable de Mezcla</label>
            <PremiumSelect
              options={operarios.map(e => ({ value: e.nombre, label: `${e.nombre} (${e.tipo})` }))}
              value={filters.responsable}
              onChange={e => setFilters({...filters, responsable: e.target.value})}
              placeholder="-- Todos los Responsables --"
            />
          </div>
        </div>
        
        <div style={{ padding: '15px 20px', background: 'rgba(0,0,0,0.25)', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={handleProcess} disabled={loading} style={{ padding: '10px 25px', fontSize: '1.05em', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
            {loading ? '⏳ Procesando...' : '⚙️ Procesar Consulta'}
          </button>
        </div>
      </div>

      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('id_preparacion')} style={{cursor: 'pointer', userSelect: 'none'}}>
                ID Mezcla <span style={{marginLeft: '5px'}}>{renderSortIcon('id_preparacion')}</span>
              </th>
              <th onClick={() => handleSort('fecha_preparacion')} style={{cursor: 'pointer', userSelect: 'none'}}>
                Fecha <span style={{marginLeft: '5px'}}>{renderSortIcon('fecha_preparacion')}</span>
              </th>
              <th onClick={() => handleSort('lote')} style={{cursor: 'pointer', userSelect: 'none'}}>
                Lote Destino <span style={{marginLeft: '5px'}}>{renderSortIcon('lote')}</span>
              </th>
              <th onClick={() => handleSort('receta')} style={{cursor: 'pointer', userSelect: 'none'}}>
                Receta (Fórmula) <span style={{marginLeft: '5px'}}>{renderSortIcon('receta')}</span>
              </th>
              <th onClick={() => handleSort('volumen_preparado')} style={{cursor: 'pointer', userSelect: 'none'}}>
                Volumen Total (Lts) <span style={{marginLeft: '5px'}}>{renderSortIcon('volumen_preparado')}</span>
              </th>
              <th onClick={() => handleSort('responsable_mezcla')} style={{cursor: 'pointer', userSelect: 'none'}}>
                Responsable <span style={{marginLeft: '5px'}}>{renderSortIcon('responsable_mezcla')}</span>
              </th>
              <th style={{ textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sortedMezclas.length === 0 ? (
              <tr><td colSpan="7" style={{textAlign: 'center', padding: '20px'}}>Presione 'Procesar Consulta' para cargar registros.</td></tr>
            ) : (
              sortedMezclas.map(m => (
                <tr key={m.id_preparacion || m.id_mezcla || m.id}>
                  <td>MEZ-{m.id_preparacion || m.id_mezcla || m.id}</td>
                  <td>{m.fecha_preparacion ? new Date(m.fecha_preparacion).toLocaleString() : 'N/A'}</td>
                  <td>{lotesMap[m.id_lote || m.lote_id] || m.lote_id || m.id_lote || 'General'}</td>
                  <td>{recetas[m.id_receta] || m.id_receta || 'Mezcla Manual'}</td>
                  <td>{m.volumen_preparado || m.cantidad_litros || 0} Lts</td>
                  <td style={{ color: m.responsable_mezcla ? '#10B981' : '#EF4444', fontWeight: m.responsable_mezcla ? 'normal' : 'bold' }}>
                    {m.responsable_mezcla || m.responsable || 'No asignado'}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <Button 
                      type="text" 
                      icon={<EditOutlined style={{ color: '#3b82f6' }} />} 
                      onClick={() => handleEdit(m)}
                    />
                    <Popconfirm
                      title="¿Eliminar esta mezcla?"
                      description="Esta acción no se puede deshacer."
                      onConfirm={() => handleDelete(m.id_preparacion || m.id_mezcla || m.id)}
                      okText="Sí, Eliminar"
                      cancelText="Cancelar"
                      okButtonProps={{ danger: true }}
                    >
                      <Button type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Nueva / Editar Preparación */}
      <ConfigProvider theme={{ algorithm: theme.darkAlgorithm, token: { colorBgElevated: '#1f2937', colorPrimary: '#10B981', colorText: '#e5e7eb' } }}>
        <Modal
          title={<span style={{ color: '#10B981', fontSize: '1.2em' }}>⚗️ {editingId ? 'Editar' : 'Nueva'} Preparación de Mezcla</span>}
          open={isModalVisible}
          onCancel={() => { setIsModalVisible(false); setEditingId(null); }}
          footer={null}
          destroyOnClose
          width={600}
        >
          <Form form={form} layout="vertical" onFinish={handleCreateMezcla}>
            <Form.Item name="id_receta" label="Receta Fitosanitaria a Preparar" rules={[{ required: true, message: 'Seleccione una receta' }]}>
              <Select showSearch placeholder="Seleccione la receta/fórmula" filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}>
                {Object.entries(recetas).map(([id, nombre]) => (
                  <Option key={id} value={id}>{nombre}</Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item name="finca_id" label="Finca Destino" rules={[{ required: true, message: 'Seleccione la finca' }]}>
              <Select 
                showSearch 
                placeholder="Seleccione la finca" 
                filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}
                onChange={(val) => {
                  form.setFieldsValue({ lote_id: undefined });
                  const b = bodegas.find(bd => String(bd.id_finca) === String(val));
                  if (b) form.setFieldsValue({ id_bodega: b.id_bodega });
                }}
              >
                {fincas.map((f) => (
                  <Option key={f.id_finca} value={f.id_finca}>{f.nombre}</Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item name="lote_id" label="Lote o Potrero Destino" rules={[{ required: true, message: 'Seleccione el lote destino' }]}>
              <Select showSearch placeholder="Seleccione el lote" disabled={!formFincaValue} filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}>
                {modalLotes.map((l) => (
                  <Option key={l.id_lote} value={l.id_lote}>{l.nombre}</Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item name="id_bodega" label="Bodega de Origen (Insumos)" rules={[{ required: true, message: 'Seleccione la bodega' }]}>
              <Select showSearch placeholder="Seleccione la bodega de la finca" filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}>
                {bodegas.map((b) => (
                  <Option key={b.id_bodega} value={b.id_bodega}>{b.nombre_bodega || b.nombre}</Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item name="cantidad_litros" label="Volumen a Preparar (Litros Totales de Mezcla)" rules={[{ required: true, message: 'Ingrese la cantidad' }]}>
              <InputNumber style={{ width: '100%' }} min={1} placeholder="Ej: 200 Lts" />
            </Form.Item>

            <Form.Item name="responsable_mezcla" label="Responsable de la Mezcla (Interno o Contratista)" rules={[{ required: true, message: 'Seleccione un responsable' }]}>
              <Select showSearch placeholder="Seleccione el responsable" filterOption={(input, option) => String(option.children).toLowerCase().includes(input.toLowerCase())}>
                {operarios.map(e => (
                  <Option key={e.id} value={e.nombre}>
                    {e.nombre} - <span style={{ color: e.tipo === 'Contratista' ? '#F59E0B' : '#60A5FA' }}>[{e.tipo}]</span>
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item style={{ marginTop: '20px', textAlign: 'right' }}>
              <Button onClick={() => { setIsModalVisible(false); setEditingId(null); }} style={{ marginRight: '10px' }}>Cancelar</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                {editingId ? 'Actualizar Preparación' : 'Registrar Preparación'}
              </Button>
            </Form.Item>
          </Form>
        </Modal>
      </ConfigProvider>

    </div>
  );
};

export default CentroMezclas;
