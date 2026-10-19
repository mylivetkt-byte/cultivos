import React, { useState, useMemo } from 'react';
import { Card, Button, InputNumber, Slider, Radio, Tag, Alert, Row, Col, Typography, Space, Tooltip } from 'antd';
import { 
  CalculatorOutlined, SoundOutlined, ShareAltOutlined, CheckCircleOutlined, 
  WarningOutlined, AlertOutlined, InfoCircleOutlined, FieldTimeOutlined 
} from '@ant-design/icons';
import { hablarEnVozCampesina, pararVozCampesina } from '../../utils/glosarioCampesino';
import AyudaCampesina from '../Common/AyudaCampesina';

const { Title, Text, Paragraph } = Typography;

export default function AsistenteGanaderoCampesino({ onClose, fincaId }) {
  const [pasoActivo, setPasoActivo] = useState(1);

  // --- PASO 1: AFORO DE PASTOS (Marco 1x1m) ---
  const [unidadArea, setUnidadArea] = useState('cuadras'); // cuadras, fanegadas, ha, m2
  const [cantidadArea, setCantidadArea] = useState(1);
  const [muestraAlta, setMuestraAlta] = useState(1.8); // kg/m2
  const [muestraMedia, setMuestraMedia] = useState(1.2);
  const [muestraBaja, setMuestraBaja] = useState(0.6);
  const [pctDesperdicio, setPctDesperdicio] = useState(30); // 30% pisoteo/bosta
  const [cabezasGanado, setCabezasGanado] = useState(25);
  const [pesoPromedioAnimal, setPesoPromedioAnimal] = useState(400); // kg

  // Cálculo área m2
  const areaM2 = useMemo(() => {
    if (unidadArea === 'cuadras' || unidadArea === 'fanegadas') return cantidadArea * 6400;
    if (unidadArea === 'ha') return cantidadArea * 10000;
    return cantidadArea;
  }, [unidadArea, cantidadArea]);

  // Promedio aforo kg/m2
  const promedioKgM2 = useMemo(() => {
    return Number(((muestraAlta + muestraMedia + muestraBaja) / 3).toFixed(2));
  }, [muestraAlta, muestraMedia, muestraBaja]);

  // Forraje total y útil
  const forrajeTotalKg = useMemo(() => Math.round(areaM2 * promedioKgM2), [areaM2, promedioKgM2]);
  const forrajeUtilKg = useMemo(() => Math.round(forrajeTotalKg * (1 - pctDesperdicio / 100)), [forrajeTotalKg, pctDesperdicio]);

  // Consumo diario del lote (vaca consume ~10% peso vivo en forraje verde)
  const consumoDiarioPorAnimalKg = useMemo(() => pesoPromedioAnimal * 0.10, [pesoPromedioAnimal]);
  const consumoDiarioLoteKg = useMemo(() => Math.round(cabezasGanado * consumoDiarioPorAnimalKg), [cabezasGanado, consumoDiarioPorAnimalKg]);

  // Días que aguanta el potrero
  const diasPastoreoPotrero = useMemo(() => {
    if (consumoDiarioLoteKg <= 0) return 0;
    const dias = forrajeUtilKg / consumoDiarioLoteKg;
    return Number(dias.toFixed(1));
  }, [forrajeUtilKg, consumoDiarioLoteKg]);

  // Capacidad de carga en UGG (Unidad Gran Ganado = 450 kg)
  const uggSoportadas = useMemo(() => {
    const consumoUGGDiario = 45; // 450 kg * 10%
    return Math.round(forrajeUtilKg / (consumoUGGDiario * (diasPastoreoPotrero || 1)));
  }, [forrajeUtilKg, diasPastoreoPotrero]);

  // --- PASO 2: CINTA BARZONERA (Sin Báscula) ---
  const [perimetroToracicoCm, setPerimetroToracicoCm] = useState(175);
  const [longitudCuerpoCm, setLongitudCuerpoCm] = useState(140);
  const [tipoCalculoCinta, setTipoCalculoCinta] = useState('completo'); // completo o solo_pecho

  const pesoEstimadoKg = useMemo(() => {
    if (tipoCalculoCinta === 'completo' && longitudCuerpoCm > 0) {
      // Fórmula Crevat: (Tórax² * Longitud) / 10838
      const p = (Math.pow(perimetroToracicoCm, 2) * longitudCuerpoCm) / 10838;
      return Math.round(p);
    } else {
      // Estimación polinomial rápida de campo FEDEGAN
      // Para 140cm ~ 230kg, 160cm ~ 330kg, 180cm ~ 450kg, 200cm ~ 580kg
      const p = Math.pow(perimetroToracicoCm, 2.7) / 1250;
      return Math.round(p);
    }
  }, [perimetroToracicoCm, longitudCuerpoCm, tipoCalculoCinta]);

  const arrobasEstimadas = useMemo(() => (pesoEstimadoKg / 12.5).toFixed(1), [pesoEstimadoKg]);

  // Categoría zootécnica
  const categoriaAnimal = useMemo(() => {
    if (pesoEstimadoKg < 150) return { nombre: 'Ternero(a) de Cría / Desteto', color: 'blue', dosisVit: '2-3 ml' };
    if (pesoEstimadoKg < 280) return { nombre: 'Novillo(a) de Levante', color: 'cyan', dosisVit: '5 ml' };
    if (pesoEstimadoKg < 420) return { nombre: 'Novillo de Ceba o Vaca Horra', color: 'orange', dosisVit: '8-10 ml' };
    return { nombre: 'Toro o Vaca Adulta Pesada', color: 'green', dosisVit: '10-12 ml' };
  }, [pesoEstimadoKg]);

  // --- PASO 3: CONDICIÓN CORPORAL (1 a 5) ---
  const [condicionSeleccionada, setCondicionSeleccionada] = useState(3);

  const ESCALA_CONDICION = [
    {
      grado: 1,
      titulo: '1 - Muy Flaca (Emaciada / Serrucho)',
      icono: '🔴',
      color: '#ef4444',
      senales: 'Costillas, cadera y vértebras sobresalen como cuchillas. No hay nada de grasa.',
      problemas: 'No entra en calor (anestro), bajas defensas, peligro inminente de muerte.',
      receta: 'Separar al lote de enfermería. Suministrar pasto de corte picado, 2 kg de concentrado/silo con melaza y sal mineralizada al 8% rica en fósforo.'
    },
    {
      grado: 2,
      titulo: '2 - Flaca (Baja Condición)',
      icono: '🟡',
      color: '#f59e0b',
      senales: 'Costillas y punta de nalga visibles, pero los huecos entre huesos están suaves.',
      problemas: 'Se demora muchos meses en volver a preñarse; produce poca leche.',
      receta: 'Dar mejor potrero con buen aforo, suplementar con 1 kg de maíz molido o silo y sal mineralizada.'
    },
    {
      grado: 3,
      titulo: '3 - Óptima / Ideal Campesina 🟢',
      icono: '🟢',
      color: '#10b981',
      senales: 'Lomo parejo, costillas cubiertas con una capa delgada de carne. Piel brillante.',
      problemas: '¡Punto ideal! Máxima fertilidad, fácil parto y excelente producción de leche.',
      receta: 'Mantener la rotación de praderas Voisin y sal mineralizada a voluntad.'
    },
    {
      grado: 4,
      titulo: '4 - Gorda (Sobrecondición)',
      icono: '🟡',
      color: '#eab308',
      senales: 'Lomo plano y ancho, rollos de grasa evidentes alrededor de la base de la cola.',
      problemas: 'Partos difíciles (distocias), retención de placenta y desperdicio de alimento.',
      receta: 'No engordar más. Ajustar la carga animal y aumentar el ejercicio en potrero.'
    },
    {
      grado: 5,
      titulo: '5 - Muy Obesa',
      icono: '🔴',
      color: '#dc2626',
      senales: 'Huesos de cadera invisibles enterrados en grasa. Movimiento pesado y torpe.',
      problemas: 'Hígado graso, problemas en patas e infertilidad casi total.',
      receta: 'Restringir suplementación calórica y racionar pasturas.'
    }
  ];

  // --- PASO 4: SEMÁFORO DE TIEMPO DE RETIRO ---
  const [medicamentoSel, setMedicamentoSel] = useState('oxitetraciclina');
  const [fechaAplicacion, setFechaAplicacion] = useState(new Date().toISOString().split('T')[0]);

  const MEDICAMENTOS_GUIA = {
    oxitetraciclina: {
      nombre: 'Oxitetraciclina L.A. (Antibiótico)',
      diasLeche: 6,
      diasCarne: 21,
      alerta: 'Inhibe el cuajo de los quesos y deja residuos tóxicos en la leche.',
      icono: '💉'
    },
    penicilina: {
      nombre: 'Penicilina G + Estreptomicina (Antibiótico)',
      diasLeche: 3,
      diasCarne: 14,
      alerta: 'Altamente alergénico en humanos si se consume leche antes de tiempo.',
      icono: '🧪'
    },
    ivermectina: {
      nombre: 'Ivermectina al 1% o 3.15% (Desparasitante)',
      diasLeche: 999, // Prohibido en ordeño
      diasCarne: 35,
      alerta: '¡PROHIBIDO EN VACAS DE LECHE! Se fija en la grasa de la ubre por meses.',
      icono: '🚫'
    },
    albendazol: {
      nombre: 'Albendazol / Fenbendazol Oral (Purgante)',
      diasLeche: 3,
      diasCarne: 14,
      alerta: 'Apto para ganado de leche respetando los 3 días de descarte.',
      icono: '🥣'
    },
    vacuna_aftosa: {
      nombre: 'Vacuna Aftosa / Rabia / Cepa 19 (ICA)',
      diasLeche: 0,
      diasCarne: 0,
      alerta: 'Cero días de retiro. La leche y carne son totalmente seguras.',
      icono: '🛡️'
    }
  };

  const medInfo = MEDICAMENTOS_GUIA[medicamentoSel];

  const fechaLiberacionLeche = useMemo(() => {
    if (medInfo.diasLeche === 999) return 'PROHIBIDO en vacas de ordeño';
    if (medInfo.diasLeche === 0) return 'Inmediato (0 días)';
    const f = new Date(fechaAplicacion);
    f.setDate(f.getDate() + medInfo.diasLeche);
    return f.toISOString().split('T')[0];
  }, [fechaAplicacion, medInfo]);

  const fechaLiberacionCarne = useMemo(() => {
    if (medInfo.diasCarne === 0) return 'Inmediato (0 días)';
    const f = new Date(fechaAplicacion);
    f.setDate(f.getDate() + medInfo.diasCarne);
    return f.toISOString().split('T')[0];
  }, [fechaAplicacion, medInfo]);

  // Compartir por WhatsApp
  const compartirWhatsApp = () => {
    const texto = encodeURIComponent(
      `*🐄 REPORTE DE ASISTENCIA CAMPESINA GANADERA*\n\n` +
      `*1. Aforo y Rotación del Potrero:*\n` +
      `- Área: ${cantidadArea} ${unidadArea} (${areaM2.toLocaleString()} m²)\n` +
      `- Pasto cortado promedio: ${promedioKgM2} kg/m²\n` +
      `- Forraje verde útil disponible: ${forrajeUtilKg.toLocaleString()} kg\n` +
      `- Días recomendados de pastoreo: *${diasPastoreoPotrero} días* para ${cabezasGanado} animales\n` +
      `- Carga animal: ~${uggSoportadas} UGG\n\n` +
      `*2. Pesaje Cinta Barzonera:*\n` +
      `- Perímetro de pecho: ${perimetroToracicoCm} cm\n` +
      `- Peso aproximado: *${pesoEstimadoKg} Kg* (${arrobasEstimadas} @)\n` +
      `- Categoría: ${categoriaAnimal.nombre}\n\n` +
      `*3. Alerta de Retiro Sanitario:*\n` +
      `- Medicamento: ${medInfo.nombre}\n` +
      `- Leche apta a partir de: *${fechaLiberacionLeche}*\n` +
      `- Carne apta a partir de: *${fechaLiberacionCarne}*\n\n` +
      `_Generado por AgroPaccioli Escuela de Campo Ganadera_`
    );
    window.open(`https://wa.me/?text=${texto}`, '_blank');
  };

  return (
    <div style={{ maxWidth: '980px', margin: '0 auto', padding: '16px' }}>
      {/* CABECERA */}
      <Card style={{ 
        background: 'linear-gradient(135deg, #1e3a2f 0%, #11221b 100%)', 
        borderRadius: '16px', 
        border: '1px solid #2d5a49', 
        color: '#fff', 
        marginBottom: '20px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
      }}>
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col xs={24} md={16}>
            <Space orientation="vertical" size={2}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '32px' }}>🐄</span>
                <Title level={2} style={{ color: '#fff', margin: 0 }}>
                  Escuela de Campo Ganadera
                </Title>
              </div>
              <Paragraph style={{ color: '#a7f3d0', margin: '4px 0 0 0', fontSize: '15px' }}>
                Asistente Campesino para cálculo de pasto (Voisin), pesaje sin báscula, condición corporal y retiro de leche.
              </Paragraph>
            </Space>
          </Col>
          <Col xs={24} md={8} style={{ textAlign: 'right' }}>
            <Space wrap>
              <Button 
                type="primary" 
                icon={<SoundOutlined />} 
                style={{ background: '#10b981', borderColor: '#10b981', fontWeight: 'bold' }}
                onClick={() => hablarEnVozCampesina(
                  "Bienvenido a la Escuela de Campo Ganadera. Aquí aprenderá a calcular cuántos animales soporta su potrero usando el marco de aforo, a pesar ganado con cinta métrica si no tiene báscula, y a respetar los días de retiro de las medicinas para no envenenar la leche ni la carne."
                )}
              >
                🔊 Escuchar Explicación
              </Button>
              {onClose && (
                <Button onClick={onClose} style={{ background: 'transparent', color: '#fff', borderColor: '#4ade80' }}>
                  Cerrar
                </Button>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      {/* BOTONES DE PASOS NAVEGACIÓN */}
      <Row gutter={[10, 10]} style={{ marginBottom: '20px' }}>
        {[
          { num: 1, tit: '1. Aforo y Pasturas', ico: '🌾' },
          { num: 2, tit: '2. Pesaje Cinta Barzonera', ico: '📏' },
          { num: 3, tit: '3. Condición Corporal', ico: '🐄' },
          { num: 4, tit: '4. Semáforo de Retiro', ico: '🛑' }
        ].map(p => (
          <Col xs={12} sm={6} key={p.num}>
            <Button
              block
              size="large"
              type={pasoActivo === p.num ? 'primary' : 'default'}
              onClick={() => {
                pararVozCampesina();
                setPasoActivo(p.num);
              }}
              style={{
                height: '52px',
                borderRadius: '12px',
                fontWeight: 'bold',
                fontSize: '14px',
                background: pasoActivo === p.num ? '#059669' : '#1f2937',
                borderColor: pasoActivo === p.num ? '#34d399' : '#374151',
                color: '#fff'
              }}
            >
              {p.ico} {p.tit}
            </Button>
          </Col>
        ))}
      </Row>

      {/* ========================================================================= */}
      {/* PASO 1: AFORO DE PASTOS (MÉTODO DEL MARCO 1x1M) */}
      {/* ========================================================================= */}
      {pasoActivo === 1 && (
        <Card style={{ background: '#111827', borderColor: '#1f2937', borderRadius: '16px', color: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <Title level={3} style={{ color: '#34d399', margin: 0 }}>
              🌾 Aforo de Pasturas y Capacidad del Potrero (Método del Marco de 1m)
            </Title>
            <AyudaCampesina campoKey="aforo_pastos" />
          </div>

          <Alert
            message="¿Cómo hacer el aforo en el potrero?"
            description="Camine el potrero en diagonal. Bote un marco cuadrado de 1 metro de lado en tres puntos: donde el pasto esté alto y tupido, donde esté normal (medio), y donde esté raleado o bajo. Corte con machete a 10 cm del suelo y pese cada muestra con un peso o romana."
            type="info"
            showIcon
            style={{ marginBottom: '20px', background: '#064e3b', borderColor: '#059669', color: '#ecfdf5' }}
          />

          <Row gutter={[20, 20]}>
            {/* Lado izquierdo: Entradas */}
            <Col xs={24} md={12}>
              <Card style={{ background: '#1f2937', borderColor: '#374151', borderRadius: '12px' }}>
                <Title level={5} style={{ color: '#fff', marginBottom: '12px' }}>
                  📐 1. Tamaño del Potrero
                </Title>

                <div style={{ marginBottom: '16px' }}>
                  <Text style={{ color: '#9ca3af', display: 'block', marginBottom: '6px' }}>Unidad de Medida Campesina:</Text>
                  <Radio.Group value={unidadArea} onChange={e => setUnidadArea(e.target.value)}>
                    <Radio.Button value="cuadras" style={{ background: '#374151', color: '#fff' }}>Cuadras (Plazas)</Radio.Button>
                    <Radio.Button value="fanegadas" style={{ background: '#374151', color: '#fff' }}>Fanegadas</Radio.Button>
                    <Radio.Button value="ha" style={{ background: '#374151', color: '#fff' }}>Hectáreas</Radio.Button>
                    <Radio.Button value="m2" style={{ background: '#374151', color: '#fff' }}>Metros²</Radio.Button>
                  </Radio.Group>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <Text style={{ color: '#9ca3af', display: 'block', marginBottom: '6px' }}>Cantidad de Área:</Text>
                  <InputNumber
                    min={0.1}
                    value={cantidadArea}
                    onChange={v => setCantidadArea(v || 1)}
                    size="large"
                    style={{ width: '100%' }}
                  />
                  <Text style={{ color: '#10b981', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                    = {areaM2.toLocaleString()} metros cuadrados
                  </Text>
                </div>

                <Title level={5} style={{ color: '#fff', marginTop: '20px', marginBottom: '12px' }}>
                  ⚖️ 2. Pesaje de las 3 Muestras (Kilos por Metro²)
                </Title>

                <Row gutter={10}>
                  <Col span={8}>
                    <Text style={{ color: '#a7f3d0', fontSize: '12px' }}>Alto (Tupido)</Text>
                    <InputNumber
                      min={0.1}
                      step={0.1}
                      value={muestraAlta}
                      onChange={v => setMuestraAlta(v || 0.1)}
                      style={{ width: '100%', marginTop: '4px' }}
                    />
                  </Col>
                  <Col span={8}>
                    <Text style={{ color: '#fef08a', fontSize: '12px' }}>Medio (Normal)</Text>
                    <InputNumber
                      min={0.1}
                      step={0.1}
                      value={muestraMedia}
                      onChange={v => setMuestraMedia(v || 0.1)}
                      style={{ width: '100%', marginTop: '4px' }}
                    />
                  </Col>
                  <Col span={8}>
                    <Text style={{ color: '#fca5a5', fontSize: '12px' }}>Bajo (Raleado)</Text>
                    <InputNumber
                      min={0.1}
                      step={0.1}
                      value={muestraBaja}
                      onChange={v => setMuestraBaja(v || 0.1)}
                      style={{ width: '100%', marginTop: '4px' }}
                    />
                  </Col>
                </Row>

                <div style={{ marginTop: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9ca3af', fontSize: '13px' }}>
                    <span>Desperdicio por Pisoteo y Bosta:</span>
                    <strong style={{ color: '#f59e0b' }}>{pctDesperdicio}%</strong>
                  </div>
                  <Slider
                    min={15}
                    max={50}
                    value={pctDesperdicio}
                    onChange={v => setPctDesperdicio(v)}
                  />
                </div>

                <Title level={5} style={{ color: '#fff', marginTop: '16px', marginBottom: '12px' }}>
                  🐂 3. Ganado que Entrará al Potrero
                </Title>
                <Row gutter={10}>
                  <Col span={12}>
                    <Text style={{ color: '#9ca3af', fontSize: '12px' }}>Número de Animales:</Text>
                    <InputNumber
                      min={1}
                      value={cabezasGanado}
                      onChange={v => setCabezasGanado(v || 1)}
                      style={{ width: '100%', marginTop: '4px' }}
                    />
                  </Col>
                  <Col span={12}>
                    <Text style={{ color: '#9ca3af', fontSize: '12px' }}>Peso Promedio (Kg):</Text>
                    <InputNumber
                      min={50}
                      step={25}
                      value={pesoPromedioAnimal}
                      onChange={v => setPesoPromedioAnimal(v || 100)}
                      style={{ width: '100%', marginTop: '4px' }}
                    />
                  </Col>
                </Row>
              </Card>
            </Col>

            {/* Lado derecho: Resultados pedagógicos */}
            <Col xs={24} md={12}>
              <Card style={{ 
                background: 'linear-gradient(135deg, #064e3b 0%, #022c22 100%)', 
                borderColor: '#059669', 
                borderRadius: '12px',
                height: '100%'
              }}>
                <Title level={4} style={{ color: '#6ee7b7', borderBottom: '1px solid #047857', paddingBottom: '10px', marginTop: 0 }}>
                  📊 Diagnóstico y Recomendación Voisin
                </Title>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '16px' }}>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px' }}>
                    <Text style={{ color: '#a7f3d0', fontSize: '12px' }}>Pasto Verde Cortado:</Text>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#fff' }}>
                      {promedioKgM2} <span style={{ fontSize: '13px' }}>kg/m²</span>
                    </div>
                  </div>

                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px' }}>
                    <Text style={{ color: '#a7f3d0', fontSize: '12px' }}>Forraje Útil Real:</Text>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#34d399' }}>
                      {forrajeUtilKg.toLocaleString()} <span style={{ fontSize: '13px' }}>kg</span>
                    </div>
                  </div>

                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px' }}>
                    <Text style={{ color: '#a7f3d0', fontSize: '12px' }}>Consumo Diario Lote:</Text>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#fcd34d' }}>
                      {consumoDiarioLoteKg.toLocaleString()} <span style={{ fontSize: '13px' }}>kg/día</span>
                    </div>
                  </div>

                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px' }}>
                    <Text style={{ color: '#a7f3d0', fontSize: '12px' }}>Carga Estimada:</Text>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#60a5fa' }}>
                      ~{uggSoportadas} <span style={{ fontSize: '13px' }}>UGG</span>
                    </div>
                  </div>
                </div>

                <div style={{ 
                  marginTop: '20px', 
                  padding: '16px', 
                  borderRadius: '10px', 
                  background: diasPastoreoPotrero >= 1 && diasPastoreoPotrero <= 3 ? '#065f46' : '#78350f',
                  border: `1px solid ${diasPastoreoPotrero >= 1 && diasPastoreoPotrero <= 3 ? '#10b981' : '#f59e0b'}`
                }}>
                  <div style={{ fontSize: '13px', color: '#ecfdf5', textTransform: 'uppercase', fontWeight: 'bold' }}>
                    ⏳ Días de Ocupación Máximos Recomendados:
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: '900', color: '#fff', margin: '4px 0' }}>
                    {diasPastoreoPotrero} Días
                  </div>
                  <Paragraph style={{ color: '#d1fae5', margin: 0, fontSize: '13px' }}>
                    {diasPastoreoPotrero > 3 
                      ? "⚠️ Alerta: Dejar el ganado más de 3 días en el potrero hace que se coman el rebrote tierno de la mata y el pasto se degrada. Divida el potrero con cerca eléctrica móvil en 2 o 3 partes."
                      : "✅ Excelente: Rotación rápida tipo Voisin. El ganado come la punta del pasto sin perjudicar la raíz ni el rebrote."}
                  </Paragraph>
                </div>

                <div style={{ marginTop: '16px', background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px' }}>
                  <Text style={{ color: '#6ee7b7', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                    🌱 Tiempo de Descanso Obligatorio:
                  </Text>
                  <Text style={{ color: '#e2e8f0', fontSize: '13px' }}>
                    Deje descansar este potrero <b>30 a 40 días</b> (en clima caliente) o <b>45 a 60 días</b> (en clima frío) antes de volver a meter el ganado, hasta que el pasto tenga entre 4 y 5 hojas nuevas.
                  </Text>
                </div>
              </Card>
            </Col>
          </Row>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* PASO 2: PESAJE CON CINTA BARZONERA (SIN BÁSCULA) */}
      {/* ========================================================================= */}
      {pasoActivo === 2 && (
        <Card style={{ background: '#111827', borderColor: '#1f2937', borderRadius: '16px', color: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <Title level={3} style={{ color: '#60a5fa', margin: 0 }}>
              📏 Estimación de Peso con Cinta Barzonera (Sin Báscula Ganadera)
            </Title>
            <AyudaCampesina campoKey="cinta_barzonera" />
          </div>

          <Alert
            message="¿Cómo medir al animal con la cinta métrica de costura?"
            description="1. Ponga el animal parado derecho en piso plano sobre las 4 patas. 2. Pase la cinta métrica por detrás de las manos (brazuelos), bien ceñida al tórax sin apretar en exceso. Anote los centímetros. 3. Para mayor exactitud, mida el largo desde la cruz hasta la punta del anca (isquion)."
            type="info"
            showIcon
            style={{ marginBottom: '20px', background: '#1e3a8a', borderColor: '#3b82f6', color: '#dbeafe' }}
          />

          <Row gutter={[20, 20]}>
            <Col xs={24} md={12}>
              <Card style={{ background: '#1f2937', borderColor: '#374151', borderRadius: '12px' }}>
                <Title level={5} style={{ color: '#fff', marginBottom: '16px' }}>
                  📐 Mediciones del Animal (en Centímetros)
                </Title>

                <div style={{ marginBottom: '20px' }}>
                  <Text style={{ color: '#9ca3af', display: 'block', marginBottom: '6px' }}>
                    1. Perímetro Torácico (Alrededor del Pecho en cm):
                  </Text>
                  <InputNumber
                    min={80}
                    max={260}
                    value={perimetroToracicoCm}
                    onChange={v => setPerimetroToracicoCm(v || 140)}
                    size="large"
                    style={{ width: '100%' }}
                  />
                  <Slider
                    min={100}
                    max={240}
                    value={perimetroToracicoCm}
                    onChange={v => setPerimetroToracicoCm(v)}
                  />
                  <Text style={{ color: '#60a5fa', fontSize: '12px' }}>
                    Rango típico: 130 cm (ternero) a 210 cm (toro grande)
                  </Text>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: '#9ca3af', marginBottom: '6px' }}>
                      2. Longitud Corporal (Desde la cruz hasta la nalga):
                    </Text>
                    <Radio.Group 
                      size="small" 
                      value={tipoCalculoCinta} 
                      onChange={e => setTipoCalculoCinta(e.target.value)}
                    >
                      <Radio.Button value="completo">Con Largo</Radio.Button>
                      <Radio.Button value="solo_pecho">Solo Pecho</Radio.Button>
                    </Radio.Group>
                  </div>
                  {tipoCalculoCinta === 'completo' && (
                    <>
                      <InputNumber
                        min={70}
                        max={220}
                        value={longitudCuerpoCm}
                        onChange={v => setLongitudCuerpoCm(v || 120)}
                        size="large"
                        style={{ width: '100%', marginTop: '8px' }}
                      />
                      <Slider
                        min={80}
                        max={190}
                        value={longitudCuerpoCm}
                        onChange={v => setLongitudCuerpoCm(v)}
                      />
                    </>
                  )}
                </div>

                <div style={{ background: '#111827', padding: '12px', borderRadius: '8px', borderLeft: '4px solid #3b82f6' }}>
                  <Text style={{ color: '#93c5fd', fontSize: '13px' }}>
                    <b>💡 Consejo del Mayordomo:</b> No mida al animal agitado o recién comido con la barriga inflada de pasto y agua, porque el tórax puede variar de 5 a 10 cm. Es mejor medir en la mañana en ayunas.
                  </Text>
                </div>
              </Card>
            </Col>

            <Col xs={24} md={12}>
              <Card style={{ 
                background: 'linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)', 
                borderColor: '#3b82f6', 
                borderRadius: '12px',
                textAlign: 'center',
                padding: '20px 10px'
              }}>
                <Text style={{ color: '#bfdbfe', textTransform: 'uppercase', fontSize: '13px', letterSpacing: '1px' }}>
                  Peso Vivo Estimado por Cinta
                </Text>
                <div style={{ fontSize: '56px', fontWeight: '900', color: '#60a5fa', margin: '8px 0' }}>
                  {pesoEstimadoKg} <span style={{ fontSize: '24px', color: '#fff' }}>Kg</span>
                </div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#93c5fd', marginBottom: '16px' }}>
                  ≈ {arrobasEstimadas} Arrobas (@)
                </div>

                <Tag color={categoriaAnimal.color} style={{ fontSize: '15px', padding: '6px 16px', borderRadius: '20px', marginBottom: '20px' }}>
                  {categoriaAnimal.nombre}
                </Tag>

                <div style={{ background: 'rgba(0,0,0,0.4)', padding: '16px', borderRadius: '10px', textAlign: 'left', marginTop: '10px' }}>
                  <Title level={5} style={{ color: '#fff', margin: '0 0 10px 0' }}>
                    💊 Dosis Sugeridas según Peso ({pesoEstimadoKg} Kg):
                  </Title>
                  <div style={{ color: '#cbd5e1', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div>
                      💉 <b>Desparasitante (1 ml por cada 50 Kg):</b>{' '}
                      <span style={{ color: '#34d399', fontWeight: 'bold' }}>
                        {(pesoEstimadoKg / 50).toFixed(1)} ml
                      </span>
                    </div>
                    <div>
                      🧪 <b>Antibiótico Oxitetraciclina L.A. (1 ml por cada 10 Kg):</b>{' '}
                      <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>
                        {(pesoEstimadoKg / 10).toFixed(1)} ml
                      </span>
                    </div>
                    <div>
                      ✨ <b>Complejo B / Reconstituyente:</b>{' '}
                      <span style={{ color: '#60a5fa', fontWeight: 'bold' }}>
                        {categoriaAnimal.dosisVit}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            </Col>
          </Row>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* PASO 3: CONDICIÓN CORPORAL CAMPESINA (1 A 5) */}
      {/* ========================================================================= */}
      {pasoActivo === 3 && (
        <Card style={{ background: '#111827', borderColor: '#1f2937', borderRadius: '16px', color: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <Title level={3} style={{ color: '#f59e0b', margin: 0 }}>
              🐄 Evaluación de Condición Corporal Campesina (Escala 1 a 5)
            </Title>
            <AyudaCampesina campoKey="condicion_corporal" />
          </div>

          <Paragraph style={{ color: '#9ca3af' }}>
            Toque el grado en el que ve a su vaca o lote de ganado. Le enseñamos a palpar costillas, lomo y cadera para saber si necesita comida extra o si está en su punto para preñarse.
          </Paragraph>

          <Row gutter={[12, 12]} style={{ marginBottom: '20px' }}>
            {ESCALA_CONDICION.map(c => (
              <Col xs={24} sm={12} md={true} key={c.grado} style={{ flex: 1 }}>
                <Card
                  hoverable
                  onClick={() => setCondicionSeleccionada(c.grado)}
                  style={{
                    background: condicionSeleccionada === c.grado ? '#1f2937' : '#111827',
                    borderColor: condicionSeleccionada === c.grado ? c.color : '#374151',
                    borderWidth: condicionSeleccionada === c.grado ? '2px' : '1px',
                    borderRadius: '12px',
                    textAlign: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontSize: '28px', marginBottom: '4px' }}>{c.icono}</div>
                  <div style={{ fontWeight: 'bold', color: c.color, fontSize: '15px' }}>
                    Grado {c.grado}
                  </div>
                </Card>
              </Col>
            ))}
          </Row>

          {/* Ficha explicativa del grado seleccionado */}
          {(() => {
            const item = ESCALA_CONDICION.find(x => x.grado === condicionSeleccionada);
            return (
              <Card style={{ 
                background: '#1f2937', 
                borderColor: item.color, 
                borderRadius: '12px', 
                borderLeft: `6px solid ${item.color}` 
              }}>
                <Title level={4} style={{ color: item.color, margin: '0 0 12px 0' }}>
                  {item.titulo}
                </Title>

                <Row gutter={[16, 16]}>
                  <Col xs={24} md={8}>
                    <Text style={{ color: '#9ca3af', fontSize: '12px', fontWeight: 'bold', display: 'block' }}>
                      👀 LO QUE SE VE A SIMPLE VISTA:
                    </Text>
                    <Paragraph style={{ color: '#fff', marginTop: '4px' }}>
                      {item.senales}
                    </Paragraph>
                  </Col>

                  <Col xs={24} md={8}>
                    <Text style={{ color: '#f87171', fontSize: '12px', fontWeight: 'bold', display: 'block' }}>
                      ⚠️ IMPACTO EN LA PRODUCCIÓN:
                    </Text>
                    <Paragraph style={{ color: '#fecaca', marginTop: '4px' }}>
                      {item.problemas}
                    </Paragraph>
                  </Col>

                  <Col xs={24} md={8}>
                    <Text style={{ color: '#34d399', fontSize: '12px', fontWeight: 'bold', display: 'block' }}>
                      🌾 RECETA DE RECUPERACIÓN CAMPESINA:
                    </Text>
                    <Paragraph style={{ color: '#d1fae5', marginTop: '4px' }}>
                      {item.receta}
                    </Paragraph>
                  </Col>
                </Row>
              </Card>
            );
          })()}
        </Card>
      )}

      {/* ========================================================================= */}
      {/* PASO 4: SEMÁFORO DE TIEMPO DE RETIRO (LECHE Y CARNE SEGURA) */}
      {/* ========================================================================= */}
      {pasoActivo === 4 && (
        <Card style={{ background: '#111827', borderColor: '#1f2937', borderRadius: '16px', color: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <Title level={3} style={{ color: '#ef4444', margin: 0 }}>
              🛑 Semáforo de Tiempo de Retiro (Carne y Leche Segura)
            </Title>
            <AyudaCampesina campoKey="tiempo_retiro" />
          </div>

          <Alert
            message="¡Cero medicamentos en la mesa de los colombianos!"
            description="Si le inyecta antibiótico o antiparasitario a una vaca, los residuos viajan en la leche y en la carne. Si entrega esa leche a la quesería, el cuajo no corta y le devuelven la cantina; si manda el novillo al matadero con químicos, el INVIMA sanciona la finca."
            type="warning"
            showIcon
            style={{ marginBottom: '20px', background: '#451a03', borderColor: '#d97706', color: '#fef3c7' }}
          />

          <Row gutter={[20, 20]}>
            <Col xs={24} md={12}>
              <Card style={{ background: '#1f2937', borderColor: '#374151', borderRadius: '12px' }}>
                <Title level={5} style={{ color: '#fff', marginBottom: '16px' }}>
                  💊 Seleccione el Medicamento Aplicado
                </Title>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {Object.entries(MEDICAMENTOS_GUIA).map(([key, m]) => (
                    <div 
                      key={key}
                      onClick={() => setMedicamentoSel(key)}
                      style={{
                        padding: '12px 16px',
                        borderRadius: '8px',
                        background: medicamentoSel === key ? '#374151' : '#111827',
                        border: `1px solid ${medicamentoSel === key ? '#ef4444' : '#1f2937'}`,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div>
                        <div style={{ color: '#fff', fontWeight: 'bold' }}>
                          {m.icono} {m.nombre}
                        </div>
                        <div style={{ color: '#9ca3af', fontSize: '12px' }}>
                          {m.alerta}
                        </div>
                      </div>
                      {medicamentoSel === key && (
                        <CheckCircleOutlined style={{ color: '#ef4444', fontSize: '18px' }} />
                      )}
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: '20px' }}>
                  <Text style={{ color: '#9ca3af', display: 'block', marginBottom: '6px' }}>
                    Fecha de Aplicación de la Dosis:
                  </Text>
                  <input
                    type="date"
                    value={fechaAplicacion}
                    onChange={e => setFechaAplicacion(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: '#111827',
                      color: '#fff',
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }}
                  />
                </div>
              </Card>
            </Col>

            <Col xs={24} md={12}>
              <Card style={{ 
                background: 'linear-gradient(135deg, #450a0a 0%, #1f2937 100%)', 
                borderColor: '#ef4444', 
                borderRadius: '12px',
                padding: '16px'
              }}>
                <Title level={4} style={{ color: '#fca5a5', marginTop: 0 }}>
                  📅 Fechas de Liberación Sanitaria
                </Title>

                <div style={{ 
                  background: 'rgba(0,0,0,0.4)', 
                  padding: '16px', 
                  borderRadius: '10px', 
                  marginBottom: '16px',
                  borderLeft: '4px solid #38bdf8'
                }}>
                  <div style={{ fontSize: '12px', color: '#93c5fd', textTransform: 'uppercase' }}>
                    🥛 En Leche de Ordeño:
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fff', margin: '4px 0' }}>
                    {fechaLiberacionLeche}
                  </div>
                  <Text style={{ color: '#cbd5e1', fontSize: '12px' }}>
                    {medInfo.diasLeche === 999 
                      ? "❌ Esta medicina se queda en la grasa de la ubre. No use la leche para consumo ni venta."
                      : `Botar la leche durante ${medInfo.diasLeche} días completos después de la última inyección.`}
                  </Text>
                </div>

                <div style={{ 
                  background: 'rgba(0,0,0,0.4)', 
                  padding: '16px', 
                  borderRadius: '10px',
                  borderLeft: '4px solid #f87171'
                }}>
                  <div style={{ fontSize: '12px', color: '#fca5a5', textTransform: 'uppercase' }}>
                    🥩 En Carne (Beneficio / Matadero):
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fff', margin: '4px 0' }}>
                    {fechaLiberacionCarne}
                  </div>
                  <Text style={{ color: '#cbd5e1', fontSize: '12px' }}>
                    {medInfo.diasCarne === 0
                      ? "Apto de inmediato."
                      : `No despachar el animal al matadero antes de ${medInfo.diasCarne} días.`}
                  </Text>
                </div>

                <Button
                  block
                  size="large"
                  icon={<ShareAltOutlined />}
                  onClick={compartirWhatsApp}
                  style={{
                    marginTop: '20px',
                    background: '#25D366',
                    borderColor: '#25D366',
                    color: '#fff',
                    fontWeight: 'bold',
                    height: '48px',
                    borderRadius: '8px'
                  }}
                >
                  📲 Compartir Dictamen por WhatsApp
                </Button>
              </Card>
            </Col>
          </Row>
        </Card>
      )}

      {/* PIE DE PÁGINA CON BOTÓN DE WHATSAPP */}
      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <Button
          size="large"
          icon={<ShareAltOutlined />}
          onClick={compartirWhatsApp}
          style={{
            background: '#25D366',
            borderColor: '#25D366',
            color: '#fff',
            fontWeight: 'bold',
            borderRadius: '24px',
            padding: '0 32px',
            height: '48px',
            boxShadow: '0 4px 14px rgba(37, 211, 102, 0.4)'
          }}
        >
          📲 Enviar Dictamen Ganadero al Mayordomo por WhatsApp
        </Button>
      </div>
    </div>
  );
}
