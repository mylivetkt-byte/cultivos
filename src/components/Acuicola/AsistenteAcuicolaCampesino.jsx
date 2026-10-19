import React, { useState, useMemo } from 'react';
import { Card, Button, InputNumber, Slider, Radio, Tag, Alert, Row, Col, Typography, Space } from 'antd';
import { 
  SoundOutlined, ShareAltOutlined, CheckCircleOutlined, 
  WarningOutlined, AlertOutlined, InfoCircleOutlined, DashboardOutlined 
} from '@ant-design/icons';
import { hablarEnVozCampesina, pararVozCampesina } from '../../utils/glosarioCampesino';
import AyudaCampesina from '../Common/AyudaCampesina';

const { Title, Text, Paragraph } = Typography;

export default function AsistenteAcuicolaCampesino({ onClose, fincaId }) {
  const [pasoActivo, setPasoActivo] = useState(1);

  // --- PASO 1: CALIDAD DE AGUA Y DISCO SECCHI ---
  const [profundidadSecchiCm, setProfundidadSecchiCm] = useState(30);
  const [colorAgua, setColorAgua] = useState('verde_esmeralda');

  // Diagnóstico de turbidez
  const diagTurbidez = useMemo(() => {
    if (profundidadSecchiCm < 20) {
      return {
        estado: 'Agua muy espesa / Verde oscura',
        color: '#ef4444',
        alerta: '🔴 Peligro Crítico de Falta de Oxígeno en la Noche',
        desc: 'Hay demasiada microalga o barro. Durante el día dan oxígeno pero en la noche consumen todo y asfixian a los peces.',
        accion: 'Suspenda el alimento hoy. Abra la llave de entrada para recambiar al menos el 30% del agua del estanque.'
      };
    }
    if (profundidadSecchiCm <= 35) {
      return {
        estado: 'Rango Ideal Campesino (Verde Esmeralda)',
        color: '#10b981',
        alerta: '🟢 Calidad de Agua en su Punto Perfecto',
        desc: 'El disco desaparece entre 25 y 35 cm. Hay buen fitoplancton que oxigena de día y produce alimento natural rico en proteína.',
        accion: 'Mantenga la rutina normal de alimentación y revise a las 6 de la mañana que no haya peces boqueando.'
      };
    }
    return {
      estado: 'Agua muy transparente / Cristalina',
      color: '#f59e0b',
      alerta: '🟡 Falta Alimento Natural o Exceso de Filtración',
      desc: 'El disco se ve a más de 40 cm. El agua está muy clara; los peces gastan más energía escondiéndose y falta fitoplancton.',
      accion: 'En estanques de tierra se puede abonar con abono orgánico bien compostado (bocashi) o gallinaza desinfectada para fertilizar el agua.'
    };
  }, [profundidadSecchiCm]);

  // --- PASO 2: ACLIMATACIÓN Y SIEMBRA DE ALEVINOS ---
  const [tipoEstanqueSiembra, setTipoEstanqueSiembra] = useState('tierra_flujo'); // tierra_estancada, tierra_flujo, geomembrana_aireador
  const [especieSiembra, setEspecieSiembra] = useState('tilapia_roja');

  // --- PASO 3: CALCULADORA DE RACIÓN Y ALIMENTACIÓN (% PESO VIVO) ---
  const [pecesVivos, setPecesVivos] = useState(3000);
  const [pesoPromedioGramos, setPesoPromedioGramos] = useState(120); // g
  const [etapaManual, setEtapaManual] = useState('auto'); // auto, alevinaje, levante, engorde, acabado

  // Determinar etapa y tasa según peso en gramos
  const infoEtapa = useMemo(() => {
    if (pesoPromedioGramos <= 20) {
      return {
        etapa: 'Alevinaje',
        proteina: '45% Proteína',
        tasaSugerida: 8.5, // 8 a 10%
        racionesDia: 4,
        tamanoPellet: '0.8 a 1.2 mm (Harina / Micro)'
      };
    }
    if (pesoPromedioGramos <= 150) {
      return {
        etapa: 'Levante',
        proteina: '34% - 38% Proteína',
        tasaSugerida: 4.5, // 4 a 5%
        racionesDia: 3,
        tamanoPellet: '2.5 a 3.0 mm'
      };
    }
    if (pesoPromedioGramos <= 400) {
      return {
        etapa: 'Engorde',
        proteina: '28% - 32% Proteína',
        tasaSugerida: 2.8, // 2.5 a 3.0%
        racionesDia: 2,
        tamanoPellet: '4.0 a 5.0 mm'
      };
    }
    return {
      etapa: 'Acabado / Cosecha',
      proteina: '24% - 28% Proteína',
      tasaSugerida: 2.0, // 1.8 a 2.2%
      racionesDia: 2,
      tamanoPellet: '6.0 mm'
    };
  }, [pesoPromedioGramos]);

  // Cálculos de biomasa y ración diaria
  const biomasaTotalKg = useMemo(() => {
    return Math.round((pecesVivos * pesoPromedioGramos) / 1000);
  }, [pecesVivos, pesoPromedioGramos]);

  const racionDiariaKg = useMemo(() => {
    const k = (biomasaTotalKg * infoEtapa.tasaSugerida) / 100;
    return Number(k.toFixed(1));
  }, [biomasaTotalKg, infoEtapa.tasaSugerida]);

  const racionPorTandaKg = useMemo(() => {
    if (infoEtapa.racionesDia <= 0) return 0;
    return Number((racionDiariaKg / infoEtapa.racionesDia).toFixed(1));
  }, [racionDiariaKg, infoEtapa.racionesDia]);

  // --- PASO 4: DIMENSIONES Y CAPACIDAD DEL ESTANQUE ---
  const [formaEstanque, setFormaEstanque] = useState('rectangular');
  const [largoM, setLargoM] = useState(20);
  const [anchoM, setAnchoM] = useState(10);
  const [profundidadM, setProfundidadM] = useState(1.2);
  const [diametroM, setDiametroM] = useState(8);

  const areaEspejoM2 = useMemo(() => {
    if (formaEstanque === 'rectangular') return Math.round(largoM * anchoM);
    // circular
    const r = diametroM / 2;
    return Math.round(Math.PI * r * r);
  }, [formaEstanque, largoM, anchoM, diametroM]);

  const volumenM3 = useMemo(() => {
    return Math.round(areaEspejoM2 * profundidadM);
  }, [areaEspejoM2, profundidadM]);

  // Capacidad de peces según tipo
  const capacidadRecomendada = useMemo(() => {
    if (tipoEstanqueSiembra === 'tierra_estancada') {
      // 2 a 4 peces / m2
      const min = areaEspejoM2 * 2;
      const max = areaEspejoM2 * 4;
      return { min, max, sugerido: Math.round((min + max) / 2), densidadStr: '2 a 4 peces por m²' };
    }
    if (tipoEstanqueSiembra === 'tierra_flujo') {
      // 6 a 10 peces / m2
      const min = areaEspejoM2 * 6;
      const max = areaEspejoM2 * 10;
      return { min, max, sugerido: Math.round((min + max) / 2), densidadStr: '6 a 10 peces por m²' };
    }
    // geomembrana con aireacion: 20 a 35 peces / m3
    const min = volumenM3 * 20;
    const max = volumenM3 * 35;
    return { min, max, sugerido: Math.round((min + max) / 2), densidadStr: '20 a 35 peces por m³ (con aireador)' };
  }, [tipoEstanqueSiembra, areaEspejoM2, volumenM3]);

  // Compartir por WhatsApp
  const compartirWhatsApp = () => {
    const texto = encodeURIComponent(
      `*🐟 REPORTE DE ASISTENCIA PISCÍCOLA CAMPESINA*\n\n` +
      `*1. Calidad de Agua:*\n` +
      `- Disco Secchi: ${profundidadSecchiCm} cm (${diagTurbidez.estado})\n` +
      `- Diagnóstico: ${diagTurbidez.alerta}\n\n` +
      `*2. Calculadora de Alimentación:* \n` +
      `- Población: ${pecesVivos.toLocaleString()} peces (${infoEtapa.etapa})\n` +
      `- Peso promedio: ${pesoPromedioGramos} gramos\n` +
      `- Biomasa total: *${biomasaTotalKg} Kg de pez vivo*\n` +
      `- Concentrado diario recomendado: *${racionDiariaKg} Kg/día* (${infoEtapa.proteina})\n` +
      `- Ración por tanda: ${racionPorTandaKg} Kg (${infoEtapa.racionesDia} veces al día)\n\n` +
      `*3. Capacidad del Estanque:*\n` +
      `- Espejo de agua: ${areaEspejoM2} m² (${volumenM3} m³)\n` +
      `- Alevinos sugeridos a sembrar: *${capacidadRecomendada.sugerido.toLocaleString()} peces*\n\n` +
      `_Generado por AgroPaccioli Escuela de Campo Acuícola_`
    );
    window.open(`https://wa.me/?text=${texto}`, '_blank');
  };

  return (
    <div style={{ maxWidth: '980px', margin: '0 auto', padding: '16px' }}>
      {/* CABECERA */}
      <Card style={{ 
        background: 'linear-gradient(135deg, #0c4a6e 0%, #082f49 100%)', 
        borderRadius: '16px', 
        border: '1px solid #0284c7', 
        color: '#fff', 
        marginBottom: '20px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
      }}>
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col xs={24} md={16}>
            <Space orientation="vertical" size={2}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '32px' }}>🐟</span>
                <Title level={2} style={{ color: '#fff', margin: 0 }}>
                  Escuela de Campo Piscícola
                </Title>
              </div>
              <Paragraph style={{ color: '#7dd3fc', margin: '4px 0 0 0', fontSize: '15px' }}>
                Asistente Campesino para medición de agua (Disco Secchi), aclimatación de alevinos, biomasa y ración diaria.
              </Paragraph>
            </Space>
          </Col>
          <Col xs={24} md={8} style={{ textAlign: 'right' }}>
            <Space wrap>
              <Button 
                type="primary" 
                icon={<SoundOutlined />} 
                style={{ background: '#0284c7', borderColor: '#38bdf8', fontWeight: 'bold' }}
                onClick={() => hablarEnVozCampesina(
                  "Bienvenido a la Escuela de Campo Piscícola. Aprenda a medir la calidad del agua de sus estanques con una tapa blanca o disco Secchi casero, a aclimatar alevinos para que no se le mueran por choque de temperatura, y a calcular cuántos kilos de concentrado darles cada día según su peso."
                )}
              >
                🔊 Escuchar Explicación
              </Button>
              {onClose && (
                <Button onClick={onClose} style={{ background: 'transparent', color: '#fff', borderColor: '#38bdf8' }}>
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
          { num: 1, tit: '1. Calidad de Agua & Secchi', ico: '🥏' },
          { num: 2, tit: '2. Aclimatación y Siembra', ico: '🐟' },
          { num: 3, tit: '3. Calculadora de Ración', ico: '🥣' },
          { num: 4, tit: '4. Capacidad del Estanque', ico: '🏞️' }
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
                background: pasoActivo === p.num ? '#0284c7' : '#1f2937',
                borderColor: pasoActivo === p.num ? '#38bdf8' : '#374151',
                color: '#fff'
              }}
            >
              {p.ico} {p.tit}
            </Button>
          </Col>
        ))}
      </Row>

      {/* ========================================================================= */}
      {/* PASO 1: CALIDAD DE AGUA Y DISCO SECCHI */}
      {/* ========================================================================= */}
      {pasoActivo === 1 && (
        <Card style={{ background: '#111827', borderColor: '#1f2937', borderRadius: '16px', color: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <Title level={3} style={{ color: '#38bdf8', margin: 0 }}>
              🥏 Monitoreo de Agua con Disco Secchi Casero y Coloración
            </Title>
            <AyudaCampesina campoKey="disco_secchi" />
          </div>

          <Alert
            message="¿Cómo fabricar un Disco Secchi casero en la finca?"
            description="Tome una tapa plástica blanca de balde de pintura o caneca de 20 cm de diámetro. Píntela dividida en 4 cuartos (dos blancos y dos negros). Átala por el centro a un palo de escoba o cabuya con nudos marcados cada 5 centímetros con marcador permanente. Sumérjala despacio en el agua hasta que deje de ver el contraste."
            type="info"
            showIcon
            style={{ marginBottom: '20px', background: '#082f49', borderColor: '#0284c7', color: '#e0f2fe' }}
          />

          <Row gutter={[20, 20]}>
            <Col xs={24} md={12}>
              <Card style={{ background: '#1f2937', borderColor: '#374151', borderRadius: '12px' }}>
                <Title level={5} style={{ color: '#fff', marginBottom: '16px' }}>
                  📏 ¿A cuántos centímetros deja de verse el disco?
                </Title>

                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9ca3af', fontSize: '14px' }}>
                    <span>Profundidad de Lectura:</span>
                    <strong style={{ color: diagTurbidez.color, fontSize: '18px' }}>
                      {profundidadSecchiCm} cm
                    </strong>
                  </div>
                  <Slider
                    min={10}
                    max={60}
                    value={profundidadSecchiCm}
                    onChange={v => setProfundidadSecchiCm(v)}
                    marks={{
                      15: { style: { color: '#ef4444' }, label: '<20cm (Muy Espesa)' },
                      30: { style: { color: '#10b981', fontWeight: 'bold' }, label: '25-35cm (Ideal)' },
                      50: { style: { color: '#f59e0b' }, label: '>40cm (Transparente)' }
                    }}
                  />
                </div>

                <Title level={5} style={{ color: '#fff', marginTop: '30px', marginBottom: '12px' }}>
                  🎨 Color del Agua en el Estanque:
                </Title>

                <Radio.Group 
                  value={colorAgua} 
                  onChange={e => setColorAgua(e.target.value)}
                  style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
                >
                  <Radio value="verde_esmeralda" style={{ color: '#a7f3d0' }}>
                    🟢 <b>Verde Esmeralda / Oliva Claro:</b> Excelente fitoplancton vivo.
                  </Radio>
                  <Radio value="marron" style={{ color: '#fed7aa' }}>
                    🟤 <b>Marrón / Chocolate:</b> Barro o arcilla tras aguacero.
                  </Radio>
                  <Radio value="verde_azulada" style={{ color: '#fca5a5' }}>
                    🔴 <b>Verde Azulada Oscura con Nata:</b> Cianobacterias tóxicas.
                  </Radio>
                  <Radio value="lechoso" style={{ color: '#e2e8f0' }}>
                    ⚪ <b>Lechoso / Grisáceo:</b> Descomposición y falta de oxígeno.
                  </Radio>
                </Radio.Group>
              </Card>
            </Col>

            <Col xs={24} md={12}>
              <Card style={{ 
                background: '#1f2937', 
                borderColor: diagTurbidez.color, 
                borderRadius: '12px',
                borderLeft: `6px solid ${diagTurbidez.color}` 
              }}>
                <Title level={4} style={{ color: diagTurbidez.color, marginTop: 0 }}>
                  {diagTurbidez.alerta}
                </Title>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#fff', marginBottom: '10px' }}>
                  Estado: {diagTurbidez.estado}
                </div>
                <Paragraph style={{ color: '#cbd5e1', fontSize: '14px' }}>
                  {diagTurbidez.desc}
                </Paragraph>

                <div style={{ background: '#111827', padding: '14px', borderRadius: '8px', borderLeft: '4px solid #38bdf8', marginTop: '16px' }}>
                  <Text style={{ color: '#7dd3fc', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                    🛠️ ¿Qué debe hacer el piscicultor hoy?
                  </Text>
                  <Text style={{ color: '#fff', fontSize: '13px' }}>
                    {diagTurbidez.accion}
                  </Text>
                </div>

                {/* ALERTA DE BOQUEO AL AMANECER */}
                <div style={{ marginTop: '16px', background: '#450a0a', padding: '14px', borderRadius: '8px', border: '1px solid #ef4444' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fca5a5', fontWeight: 'bold' }}>
                    <AlertOutlined style={{ fontSize: '18px' }} />
                    <span>¡Ojo con el "Boqueo" a las 5:30 AM!</span>
                  </div>
                  <Text style={{ color: '#fee2e2', fontSize: '12px', display: 'block', marginTop: '4px' }}>
                    El oxígeno cae a su punto más bajo justo antes de salir el sol. Si ve peces en la orilla tragando aire en la superficie, prenda aireador o meta chorro de manguera a presión rompiendo contra piedras de inmediato para no perder la cosecha.
                  </Text>
                </div>
              </Card>
            </Col>
          </Row>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* PASO 2: ACLIMATACIÓN Y SIEMBRA DE ALEVINOS */}
      {/* ========================================================================= */}
      {pasoActivo === 2 && (
        <Card style={{ background: '#111827', borderColor: '#1f2937', borderRadius: '16px', color: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <Title level={3} style={{ color: '#10b981', margin: 0 }}>
              🐟 Protocolo de Siembra y Aclimatación (Cero Mortalidad)
            </Title>
            <AyudaCampesina campoKey="aclimatacion_alevinos" />
          </div>

          <Alert
            message="¿Por qué se mueren los alevinos en la primera semana?"
            description="El 90% de las muertes al sembrar ocurren por choque térmico (el agua de la bolsa viene fría y el lago está caliente) o choque de pH. Si los suelta de golpe, mueren de paro cardíaco o quedan ciegos y pasmados."
            type="warning"
            showIcon
            style={{ marginBottom: '20px', background: '#451a03', borderColor: '#d97706', color: '#fef3c7' }}
          />

          <Row gutter={[16, 16]}>
            {[
              {
                paso: '1. Flotación Térmica',
                tiempo: '20 a 30 Minutos',
                ico: '⏳',
                desc: 'Ponga a flotar las bolsas selladas sin abrirlas en la orilla donde haya sombra. El calor del lago se transmitirá a la bolsa hasta que ambas aguas tengan exactamente la misma temperatura.'
              },
              {
                paso: '2. Mezcla de Aguas (pH)',
                tiempo: '10 a 15 Minutos',
                ico: '🥣',
                desc: 'Abra la bolsa. Agregue poco a poco 3 a 4 vasos de agua del estanque dentro de la bolsa cada 5 minutos. Esto permite que las branquias y la piel del alevino se adapten a la dureza y el pH.'
              },
              {
                paso: '3. Liberación Suave',
                tiempo: 'Salida Voluntaria',
                ico: '🌊',
                desc: 'Hunda lentamente la boca de la bolsa bajo el agua e inclínela. Deje que los peces salgan nadando por sus propios medios. ¡Nunca los tire desde el barranco ni sacuda la bolsa!'
              }
            ].map((p, idx) => (
              <Col xs={24} md={8} key={idx}>
                <Card style={{ background: '#1f2937', borderColor: '#059669', borderRadius: '12px', height: '100%' }}>
                  <div style={{ fontSize: '28px', marginBottom: '6px' }}>{p.ico}</div>
                  <Title level={5} style={{ color: '#34d399', margin: '0 0 4px 0' }}>{p.paso}</Title>
                  <Tag color="cyan" style={{ marginBottom: '10px' }}>Duración: {p.tiempo}</Tag>
                  <Paragraph style={{ color: '#cbd5e1', fontSize: '13px' }}>{p.desc}</Paragraph>
                </Card>
              </Col>
            ))}
          </Row>

          <div style={{ marginTop: '20px', background: '#064e3b', padding: '16px', borderRadius: '12px', border: '1px solid #10b981' }}>
            <Title level={5} style={{ color: '#a7f3d0', margin: '0 0 8px 0' }}>
              💡 Regla Campesina para el Primer Día:
            </Title>
            <Text style={{ color: '#fff', fontSize: '14px' }}>
              <b>¡No les eche comida el primer día de siembra!</b> Los alevinos llegan estresados del viaje en moto o camioneta. Si les echa concentrado no van a comer y el alimento se pudre. Empiece a darles ración ligera al segundo día por la mañana.
            </Text>
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* PASO 3: CALCULADORA DE RACIÓN Y ALIMENTACIÓN (% PESO VIVO) */}
      {/* ========================================================================= */}
      {pasoActivo === 3 && (
        <Card style={{ background: '#111827', borderColor: '#1f2937', borderRadius: '16px', color: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <Title level={3} style={{ color: '#f59e0b', margin: 0 }}>
              🥣 Calculadora Diaria de Alimento y Biomasa del Lago
            </Title>
            <AyudaCampesina campoKey="tasa_alimentacion" />
          </div>

          <Row gutter={[20, 20]}>
            <Col xs={24} md={12}>
              <Card style={{ background: '#1f2937', borderColor: '#374151', borderRadius: '12px' }}>
                <Title level={5} style={{ color: '#fff', marginBottom: '16px' }}>
                  🐟 Datos del Lago o Estanque
                </Title>

                <div style={{ marginBottom: '16px' }}>
                  <Text style={{ color: '#9ca3af', display: 'block', marginBottom: '6px' }}>
                    Número de Peces Vivos Estimados:
                  </Text>
                  <InputNumber
                    min={100}
                    max={100000}
                    step={500}
                    value={pecesVivos}
                    onChange={v => setPecesVivos(v || 1000)}
                    size="large"
                    style={{ width: '100%' }}
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9ca3af' }}>
                    <span>Peso Promedio por Pez:</span>
                    <strong style={{ color: '#f59e0b', fontSize: '16px' }}>{pesoPromedioGramos} gramos</strong>
                  </div>
                  <Slider
                    min={5}
                    max={600}
                    value={pesoPromedioGramos}
                    onChange={v => setPesoPromedioGramos(v)}
                  />
                  <Text style={{ color: '#9ca3af', fontSize: '12px' }}>
                    Etapa detectada: <Tag color="blue">{infoEtapa.etapa}</Tag> ({infoEtapa.proteina})
                  </Text>
                </div>

                <div style={{ background: '#111827', padding: '14px', borderRadius: '8px', borderLeft: '4px solid #f59e0b' }}>
                  <Text style={{ color: '#fcd34d', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                    ⏱️ La Regla de Oro Campesina de los 15 Minutos:
                  </Text>
                  <Text style={{ color: '#e2e8f0', fontSize: '13px' }}>
                    Tire la comida en el mismo sitio y silbe o golpee la tabla del muelle para que los peces reconozcan el llamado. Si a los 15 minutos todavía flota concentrado en el agua, <b>reduzca la ración inmediatamente</b>; el concentrado que no se comen es dinero botado que se pudre y envenena el lago.
                  </Text>
                </div>
              </Card>
            </Col>

            <Col xs={24} md={12}>
              <Card style={{ 
                background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', 
                borderColor: '#f59e0b', 
                borderRadius: '12px',
                textAlign: 'center',
                padding: '16px'
              }}>
                <Text style={{ color: '#cbd5e1', textTransform: 'uppercase', fontSize: '12px' }}>
                  Biomasa Total en el Estanque
                </Text>
                <div style={{ fontSize: '38px', fontWeight: '900', color: '#38bdf8', margin: '4px 0' }}>
                  {biomasaTotalKg.toLocaleString()} <span style={{ fontSize: '18px', color: '#fff' }}>Kg de Pescado</span>
                </div>

                <div style={{ 
                  margin: '16px 0', 
                  padding: '16px', 
                  borderRadius: '10px', 
                  background: '#78350f', 
                  border: '1px solid #f59e0b' 
                }}>
                  <div style={{ fontSize: '13px', color: '#fef3c7', textTransform: 'uppercase' }}>
                    🍲 Ración Diaria Recomendada ({infoEtapa.tasaSugerida}% del Peso Vivo):
                  </div>
                  <div style={{ fontSize: '42px', fontWeight: '900', color: '#fff', margin: '4px 0' }}>
                    {racionDiariaKg} <span style={{ fontSize: '20px' }}>Kg/Día</span>
                  </div>
                  <Text style={{ color: '#fde68a', fontSize: '14px', fontWeight: 'bold' }}>
                    = {racionPorTandaKg} Kg por cada tanda ({infoEtapa.racionesDia} veces al día)
                  </Text>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', textAlign: 'left' }}>
                  <Text style={{ color: '#a7f3d0', fontSize: '12px', fontWeight: 'bold', display: 'block' }}>
                    📦 Recomendación de Concentrado:
                  </Text>
                  <Text style={{ color: '#fff', fontSize: '13px', display: 'block', marginTop: '2px' }}>
                    - Calidad: <b>{infoEtapa.proteina}</b>
                  </Text>
                  <Text style={{ color: '#fff', fontSize: '13px', display: 'block' }}>
                    - Tamaño del pellet (grano): <b>{infoEtapa.tamanoPellet}</b>
                  </Text>
                  <Text style={{ color: '#fff', fontSize: '13px', display: 'block' }}>
                    - Horarios recomendados: <b>8:00 AM, 12:00 M y 4:30 PM</b> (cuando el agua está tibia).
                  </Text>
                </div>
              </Card>
            </Col>
          </Row>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* PASO 4: CAPACIDAD Y SIEMBRA DEL ESTANQUE */}
      {/* ========================================================================= */}
      {pasoActivo === 4 && (
        <Card style={{ background: '#111827', borderColor: '#1f2937', borderRadius: '16px', color: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <Title level={3} style={{ color: '#a855f7', margin: 0 }}>
              🏞️ Calculadora de Capacidad y Densidad de Siembra
            </Title>
            <AyudaCampesina campoKey="densidad_estanque" />
          </div>

          <Row gutter={[20, 20]}>
            <Col xs={24} md={12}>
              <Card style={{ background: '#1f2937', borderColor: '#374151', borderRadius: '12px' }}>
                <Title level={5} style={{ color: '#fff', marginBottom: '16px' }}>
                  📐 1. Medidas del Estanque
                </Title>

                <div style={{ marginBottom: '16px' }}>
                  <Text style={{ color: '#9ca3af', display: 'block', marginBottom: '6px' }}>Forma del Estanque:</Text>
                  <Radio.Group value={formaEstanque} onChange={e => setFormaEstanque(e.target.value)}>
                    <Radio.Button value="rectangular" style={{ background: '#374151', color: '#fff' }}>Rectangular (Tierra)</Radio.Button>
                    <Radio.Button value="circular" style={{ background: '#374151', color: '#fff' }}>Circular (Geomembrana)</Radio.Button>
                  </Radio.Group>
                </div>

                {formaEstanque === 'rectangular' ? (
                  <Row gutter={10}>
                    <Col span={8}>
                      <Text style={{ color: '#9ca3af', fontSize: '12px' }}>Largo (m):</Text>
                      <InputNumber min={2} value={largoM} onChange={v => setLargoM(v || 10)} style={{ width: '100%', marginTop: '4px' }} />
                    </Col>
                    <Col span={8}>
                      <Text style={{ color: '#9ca3af', fontSize: '12px' }}>Ancho (m):</Text>
                      <InputNumber min={2} value={anchoM} onChange={v => setAnchoM(v || 5)} style={{ width: '100%', marginTop: '4px' }} />
                    </Col>
                    <Col span={8}>
                      <Text style={{ color: '#9ca3af', fontSize: '12px' }}>Profundidad (m):</Text>
                      <InputNumber min={0.5} step={0.1} value={profundidadM} onChange={v => setProfundidadM(v || 1)} style={{ width: '100%', marginTop: '4px' }} />
                    </Col>
                  </Row>
                ) : (
                  <Row gutter={10}>
                    <Col span={12}>
                      <Text style={{ color: '#9ca3af', fontSize: '12px' }}>Diámetro (m):</Text>
                      <InputNumber min={2} value={diametroM} onChange={v => setDiametroM(v || 6)} style={{ width: '100%', marginTop: '4px' }} />
                    </Col>
                    <Col span={12}>
                      <Text style={{ color: '#9ca3af', fontSize: '12px' }}>Altura Agua (m):</Text>
                      <InputNumber min={0.5} step={0.1} value={profundidadM} onChange={v => setProfundidadM(v || 1)} style={{ width: '100%', marginTop: '4px' }} />
                    </Col>
                  </Row>
                )}

                <Title level={5} style={{ color: '#fff', marginTop: '24px', marginBottom: '12px' }}>
                  🌊 2. Tipo de Entrada de Agua y Tecnología
                </Title>

                <Radio.Group 
                  value={tipoEstanqueSiembra} 
                  onChange={e => setTipoEstanqueSiembra(e.target.value)}
                  style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
                >
                  <Radio value="tierra_estancada" style={{ color: '#fed7aa' }}>
                    🏞️ <b>Tierra sin recambio continuo</b> (2 a 4 peces / m²)
                  </Radio>
                  <Radio value="tierra_flujo" style={{ color: '#a7f3d0' }}>
                    🌊 <b>Tierra con entrada constante de canal / quebrada</b> (6 a 10 peces / m²)
                  </Radio>
                  <Radio value="geomembrana_aireador" style={{ color: '#bfdbfe' }}>
                    ⚡ <b>Geomembrana con aireador eléctrico Splash o Blower</b> (20 a 35 peces / m³)
                  </Radio>
                </Radio.Group>
              </Card>
            </Col>

            <Col xs={24} md={12}>
              <Card style={{ 
                background: 'linear-gradient(135deg, #3b0764 0%, #1e1b4b 100%)', 
                borderColor: '#a855f7', 
                borderRadius: '12px',
                textAlign: 'center',
                padding: '20px 10px'
              }}>
                <Text style={{ color: '#d8b4fe', textTransform: 'uppercase', fontSize: '13px' }}>
                  Espejo de Agua y Volumen
                </Text>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#fff', margin: '4px 0' }}>
                  {areaEspejoM2} m² <span style={{ fontSize: '18px', color: '#c084fc' }}>({volumenM3} m³ de agua)</span>
                </div>

                <div style={{ 
                  margin: '20px 0', 
                  padding: '16px', 
                  borderRadius: '10px', 
                  background: 'rgba(0,0,0,0.4)', 
                  border: '1px solid #c084fc' 
                }}>
                  <div style={{ fontSize: '13px', color: '#e9d5ff', textTransform: 'uppercase' }}>
                    Cantidad Óptima de Alevinos a Sembrar:
                  </div>
                  <div style={{ fontSize: '48px', fontWeight: '900', color: '#a855f7', margin: '4px 0' }}>
                    {capacidadRecomendada.sugerido.toLocaleString()}
                  </div>
                  <Text style={{ color: '#d8b4fe', fontSize: '13px' }}>
                    Rango seguro: {capacidadRecomendada.min.toLocaleString()} a {capacidadRecomendada.max.toLocaleString()} alevines
                  </Text>
                </div>

                <div style={{ background: '#111827', padding: '12px', borderRadius: '8px', textAlign: 'left' }}>
                  <Text style={{ color: '#f0abfc', fontSize: '12px', fontWeight: 'bold', display: 'block' }}>
                    🚚 Compra de Semilla (+10% margen de transporte):
                  </Text>
                  <Text style={{ color: '#fff', fontSize: '14px', fontWeight: 'bold', display: 'block', marginTop: '2px' }}>
                    Pida al laboratorio: {Math.round(capacidadRecomendada.sugerido * 1.10).toLocaleString()} alevinos
                  </Text>
                  <Text style={{ color: '#9ca3af', fontSize: '12px' }}>
                    (El 10% adicional compensa la pérdida normal por transporte y adaptación).
                  </Text>
                </div>
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
          📲 Enviar Dictamen Piscícola al Mayordomo por WhatsApp
        </Button>
      </div>
    </div>
  );
}
