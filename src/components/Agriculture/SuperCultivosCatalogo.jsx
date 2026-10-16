import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Table, Button, Modal, Tabs, Form, Input, InputNumber, notification, Card, Row, Col, Typography, Select, ConfigProvider, theme, Space, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, CompassOutlined, CheckCircleOutlined, MinusCircleOutlined, QuestionCircleOutlined } from '@ant-design/icons';

const { TabPane } = Tabs;
const { Title, Text } = Typography;
const { Option } = Select;

// Ficha técnica experta para autocompletar en el Wizard (Basado en Agronomía Real)
const WIZARD_EXPERT_DATA = {
  'Plátano (Hartón)': {
    nombre_oficial: 'Plátano (Hartón)',
    especie_biologica: 'Musa paradisiaca',
    familia_botanica: 'Musaceae',
    imagen_url: '/img/cultivos/platano_harton_gen.png',
    resumen_cientifico_api: 'El plátano Hartón (Musa paradisiaca) es una planta herbácea gigante originaria de Asia. En Colombia es fundamental para la seguridad alimentaria. Requiere climas cálidos y húmedos, suelos profundos y bien drenados. El ciclo vegetativo hasta la cosecha dura aproximadamente 9 a 12 meses.',
    distancia_siembra_m: 3,
    densidad_ha: 1111,
    dias_ciclo: 360,
    plagas: [
      { nombre_plaga: 'Picudo negro (Cosmopolites sordidus)', etapa_ataque: 'Desarrollo vegetativo', umbral_dano: '3 picudos por trampa/semana' },
      { nombre_plaga: 'Gusano tornillo (Castniomera humboldti)', etapa_ataque: 'Crecimiento', umbral_dano: 'Presencia visual en tallo' }
    ],
    enfermedades: [
      { nombre_enfermedad: 'Sigatoka Negra (Mycosphaerella fijiensis)', sintomas: 'Estrías marrones en el envés de la hoja, necrosis.', nivel_riesgo: 'Crítico' },
      { nombre_enfermedad: 'Moko (Ralstonia solanacearum)', sintomas: 'Marchitamiento rápido, amarillamiento.', nivel_riesgo: 'Alto' }
    ],
    abonos: [
      { fase_aplicacion: 'Establecimiento (Mes 1)', dosis_npk: '10-30-10', cantidad_por_planta_gr: 100 },
      { fase_aplicacion: 'Crecimiento (Mes 4)', dosis_npk: '15-15-15', cantidad_por_planta_gr: 150 },
      { fase_aplicacion: 'Pre-floración (Mes 7)', dosis_npk: 'KCI (Potasio)', cantidad_por_planta_gr: 200 }
    ],
    fumigaciones: [
      { ingrediente_activo: 'Mancozeb (Preventivo)', dosis_cc_litro: 2.5, frecuencia_dias: 14 },
      { ingrediente_activo: 'Propiconazol (Curativo)', dosis_cc_litro: 1.0, frecuencia_dias: 21 }
    ],
    semillas: [
      { nombre_variedad: 'Hartón Dominico (Cormos certificados)', proveedor: 'Agrosavia', tolerancia: 'Tolerancia media a Sigatoka' }
    ],
    riegos: [
      { etapa_fenologica: 'Desarrollo vegetativo', requerimiento_hidrico_mm: 120, frecuencia_dias: 7, metodo_recomendado: 'Goteo o microaspersión' },
      { etapa_fenologica: 'Floración y llenado', requerimiento_hidrico_mm: 150, frecuencia_dias: 5, metodo_recomendado: 'Goteo' }
    ],
    siembra: [
      { sistema_siembra: 'Tresbolillo', distancia_surcos_m: 3.0, distancia_plantas_m: 3.0, plantas_por_ha: 1283, instrucciones_especiales: 'Ahoyado de 40x40x40cm. Aplicar materia orgánica y cal dolomita.' }
    ]
  },
  'Cacao': {
    nombre_oficial: 'Cacao',
    especie_biologica: 'Theobroma cacao',
    familia_botanica: 'Malvaceae',
    imagen_url: '/img/cultivos/cacao_gen.png',
    resumen_cientifico_api: 'El cacao (Theobroma cacao) es un árbol de clima tropical. Requiere sombrío en sus primeros años. Es altamente valorado por sus semillas utilizadas para el chocolate. Los clones modernos como el CCN51 ofrecen alta productividad pero requieren excelente nutrición.',
    distancia_siembra_m: 3,
    densidad_ha: 1111,
    dias_ciclo: 180, // Días para maduración de mazorca
    plagas: [
      { nombre_plaga: 'Monalonion (Chinche)', etapa_ataque: 'Desarrollo de mazorcas', umbral_dano: '3-5% de mazorcas picadas' },
      { nombre_plaga: 'Xyleborus spp. (Barrenador)', etapa_ataque: 'Tallo y ramas', umbral_dano: 'Presencia de aserrín' }
    ],
    enfermedades: [
      { nombre_enfermedad: 'Moniliasis (Moniliophthora roreri)', sintomas: 'Mancha marrón en la mazorca, esporas blancas.', nivel_riesgo: 'Crítico' },
      { nombre_enfermedad: 'Escoba de bruja (Moniliophthora perniciosa)', sintomas: 'Proliferación anormal de brotes vegetativos.', nivel_riesgo: 'Alto' }
    ],
    abonos: [
      { fase_aplicacion: 'Producción (Inicio lluvias)', dosis_npk: 'Urea + DAP + KCl', cantidad_por_planta_gr: 300 }
    ],
    fumigaciones: [
      { ingrediente_activo: 'Óxido de Cobre', dosis_cc_litro: 3.0, frecuencia_dias: 30 }
    ],
    semillas: [
      { nombre_variedad: 'Clon CCN-51 (Patrón IMC67)', proveedor: 'Fedecacao', tolerancia: 'Alta productividad, susceptible a Monilia' }
    ],
    riegos: [
      { etapa_fenologica: 'Establecimiento', requerimiento_hidrico_mm: 100, frecuencia_dias: 7, metodo_recomendado: 'Microaspersión' }
    ],
    siembra: [
      { sistema_siembra: 'Cuadrado', distancia_surcos_m: 3.0, distancia_plantas_m: 3.0, plantas_por_ha: 1111, instrucciones_especiales: 'Sembrar plátano como sombrío transitorio a 3x3.' }
    ]
  },
  'Palma de Aceite': {
    nombre_oficial: 'Palma de Aceite',
    especie_biologica: 'Elaeis guineensis',
    familia_botanica: 'Arecaceae',
    imagen_url: '/img/cultivos/palma_aceite_gen.png',
    resumen_cientifico_api: 'La palma de aceite es el cultivo oleaginoso más productivo del mundo. Los híbridos OxG (Oleifera x Guineensis) son populares en Colombia por su resistencia a la Pudrición del Cogollo.',
    distancia_siembra_m: 9,
    densidad_ha: 143,
    dias_ciclo: 150,
    plagas: [
      { nombre_plaga: 'Picudo de la palma (Rhynchophorus palmarum)', etapa_ataque: 'Todas', umbral_dano: '1 picudo por trampa/mes' }
    ],
    enfermedades: [
      { nombre_enfermedad: 'Pudrición del Cogollo (PC)', sintomas: 'Amarillamiento y pudrición de las flechas jóvenes.', nivel_riesgo: 'Crítico' }
    ],
    abonos: [
      { fase_aplicacion: 'Mantenimiento (Semestral)', dosis_npk: 'K-Mag / Cloruro de Potasio', cantidad_por_planta_gr: 2000 }
    ],
    fumigaciones: [
      { ingrediente_activo: 'Aceite Agrícola + Insecticida', dosis_cc_litro: 2.0, frecuencia_dias: 45 }
    ],
    semillas: [
      { nombre_variedad: 'Híbrido OxG Coari x La Mé', proveedor: 'Cenipalma', tolerancia: 'Resistente a Pudrición del Cogollo' }
    ],
    riegos: [
      { etapa_fenologica: 'Producción', requerimiento_hidrico_mm: 150, frecuencia_dias: 15, metodo_recomendado: 'Gravedad o Aspersión' }
    ],
    siembra: [
      { sistema_siembra: 'Triángulo equilátero', distancia_surcos_m: 7.8, distancia_plantas_m: 9.0, plantas_por_ha: 143, instrucciones_especiales: 'Trazado topográfico. Establecer leguminosas de cobertura (Kudzu) antes de sembrar.' }
    ]
  }
};

const RECOMENDACIONES_ALTITUD = [
  { nombre_oficial: 'Cacao', especie_biologica: 'Theobroma cacao', familia_botanica: 'Malvaceae', imagen: WIZARD_EXPERT_DATA['Cacao'].imagen_url },
  { nombre_oficial: 'Plátano (Hartón)', especie_biologica: 'Musa paradisiaca', familia_botanica: 'Musaceae', imagen: WIZARD_EXPERT_DATA['Plátano (Hartón)'].imagen_url },
  { nombre_oficial: 'Palma de Aceite', especie_biologica: 'Elaeis guineensis', familia_botanica: 'Arecaceae', imagen: WIZARD_EXPERT_DATA['Palma de Aceite'].imagen_url }
];

export default function SuperCultivosCatalogo() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // States for Wizard
  const [isWizardVisible, setIsWizardVisible] = useState(false);
  const [selectedFinca, setSelectedFinca] = useState(null);
  const [fincasList, setFincasList] = useState([]);

  // States for Edit/Create Form
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [form] = Form.useForm();
  
  const [fetchingWiki, setFetchingWiki] = useState(false);
  const [wikiData, setWikiData] = useState({ imagen_url: null, resumen_cientifico_api: '' });
  const [especiesList, setEspeciesList] = useState([]);

  useEffect(() => {
    fetchData();
    fetchEspecies();
    fetchFincas();
  }, []);

  const fetchEspecies = async () => {
    try {
      const res = await axios.get('/api/catalogo_cultivos_super/especies');
      setEspeciesList(res.data.map(item => item.especie_biologica));
    } catch (err) {
      console.error('Error fetching especies', err);
    }
  };

  const fetchFincas = async () => {
    try {
      const res = await axios.get('/api/fincas');
      setFincasList(res.data);
      if (res.data.length > 0) {
        setSelectedFinca(res.data[0]);
      }
    } catch (error) {
      console.error('Error fetching fincas:', error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/catalogo_cultivos_super');
      setData(res.data);
    } catch (err) {
      notification.error({ message: 'Error cargando catálogo' });
    } finally {
      setLoading(false);
    }
  };

  const startWizard = () => {
    setIsWizardVisible(true);
  };

  const confirmWizardSelection = async (crop) => {
    setIsWizardVisible(false);
    
    setEditingRecord(null);
    form.resetFields();
    
    // Check if we have expert data hardcoded
    const expertData = WIZARD_EXPERT_DATA[crop.nombre_oficial];
    
    if (expertData) {
      // Inyectar datos expertos!
      setWikiData({ imagen_url: expertData.imagen_url, resumen_cientifico_api: expertData.resumen_cientifico_api });
      form.setFieldsValue(expertData);
      notification.success({ message: `Ficha técnica experta para ${crop.nombre_oficial} inyectada con éxito.` });
      setIsModalVisible(true);
    } else {
      // Fallback a Wikipedia si es un cultivo desconocido (no en la lista experta)
      setWikiData({ imagen_url: crop.imagen, resumen_cientifico_api: 'Cargando información...' });
      form.setFieldsValue({
        nombre_oficial: crop.nombre_oficial,
        especie_biologica: crop.especie_biologica,
        familia_botanica: crop.familia_botanica
      });
      setIsModalVisible(true);
      
      try {
        setFetchingWiki(true);
        const res = await axios.post('/api/catalogo_cultivos_super/auto-fetch', {
          nombre_oficial: crop.nombre_oficial,
          especie_biologica: crop.especie_biologica
        });
        setWikiData(res.data);
        form.setFieldsValue(res.data);
        notification.info({ message: `Datos básicos de Wikipedia cargados.` });
      } catch (err) {
        notification.error({ message: 'Error obteniendo info de Wikipedia' });
      } finally {
        setFetchingWiki(false);
      }
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      
      const payload = {
        ...values,
        imagen_url: wikiData.imagen_url
      };

      if (editingRecord) {
        await axios.put(`/api/catalogo_cultivos_super/${editingRecord.id_catalogo}`, payload);
        notification.success({ message: 'Cultivo actualizado correctamente' });
      } else {
        await axios.post('/api/catalogo_cultivos_super', payload);
        notification.success({ message: 'Cultivo creado correctamente' });
      }
      setIsModalVisible(false);
      fetchData();
    } catch (error) {
      if (error.response && error.response.status === 409) {
        notification.error({ message: 'Cultivo Duplicado', description: error.response.data.error });
      } else if (error.errorFields) {
        notification.warning({ message: 'Por favor complete todos los campos requeridos.' });
      } else {
        notification.error({ message: 'Error guardando el cultivo' });
      }
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id_catalogo', key: 'id' },
    { title: 'Nombre Oficial', dataIndex: 'nombre_oficial', key: 'nombre' },
    { title: 'Especie Biológica', dataIndex: 'especie_biologica', key: 'especie' },
    { title: 'Familia', dataIndex: 'familia_botanica', key: 'familia' },
    { 
      title: 'Acciones', 
      key: 'acciones',
      render: (_, record) => (
        <Button type="primary" icon={<EditOutlined />} onClick={async () => {
          try {
            setLoading(true);
            const res = await axios.get(`/api/catalogo_cultivos_super/${record.id_catalogo}`);
    const expertData = WIZARD_EXPERT_DATA[record.nombre_oficial];
    if (expertData && !res.data.imagen_url) {
        res.data.imagen_url = expertData.imagen_url;
        res.data.resumen_cientifico_api = expertData.resumen_cientifico_api;
    }
    
    setEditingRecord(res.data);
    setWikiData({ imagen_url: res.data.imagen_url, resumen_cientifico_api: res.data.resumen_cientifico_api });
    form.resetFields();
    form.setFieldsValue(res.data);
    setIsModalVisible(true);
          } catch (e) {
            notification.error({ message: 'Error cargando datos completos del cultivo.' });
          } finally {
            setLoading(false);
          }
        }}>
          Editar Súper Catálogo
        </Button>
      )
    }
  ];

  return (
    <ConfigProvider theme={{ algorithm: theme.darkAlgorithm }}>
      <div style={{ padding: 24, minHeight: '100vh' }}>
        <h2>Súper Catálogo de Cultivos</h2>
      
      <Button type="primary" icon={<PlusOutlined />} onClick={startWizard} style={{ marginBottom: 16 }}>
        Nuevo Cultivo (Asistente Inteligente)
      </Button>

      <Table columns={columns} dataSource={data} rowKey="id_catalogo" loading={loading} />

      {/* --- MODAL WIZARD DE SELECCIÓN INTELIGENTE --- */}
      <Modal
        title={<div><CompassOutlined /> Asistente de Planificación Inteligente</div>}
        open={isWizardVisible}
        onCancel={() => setIsWizardVisible(false)}
        width={800}
        footer={null}
      >
        <div style={{ marginBottom: 20 }}>
          <Title level={5}>1. Inteligencia Geográfica y Selección</Title>
          <Text>Selecciona la Finca donde deseas proyectar:</Text>
          <Select 
            value={selectedFinca?.id_finca}
            style={{ width: '100%', marginBottom: 15, marginTop: 5 }}
            onChange={(val) => {
              const f = fincasList.find(x => x.id_finca === val);
              setSelectedFinca(f);
            }}
            showSearch
            optionFilterProp="children"
          >
            {fincasList.map(f => (
              <Option key={f.id_finca} value={f.id_finca}>{f.nombre} ({f.altitud_promedio || 0} msnm)</Option>
            ))}
          </Select>
          
          <div style={{ padding: 15, background: 'rgba(23, 125, 220, 0.1)', border: '1px solid #177ddc', borderRadius: 8, marginBottom: 20 }}>
            <CheckCircleOutlined style={{ color: '#177ddc' }} /> <strong>Ubicación Confirmada:</strong> La finca está ubicada a {selectedFinca ? (selectedFinca.altitud_promedio || 0) : 0} msnm.
          </div>
          
          <Text strong>Según la altitud, estos son los cultivos recomendados para automatizar:</Text>
        </div>

        <Row gutter={[16, 16]}>
          {RECOMENDACIONES_ALTITUD.map(crop => (
            <Col span={8} key={crop.nombre_oficial}>
              <Card 
                hoverable 
                cover={<img alt={crop.nombre_oficial} src={crop.imagen} style={{ height: 150, objectFit: 'cover' }} />}
                onClick={() => confirmWizardSelection(crop)}
                style={{ textAlign: 'center', border: '2px solid transparent', transition: '0.3s' }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#1890ff'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
              >
                <Card.Meta title={crop.nombre_oficial} description={crop.especie_biologica} />
                <Button type="primary" block style={{ marginTop: 10 }}>Seleccionar y Autocompletar</Button>
              </Card>
            </Col>
          ))}
        </Row>
      </Modal>

      {/* --- MODAL FORMULARIO DE 8 PESTAÑAS --- */}
      <Modal
        title={editingRecord ? 'Editar Súper Catálogo' : 'Nuevo Cultivo - Autocompletado'}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        width={1200}
        footer={[
          <Button key="cancel" onClick={() => setIsModalVisible(false)}>Cancelar</Button>,
          <Button key="save" type="primary" loading={saving} onClick={handleSave}>Guardar Catálogo Completo</Button>
        ]}
      >
        <Form form={form} layout="vertical">
          <Tabs defaultActiveKey="1" type="card">
            
            <TabPane tab="🪴 Información General" key="1">
              <Row gutter={16}>
                <Col span={16}>
                  <Form.Item name="nombre_oficial" label={<span>Nombre Oficial&nbsp;<Tooltip title="Nombre común o comercial del cultivo (ej. Plátano Hartón)"><QuestionCircleOutlined style={{color:'#177ddc'}} /></Tooltip></span>} rules={[{required: true}]}><Input /></Form.Item>
                  <Form.Item name="especie_biologica" label={<span>Especie Biológica&nbsp;<Tooltip title="Nombre científico de la planta. Seleccione de la lista o escriba uno nuevo."><QuestionCircleOutlined style={{color:'#177ddc'}} /></Tooltip></span>} rules={[{required: true}]}>
                    <Select
                      mode="tags"
                      maxCount={1}
                      placeholder="Seleccione o escriba la especie"
                      options={especiesList.map(e => ({ value: e, label: e }))}
                      showSearch
                    />
                  </Form.Item>
                  <Form.Item name="familia_botanica" label={<span>Familia Botánica&nbsp;<Tooltip title="Clasificación taxonómica (ej. Musaceae para plátanos)"><QuestionCircleOutlined style={{color:'#177ddc'}} /></Tooltip></span>}><Input /></Form.Item>
                  <Form.Item name="resumen_cientifico_api" label={<span>Resumen Científico&nbsp;<Tooltip title="Breve descripción agronómica o técnica del cultivo"><QuestionCircleOutlined style={{color:'#177ddc'}} /></Tooltip></span>}>
                    <Input.TextArea rows={4} disabled={fetchingWiki} placeholder={fetchingWiki ? "Obteniendo datos..." : ""} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="imagen_url" label={<span>URL de la Fotografía&nbsp;<Tooltip title="Enlace de la imagen en internet. Si está vacío, se buscará automáticamente al guardar."><QuestionCircleOutlined style={{color:'#177ddc'}} /></Tooltip></span>}>
                    <Input placeholder="https://..." onChange={e => setWikiData({...wikiData, imagen_url: e.target.value})} />
                  </Form.Item>
                  <Card title="Imagen del Cultivo" size="small">
                    {wikiData.imagen_url ? (
                      <img src={wikiData.imagen_url} referrerPolicy="no-referrer" alt="Cultivo" style={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 8 }} />
                    ) : (
                      <div style={{ height: 200, background: '#1f1f1f', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}>
                        <Text type="secondary">Sin imagen</Text>
                      </div>
                    )}
                  </Card>
                </Col>
              </Row>
              <Row gutter={16} style={{marginTop: 16}}>
                <Col span={8}><Form.Item name="distancia_siembra_m" label={<span>Distancia Plantas (m)&nbsp;<Tooltip title="Distancia recomendada entre cada planta en el mismo surco"><QuestionCircleOutlined style={{color:'#177ddc'}} /></Tooltip></span>}><InputNumber style={{width:'100%'}} /></Form.Item></Col>
                <Col span={8}><Form.Item name="densidad_ha" label={<span>Densidad (Plantas/ha)&nbsp;<Tooltip title="Número total de plantas estimadas por hectárea"><QuestionCircleOutlined style={{color:'#177ddc'}} /></Tooltip></span>}><InputNumber style={{width:'100%'}} /></Form.Item></Col>
                <Col span={8}><Form.Item name="dias_ciclo" label={<span>Días de Ciclo&nbsp;<Tooltip title="Días estimados desde la siembra hasta la primera cosecha principal"><QuestionCircleOutlined style={{color:'#177ddc'}} /></Tooltip></span>}><InputNumber style={{width:'100%'}} /></Form.Item></Col>
              </Row>
            </TabPane>

            <TabPane tab="🐛 Plagas" key="2">
              <Form.List name="plagas">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...restField }) => (
                      <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                        <Form.Item {...restField} name={[name, 'nombre_plaga']} label={<span>Nombre de la Plaga&nbsp;<Tooltip title="Nombre común o científico de la plaga"><QuestionCircleOutlined style={{color:'#177ddc'}}/></Tooltip></span>} rules={[{ required: true, message: 'Falta nombre' }]}>
                          <Input placeholder="Nombre de la Plaga" />
                        </Form.Item>
                        <Form.Item {...restField} name={[name, 'etapa_ataque']} label={<span>Etapa de Ataque&nbsp;<Tooltip title="Fase del cultivo donde ataca (ej. Floración)"><QuestionCircleOutlined style={{color:'#177ddc'}}/></Tooltip></span>}>
                          <Input placeholder="Etapa de Ataque (ej. Floración)" />
                        </Form.Item>
                        <Form.Item {...restField} name={[name, 'umbral_dano']} label={<span>Umbral de Daño&nbsp;<Tooltip title="Punto en el que se debe aplicar control (ej. 5%)"><QuestionCircleOutlined style={{color:'#177ddc'}}/></Tooltip></span>}>
                          <Input placeholder="Umbral de Daño (ej. 5%)" />
                        </Form.Item>
                        <MinusCircleOutlined onClick={() => remove(name)} style={{ color: 'red' }} />
                      </Space>
                    ))}
                    <Form.Item>
                      <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                        Agregar Plaga
                      </Button>
                    </Form.Item>
                  </>
                )}
              </Form.List>
            </TabPane>

            <TabPane tab="🦠 Enfermedades" key="3">
              <Form.List name="enfermedades">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...restField }) => (
                      <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                        <Form.Item {...restField} name={[name, 'nombre_enfermedad']} label={<span>Nombre de la Enf.&nbsp;<Tooltip title="Nombre de la enfermedad"><QuestionCircleOutlined style={{color:'#177ddc'}}/></Tooltip></span>} rules={[{ required: true, message: 'Falta nombre' }]}>
                          <Input placeholder="Nombre de la Enfermedad" />
                        </Form.Item>
                        <Form.Item {...restField} name={[name, 'sintomas']} label={<span>Síntomas&nbsp;<Tooltip title="Cómo identificarla visualmente"><QuestionCircleOutlined style={{color:'#177ddc'}}/></Tooltip></span>}>
                          <Input placeholder="Síntomas Principales" />
                        </Form.Item>
                        <Form.Item {...restField} name={[name, 'nivel_riesgo']} label={<span>Riesgo&nbsp;<Tooltip title="Nivel de severidad para el cultivo"><QuestionCircleOutlined style={{color:'#177ddc'}}/></Tooltip></span>}>
                          <Select placeholder="Nivel de Riesgo" style={{ width: 120 }}>
                            <Option value="Bajo">Bajo</Option>
                            <Option value="Medio">Medio</Option>
                            <Option value="Alto">Alto</Option>
                            <Option value="Crítico">Crítico</Option>
                          </Select>
                        </Form.Item>
                        <MinusCircleOutlined onClick={() => remove(name)} style={{ color: 'red' }} />
                      </Space>
                    ))}
                    <Form.Item>
                      <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                        Agregar Enfermedad
                      </Button>
                    </Form.Item>
                  </>
                )}
              </Form.List>
            </TabPane>

            <TabPane tab="🧪 Abonos" key="4">
              <Form.List name="abonos">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...restField }) => (
                      <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                        <Form.Item {...restField} name={[name, 'fase_aplicacion']} label={<span>Fase de Aplicación&nbsp;<Tooltip title="Momento en que se debe abonar (ej. Siembra)"><QuestionCircleOutlined style={{color:'#177ddc'}}/></Tooltip></span>} rules={[{ required: true, message: 'Falta fase' }]}>
                          <Input placeholder="Fase (ej. Siembra)" />
                        </Form.Item>
                        <Form.Item {...restField} name={[name, 'dosis_npk']} label={<span>Fórmula N-P-K&nbsp;<Tooltip title="Proporción de Nitrógeno, Fósforo y Potasio (ej. 15-15-15)"><QuestionCircleOutlined style={{color:'#177ddc'}}/></Tooltip></span>}>
                          <Input placeholder="Fórmula N-P-K" />
                        </Form.Item>
                        <Form.Item {...restField} name={[name, 'cantidad_por_planta_gr']} label={<span>Gramos / Planta&nbsp;<Tooltip title="Cantidad en gramos a aplicar por cada planta"><QuestionCircleOutlined style={{color:'#177ddc'}}/></Tooltip></span>}>
                          <InputNumber placeholder="Gramos / Planta" style={{ width: '100%' }} />
                        </Form.Item>
                        <MinusCircleOutlined onClick={() => remove(name)} style={{ color: 'red' }} />
                      </Space>
                    ))}
                    <Form.Item>
                      <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                        Agregar Fórmula de Abono
                      </Button>
                    </Form.Item>
                  </>
                )}
              </Form.List>
            </TabPane>

            <TabPane tab="🛡️ Fumigaciones" key="5">
              <Form.List name="fumigaciones">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...restField }) => (
                      <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                        <Form.Item {...restField} name={[name, 'ingrediente_activo']} label={<span>Ingrediente Activo&nbsp;<Tooltip title="Componente químico del producto (ej. Mancozeb)"><QuestionCircleOutlined style={{color:'#177ddc'}}/></Tooltip></span>} rules={[{ required: true, message: 'Falta ingrediente' }]}>
                          <Input placeholder="Ingrediente Activo" />
                        </Form.Item>
                        <Form.Item {...restField} name={[name, 'dosis_cc_litro']} label={<span>Dosis (cc/L)&nbsp;<Tooltip title="Centímetros cúbicos por litro de agua"><QuestionCircleOutlined style={{color:'#177ddc'}}/></Tooltip></span>}>
                          <InputNumber placeholder="Dosis (cc/L)" style={{ width: '100%' }} />
                        </Form.Item>
                        <Form.Item {...restField} name={[name, 'frecuencia_dias']} label={<span>Frecuencia (Días)&nbsp;<Tooltip title="Cada cuántos días se debe aplicar la acción"><QuestionCircleOutlined style={{color:'#177ddc'}}/></Tooltip></span>}>
                          <InputNumber placeholder="Frecuencia (Días)" style={{ width: '100%' }} />
                        </Form.Item>
                        <MinusCircleOutlined onClick={() => remove(name)} style={{ color: 'red' }} />
                      </Space>
                    ))}
                    <Form.Item>
                      <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                        Agregar Fumigación
                      </Button>
                    </Form.Item>
                  </>
                )}
              </Form.List>
            </TabPane>

            <TabPane tab="🌱 Semillas" key="6">
              <Form.List name="semillas">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...restField }) => (
                      <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                        <Form.Item {...restField} name={[name, 'nombre_variedad']} label={<span>Variedad&nbsp;<Tooltip title="Nombre específico de la semilla o clon"><QuestionCircleOutlined style={{color:'#177ddc'}}/></Tooltip></span>} rules={[{ required: true, message: 'Falta variedad' }]}>
                          <Input placeholder="Variedad (ej. Clon 51)" />
                        </Form.Item>
                        <Form.Item {...restField} name={[name, 'proveedor']} label={<span>Proveedor&nbsp;<Tooltip title="Empresa o lugar recomendado para comprarla"><QuestionCircleOutlined style={{color:'#177ddc'}}/></Tooltip></span>}>
                          <Input placeholder="Proveedor" />
                        </Form.Item>
                        <Form.Item {...restField} name={[name, 'tolerancia']} label={<span>Tolerancia&nbsp;<Tooltip title="A qué es resistente (ej. Sequía, Plagas)"><QuestionCircleOutlined style={{color:'#177ddc'}}/></Tooltip></span>}>
                          <Input placeholder="Tolerancia (ej. Sequía)" />
                        </Form.Item>
                        <MinusCircleOutlined onClick={() => remove(name)} style={{ color: 'red' }} />
                      </Space>
                    ))}
                    <Form.Item>
                      <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                        Agregar Semilla
                      </Button>
                    </Form.Item>
                  </>
                )}
              </Form.List>
            </TabPane>

            <TabPane tab="💧 Riegos" key="7">
              <Form.List name="riegos">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...restField }) => (
                      <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                        <Form.Item {...restField} name={[name, 'etapa_fenologica']} label={<span>Etapa Fenológica&nbsp;<Tooltip title="Fase de crecimiento de la planta"><QuestionCircleOutlined style={{color:'#177ddc'}}/></Tooltip></span>} rules={[{ required: true, message: 'Falta etapa' }]}>
                          <Input placeholder="Etapa Fenológica" />
                        </Form.Item>
                        <Form.Item {...restField} name={[name, 'requerimiento_hidrico_mm']} label={<span>Agua (mm)&nbsp;<Tooltip title="Milímetros de agua requeridos. 1 mm = 1 Litro por metro cuadrado."><QuestionCircleOutlined style={{color:'#177ddc'}}/></Tooltip></span>}>
                          <InputNumber placeholder="Agua (mm)" style={{ width: '100%' }} />
                        </Form.Item>
                        <Form.Item {...restField} name={[name, 'frecuencia_dias']} label={<span>Frecuencia (Días)&nbsp;<Tooltip title="Cada cuántos días se debe aplicar la acción"><QuestionCircleOutlined style={{color:'#177ddc'}}/></Tooltip></span>}>
                          <InputNumber placeholder="Frecuencia (Días)" style={{ width: '100%' }} />
                        </Form.Item>
                        <Form.Item {...restField} name={[name, 'metodo_recomendado']} label={<span>Método Recomendado&nbsp;<Tooltip title="Forma de aplicar el riego (ej. Goteo, Aspersión)"><QuestionCircleOutlined style={{color:'#177ddc'}}/></Tooltip></span>}>
                          <Input placeholder="Método (ej. Goteo)" />
                        </Form.Item>
                        <MinusCircleOutlined onClick={() => remove(name)} style={{ color: 'red' }} />
                      </Space>
                    ))}
                    <Form.Item>
                      <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                        Agregar Patrón de Riego
                      </Button>
                    </Form.Item>
                  </>
                )}
              </Form.List>
            </TabPane>

            <TabPane tab="📏 Siembra" key="8">
              <Form.List name="siembra">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...restField }) => (
                      <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                        <Form.Item {...restField} name={[name, 'sistema_siembra']} label={<span>Sistema&nbsp;<Tooltip title="Patrón geométrico (ej. Tresbolillo, Cuadrado)"><QuestionCircleOutlined style={{color:'#177ddc'}}/></Tooltip></span>} rules={[{ required: true, message: 'Falta sistema' }]}>
                          <Input placeholder="Sistema (ej. Tresbolillo)" />
                        </Form.Item>
                        <Form.Item {...restField} name={[name, 'distancia_surcos_m']} label={<span>Dist. Surcos (m)&nbsp;<Tooltip title="Metros de separación entre líneas o surcos"><QuestionCircleOutlined style={{color:'#177ddc'}}/></Tooltip></span>}>
                          <InputNumber placeholder="Dist. Surcos (m)" style={{ width: '100%' }} />
                        </Form.Item>
                        <Form.Item {...restField} name={[name, 'distancia_plantas_m']} label={<span>Dist. Plantas (m)&nbsp;<Tooltip title="Metros de separación entre plantas de la misma línea"><QuestionCircleOutlined style={{color:'#177ddc'}}/></Tooltip></span>}>
                          <InputNumber placeholder="Dist. Plantas (m)" style={{ width: '100%' }} />
                        </Form.Item>
                        <Form.Item {...restField} name={[name, 'plantas_por_ha']} label={<span>Plantas / Ha&nbsp;<Tooltip title="Cantidad total de plantas que caben en 1 Hectárea (10,000 m2)"><QuestionCircleOutlined style={{color:'#177ddc'}}/></Tooltip></span>}>
                          <InputNumber placeholder="Plantas/Ha" style={{ width: '100%' }} />
                        </Form.Item>
                        <Form.Item {...restField} name={[name, 'instrucciones_especiales']} label={<span>Instrucciones&nbsp;<Tooltip title="Recomendaciones para el hoyo o el terreno"><QuestionCircleOutlined style={{color:'#177ddc'}}/></Tooltip></span>}>
                          <Input placeholder="Instrucciones" />
                        </Form.Item>
                        <MinusCircleOutlined onClick={() => remove(name)} style={{ color: 'red' }} />
                      </Space>
                    ))}
                    <Form.Item>
                      <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                        Agregar Patrón de Siembra
                      </Button>
                    </Form.Item>
                  </>
                )}
              </Form.List>
            </TabPane>

          </Tabs>
        </Form>
      </Modal>
      </div>
    </ConfigProvider>
  );
}
