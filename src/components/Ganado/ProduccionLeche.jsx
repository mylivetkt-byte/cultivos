import React, { useState } from 'react';
import DatePickerClaro from '../Common/DatePickerClaro';
import { Modal, Button, Alert } from 'antd';
import { BookOutlined, SoundOutlined, CheckCircleOutlined } from '@ant-design/icons';
import AyudaCampesina from '../Common/AyudaCampesina';
import AsistenteGanaderoCampesino from './AsistenteGanaderoCampesino';
import { hablarEnVozCampesina } from '../../utils/glosarioCampesino';

function ProduccionLeche({ fincaId }) {
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [litros, setLitros] = useState('');
  const [cliente, setCliente] = useState('');
  const [tipoPago, setTipoPago] = useState('Contado');
  const [valorTotal, setValorTotal] = useState('');
  const [showEscuelaGanadera, setShowEscuelaGanadera] = useState(false);

  // Precio por litro calculado
  const precioPorLitro = litros && valorTotal && Number(litros) > 0 
    ? Math.round(Number(valorTotal) / Number(litros)) 
    : 0;

  const handleGuardar = async () => {
    try {
      const res = await fetch('/api/ganado_avanzado/leche', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ fecha, litros, cliente, tipo_pago: tipoPago, valor_total: valorTotal })
      });
      if(res.ok) {
        alert('Producción y Venta de Leche registrada con éxito.');
        setLitros(''); setCliente(''); setValorTotal('');
      } else {
        alert('Error al registrar venta de leche.');
      }
    } catch(e) {
      alert('Error de red al registrar.');
    }
  };

  return (
    <div className="p-4 dashboard-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* CABECERA */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 style={{ color: 'var(--primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            🥛 Producción y Venta de Leche
          </h2>
          <p style={{ margin: '5px 0 0 0', color: 'var(--text-muted)' }}>
            Registro Diario de Ordeño con Buenas Prácticas Ganaderas y Facturación
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Button 
            type="primary"
            icon={<BookOutlined />}
            onClick={() => setShowEscuelaGanadera(true)}
            style={{ 
              background: '#059669', 
              borderColor: '#10b981', 
              fontWeight: 'bold', 
              height: '38px',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)'
            }}
          >
            🌾 Escuela Ganadera (Aforo, Cinta, Retiro)
          </Button>
          <button style={{ background: '#10b981', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}>
            📗 Exportar Diario Excel
          </button>
          <button style={{ background: '#ef4444', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}>
            📕 Reporte DIAN PDF
          </button>
        </div>
      </div>

      {/* BANNER PEDAGÓGICO DE BUENAS PRÁCTICAS DE ORDEÑO (BPO) */}
      <div style={{
        background: 'linear-gradient(135deg, #064e3b 0%, #022c22 100%)',
        border: '1px solid #059669',
        borderRadius: '12px',
        padding: '16px 20px',
        color: '#ecfdf5',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 'bold', fontSize: '15px', color: '#6ee7b7' }}>
            <span style={{ fontSize: '22px' }}>🐄</span>
            <span>Regla de Oro del Ordeño Limpio (Para evitar mastitis y cuidar el tanque)</span>
          </div>
          <Button
            size="small"
            icon={<SoundOutlined />}
            style={{ background: '#10b981', borderColor: '#10b981', color: '#fff', fontWeight: 'bold' }}
            onClick={() => hablarEnVozCampesina(
              "Recuerde los tres pasos del ordeño limpio: Primero, amarre la cola y lave los pezones secando con toalla limpia. Segundo, despunte los tres primeros chorros en una taza oscura para revisar si hay grumos de mastitis. Y tercero, al terminar selle los pezones con yodo para que no entren bacterias."
            )}
          >
            🔊 Escuchar Guía
          </Button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px', marginTop: '6px' }}>
          <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px 14px', borderRadius: '8px', fontSize: '13px' }}>
            <b>1. Limpieza y Secado:</b> Amarre la cola. Lave los pezones con agua limpia y seque con papel o toalla individual. Nunca use trapos sucios compartidos.
          </div>
          <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px 14px', borderRadius: '8px', fontSize: '13px' }}>
            <b>2. Despunte contra Mastitis:</b> Bote los 3 primeros chorros de cada teta en fondo oscuro. Si ve grumos, coágulos o sangre, aparte esa leche del tanque.
          </div>
          <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px 14px', borderRadius: '8px', fontSize: '13px' }}>
            <b>3. Sellado con Yodo:</b> Al terminar de ordeñar, unte los pezones con desinfectante yodado. La punta de la teta queda abierta 30 minutos; el yodo frena bacterias.
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        {/* FORMULARIO DE ORDEÑO Y VENTA */}
        <div className="card" style={{ flex: '1', minWidth: '320px', padding: '20px', background: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <h3 style={{ marginTop: 0, color: 'var(--text)', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
            Formulario de Ordeño y Venta
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Fecha de Ordeño</label>
                <AyudaCampesina campoKey="fecha_inicio" />
              </div>
              <DatePickerClaro value={fecha} 
                onChange={e => setFecha(e.target.value)} 
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', marginTop: '4px' }} />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Litros Extraídos (Total Diario)</label>
                <AyudaCampesina campoKey="capacidad" />
              </div>
              <input 
                type="number" 
                value={litros} 
                onChange={e => setLitros(e.target.value)} 
                placeholder="Ej: 140 litros"
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', marginTop: '4px' }}
              />
            </div>
            
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Cliente / Industria Láctea</label>
                <AyudaCampesina campoKey="responsable_herramienta" />
              </div>
              <input 
                type="text" 
                value={cliente} 
                onChange={e => setCliente(e.target.value)} 
                placeholder="Ej: Lácteos La Sabana o Quesería Don Pedro" 
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', marginTop: '4px' }}
              />
            </div>
            
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Modalidad de Cobro</label>
              <select 
                value={tipoPago} 
                onChange={e => setTipoPago(e.target.value)} 
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', marginTop: '4px' }}
              >
                <option value="Contado">Pago de Contado (Efectivo o Transferencia)</option>
                <option value="Crédito">A Crédito (Quincena o Fin de Mes)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Valor Total Venta ($ COP)</label>
              <input 
                type="number" 
                value={valorTotal} 
                onChange={e => setValorTotal(e.target.value)} 
                placeholder="Ej: 280000"
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', marginTop: '4px' }}
              />
              {precioPorLitro > 0 && (
                <div style={{ marginTop: '6px', fontSize: '13px', color: '#10b981', fontWeight: 'bold' }}>
                  💵 Precio liquidado por litro: ${precioPorLitro.toLocaleString()} COP / Litro
                </div>
              )}
            </div>
            
            <button 
              onClick={handleGuardar} 
              style={{ 
                background: 'var(--primary)', 
                color: 'white', 
                border: 'none', 
                padding: '12px 20px', 
                borderRadius: '6px', 
                cursor: 'pointer', 
                fontWeight: 'bold', 
                marginTop: '10px',
                fontSize: '15px'
              }}
            >
              💾 Registrar Ordeño y Venta
            </button>
          </div>
        </div>

        {/* RESUMEN DEL MES Y ALERTAS */}
        <div className="card" style={{ flex: '1', minWidth: '320px', padding: '20px', background: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <h3 style={{ marginTop: 0, color: 'var(--text)', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
            Resumen del Mes y Cuidados Sanitarios
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginTop: '16px' }}>
            <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #3b82f6' }}>
              <h4 style={{ margin: '0 0 5px 0', fontSize: '13px', color: 'var(--text-muted)' }}>Litros Producidos Este Mes</h4>
              <h2 style={{ margin: 0, color: '#3b82f6' }}>4,250 L</h2>
            </div>

            <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #10b981' }}>
              <h4 style={{ margin: '0 0 5px 0', fontSize: '13px', color: 'var(--text-muted)' }}>Ingresos por Leche (Contado)</h4>
              <h2 style={{ margin: 0, color: '#10b981' }}>$ 8,500,000</h2>
            </div>

            <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #f59e0b' }}>
              <h4 style={{ margin: '0 0 5px 0', fontSize: '13px', color: 'var(--text-muted)' }}>Cartera por Cobrar (Crédito)</h4>
              <h2 style={{ margin: 0, color: '#f59e0b' }}>$ 1,200,000</h2>
            </div>

            <div style={{ 
              background: '#fff1f2', 
              padding: '14px', 
              borderRadius: '8px', 
              borderLeft: '4px solid #ef4444',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 'bold', color: '#991b1b', fontSize: '13px' }}>
                  🛑 Alerta de Retiro de Leche
                </span>
                <AyudaCampesina campoKey="tiempo_retiro" />
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: '#7f1d1d' }}>
                Si aplicó oxitetraciclina o penicilina a alguna vaca, recuerde que esa leche no se mezcla en la cantina. Debe ordeñarse de última y botarse.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL DE ESCUELA GANADERA */}
      <Modal
        open={showEscuelaGanadera}
        onCancel={() => setShowEscuelaGanadera(false)}
        footer={null}
        width={1040}
        destroyOnClose
        styles={{ body: { padding: '8px', background: '#0b1120' } }}
      >
        <AsistenteGanaderoCampesino 
          fincaId={fincaId} 
          onClose={() => setShowEscuelaGanadera(false)} 
        />
      </Modal>
    </div>
  );
}

export default ProduccionLeche;
