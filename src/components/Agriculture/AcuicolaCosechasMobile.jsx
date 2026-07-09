import React, { useState, useEffect } from 'react';
import { message, Button, Card, Row, Col, Typography, Modal, InputNumber, Divider, List, Tag, Select, Input } from 'antd';
import { authFetch, API_BASE } from '../../utils/api.js';

const { Title, Text } = Typography;
const { Option } = Select;

function AcuicolaCosechasMobile({ tenantId }) {
  const [activeSiembras, setActiveSiembras] = useState([]);
  const [activeLotes, setActiveLotes] = useState([]);
  const [currentLote, setCurrentLote] = useState(null);
  
  // Pesaje Form
  const [pesoBruto, setPesoBruto] = useState(null);
  const [pesoTara, setPesoTara] = useState(2.5); // Canastilla promedio
  const [promedioTalla, setPromedioTalla] = useState(null);
  const [notasPesaje, setNotasPesaje] = useState('');
  
  const [pesajes, setPesajes] = useState([]);
  
  // Recolectores
  const [modalRecolectoresVisible, setModalRecolectoresVisible] = useState(false);
  const [empleadosDisponibles, setEmpleadosDisponibles] = useState([]);
  const [recolectoresSeleccionados, setRecolectoresSeleccionados] = useState([]);
  const [recolectoresData, setRecolectoresData] = useState([]);
  
  const loadData = async () => {
    try {
      const q = tenantId ? `?tenantId=${tenantId}` : '';
      const [siembrasRes, lotesRes] = await Promise.all([
        authFetch(`${API_BASE}/acuicola/cosechas-mobile/siembras-activas${q}`),
        authFetch(`${API_BASE}/acuicola/cosechas-mobile/lotes-progreso${q}`)
      ]);
      const siembrasData = await siembrasRes.json();
      const lotesData = await lotesRes.json();
      setActiveSiembras(Array.isArray(siembrasData) ? siembrasData : []);
      setActiveLotes(Array.isArray(lotesData) ? lotesData : []);
    } catch (err) {
      console.error(err);
      message.error('Error cargando datos');
    }
  };

  const loadPesajes = async (loteId) => {
    try {
      const res = await authFetch(`${API_BASE}/acuicola/cosechas-mobile/${loteId}/pesajes`);
      const data = await res.json();
      setPesajes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadEmpleados = async () => {
    try {
      const q = tenantId ? `?tenantId=${tenantId}` : '';
      const res = await authFetch(`${API_BASE}/acuicola/cosechas-mobile/empleados/activos${q}`);
      const data = await res.json();
      setEmpleadosDisponibles(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadRecolectores = async (loteId) => {
    try {
      const res = await authFetch(`${API_BASE}/acuicola/cosechas-mobile/${loteId}/recursos`);
      const data = await res.json();
      setRecolectoresData(data);
      setRecolectoresSeleccionados(data.filter(r => r.estado === 'Activo').map(r => r.id_empleado));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
    loadEmpleados();
  }, [tenantId]);

  useEffect(() => {
    if (currentLote) {
      loadPesajes(currentLote.id_lote_cosecha);
      loadRecolectores(currentLote.id_lote_cosecha);
    }
  }, [currentLote]);

  const handleStartLote = async (siembra) => {
    try {
      const res = await authFetch(`${API_BASE}/acuicola/cosechas-mobile/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          id_finca: siembra.id_finca,
          id_estanque: siembra.id_estanque,
          id_siembra_acui: siembra.id_siembra_acui,
          id_especie: siembra.id_especie
        })
      });
      if (res.ok) {
        message.success('Campaña de cosecha iniciada');
        loadData();
      } else {
        message.error('Error al iniciar');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRegisterPesaje = async () => {
    if (!pesoBruto || pesoBruto <= pesoTara) {
      return message.error('Peso bruto debe ser mayor a la tara');
    }
    const pesoNeto = pesoBruto - pesoTara;
    
    try {
      const res = await authFetch(`${API_BASE}/acuicola/cosechas-mobile/${currentLote.id_lote_cosecha}/pesaje`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          peso_bruto_kg: pesoBruto,
          peso_tara_kg: pesoTara,
          peso_neto_kg: pesoNeto,
          promedio_talla_g: promedioTalla,
          notas: notasPesaje
        })
      });
      if (res.ok) {
        message.success('Pesaje registrado');
        setPesoBruto(null);
        setNotasPesaje('');
        loadPesajes(currentLote.id_lote_cosecha);
      }
    } catch (err) {
      message.error('Error registrando pesaje');
    }
  };

  const handleFinalize = async () => {
    Modal.confirm({
      title: '¿Finalizar Cosecha de este Lago?',
      content: 'Al finalizar, la siembra pasará a estado Cosechado y los kilos se sumarán al inventario de pescado fresco para despachos.',
      onOk: async () => {
        try {
          const res = await authFetch(`${API_BASE}/acuicola/cosechas-mobile/${currentLote.id_lote_cosecha}/finalize`, {
            method: 'POST'
          });
          if (res.ok) {
            message.success('Lote cerrado exitosamente');
            setCurrentLote(null);
            loadData();
          }
        } catch (err) {
          message.error('Error al finalizar lote');
        }
      }
    });
  };

  const handleSaveRecolectores = async () => {
    try {
      const q = tenantId ? `?tenantId=${tenantId}` : '';
      const res = await authFetch(`${API_BASE}/acuicola/cosechas-mobile/${currentLote.id_lote_cosecha}/recursos${q}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empleados: recolectoresSeleccionados })
      });
      if (res.ok) {
        message.success('Recolectores actualizados');
        setModalRecolectoresVisible(false);
        loadRecolectores(currentLote.id_lote_cosecha);
      } else {
        message.error('Error guardando recolectores');
      }
    } catch (err) {
      message.error('Error de conexión');
    }
  };

  const handleRetirarPescador = async (id_empleado) => {
    if (window.confirm('¿Seguro que deseas retirar a este pescador? Se registrará su hora de salida.')) {
      try {
        const res = await authFetch(`${API_BASE}/acuicola/cosechas-mobile/${currentLote.id_lote_cosecha}/recursos/retirar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id_empleado })
        });
        if (res.ok) {
          message.success('Pescador retirado');
          loadRecolectores(currentLote.id_lote_cosecha);
        }
      } catch (err) {
        message.error('Error al retirar pescador');
      }
    }
  };

  // VISTA DE OPERARIO: Lote Activo
  if (currentLote) {
    try {
      const totalAcumulado = pesajes.reduce((acc, p) => acc + Number(p.peso_neto_kg), 0);

      return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <button 
            type="button"
            style={{ background: '#3b82f6', color: '#fff', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', userSelect: 'none', border: 'none' }} 
            onClick={(e) => {
              e.preventDefault();
              setCurrentLote(null);
            }}
          >
            <span>←</span> Volver a Menú
          </button>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button 
              type="button"
              style={{ background: '#f59e0b', color: '#fff', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', userSelect: 'none', border: 'none' }} 
              onClick={(e) => {
                e.preventDefault();
                setModalRecolectoresVisible(true);
              }}
            >
              🧑‍🌾 Recolectores
            </button>
            <button 
              type="button"
              style={{ background: '#ef4444', color: '#fff', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', userSelect: 'none', border: 'none' }} 
              onClick={async (e) => {
                e.preventDefault();
                if (window.confirm('¿Seguro que deseas finalizar la cosecha de este lago?')) {
                  try {
                    const res = await authFetch(`${API_BASE}/acuicola/cosechas-mobile/${currentLote.id_lote_cosecha}/finalize`, {
                      method: 'POST'
                    });
                    if (res.ok) {
                      message.success('Lote cerrado exitosamente');
                      setCurrentLote(null);
                      loadData();
                    } else {
                      message.error('Error al finalizar');
                    }
                  } catch (err) {
                    message.error('Error al finalizar lote');
                  }
                }
              }}
            >
              Finalizar Cosecha de Lago
            </button>
          </div>
        </div>

        <Card style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', marginBottom: '20px' }}>
          <Title level={4} style={{ color: '#fff', marginTop: 0 }}>
            🐟 Cosecha: Lago {currentLote.estanque_codigo} - {currentLote.especie_nombre}
          </Title>
          <div style={{ display: 'flex', gap: '20px' }}>
            <div style={{ background: '#0f172a', padding: '15px', borderRadius: '8px', flex: 1, textAlign: 'center' }}>
              <Text style={{ color: '#94a3b8' }}>Total Acumulado</Text>
              <div style={{ fontSize: '28px', color: '#10b981', fontWeight: 'bold' }}>{totalAcumulado.toFixed(2)} kg</div>
            </div>
            <div style={{ background: '#0f172a', padding: '15px', borderRadius: '8px', flex: 1, textAlign: 'center' }}>
              <Text style={{ color: '#94a3b8' }}>Canastillas</Text>
              <div style={{ fontSize: '28px', color: '#38bdf8', fontWeight: 'bold' }}>{pesajes.length}</div>
            </div>
          </div>
        </Card>

        {/* Captura de Peso */}
        <Card title="Nueva Pesada (Báscula)" style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }}>
          <Row gutter={[16, 16]} align="middle">
            <Col span={8}>
              <Text style={{ color: '#94a3b8', display: 'block', marginBottom: '5px' }}>Peso Bruto (kg)</Text>
              <InputNumber 
                size="large" 
                style={{ width: '100%', fontSize: '24px' }} 
                value={pesoBruto}
                onChange={setPesoBruto}
                autoFocus
              />
            </Col>
            <Col span={8}>
              <Text style={{ color: '#94a3b8', display: 'block', marginBottom: '5px' }}>Tara (Canastilla kg)</Text>
              <InputNumber 
                size="large" 
                style={{ width: '100%' }} 
                value={pesoTara}
                onChange={setPesoTara}
              />
            </Col>
            <Col span={8}>
              <Text style={{ color: '#94a3b8', display: 'block', marginBottom: '5px' }}>Peso Neto Calculado</Text>
              <div style={{ fontSize: '24px', color: '#10b981', padding: '5px' }}>
                {pesoBruto && pesoBruto > pesoTara ? (pesoBruto - pesoTara).toFixed(2) : '0.00'} kg
              </div>
            </Col>
          </Row>
          <Row gutter={[16, 16]} style={{ marginTop: '20px' }}>
            <Col span={8}>
               <Text style={{ color: '#94a3b8', display: 'block', marginBottom: '5px' }}>Talla Promedio (g) - Opcional</Text>
               <InputNumber style={{ width: '100%' }} value={promedioTalla} onChange={setPromedioTalla} />
            </Col>
            <Col span={16}>
               <Text style={{ color: '#94a3b8', display: 'block', marginBottom: '5px' }}>Notas</Text>
               <Input value={notasPesaje} onChange={(e) => setNotasPesaje(e.target.value)} />
            </Col>
          </Row>
          <Button 
            type="primary" 
            size="large" 
            style={{ width: '100%', marginTop: '20px', height: '60px', fontSize: '20px', background: '#3b82f6' }}
            onClick={handleRegisterPesaje}
            disabled={!pesoBruto || pesoBruto <= pesoTara}
          >
            GUARDAR PESAJE
          </Button>
        </Card>

        <Divider style={{ borderColor: '#334155' }} />

        <Title level={5} style={{ color: '#fff' }}>Últimas Pesadas</Title>
        <List
          dataSource={pesajes}
          renderItem={item => (
            <List.Item style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '15px', marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <div>
                  <Text style={{ color: '#e2e8f0', fontSize: '18px', fontWeight: 'bold' }}>{item.peso_neto_kg} kg</Text>
                  <div style={{ color: '#94a3b8', fontSize: '12px' }}>
                    Bruto: {item.peso_bruto_kg} | Tara: {item.peso_tara_kg} 
                    {item.promedio_talla_g ? ` | Talla: ${item.promedio_talla_g}g` : ''}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <Text style={{ color: '#94a3b8', fontSize: '12px' }}>{new Date(item.fecha_captura).toLocaleTimeString()}</Text>
                </div>
              </div>
            </List.Item>
          )}
        />

        <Divider style={{ borderColor: '#334155' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={5} style={{ color: '#fff' }}>Pescadores en la Cosecha</Title>
        </div>
        
        <List
          dataSource={recolectoresData}
          renderItem={item => {
            const start = new Date(item.hora_inicio);
            const end = item.hora_fin ? new Date(item.hora_fin) : new Date();
            const hours = ((end - start) / 3600000).toFixed(1);

            return (
              <List.Item style={{ background: item.estado === 'Activo' ? '#0f172a' : '#334155', border: '1px solid #3b82f6', borderRadius: '8px', padding: '15px', marginBottom: '10px' }}>
                <div style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <Text style={{ color: '#e2e8f0', fontSize: '16px', fontWeight: 'bold' }}>{item.nombre_completo}</Text>
                    {item.estado === 'Activo' ? (
                      <Tag color="green">Activo</Tag>
                    ) : (
                      <Tag color="default">Retirado</Tag>
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#94a3b8' }}>
                    <div>
                      <div><strong>Inicio:</strong> {start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                      {item.hora_fin && <div><strong>Fin:</strong> {new Date(item.hora_fin).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>}
                      <div style={{ marginTop: '5px', color: '#38bdf8' }}>Tiempo: {hours} hr</div>
                    </div>
                    {item.estado === 'Activo' && (
                      <Button size="small" danger onClick={() => handleRetirarPescador(item.id_empleado)}>
                        Retirar
                      </Button>
                    )}
                  </div>
                </div>
              </List.Item>
            );
          }}
        />

        <Modal
          title="Asignar Recolectores (Empleados Pescando)"
          open={modalRecolectoresVisible}
          visible={modalRecolectoresVisible}
          onOk={handleSaveRecolectores}
          onCancel={() => setModalRecolectoresVisible(false)}
          okText="Guardar"
          cancelText="Cancelar"
        >
          <Select
            mode="multiple"
            style={{ width: '100%' }}
            placeholder="Seleccione los empleados (Buscar por Cédula o Nombre)"
            value={recolectoresSeleccionados}
            onChange={setRecolectoresSeleccionados}
            optionFilterProp="children"
            filterOption={(input, option) =>
              (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
            }
          >
            {empleadosDisponibles.map(emp => (
              <Option key={emp.id_empleado} value={emp.id_empleado}>
                {emp.numero_identificacion} - {emp.nombre_completo}
              </Option>
            ))}
          </Select>
        </Modal>

        </div>
      );
    } catch (renderError) {
      return (
        <div style={{ padding: '20px', color: 'white', background: 'red', borderRadius: '8px' }}>
          <h1>💥 Error en la vista de Cosecha</h1>
          <p>{renderError.toString()}</p>
          <pre style={{ color: 'yellow', whiteSpace: 'pre-wrap' }}>{renderError.stack}</pre>
          <Button onClick={() => setCurrentLote(null)}>← Volver a Forzar Salida</Button>
        </div>
      );
    }
  }

  // VISTA PRINCIPAL: Seleccion de Lago
  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <Title level={3} style={{ color: '#fff', marginBottom: '30px' }}>📱 Captura de Cosecha en Campo</Title>

      {/* Lotes en Progreso */}
      {activeLotes.length > 0 && (
        <div style={{ marginBottom: '40px' }}>
          <Title level={5} style={{ color: '#38bdf8' }}>Campañas en Progreso (Continuar)</Title>
          <Row gutter={[16, 16]}>
            {activeLotes.map(lote => (
              <Col span={24} sm={12} key={lote.id_lote_cosecha}>
                <Card 
                  hoverable 
                  onClick={() => setCurrentLote(lote)}
                  style={{ background: '#1e293b', border: '1px solid #3b82f6', borderRadius: '12px' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <Title level={5} style={{ color: '#fff', margin: 0 }}>Lago {lote.estanque_codigo}</Title>
                      <Text style={{ color: '#94a3b8' }}>{lote.especie_nombre}</Text>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <Tag color="blue">En Progreso</Tag>
                      <div style={{ color: '#10b981', fontWeight: 'bold', marginTop: '5px' }}>{Number(lote.total_capturado_kg).toFixed(2)} kg</div>
                    </div>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      )}

      {/* Iniciar nueva Cosecha */}
      <Title level={4} style={{ color: "#0ea5e9", marginTop: 0 }}>Lagos listos para Cosechar (Iniciar Nueva)</Title>
      <Row gutter={[16, 16]}>
        {activeSiembras.length === 0 && <Text style={{ color: '#94a3b8' }}>No hay siembras activas disponibles.</Text>}
        {activeSiembras.map(s => (
          <Col span={24} sm={12} key={s.id_siembra_acui}>
            <Card style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }}>
              <Title level={5} style={{ color: '#fff', margin: 0 }}>Lago {s.estanque_codigo}</Title>
              <Text style={{ color: '#94a3b8', display: 'block' }}>{s.especie_nombre}</Text>
              <Text style={{ color: '#64748b', fontSize: '12px' }}>Alevines: {s.cantidad_alevines}</Text>
              
              <Button 
                type="primary" 
                style={{ width: '100%', marginTop: '15px', background: '#10b981' }}
                onClick={() => handleStartLote(s)}
              >
                Abrir Cosecha
              </Button>
            </Card>
          </Col>
        ))}
      </Row>

    </div>
  );
}

export default AcuicolaCosechasMobile;
