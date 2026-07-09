import React, { useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';

const PROTOCOLOS = {
  continua: { nombre: '📡 Lectura Continua', desc: 'Extrae cualquier número del flujo de datos' },
  cas: { nombre: '⚖️ CAS', desc: 'Formato: ST,GS,+0000.00kg' },
  magallan: { nombre: '⚖️ Magallan', desc: 'Formato: 0.000 kg con espacios' },
  torrey: { nombre: '⚖️ Torrey', desc: 'Formato: +0000.00kg' },
  personalizado: { nombre: '🔧 Personalizado', desc: 'Expresión regular definida por el usuario' },
};

function parsearProtocolo(texto, protocolo, regexPersonalizado) {
  const t = texto.trim();
  if (!t) return null;

  switch (protocolo) {
    case 'cas': {
      const casMatch = t.match(/ST,(GS|NT),([+\- ]?[\d.,]+)/i);
      if (casMatch) {
        const num = parseFloat(casMatch[2].replace(',', '.').replace(' ', ''));
        return isNaN(num) ? null : num;
      }
      return null;
    }
    case 'magallan': {
      const magMatch = t.match(/^\s*([+\-]?\s*[\d.,]+)\s*(kg|lb|g|t|ton)?$/i);
      if (magMatch) {
        const num = parseFloat(magMatch[1].replace(',', '.').replace(/\s/g, ''));
        return isNaN(num) ? null : num;
      }
      return null;
    }
    case 'torrey': {
      const torMatch = t.match(/^([+\-]?\s*[\d.,]+)\s*(kg|lb|g)?/i);
      if (torMatch) {
        const num = parseFloat(torMatch[1].replace(',', '.').replace(/\s/g, ''));
        return isNaN(num) ? null : num;
      }
      return null;
    }
    case 'personalizado': {
      if (!regexPersonalizado) return null;
      try {
        const re = new RegExp(regexPersonalizado, 'i');
        const m = t.match(re);
        if (m && m[1]) {
          const num = parseFloat(m[1].replace(',', '.').replace(/\s/g, ''));
          return isNaN(num) ? null : num;
        }
      } catch (e) {
        return null;
      }
      return null;
    }
    case 'continua':
    default: {
      const limpio = t.replace(/[^\d.,\-]/g, ' ').trim();
      const match = limpio.match(/([\d]+[.,]?[\d]*)/);
      if (match) {
        const num = parseFloat(match[1].replace(',', '.'));
        return isNaN(num) ? null : num;
      }
      return null;
    }
  }
}

const PruebasBasculas = ({ tenantId }) => {
  const [basculas, setBasculas] = useState([]);
  const [selectedBascula, setSelectedBascula] = useState('');
  const [configBascula, setConfigBascula] = useState(null);
  const [regexPersonalizado, setRegexPersonalizado] = useState('([\\d]+[.,][\\d]+)');
  const [pesoSimulado, setPesoSimulado] = useState('');
  const [pesoRecibido, setPesoRecibido] = useState(null);
  const [conectado, setConectado] = useState(false);
  const [tipoConexion, setTipoConexion] = useState('simulacion');
  const [serialPort, setSerialPort] = useState(null);
  const [portInfo, setPortInfo] = useState(null);
  const [autoRegistrar, setAutoRegistrar] = useState(true);
  const [historial, setHistorial] = useState([]);
  const [mensaje, setMensaje] = useState('');
  const [tramaCruda, setTramaCruda] = useState('');
  const [tramaExtraida, setTramaExtraida] = useState('');
  const readerRef = useRef(null);
  const writerRef = useRef(null);
  const pollIntervalRef = useRef(null);

  const fetchBasculas = useCallback(async () => {
    if (!tenantId) return;
    try {
      const { data } = await axios.get('/api/basculas', { params: { tenantId, activa: true } });
      setBasculas(data);
    } catch (err) {
      console.error(err);
    }
  }, [tenantId]);

  useEffect(() => { fetchBasculas(); }, [fetchBasculas]);

  useEffect(() => {
    if (selectedBascula) {
      const b = basculas.find(x => String(x.id_bascula) === selectedBascula);
      setConfigBascula(b || null);
    } else {
      setConfigBascula(null);
    }
  }, [selectedBascula, basculas]);

  const agregarRegistro = useCallback((peso, fuente) => {
    const bascula = basculas.find(b => String(b.id_bascula) === selectedBascula);
    const registro = {
      fecha: new Date().toLocaleTimeString(),
      bascula: bascula?.nombre || selectedBascula,
      peso,
      fuente,
      protocolo: configBascula?.protocolo || 'continua',
      estado: 'OK',
    };
    setPesoRecibido(peso);
    setHistorial(prev => [registro, ...prev].slice(0, 500));

    if (autoRegistrar && selectedBascula) {
      axios.post(`/api/basculas/${selectedBascula}/registro-peso`, {
        peso,
        movimientoId: null,
      }).catch(err => console.error('Error registrando peso en backend:', err));
    }
  }, [basculas, selectedBascula, autoRegistrar, configBascula]);

  const handleConectarSerial = async () => {
    if (!navigator.serial) {
      setMensaje('⚠️ Web Serial API no disponible. Usa Chrome/Edge con HTTPS o localhost.');
      return;
    }
    try {
      const port = await navigator.serial.requestPort();
      await port.open({
        baudRate: configBascula?.baud_rate || 9600,
        dataBits: configBascula?.data_bits || 8,
        parity: configBascula?.paridad || 'none',
        stopBits: configBascula?.stop_bits || 1,
      });

      const info = port.getInfo();
      setPortInfo(info);
      setSerialPort(port);
      setConectado(true);
      setTipoConexion('serial');
      setMensaje(`🔌 Conectado @ ${configBascula?.baud_rate || 9600} baud — ${configBascula?.protocolo || 'continua'}`);

      // Setup polling if mode is peticion (e.g. sending ENQ/\x05 parameter)
      if (configBascula?.modo_lectura === 'peticion') {
        const writer = port.writable.getWriter();
        writerRef.current = writer;
        const encoder = new TextEncoder();
        
        let cmd = configBascula.comando_peticion || 'ENQ';
        let data;
        if (cmd === 'ENQ' || cmd === '\\x05' || cmd === '0x05') {
          data = new Uint8Array([5]); // ASCII ENQ (0x05)
        } else {
          data = encoder.encode(cmd);
        }

        console.log(`[Serial Polling] Iniciando envío de parámetro: ${cmd}`);
        pollIntervalRef.current = setInterval(async () => {
          try {
            await writer.write(data);
          } catch (writeErr) {
            console.error('Error escribiendo al puerto serie:', writeErr);
          }
        }, 1000); // Enviar cada 1 segundo
      }

      const reader = port.readable.getReader();
      readerRef.current = reader;
      const decoder = new TextDecoder();
      let buffer = '';

      while (port.readable) {
        try {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split(/\r?\n/);
          buffer = lines.pop();

          for (const line of lines) {
            if (!line.trim()) continue;
            setTramaCruda(line);
            const inicio = (configBascula?.inicio_lectura ?? 0);
            const longitud = (configBascula?.longitud_lectura ?? 10);
            const fragmento = line.substring(inicio, inicio + longitud);
            setTramaExtraida(fragmento);
            const peso = parsearProtocolo(fragmento, configBascula?.protocolo || 'continua', regexPersonalizado);
            if (peso !== null && peso > 0) {
              agregarRegistro(peso, `RS-232`);
            }
          }
        } catch (err) {
          if (err.name !== 'AbortError') {
            console.error('Error leyendo serie:', err);
          }
          break;
        }
      }
    } catch (err) {
      if (err.name === 'AbortError' || err.message?.includes('cancelled')) {
        setMensaje('🔌 Conexión cancelada');
        return;
      }
      console.error('Error conectando RS-232:', err);
      setMensaje(`❌ Error: ${err.message}`);
      setConectado(false);
    }
  };

  const handleDesconectar = async () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (writerRef.current) {
      try { writerRef.current.releaseLock(); } catch (e) {}
      writerRef.current = null;
    }
    if (readerRef.current) {
      try { await readerRef.current.cancel(); } catch (e) { /* ignore */ }
      readerRef.current = null;
    }
    if (serialPort) {
      try { await serialPort.close(); } catch (e) { /* ignore */ }
      setSerialPort(null);
    }
    setConectado(false);
    setPesoRecibido(null);
    setPortInfo(null);
    setTipoConexion('simulacion');
    setMensaje('🔌 Desconectado');
  };

  const handleSimular = () => {
    if (!selectedBascula || !pesoSimulado) {
      setMensaje('Selecciona una báscula e ingresa un peso');
      return;
    }
    agregarRegistro(parseFloat(pesoSimulado), 'Manual');
    setMensaje(`✅ Peso: ${pesoSimulado} kg`);
    setPesoSimulado('');
  };

  useEffect(() => {
    if (tipoConexion !== 'simulacion' || !conectado) return;
  }, [conectado, tipoConexion, agregarRegistro]);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      if (writerRef.current) {
        try { writerRef.current.releaseLock(); } catch (e) {}
        writerRef.current = null;
      }
      if (readerRef.current) readerRef.current.cancel().catch(() => {});
      if (serialPort) serialPort.close().catch(() => {});
    };
  }, [serialPort]);

  const limpiarHistorial = () => {
    setHistorial([]);
    setMensaje('Historial limpiado');
  };

  const serialSupported = typeof navigator !== 'undefined' && 'serial' in navigator;
  const proto = PROTOCOLOS[configBascula?.protocolo] || PROTOCOLOS.continua;

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '20px' }}>🔬 Pruebas de Básculas</h2>

      <div style={{
        display: 'flex', gap: '16px', alignItems: 'end', flexWrap: 'wrap', marginBottom: '24px',
        padding: '16px', background: 'var(--card-bg)', borderRadius: '10px', border: '1px solid var(--border)'
      }}>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Báscula</label>
          <select value={selectedBascula} onChange={e => { setSelectedBascula(e.target.value); setPesoRecibido(null); }}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)', minWidth: '220px', background: 'var(--bg)' }}>
            <option value="">-- Seleccionar --</option>
            {basculas.map(b => (
              <option key={b.id_bascula} value={b.id_bascula}>
                {b.codigo} — {b.nombre} ({PROTOCOLOS[b.protocolo]?.nombre || b.protocolo})
              </option>
            ))}
          </select>
        </div>

        {configBascula?.protocolo === 'personalizado' && !conectado && (
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Regex</label>
            <input value={regexPersonalizado} onChange={e => setRegexPersonalizado(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)', fontFamily: 'monospace', width: '180px', background: 'var(--bg)' }} />
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', alignItems: 'end' }}>
          {!conectado ? (
            <>
              <button onClick={handleConectarSerial} disabled={!selectedBascula || !serialSupported}
                className="btn btn-primary"
                title={!serialSupported ? 'Web Serial no disponible' : ''}
                style={{ padding: '8px 20px', fontWeight: 600 }}>
                🔌 Conectar RS-232
              </button>
              <button onClick={() => { setConectado(true); setTipoConexion('simulacion'); setMensaje('🖥️ Simulación activa'); }}
                disabled={!selectedBascula} className="btn btn-secondary"
                style={{ padding: '8px 20px', fontWeight: 600 }}>
                🖥️ Simular
              </button>
            </>
          ) : (
            <button onClick={handleDesconectar} className="btn btn-danger"
              style={{ padding: '8px 20px', fontWeight: 600 }}>
              🔌 Desconectar
            </button>
          )}
        </div>
      </div>

      {configBascula && (
        <div style={{
          padding: '8px 16px', borderRadius: '8px', marginBottom: '16px',
          background: '#f0f9ff', color: '#1e40af', fontSize: '13px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px'
        }}>
          <span>{proto.desc}</span>
          <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
            {configBascula.baud_rate} baud · {configBascula.data_bits ?? 8}{configBascula.paridad === 'none' ? 'N' : configBascula.paridad === 'even' ? 'E' : 'O'}{configBascula.stop_bits ?? 1} ·
            [{configBascula.inicio_lectura ?? 0}:{(configBascula.inicio_lectura ?? 0) + (configBascula.longitud_lectura ?? 10)}]
          </span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
        <div style={{
          background: 'var(--card-bg)', borderRadius: '12px', padding: '24px',
          border: '1px solid var(--border)', textAlign: 'center'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>
              {conectado ? '📡 Peso en Vivo' : '✋ Peso Manual'}
            </h3>
            <div style={{ display: 'flex', gap: '6px' }}>
              {conectado && (
                <span style={{
                  fontSize: '11px', padding: '2px 10px', borderRadius: '10px', fontWeight: 600,
                  background: tipoConexion === 'serial' ? '#dbeafe' : '#fef9c3',
                  color: tipoConexion === 'serial' ? '#1e40af' : '#92400e',
                }}>
                  {tipoConexion === 'serial' ? `${configBascula?.baud_rate || 9600} baud` : 'Simulación'}
                </span>
              )}
              {proto && (
                <span style={{ fontSize: '11px', padding: '2px 10px', borderRadius: '10px', fontWeight: 600, background: '#f0fdf4', color: '#166534' }}>
                  {proto.nombre.replace(/^[^\s]+\s/, '')}
                </span>
              )}
            </div>
          </div>
          <div style={{
            fontSize: '48px', fontWeight: 700, fontFamily: 'monospace',
            color: 'var(--primary)', padding: '20px',
            background: 'rgba(0,0,0,0.02)', borderRadius: '8px',
            border: conectado && tipoConexion === 'serial' ? '2px solid #3b82f6' : '2px solid transparent',
          }}>
            {pesoRecibido !== null ? `${pesoRecibido} kg` : '— — —'}
          </div>
          {conectado && (
            <p style={{ fontSize: '12px', marginTop: '8px', color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
              {tipoConexion === 'serial' ? 'Recibiendo datos del puerto serie' : 'Lectura manual activa'}
            </p>
          )}
          {tipoConexion === 'serial' && configBascula && (
            <div style={{ marginTop: '12px', padding: '8px', background: '#f8fafc', borderRadius: '6px', fontSize: '11px', fontFamily: 'monospace', textAlign: 'left' }}>
              <div style={{ color: '#64748b', marginBottom: '4px' }}>
                📐 Extracción: [{configBascula.inicio_lectura ?? 0}..{(configBascula.inicio_lectura ?? 0) + (configBascula.longitud_lectura ?? 10) - 1}]
              </div>
              {tramaCruda && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1px' }}>
                  {[...tramaCruda].map((ch, i) => {
                    const inicio = configBascula.inicio_lectura ?? 0;
                    const fin = inicio + (configBascula.longitud_lectura ?? 10);
                    const dentro = i >= inicio && i < fin;
                    return (
                      <span key={i} style={{
                        display: 'inline-block', width: '10px', textAlign: 'center',
                        background: dentro ? '#3b82f6' : 'transparent',
                        color: dentro ? 'white' : '#94a3b8',
                        borderRadius: '2px', fontWeight: dentro ? 700 : 400, fontSize: '10px',
                      }}>{ch === ' ' ? '\u00B7' : ch}</span>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{
          background: 'var(--card-bg)', borderRadius: '12px', padding: '24px',
          border: '1px solid var(--border)',
        }}>
          {!conectado || tipoConexion === 'simulacion' ? (
            <>
              <h3 style={{ margin: '0 0 12px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                {conectado ? '📡 Transmisión Automática' : '✋ Simular Peso'}
              </h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="number" step="0.01" placeholder="Peso en kg" value={pesoSimulado}
                  onChange={e => setPesoSimulado(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSimular()}
                  style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '16px', background: 'var(--bg)' }} />
                <button onClick={handleSimular} disabled={!selectedBascula || !pesoSimulado} className="btn btn-primary"
                  style={{ padding: '10px 20px', fontWeight: 600 }}>
                  Enviar
                </button>
              </div>
              <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
                {[100, 250, 500, 1000, 2500].map(v => (
                  <button key={v} onClick={() => setPesoSimulado(String(v))}
                    style={{ padding: '4px 12px', fontSize: '12px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg)', cursor: 'pointer' }}>
                    +{v} kg
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div style={{ padding: '10px 0' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: '14px', color: 'var(--text-secondary)' }}>⚙️ Puerto Serie</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <Row label="Protocolo" value={proto.nombre} />
                <Row label="Tipo Conexión" value={configBascula?.tipo_conexion || 'serial'} />
                <Row label="Baud Rate" value={String(configBascula?.baud_rate || 9600)} />
                <Row label="Config Puerto" value={`${configBascula?.data_bits ?? 8}${configBascula?.paridad === 'none' ? 'N' : configBascula?.paridad === 'even' ? 'E' : 'O'}${configBascula?.stop_bits ?? 1}`} />
                <Row label="Inicio Lectura" value={String(configBascula?.inicio_lectura ?? 0)} />
                <Row label="Longitud Lectura" value={String(configBascula?.longitud_lectura ?? 10)} />
                {tramaCruda && (
                  <div style={{ fontSize: '12px', padding: '6px 0' }}>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: '2px' }}>Trama cruda:</div>
                    <div style={{ fontFamily: 'monospace', background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', wordBreak: 'break-all', color: '#334155' }}>{tramaCruda}</div>
                    <div style={{ color: 'var(--text-secondary)', marginTop: '4px', marginBottom: '2px' }}>Fragmento [{configBascula?.inicio_lectura ?? 0}:{(configBascula?.inicio_lectura ?? 0) + (configBascula?.longitud_lectura ?? 10)}]:</div>
                    <div style={{ fontFamily: 'monospace', background: '#dbeafe', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', wordBreak: 'break-all', color: '#1e40af', fontWeight: 600 }}>{tramaExtraida}</div>
                  </div>
                )}
                {portInfo && (
                  <>
                    <Row label="USB VID" value={`0x${portInfo.usbVendorId?.toString(16) || 'N/A'}`} />
                    <Row label="USB PID" value={`0x${portInfo.usbProductId?.toString(16) || 'N/A'}`} />
                  </>
                )}
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', marginTop: '4px' }}>
                  <input type="checkbox" checked={autoRegistrar} onChange={e => setAutoRegistrar(e.target.checked)} />
                  Registrar automáticamente en backend
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      {!serialSupported && (
        <div style={{ padding: '10px 16px', borderRadius: '8px', marginBottom: '16px', background: '#fef3c7', color: '#92400e', fontSize: '13px', fontWeight: 500 }}>
          ⚠️ Web Serial API no disponible. Usa <strong>Chrome 89+</strong> o <strong>Edge 89+</strong> con HTTPS o localhost.
        </div>
      )}

      {mensaje && (
        <div style={{
          padding: '10px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', fontWeight: 500,
          background: mensaje.includes('✅') ? '#dcfce7' : mensaje.includes('🔌') ? '#dbeafe' : mensaje.includes('❌') ? '#fef2f2' : '#fef3c7',
          color: mensaje.includes('✅') ? '#166534' : mensaje.includes('🔌') ? '#1e40af' : mensaje.includes('❌') ? '#991b1b' : '#92400e',
        }}>
          {mensaje}
        </div>
      )}

      <div style={{ background: 'var(--card-bg)', borderRadius: '10px', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ margin: 0, fontSize: '14px' }}>📋 Historial de Pesos</h3>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{historial.length} registros</span>
            <button onClick={limpiarHistorial} className="btn btn-sm btn-secondary" style={{ fontSize: '12px' }}>Limpiar</button>
          </div>
        </div>
        {historial.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)', fontSize: '14px' }}>
            No hay registros aún. Conecta una báscula o simula un peso.
          </p>
        ) : (
          <div style={{ overflowX: 'auto', maxHeight: '400px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0 }}>
                  <th style={thStyle}>#</th>
                  <th style={thStyle}>Hora</th>
                  <th style={thStyle}>Báscula</th>
                  <th style={thStyle}>Peso (kg)</th>
                  <th style={thStyle}>Fuente</th>
                  <th style={thStyle}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {historial.map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={tdStyle}>{historial.length - i}</td>
                    <td style={tdStyle}>{r.fecha}</td>
                    <td style={tdStyle}>{r.bascula}</td>
                    <td style={tdStyle}><strong>{r.peso}</strong></td>
                    <td style={tdStyle}>
                      <span style={{
                        padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600,
                        background: r.fuente === 'RS-232' ? '#dbeafe' : r.fuente === 'Manual' ? '#fef3c7' : '#f0fdf4',
                        color: r.fuente === 'RS-232' ? '#1e40af' : r.fuente === 'Manual' ? '#92400e' : '#166534',
                      }}>
                        {r.fuente}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600, background: '#dcfce7', color: '#166534' }}>{r.estado}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  );
};

const Row = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
    <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
    <span style={{ fontWeight: 600 }}>{value}</span>
  </div>
);

const thStyle = { padding: '8px 12px', textAlign: 'left', whiteSpace: 'nowrap', fontWeight: 600, fontSize: '12px', color: '#64748b' };
const tdStyle = { padding: '8px 12px', whiteSpace: 'nowrap' };

export default PruebasBasculas;
