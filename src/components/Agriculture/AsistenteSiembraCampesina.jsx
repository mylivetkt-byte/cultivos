import React, { useState, useEffect, useMemo } from 'react';
import { authFetch } from '../../utils/api';
import { hablarEnVozCampesina, pararVozCampesina } from '../../utils/glosarioCampesino';
import { message } from 'antd';
import { 
  ArrowLeftOutlined, ArrowRightOutlined, SoundOutlined, CheckCircleOutlined,
  WhatsAppOutlined, SaveOutlined
} from '@ant-design/icons';
import './AsistenteSiembraCampesina.css';

// Catálogo agroecológico experto por pisos térmicos de Colombia / Latinoamérica
const CULTIVOS_EXPERTOS = [
  {
    id: 101,
    nombre: 'Café (Castillo / Colombia)',
    icono: '☕',
    altitud_min: 1200,
    altitud_max: 2000,
    piso_ideal: 'Templado - Frío',
    ciclo_dias: 240, // De floración a cosecha
    distancia_surco: 1.5,
    distancia_planta: 1.5,
    sistema: 'Tresbolillo',
    rendimiento_ton_ha: 2.2, // Café pergamino seco
    suelo_ideal: 'Tierra Negra (Franca), bien drenada, pH 5.0 a 6.0',
    descripcion: 'A mayor altura (1.500 - 1.900 msnm) el grano madura más lento, produciendo mayor acidez cítrica y mejor taza de exportación.'
  },
  {
    id: 102,
    nombre: 'Aguacate Hass',
    icono: '🥑',
    altitud_min: 1600,
    altitud_max: 2400,
    piso_ideal: 'Frío Moderado',
    ciclo_dias: 210,
    distancia_surco: 6.0,
    distancia_planta: 5.0,
    sistema: 'Tresbolillo',
    rendimiento_ton_ha: 14.0,
    suelo_ideal: 'Tierra franca profunda, CERO encharcamiento (muy sensible a Phytophthora), pH 5.5 a 6.5',
    descripcion: 'Exige suelos con excelente drenaje y pendiente moderada. En zonas bajas se enferma la raíz y la fruta pierde materia grasa.'
  },
  {
    id: 103,
    nombre: 'Plátano (Hartón / Dominico)',
    icono: '🍌',
    altitud_min: 0,
    altitud_max: 1800,
    piso_ideal: 'Cálido - Templado',
    ciclo_dias: 360,
    distancia_surco: 3.0,
    distancia_planta: 3.0,
    sistema: 'Tresbolillo',
    rendimiento_ton_ha: 15.0,
    suelo_ideal: 'Tierra negra profunda, rica en materia orgánica y potasio, pH 5.5 a 6.5',
    descripcion: 'Excelente como cultivo principal en clima cálido o como sombrío transitorio para café o cacao en clima templado.'
  },
  {
    id: 104,
    nombre: 'Cacao (Clones CCN51 / Fedecacao)',
    icono: '🍫',
    altitud_min: 0,
    altitud_max: 1200,
    piso_ideal: 'Cálido Húmedo',
    ciclo_dias: 180,
    distancia_surco: 3.0,
    distancia_planta: 3.0,
    sistema: 'Cuadro',
    rendimiento_ton_ha: 1.8,
    suelo_ideal: 'Tierra franca rica en mantillo vegetal, pH 6.0 a 7.0',
    descripcion: 'Requiere sombrío los primeros 3 años. No tolera alturas mayores a 1.200 msnm porque el frío pasma las mazorcas y aumenta la monilia.'
  },
  {
    id: 105,
    nombre: 'Palma de Aceite',
    icono: '🌴',
    altitud_min: 0,
    altitud_max: 600,
    piso_ideal: 'Cálido Tropical',
    ciclo_dias: 150,
    distancia_surco: 9.0,
    distancia_planta: 9.0,
    sistema: 'Tresbolillo',
    rendimiento_ton_ha: 22.0,
    suelo_ideal: 'Suelos aluviales profundos, planos, pH 4.5 a 6.5',
    descripcion: 'Exclusiva de tierras bajas y calientes (<500 msnm) con alta radiación solar y lluvias abundantes.'
  },
  {
    id: 106,
    nombre: 'Maíz Tecnificado',
    icono: '🌽',
    altitud_min: 0,
    altitud_max: 2200,
    piso_ideal: 'Cálido a Frío',
    ciclo_dias: 140,
    distancia_surco: 0.8,
    distancia_planta: 0.25,
    sistema: 'Cuadro',
    rendimiento_ton_ha: 6.5,
    suelo_ideal: 'Franco o franco-arcilloso bien aireado, pH 5.8 a 7.0',
    descripcion: 'En clima caliente se cosecha en 110-120 días; en clima frío puede tardar hasta 160-180 días.'
  },
  {
    id: 107,
    nombre: 'Cítricos (Limón Tahití / Naranja)',
    icono: '🍋',
    altitud_min: 0,
    altitud_max: 1400,
    piso_ideal: 'Cálido - Templado',
    ciclo_dias: 160,
    distancia_surco: 5.0,
    distancia_planta: 4.0,
    sistema: 'Tresbolillo',
    rendimiento_ton_ha: 20.0,
    suelo_ideal: 'Franco-arenoso a franco, profundo, sin capas freáticas altas, pH 5.5 a 6.5',
    descripcion: 'Excelente para exportación. Requiere buena poda y control de floración con estrés hídrico controlado.'
  },
  {
    id: 108,
    nombre: 'Papa (Diacol Capiro / Criolla)',
    icono: '🥔',
    altitud_min: 2000,
    altitud_max: 3200,
    piso_ideal: 'Frío de Páramo',
    ciclo_dias: 150,
    distancia_surco: 1.0,
    distancia_planta: 0.35,
    sistema: 'Cuadro',
    rendimiento_ton_ha: 28.0,
    suelo_ideal: 'Tierra negra de páramo (Andisol), suelta, mullida y rica en fósforo, pH 5.0 a 6.0',
    descripcion: 'Requiere temperaturas frescas de páramo (10-14°C). Por debajo de 1.800 msnm no tuberiza.'
  }
];

export default function AsistenteSiembraCampesina({ isOpen, onClose, onSiembraCreated, tenantId = 1 }) {
  // Pasos del Wizard: 1 a 6
  const [pasoActual, setPasoActual] = useState(1);
  const [loading, setLoading] = useState(false);

  // Catálogos
  const [fincas, setFincas] = useState([]);
  const [lotes, setLotes] = useState([]);

  // Estado Paso 1: Medida del Terreno
  const [selectedFincaId, setSelectedFincaId] = useState('');
  const [selectedLoteId, setSelectedLoteId] = useState('');
  const [unidadMedida, setUnidadMedida] = useState('cuadras'); // 'cuadras', 'fanegadas', 'pasos', 'm2', 'hectareas'
  const [valorMedida, setValorMedida] = useState(2.5);
  const [pasosLargo, setPasosLargo] = useState(120);
  const [pasosAncho, setPasosAncho] = useState(100);

  // Estado Paso 2: Altura y Clima
  const [altitudMsnm, setAltitudMsnm] = useState(1650);
  const [cultivoSeleccionado, setCultivoSeleccionado] = useState(CULTIVOS_EXPERTOS[0]);

  // Estado Paso 3: Tipo de Suelo y pH
  const [tipoSuelo, setTipoSuelo] = useState('franco'); // 'franco', 'arcilloso', 'arenoso'
  const [phSuelo, setPhSuelo] = useState(5.8);

  // Estado Paso 4: Inclinación y Pendiente
  const [tipoPendiente, setTipoPendiente] = useState('loma'); // 'plano', 'loma', 'quebrado'

  // Estado Paso 5: Semilla, Marco y Hoyado
  const [sistemaSiembra, setSistemaSiembra] = useState('Tresbolillo'); // 'Tresbolillo', 'Cuadro'
  const [distanciaSurco, setDistanciaSurco] = useState(1.5);
  const [distanciaPlanta, setDistanciaPlanta] = useState(1.5);
  const [porcentajeResiembra, setPorcentajeResiembra] = useState(5); // 5%

  // Estado Paso 6: Calendario Fenológico
  const [fechaSiembra, setFechaSiembra] = useState(new Date().toISOString().split('T')[0]);

  // Cargar fincas y lotes al abrir
  useEffect(() => {
    if (isOpen) {
      authFetch(`/api/table/fincas/data?tenantId=${tenantId}&pageSize=200`)
        .then(r => r.json())
        .then(d => {
          const arr = d.data || [];
          setFincas(arr);
          if (arr.length > 0) {
            setSelectedFincaId(String(arr[0].id_finca));
            if (arr[0].altitud_promedio) setAltitudMsnm(Number(arr[0].altitud_promedio));
          }
        })
        .catch(console.error);

      authFetch(`/api/table/lotes/data?tenantId=${tenantId}&pageSize=1000`)
        .then(r => r.json())
        .then(d => setLotes(d.data || []))
        .catch(console.error);
    }
  }, [isOpen, tenantId]);

  // Actualizar altura al cambiar finca
  const handleFincaSelect = (fincaId) => {
    setSelectedFincaId(fincaId);
    setSelectedLoteId('');
    const f = fincas.find(item => String(item.id_finca) === String(fincaId));
    if (f && f.altitud_promedio) {
      setAltitudMsnm(Number(f.altitud_promedio));
    }
  };

  // Cálculo de Hectáreas y Metros Cuadrados según la unidad
  const areaCalculada = useMemo(() => {
    let m2 = 0;
    if (unidadMedida === 'cuadras' || unidadMedida === 'fanegadas') {
      m2 = (Number(valorMedida) || 0) * 6400;
    } else if (unidadMedida === 'm2') {
      m2 = Number(valorMedida) || 0;
    } else if (unidadMedida === 'hectareas') {
      m2 = (Number(valorMedida) || 0) * 10000;
    } else if (unidadMedida === 'pasos') {
      // 1 paso campesino promedio = 0.85 metros
      const largoM = (Number(pasosLargo) || 0) * 0.85;
      const anchoM = (Number(pasosAncho) || 0) * 0.85;
      m2 = largoM * anchoM;
    }
    const ha = m2 / 10000;
    const cuadras = m2 / 6400;
    return {
      m2: Math.round(m2),
      ha: Number(ha.toFixed(2)),
      cuadras: Number(cuadras.toFixed(2))
    };
  }, [unidadMedida, valorMedida, pasosLargo, pasosAncho]);

  // Clasificación del Piso Térmico
  const pisoTermico = useMemo(() => {
    if (altitudMsnm < 1000) return { nombre: 'Piso Cálido (Tierra Caliente)', icono: '☀️', temp: '> 24 °C' };
    if (altitudMsnm < 1800) return { nombre: 'Piso Templado (Clima Medio)', icono: '⛅', temp: '18 - 24 °C' };
    if (altitudMsnm < 2800) return { nombre: 'Piso Frío (Tierra Fría)', icono: '❄️', temp: '12 - 18 °C' };
    return { nombre: 'Piso Páramo / Muy Frío', icono: '🏔️', temp: '< 12 °C' };
  }, [altitudMsnm]);

  // Semáforo Agroecológico de Cultivos según la Altura
  const clasificacionCultivos = useMemo(() => {
    const recomendados = [];
    const precaucion = [];
    const noAptos = [];

    CULTIVOS_EXPERTOS.forEach(c => {
      if (altitudMsnm >= c.altitud_min && altitudMsnm <= c.altitud_max) {
        recomendados.push(c);
      } else if (
        (altitudMsnm >= c.altitud_min - 200 && altitudMsnm < c.altitud_min) ||
        (altitudMsnm <= c.altitud_max + 200 && altitudMsnm > c.altitud_max)
      ) {
        precaucion.push(c);
      } else {
        noAptos.push(c);
      }
    });

    return { recomendados, precaucion, noAptos };
  }, [altitudMsnm]);

  // Cálculo de Plantas y Semillas
  const calculoPlantas = useMemo(() => {
    const s = Number(distanciaSurco) || 1;
    const p = Number(distanciaPlanta) || 1;
    const area = areaCalculada.m2;

    let densidadPorHa = 10000 / (s * p);
    if (sistemaSiembra === 'Tresbolillo') {
      densidadPorHa = densidadPorHa * 1.1547;
    }

    const plantasNetas = Math.round((area / 10000) * densidadPorHa);
    const margenResiembra = Math.round(plantasNetas * ((Number(porcentajeResiembra) || 5) / 100));
    const totalPlantas = plantasNetas + margenResiembra;

    return {
      densidadHa: Math.round(densidadPorHa),
      plantasNetas,
      margenResiembra,
      totalPlantas
    };
  }, [distanciaSurco, distanciaPlanta, areaCalculada.m2, sistemaSiembra, porcentajeResiembra]);

  // Calendario Fenológico Proyectado
  const cronogramaFenologico = useMemo(() => {
    const fInicio = new Date(fechaSiembra);
    const diasCiclo = cultivoSeleccionado.ciclo_dias || 240;

    const sumarDias = (dias) => {
      const d = new Date(fInicio.getTime());
      d.setDate(d.getDate() + dias);
      return d.toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    return [
      {
        etapa: 'Siembra y Enraizamiento',
        dias: 'Día 0 - 30',
        fecha: sumarDias(30),
        icono: '🌱',
        labor: 'Ahoyado con cal dolomita, siembra del colino/chapola y abono rico en Fósforo (DAP o compost).'
      },
      {
        etapa: 'Crecimiento y Desyerbe',
        dias: 'Día 30 - 90',
        fecha: sumarDias(90),
        icono: '🌿',
        labor: 'Primer plateo, control de malezas y abonada de desarrollo con Nitrógeno y Potasio.'
      },
      {
        etapa: 'Pre-Floración y Poda',
        dias: 'Día 90 - 180',
        fecha: sumarDias(180),
        icono: '🌸',
        labor: 'Deschuponado, poda de formación y refuerzo de micronutrientes (Boro y Zinc).'
      },
      {
        etapa: 'Llenado de Fruto / Grano',
        dias: `Día 180 - ${Math.round(diasCiclo * 0.85)}`,
        fecha: sumarDias(Math.round(diasCiclo * 0.85)),
        icono: '🍈',
        labor: 'Riego constante y refuerzo de Potasio para engorde y peso del fruto.'
      },
      {
        etapa: '¡Cosecha y Recolección!',
        dias: `Día ${diasCiclo}`,
        fecha: sumarDias(diasCiclo),
        icono: '🌾',
        labor: `Inicio de cosecha. Rendimiento estimado: ${(cultivoSeleccionado.rendimiento_ton_ha * areaCalculada.ha).toFixed(1)} Toneladas (${Math.round(cultivoSeleccionado.rendimiento_ton_ha * areaCalculada.ha * 1000).toLocaleString()} Kilos).`
      }
    ];
  }, [fechaSiembra, cultivoSeleccionado, areaCalculada.ha]);

  // Asistente por Voz de cada Paso
  const leerExplicacionPaso = () => {
    pararVozCampesina();
    let texto = '';
    if (pasoActual === 1) {
      texto = `Paso uno: Medida del lote. Su terreno mide ${areaCalculada.ha} hectáreas, que son exactamente ${areaCalculada.cuadras} cuadras o ${areaCalculada.m2.toLocaleString()} metros cuadrados.`;
    } else if (pasoActual === 2) {
      texto = `Paso dos: Altura sobre el nivel del mar. Su lote está a ${altitudMsnm} metros, en piso ${pisoTermico.nombre}. Para esta altura le recomendamos sembrar ${cultivoSeleccionado.nombre}.`;
    } else if (pasoActual === 3) {
      texto = `Paso tres: Suelo y prueba de la bola. Si su tierra es ${tipoSuelo}, recuerde apretar un puñado húmedo en la mano. Con un pH de ${phSuelo}, aplique cal dolomita en el hoyo para corregir la acidez.`;
    } else if (pasoActual === 4) {
      texto = `Paso cuatro: Inclinación. En terreno ${tipoPendiente === 'quebrado' ? 'quebrado o pendiente fuerte' : tipoPendiente}, es obligatorio trazar curvas de nivel con el nivel en A para que la lluvia no le lave la tierra fértil.`;
    } else if (pasoActual === 5) {
      texto = `Paso cinco: Semilla y hoyado. Sembrando al ${sistemaSiembra} a ${distanciaSurco} por ${distanciaPlanta} metros, usted necesita ${calculoPlantas.plantasNetas} plantas, más ${calculoPlantas.margenResiembra} de resiembra. En total pida ${calculoPlantas.totalPlantas} colinos.`;
    } else if (pasoActual === 6) {
      texto = `Paso seis: Calendario de cosecha. Sembrando el ${fechaSiembra}, su cosecha comenzará en la fecha estimada, esperando recolectar cerca de ${(cultivoSeleccionado.rendimiento_ton_ha * areaCalculada.ha).toFixed(1)} toneladas.`;
    }
    hablarEnVozCampesina(texto);
  };

  // Guardar en la Base de Datos
  const handleGuardarSiembra = async () => {
    if (!selectedLoteId) {
      message.warning('Por favor seleccione el lote en el Paso 1');
      setPasoActual(1);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        id_tenant: tenantId,
        id_lote: Number(selectedLoteId),
        id_cultivo: cultivoSeleccionado.id || 6,
        fecha_siembra: fechaSiembra,
        hectareas_sembradas: areaCalculada.ha,
        densidad_siembra: calculoPlantas.densidadHa,
        cantidad_plantas: calculoPlantas.totalPlantas,
        sistema_riego_establecido: 'Gravedad / Secano',
        origen_plantulas: 'Vivero Certificado',
        observaciones: `Planificado con Asistente Campesino. Altura: ${altitudMsnm} msnm. Suelo: ${tipoSuelo} (pH ${phSuelo}). Pendiente: ${tipoPendiente}. Marco: ${sistemaSiembra} (${distanciaSurco}x${distanciaPlanta}m).`,
        estado: 'Activo'
      };

      const res = await authFetch('/api/table/siembras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        message.success('¡Siembra planificada y registrada exitosamente en AgroPaccioli!');
        hablarEnVozCampesina('Felicitaciones patrón. Su siembra ha quedado guardada en el sistema con su calendario completo hacia la cosecha.');
        if (onSiembraCreated) onSiembraCreated();
        onClose();
      } else {
        const err = await res.json();
        message.error('Error al guardar: ' + (err.error || 'Verifique los datos'));
      }
    } catch (e) {
      console.error(e);
      message.error('Error de red al guardar la siembra');
    } finally {
      setLoading(false);
    }
  };

  const handleCompartirWhatsApp = () => {
    let msg = `🌾 *PLAN DE SIEMBRA CAMPESINA - AGROPACCIOLI*\n\n`;
    msg += `📍 *Lote:* ${lotes.find(l => String(l.id_lote) === String(selectedLoteId))?.nombre || 'Mi Lote'}\n`;
    msg += `📐 *Área:* ${areaCalculada.ha} Ha (${areaCalculada.cuadras} Cuadras / ${areaCalculada.m2.toLocaleString()} m²)\n`;
    msg += `🏔️ *Altura:* ${altitudMsnm} m.s.n.m. (${pisoTermico.nombre})\n`;
    msg += `🌱 *Cultivo Elegido:* ${cultivoSeleccionado.nombre}\n`;
    msg += `🌰 *Densidad:* ${calculoPlantas.densidadHa} plantas/Ha (Marco: ${sistemaSiembra} ${distanciaSurco}m x ${distanciaPlanta}m)\n`;
    msg += `📦 *Total Semillas a Comprar:* ${calculoPlantas.totalPlantas.toLocaleString()} plántulas\n`;
    msg += `📅 *Fecha de Siembra:* ${fechaSiembra}\n`;
    msg += `🌾 *Cosecha Estimada:* ${(cultivoSeleccionado.rendimiento_ton_ha * areaCalculada.ha).toFixed(1)} Toneladas\n\n`;
    msg += `_Planificado con la Escuela de Campo AgroPaccioli_`;

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="asistente-siembra-overlay">
      <div className="asistente-siembra-modal">
        
        {/* Cabecera Principal */}
        <div className="asistente-header">
          <div>
            <div className="asistente-badge">🌾 ESCUELA DE CAMPO AGROPACCIOLI</div>
            <h2>Asistente Pedagógico: Cómo Iniciar un Lote y Sembrar</h2>
            <p>Guía paso a paso según altura sobre el mar (m.s.n.m.), tipo de suelo, inclinación y calendario fenológico.</p>
          </div>
          <div className="asistente-header-actions">
            <button className="btn-audio-explicacion" onClick={leerExplicacionPaso} title="Escuchar explicación en voz alta">
              <SoundOutlined /> <span>Escuchar Paso {pasoActual}</span>
            </button>
            <button className="btn-cerrar" onClick={onClose}>&times;</button>
          </div>
        </div>

        {/* Barra de Progreso en 6 Pasos */}
        <div className="stepper-bar">
          {[
            { num: 1, label: 'Medida', icon: '📐' },
            { num: 2, label: 'Altura msnm', icon: '🏔️' },
            { num: 3, label: 'Suelo y pH', icon: '🪱' },
            { num: 4, label: 'Inclinación', icon: '⛰️' },
            { num: 5, label: 'Semilla y Hoyado', icon: '🌰' },
            { num: 6, label: 'Calendario Cosecha', icon: '📅' }
          ].map(p => (
            <div 
              key={p.num} 
              className={`step-item ${pasoActual === p.num ? 'active' : ''} ${pasoActual > p.num ? 'completed' : ''}`}
              onClick={() => setPasoActual(p.num)}
            >
              <div className="step-circle">{pasoActual > p.num ? <CheckCircleOutlined /> : p.icon}</div>
              <span className="step-label">{p.label}</span>
            </div>
          ))}
        </div>

        {/* Contenido del Paso Activo */}
        <div className="asistente-body">

          {/* ==================== PASO 1: MEDIDA DEL TERRENO ==================== */}
          {pasoActual === 1 && (
            <div className="step-content">
              <h3>📐 Paso 1: ¿Cuánto mide el pedazo de tierra que va a sembrar?</h3>
              <p className="step-subtitle">No se preocupe si no sabe las hectáreas exactas. Escoja la medida que usted usa en la finca y el sistema hace la cuenta.</p>

              <div className="form-row-2">
                <div className="input-box">
                  <label>1. Seleccione la Finca:</label>
                  <select value={selectedFincaId} onChange={e => handleFincaSelect(e.target.value)}>
                    <option value="">-- Seleccione Finca --</option>
                    {fincas.map(f => (
                      <option key={f.id_finca} value={f.id_finca}>
                        {f.nombre} {f.altitud_promedio ? `(${f.altitud_promedio} msnm)` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="input-box">
                  <label>2. Lote o Potrero a Sembrar:</label>
                  <select value={selectedLoteId} onChange={e => setSelectedLoteId(e.target.value)}>
                    <option value="">-- Seleccione Lote --</option>
                    {lotes.filter(l => !selectedFincaId || String(l.id_finca) === String(selectedFincaId) || true).map(l => (
                      <option key={l.id_lote} value={l.id_lote}>{l.nombre} ({l.hectareas || 1} Ha)</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="unidad-selector-grid">
                <div 
                  className={`unidad-card ${unidadMedida === 'cuadras' ? 'selected' : ''}`}
                  onClick={() => setUnidadMedida('cuadras')}
                >
                  <div className="card-icon">🌾</div>
                  <h4>En Cuadras o Plazas</h4>
                  <p>1 cuadra = 6.400 m² (Tradicional Eje Cafetero, Antioquia, Valle, Cauca)</p>
                </div>

                <div 
                  className={`unidad-card ${unidadMedida === 'fanegadas' ? 'selected' : ''}`}
                  onClick={() => setUnidadMedida('fanegadas')}
                >
                  <div className="card-icon">📜</div>
                  <h4>En Fanegadas</h4>
                  <p>1 fanegada = 6.400 m² (Tradicional Cundinamarca, Boyacá, Santander)</p>
                </div>

                <div 
                  className={`unidad-card ${unidadMedida === 'pasos' ? 'selected' : ''}`}
                  onClick={() => setUnidadMedida('pasos')}
                >
                  <div className="card-icon">👣</div>
                  <h4>Por Pasos de Campo</h4>
                  <p>Medido caminando a pie (Largo de pasos × Ancho de pasos)</p>
                </div>

                <div 
                  className={`unidad-card ${unidadMedida === 'hectareas' ? 'selected' : ''}`}
                  onClick={() => setUnidadMedida('hectareas')}
                >
                  <div className="card-icon">🚜</div>
                  <h4>En Hectáreas Directas</h4>
                  <p>1 Hectárea = 10.000 m² (Medida técnica oficial)</p>
                </div>
              </div>

              {/* Entradas según unidad */}
              <div className="measure-input-area">
                {unidadMedida === 'pasos' ? (
                  <div className="form-row-2">
                    <div className="input-box">
                      <label>👣 Pasos de Largo:</label>
                      <input type="number" value={pasosLargo} onChange={e => setPasosLargo(e.target.value)} />
                    </div>
                    <div className="input-box">
                      <label>👣 Pasos de Ancho:</label>
                      <input type="number" value={pasosAncho} onChange={e => setPasosAncho(e.target.value)} />
                    </div>
                  </div>
                ) : (
                  <div className="input-box" style={{ maxWidth: '400px' }}>
                    <label>¿Cuántas {unidadMedida} tiene el lote?</label>
                    <input 
                      type="number" 
                      step="0.1" 
                      value={valorMedida} 
                      onChange={e => setValorMedida(e.target.value)} 
                    />
                  </div>
                )}

                {/* Tarjeta de Conversión en Tiempo Real */}
                <div className="conversion-result-card">
                  <div className="res-icon">✅</div>
                  <div className="res-details">
                    <div className="res-title">Resultado de la Medida de su Terreno:</div>
                    <div className="res-highlight">
                      <strong>{areaCalculada.ha} Hectáreas</strong> ({areaCalculada.cuadras} Cuadras / {areaCalculada.m2.toLocaleString()} m²)
                    </div>
                    <div className="res-note">
                      Con esta área el sistema le calculará exactamente cuántas plantas caben y cuántos bultos de abono va a necesitar.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== PASO 2: ALTURA SOBRE EL NIVEL DEL MAR ==================== */}
          {pasoActual === 2 && (
            <div className="step-content">
              <h3>🏔️ Paso 2: Altura del lote sobre el nivel del mar (m.s.n.m.)</h3>
              <p className="step-subtitle">La altura manda la temperatura del aire. Si siembra en la altura incorrecta, el fruto no cuaja o la mata se muere de frío o calor.</p>

              {/* Slider de Altura */}
              <div className="altitud-panel">
                <div className="altitud-header">
                  <div className="altitud-display">
                    <span className="altitud-number">{altitudMsnm}</span>
                    <span className="altitud-unit">metros sobre el nivel del mar (m.s.n.m.)</span>
                  </div>
                  <div className="piso-badge">
                    <span>{pisoTermico.icono}</span>
                    <strong>{pisoTermico.nombre}</strong> ({pisoTermico.temp})
                  </div>
                </div>

                <input 
                  type="range" 
                  min="0" 
                  max="3200" 
                  step="50"
                  value={altitudMsnm} 
                  onChange={e => setAltitudMsnm(Number(e.target.value))}
                  className="altitud-slider"
                />
                <div className="slider-labels">
                  <span>0 msnm (Mar/Calor)</span>
                  <span>1.000 msnm (Medio)</span>
                  <span>1.800 msnm (Frío)</span>
                  <span>2.800+ msnm (Páramo)</span>
                </div>
              </div>

              {/* Semáforo de Cultivos Recomendados vs No Aptos */}
              <h4 style={{ color: '#38bdf8', marginTop: '20px' }}>Semáforo Agroecológico para {altitudMsnm} m.s.n.m.:</h4>
              
              <div className="semaforo-grid">
                {/* Verde: Aptos */}
                <div className="semaforo-col verde">
                  <div className="col-header">🟢 CULTIVOS IDEALES (Excelente Producción)</div>
                  <div className="cultivos-list">
                    {clasificacionCultivos.recomendados.map(c => (
                      <div 
                        key={c.id} 
                        className={`cultivo-card-select ${cultivoSeleccionado.id === c.id ? 'active' : ''}`}
                        onClick={() => {
                          setCultivoSeleccionado(c);
                          setDistanciaSurco(c.distancia_surco);
                          setDistanciaPlanta(c.distancia_planta);
                          setSistemaSiembra(c.sistema);
                        }}
                      >
                        <div className="c-head">
                          <span className="c-icon">{c.icono}</span>
                          <strong>{c.nombre}</strong>
                        </div>
                        <p>{c.descripcion}</p>
                        <span className="c-range">Rango óptimo: {c.altitud_min} a {c.altitud_max} msnm</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Amarillo: Precaución */}
                <div className="semaforo-col amarillo">
                  <div className="col-header">🟡 CON PRECAUCIÓN (Requiere Variedad Especial)</div>
                  <div className="cultivos-list">
                    {clasificacionCultivos.precaucion.map(c => (
                      <div key={c.id} className="cultivo-card-select aviso">
                        <div className="c-head">
                          <span className="c-icon">{c.icono}</span>
                          <strong>{c.nombre}</strong>
                        </div>
                        <p>Está en el límite de temperatura. Requiere semillas tolerantes o tardará más días en madurar.</p>
                      </div>
                    ))}
                    {clasificacionCultivos.precaucion.length === 0 && (
                      <div className="empty-notice">Ningún cultivo en rango dudoso para esta altura.</div>
                    )}
                  </div>
                </div>

                {/* Rojo: No Aptos */}
                <div className="semaforo-col rojo">
                  <div className="col-header">🔴 NO RECOMENDADO (Pérdida de Cosecha)</div>
                  <div className="cultivos-list">
                    {clasificacionCultivos.noAptos.map(c => (
                      <div key={c.id} className="cultivo-card-select prohibido">
                        <div className="c-head">
                          <span className="c-icon">{c.icono}</span>
                          <strong>{c.nombre}</strong>
                        </div>
                        <p>No rinde a {altitudMsnm} msnm. Exige rangos de {c.altitud_min} a {c.altitud_max} msnm.</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== PASO 3: TIPO DE SUELO Y PRUEBA DE LA BOLA ==================== */}
          {pasoActual === 3 && (
            <div className="step-content">
              <h3>🪱 Paso 3: ¿Qué tierra tiene su lote y cómo saber si es ácida?</h3>
              <p className="step-subtitle">No necesita mandar la tierra a un laboratorio costoso el primer día. Con la prueba manual del campesino puede saber de inmediato qué suelo pisa.</p>

              {/* Selector de Texturas */}
              <div className="suelos-grid">
                <div 
                  className={`suelo-card ${tipoSuelo === 'franco' ? 'selected' : ''}`}
                  onClick={() => setTipoSuelo('franco')}
                >
                  <div className="suelo-emoji">🪱</div>
                  <h4>Tierra Negra (Franca / Suelta)</h4>
                  <div className="badge-ideal">⭐ La más bendita</div>
                  <p>Es oscura, huele a monte húmedo, tiene lombrices. Retiene humedad sin encharcarse y deja respirar las raíces.</p>
                </div>

                <div 
                  className={`suelo-card ${tipoSuelo === 'arcilloso' ? 'selected' : ''}`}
                  onClick={() => setTipoSuelo('arcilloso')}
                >
                  <div className="suelo-emoji">🧱</div>
                  <h4>Greda / Barro (Arcilloso)</h4>
                  <div className="badge-cuidado">⚠️ Pesada</div>
                  <p>Color rojizo o amarillo. Se pega como plastilina a las botas y al azadón. En invierno se empoza y asfixia la raíz; en verano se raja.</p>
                </div>

                <div 
                  className={`suelo-card ${tipoSuelo === 'arenoso' ? 'selected' : ''}`}
                  onClick={() => setTipoSuelo('arenoso')}
                >
                  <div className="suelo-emoji">🏖️</div>
                  <h4>Arenosa / Cascajosa</h4>
                  <div className="badge-cuidado">⚠️ Muy suelta</div>
                  <p>Áspera al tacto. El agua se escurre de una vez y la lluvia lava el abono químico rápidamente. Exige bastante gallinaza o compost.</p>
                </div>
              </div>

              {/* Caja de la Escuela Campesina: Prueba de la Bola */}
              <div className="escuela-box">
                <div className="escuela-title">
                  <span>💡</span> <strong>Escuela de Campo: ¿Cómo hacer la Prueba de la Bola de Barro?</strong>
                </div>
                <div className="escuela-steps">
                  <div className="e-step">
                    <strong>1. Coger un puñado:</strong> Saque un puñado de tierra a 20 centímetros de hondo (donde comen las raíces).
                  </div>
                  <div className="e-step">
                    <strong>2. Humedecer y apretar:</strong> Échele unas gotas de agua y apriete fuerte con el puño cerrado.
                  </div>
                  <div className="e-step">
                    <strong>3. Mirar qué pasa:</strong>
                    <ul>
                      <li>Si al abrir la mano se desmorona como arena suelta: <strong>Es Arenosa</strong>.</li>
                      <li>Si queda una bola dura, pegajosa y brillante: <strong>Es Greda (Arcillosa)</strong>.</li>
                      <li>Si la bola queda armadita pero se parte fácil con el dedo pulgar: <strong>¡Es Tierra Negra Franca Perfecta!</strong></li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Medición de Acidez / pH */}
              <div className="ph-panel" style={{ marginTop: '20px' }}>
                <div className="ph-header">
                  <div>
                    <strong>Acidez de la Tierra (pH del Lote): {phSuelo}</strong>
                    <p style={{ margin: 0, fontSize: '0.85em', color: '#94a3b8' }}>La mayoría de los suelos de ladera en Colombia son ácidos por las lluvias.</p>
                  </div>
                  <div className="ph-indicator" style={{ background: phSuelo < 5.5 ? '#ef4444' : phSuelo <= 6.8 ? '#10b981' : '#f59e0b' }}>
                    {phSuelo < 5.5 ? '⚠️ Tierra Ácida (Exige Cal)' : phSuelo <= 6.8 ? '🟢 pH Ideal para Nutrientes' : '🟡 Tierra Alcalina'}
                  </div>
                </div>

                <input 
                  type="range" 
                  min="4.0" 
                  max="8.0" 
                  step="0.1" 
                  value={phSuelo} 
                  onChange={e => setPhSuelo(Number(e.target.value))} 
                />
                <div className="slider-labels">
                  <span>pH 4.0 (Muy Ácido)</span>
                  <span>pH 5.5 (Cal Agrícola)</span>
                  <span>pH 6.5 (Ideal Neutro)</span>
                  <span>pH 8.0 (Alcalino)</span>
                </div>
              </div>
            </div>
          )}

          {/* ==================== PASO 4: INCLINACIÓN Y CURVAS DE NIVEL ==================== */}
          {pasoActual === 4 && (
            <div className="step-content">
              <h3>⛰️ Paso 4: Inclinación del terreno y curvas de nivel</h3>
              <p className="step-subtitle">¡La regla de oro del campo! Nunca surque a favor de la caída del agua en loma, porque el invierno le lava la tierra y le deja el lote en pura piedra.</p>

              <div className="pendiente-grid">
                <div 
                  className={`pendiente-card ${tipoPendiente === 'plano' ? 'selected' : ''}`}
                  onClick={() => setTipoPendiente('plano')}
                >
                  <div className="p-icon">🚜</div>
                  <h4>Terreno Plano (0 - 5% Pendiente)</h4>
                  <div className="p-badge verde">Mecanizable</div>
                  <p>Se puede meter tractor, hacer surcos rectos. Cuidado con hacer zanjas para que no se empoce el agua lluvia.</p>
                </div>

                <div 
                  className={`pendiente-card ${tipoPendiente === 'loma' ? 'selected' : ''}`}
                  onClick={() => setTipoPendiente('loma')}
                >
                  <div className="p-icon">🌾</div>
                  <h4>Falda o Loma Suave (5 - 20% Pendiente)</h4>
                  <div className="p-badge amarillo">Trazo en Contorno</div>
                  <p>Excelente drenaje natural. Debe sembrar cruzado siguiendo la curva de la loma, nunca de arriba hacia abajo.</p>
                </div>

                <div 
                  className={`pendiente-card ${tipoPendiente === 'quebrado' ? 'selected' : ''}`}
                  onClick={() => setTipoPendiente('quebrado')}
                >
                  <div className="p-icon">🧗</div>
                  <h4>Loma Brava / Quebrada (&gt; 20% Pendiente)</h4>
                  <div className="p-badge rojo">Curvas de Nivel Obligatorias</div>
                  <p>Peligro alto de deslizamiento y erosión. Obligatorio trazar con Nivel en A y sembrar barreras vivas (limoncillo o vetiver).</p>
                </div>
              </div>

              {/* El Compás Campesino: Nivel en A */}
              <div className="escuela-box" style={{ marginTop: '20px' }}>
                <div className="escuela-title">
                  <span>📐</span> <strong>¿Cómo se hace un "Nivel en A" con tres palos de la finca?</strong>
                </div>
                <div className="escuela-steps">
                  <div className="e-step">
                    <strong>1. Construcción rústica:</strong> Amarre 2 palos de 2 metros formando una "V" invertida, y cruce un palo en el centro formando la letra <strong>A</strong>.
                  </div>
                  <div className="e-step">
                    <strong>2. La plomada:</strong> Cuelgue una cuerda con una piedra o tuerca desde el vértice superior.
                  </div>
                  <div className="e-step">
                    <strong>3. Trazar en la loma:</strong> Cuando la cuerda pase exactamente por la mitad del palo travesero, los dos pies están al mismo nivel. Clave estacas para marcar por dónde irá su surco en curva perfecta.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== PASO 5: SEMILLA, MARCO Y HOYADO ==================== */}
          {pasoActual === 5 && (
            <div className="step-content">
              <h3>🌰 Paso 5: Marco de siembra, hoyado y abono de fondo</h3>
              <p className="step-subtitle">Al tresbolillo (en triángulo) caben más matas por cuadra y cada mata ataja el agua de la que tiene arriba.</p>

              <div className="form-row-2">
                <div className="input-box">
                  <label>Marco de Siembra:</label>
                  <select value={sistemaSiembra} onChange={e => setSistemaSiembra(e.target.value)}>
                    <option value="Tresbolillo">Al Tresbolillo / Triángulo (Recomendado en loma, +15% matas)</option>
                    <option value="Cuadro">Al Cuadro (Recomendado en plano o con tractor)</option>
                  </select>
                </div>

                <div className="form-row-2">
                  <div className="input-box">
                    <label>Distancia entre Surcos (m):</label>
                    <input type="number" step="0.1" value={distanciaSurco} onChange={e => setDistanciaSurco(e.target.value)} />
                  </div>
                  <div className="input-box">
                    <label>Distancia entre Matas (m):</label>
                    <input type="number" step="0.1" value={distanciaPlanta} onChange={e => setDistanciaPlanta(e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Tarjeta de Cálculo de Semillas */}
              <div className="resumen-semillas-card">
                <div className="s-col">
                  <span className="s-label">Densidad por Hectárea:</span>
                  <strong className="s-val">{calculoPlantas.densidadHa.toLocaleString()} matas/Ha</strong>
                </div>
                <div className="s-col">
                  <span className="s-label">Matas Netas en su Terreno:</span>
                  <strong className="s-val">{calculoPlantas.plantasNetas.toLocaleString()} colinos</strong>
                </div>
                <div className="s-col">
                  <span className="s-label">+ Margen de Resiembra (5%):</span>
                  <strong className="s-val">{calculoPlantas.margenResiembra.toLocaleString()} extras</strong>
                </div>
                <div className="s-col highlight">
                  <span className="s-label">TOTAL SEMILLAS / PLANTAS A COMPRAR:</span>
                  <strong className="s-val-big">{calculoPlantas.totalPlantas.toLocaleString()} plantas</strong>
                </div>
              </div>

              {/* Guía Práctica de Hoyado */}
              <div className="hoyado-guide" style={{ marginTop: '20px' }}>
                <h4>🕳️ Receta del Hoyo Campesino (40 × 40 × 40 centímetros):</h4>
                <div className="hoyado-steps-grid">
                  <div className="h-card">
                    <div className="h-num">1</div>
                    <strong>Separar la tierra:</strong> La tierra negra de arriba se pone a un lado del hoyo, y la greda del fondo al otro.
                  </div>
                  <div className="h-card">
                    <div className="h-num">2</div>
                    <strong>Encalado al fondo:</strong> Echar 150 a 200 gramos de cal dolomita al fondo para quitar la acidez de la tierra.
                  </div>
                  <div className="h-card">
                    <div className="h-num">3</div>
                    <strong>Mezcla con Abono:</strong> Revolver la tierra negra de arriba con 1 kilo de compost o gallinaza y 50 gramos de Fósforo (DAP).
                  </div>
                  <div className="h-card">
                    <div className="h-num">4</div>
                    <strong>Siembra recta:</strong> Colocar la plántula al nivel del suelo sin doblar la raíz principal y pisar suave alrededor.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== PASO 6: CALENDARIO FENOLÓGICO Y GUARDAR ==================== */}
          {pasoActual === 6 && (
            <div className="step-content">
              <h3>📅 Paso 6: Su Línea de Vida desde la Siembra hasta la Cosecha</h3>
              <p className="step-subtitle">Al guardar, el sistema programará automáticamente las fechas en su calendario de labores para que el teléfono le recuerde cuándo abonar y cuándo cosechar.</p>

              <div className="fecha-picker-box">
                <label>🗓️ ¿Qué día va a sembrar en el lote?</label>
                <input 
                  type="date" 
                  value={fechaSiembra} 
                  onChange={e => setFechaSiembra(e.target.value)}
                  style={{ maxWidth: '300px', fontSize: '1.1em', padding: '10px' }}
                />
              </div>

              {/* Línea de Tiempo Fenológica */}
              <div className="timeline-container">
                {cronogramaFenologico.map((etapa, idx) => (
                  <div key={idx} className="timeline-item">
                    <div className="timeline-icon">{etapa.icono}</div>
                    <div className="timeline-body">
                      <div className="t-header">
                        <strong>{etapa.etapa}</strong>
                        <span className="t-date">{etapa.fecha} ({etapa.dias})</span>
                      </div>
                      <p className="t-desc">{etapa.labor}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Resumen Final de Guardado */}
              <div className="resumen-final-box">
                <div className="r-item">
                  <span>Cultivo:</span>
                  <strong>{cultivoSeleccionado.nombre}</strong>
                </div>
                <div className="r-item">
                  <span>Área Total:</span>
                  <strong>{areaCalculada.ha} Ha ({areaCalculada.cuadras} Cuadras)</strong>
                </div>
                <div className="r-item">
                  <span>Plantas a Sembrar:</span>
                  <strong>{calculoPlantas.totalPlantas.toLocaleString()} matas</strong>
                </div>
                <div className="r-item">
                  <span>Cosecha Esperada:</span>
                  <strong style={{ color: '#10b981' }}>{(cultivoSeleccionado.rendimiento_ton_ha * areaCalculada.ha).toFixed(1)} Toneladas</strong>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Barra de Navegación Inferior */}
        <div className="asistente-footer">
          <div>
            {pasoActual > 1 && (
              <button className="btn-wizard-sec" onClick={() => setPasoActual(pasoActual - 1)}>
                <ArrowLeftOutlined /> Anterior
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            {pasoActual === 6 && (
              <button className="btn-wizard-wa" onClick={handleCompartirWhatsApp}>
                <WhatsAppOutlined /> Enviar Resumen al Mayordomo
              </button>
            )}

            {pasoActual < 6 ? (
              <button className="btn-wizard-pri" onClick={() => setPasoActual(pasoActual + 1)}>
                Siguiente Paso <ArrowRightOutlined />
              </button>
            ) : (
              <button className="btn-wizard-save" onClick={handleGuardarSiembra} disabled={loading}>
                <SaveOutlined /> {loading ? 'Guardando en AgroPaccioli...' : '🌾 Guardar y Programar Siembra'}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
