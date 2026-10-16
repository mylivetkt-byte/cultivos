import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, CheckCircle2, Fingerprint, LogOut, MapPin, Play, RefreshCw, ShieldAlert, Square, Trash2, UserRound } from 'lucide-react';
import { API_BASE, rrhhGpsLogin, rrhhGpsLogout, rrhhGpsSession, rrhhGpsRegister, rrhhGpsSelfie, rrhhGpsPing } from '../../utils/api';
import { authFetch } from '../../utils/api';

const API_URL = API_BASE;
const STORAGE_KEY = 'wmpa_employee_gps_session';
const DEVICE_KEY = 'wmpa_employee_gps_device';

async function buildDeviceFingerprint() {
  const existing = localStorage.getItem(DEVICE_KEY);
  if (existing) return existing;

  const raw = [
    navigator.userAgent,
    navigator.platform,
    `${window.screen.width}x${window.screen.height}`,
    `${window.devicePixelRatio}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone
  ].join('|');

  const bytes = new TextEncoder().encode(raw);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hash = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
  localStorage.setItem(DEVICE_KEY, hash);
  return hash;
}

function formatTime(value) {
  if (!value) return 'N/D';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function minutesSince(value) {
  if (!value) return null;
  const diff = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(diff) || diff < 0) return null;
  return Math.floor(diff / 60000);
}

function dataUrlToBlob(dataUrl) {
  const [meta, base64] = dataUrl.split(',');
  const mimeMatch = meta.match(/data:(.*);base64/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const binary = atob(base64);
  const length = binary.length;
  const buffer = new Uint8Array(length);
  for (let i = 0; i < length; i += 1) buffer[i] = binary.charCodeAt(i);
  return new Blob([buffer], { type: mimeType });
}

const initialForm = {
  documento: '',
  pin: '',
  confirmPin: '',
  deviceName: navigator.userAgent.includes('Mobile') ? 'Móvil' : 'Dispositivo web'
};

export default function EmpleadoApp({ tenantId }) {
  const watchRef = useRef(null);
  const cameraVideoRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const cameraCanvasRef = useRef(null);
  const [authMode, setAuthMode] = useState('login');
  const [form, setForm] = useState(initialForm);
  const [deviceFingerprint, setDeviceFingerprint] = useState('');
  const [session, setSession] = useState(null);
  const [selfieBase64, setSelfieBase64] = useState('');
  const [selfiePreview, setSelfiePreview] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [selfieTakenAt, setSelfieTakenAt] = useState(null);
  const [labores, setLabores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [gpsSharing, setGpsSharing] = useState(false);
  const [gpsStatus, setGpsStatus] = useState('');
  const [lastPingAt, setLastPingAt] = useState(null);
  const [workerPoint, setWorkerPoint] = useState(null);

  const employeeName = useMemo(() => {
    if (!session?.empleado) return '';
    const { nombres, apellidos } = session.empleado;
    return [nombres, apellidos].filter(Boolean).join(' ').trim();
  }, [session]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const fingerprint = await buildDeviceFingerprint();
        if (!cancelled) setDeviceFingerprint(fingerprint);

        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            const check = await rrhhGpsSession(parsed.session_token);
            const restored = {
              ...parsed,
              empleado: check.empleado,
              gps_identificador: check.gps_identificador,
              session_expires: check.session_expires,
              device_name: check.device_name,
              selfie_taken_at: check.selfie_taken_at
            };
            if (!cancelled) setSession(restored);
            if (!cancelled) setSelfieTakenAt(check.selfie_taken_at || null);
          } catch {
            localStorage.removeItem(STORAGE_KEY);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!session?.empleado?.id_empleado) {
      setLabores([]);
      return;
    }

    let alive = true;
    setLoading(true);
    authFetch(`${API_URL}/cuadrilla/mis-labores?empleadoId=${session.empleado.id_empleado}`)
      .then((res) => res.json())
      .then((data) => {
        if (alive) setLabores(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error(err);
        if (alive) setLabores([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [session?.empleado?.id_empleado]);

  useEffect(() => {
    return () => {
      if (watchRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchRef.current);
      }
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => track.stop());
        cameraStreamRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (cameraVideoRef.current && cameraStreamRef.current) {
      cameraVideoRef.current.srcObject = cameraStreamRef.current;
    }
  }, [cameraActive]);

  const saveSession = (payload) => {
    setSession(payload);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  };

  const clearSession = async () => {
    try {
      if (session?.session_token) await rrhhGpsLogout(session.session_token);
    } catch (err) {
      console.error(err);
    }
    closeCamera();
    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
    setGpsSharing(false);
    setGpsStatus('');
    setWorkerPoint(null);
    setSelfieBase64('');
    setSelfiePreview('');
    setSelfieTakenAt(null);
    if (watchRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchRef.current);
    }
    watchRef.current = null;
  };

  const openCamera = async () => {
    try {
      setCameraError('');
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Este dispositivo no permite cámara web.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false
      });
      cameraStreamRef.current = stream;
      setCameraActive(true);
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      setCameraError(err.message || 'No fue posible abrir la cámara.');
    }
  };

  const closeCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }
    setCameraActive(false);
  };

  const captureSelfie = async () => {
    const video = cameraVideoRef.current;
    const canvas = cameraCanvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 960;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const image = canvas.toDataURL('image/jpeg', 0.82);
    setSelfieBase64(image);
    setSelfiePreview(image);
    setSelfieTakenAt(new Date().toISOString());
    setCameraError('');
    closeCamera();

    if (session?.session_token) {
      try {
        const result = await rrhhGpsSelfie({
          session_token: session.session_token,
          selfieBase64: image
        });
        setSelfieTakenAt(result.selfie_taken_at);
        setSession((prev) => {
          if (!prev) return prev;
          const updated = { ...prev, selfie_taken_at: result.selfie_taken_at };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
          return updated;
        });
      } catch (err) {
        setGpsStatus(err.message);
      }
    }
  };

  const clearSelfie = () => {
    setSelfieBase64('');
    setSelfiePreview('');
    setSelfieTakenAt(null);
  };

  const submitAuth = async (event) => {
    event.preventDefault();
    if (!form.documento || !form.pin) return;
    if (authMode === 'register' && form.pin !== form.confirmPin) {
      setGpsStatus('El PIN de confirmación no coincide.');
      return;
    }
    if (!selfieBase64) {
      setGpsStatus('La selfie es obligatoria para registrar o iniciar sesión.');
      return;
    }

    setLoadingAuth(true);
    setGpsStatus('');

    try {
      const payload = {
        tenantId,
        documento: form.documento.trim(),
        pin: form.pin,
        deviceFingerprint,
        deviceName: form.deviceName || 'Dispositivo móvil',
        selfieBase64
      };

      const result = authMode === 'register'
        ? await rrhhGpsRegister(payload)
        : await rrhhGpsLogin(payload);

      const nextSession = {
        session_token: result.session_token,
        session_expires: result.session_expires,
        gps_identificador: result.gps_identificador,
        empleado: result.empleado,
        device_name: form.deviceName || 'Dispositivo móvil',
        selfie_taken_at: result.selfie_taken_at
      };
      saveSession(nextSession);
      setSelfieTakenAt(result.selfie_taken_at || new Date().toISOString());
      setGpsStatus(authMode === 'register' ? 'Acceso registrado y vinculado a este dispositivo.' : 'Sesión iniciada.');
    } catch (err) {
      setGpsStatus(err.message);
    } finally {
      setLoadingAuth(false);
    }
  };

  const startGpsShare = () => {
    if (!session?.session_token) return;
    if (!navigator.geolocation) {
      setGpsStatus('Este navegador no soporta geolocalización.');
      return;
    }

    const selfieAge = minutesSince(selfieTakenAt || session?.selfie_taken_at);
    if (!selfieBase64 || selfieAge === null || selfieAge > 15) {
      setGpsStatus('La selfie debe renovarse antes de compartir GPS. Toma una nueva captura.');
      return;
    }

    setGpsStatus('Solicitando GPS...');
    setGpsSharing(true);

    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current);
    }

    watchRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude, speed, heading, accuracy } = position.coords;
        const point = { lat: latitude, lng: longitude, accuracy: Math.round(accuracy || 0) };
        setWorkerPoint(point);

        if (point.accuracy > 120) {
          setGpsStatus('La precisión del GPS es muy baja. Mueva el dispositivo a un lugar abierto.');
          return;
        }

        try {
          await rrhhGpsPing({
            session_token: session.session_token,
            deviceFingerprint,
            identificador_gps: session.gps_identificador,
            latitud: latitude,
            longitud: longitude,
            velocidad: Number.isFinite(speed) ? speed : 0,
            direccion: Number.isFinite(heading) ? heading : 0,
            auto_register: true,
            tipo_entidad: 'Empleado',
            tenantId,
            id_empleado: session.empleado.id_empleado
          });
          setLastPingAt(new Date().toISOString());
          setGpsStatus('GPS compartido en tiempo real.');
        } catch (err) {
          setGpsStatus(err.message);
        }
      },
      (err) => {
        setGpsStatus(err.message || 'No fue posible activar el GPS.');
        setGpsSharing(false);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
  };

  const stopGpsShare = () => {
    if (watchRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchRef.current);
    }
    watchRef.current = null;
    setGpsSharing(false);
    setGpsStatus('Compartición de GPS detenida.');
  };

  if (!session) {
    return (
      <div style={{ minHeight: '100vh', padding: '20px', background: '#0f172a', color: '#e2e8f0' }}>
        <div style={{ maxWidth: '520px', margin: '0 auto', background: '#111827', border: '1px solid rgba(148, 163, 184, 0.25)', borderRadius: '10px', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <UserRound size={20} />
            <div>
              <div style={{ fontWeight: 800, fontSize: '20px' }}>App móvil del empleado</div>
              <div style={{ fontSize: '13px', color: '#94a3b8' }}>Acceso real con sesión, dispositivo y GPS vinculado.</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
            <button
              type="button"
              onClick={() => setAuthMode('login')}
              className="btn"
              style={{ flex: 1, background: authMode === 'login' ? '#2563eb' : '#1e293b', color: '#fff' }}
            >
              Ingresar
            </button>
            <button
              type="button"
              onClick={() => setAuthMode('register')}
              className="btn"
              style={{ flex: 1, background: authMode === 'register' ? '#2563eb' : '#1e293b', color: '#fff' }}
            >
              Registrar
            </button>
          </div>

          <form onSubmit={submitAuth} style={{ display: 'grid', gap: '12px' }}>
            <label style={{ display: 'grid', gap: '6px', fontSize: '13px' }}>
              Documento
              <input
                value={form.documento}
                onChange={(e) => setForm((prev) => ({ ...prev, documento: e.target.value }))}
                placeholder="Cédula o documento"
                style={{ padding: '12px', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: '#fff' }}
              />
            </label>
            <label style={{ display: 'grid', gap: '6px', fontSize: '13px' }}>
              PIN
              <input
                type="password"
                value={form.pin}
                onChange={(e) => setForm((prev) => ({ ...prev, pin: e.target.value }))}
                placeholder="4 a 6 dígitos"
                style={{ padding: '12px', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: '#fff' }}
              />
            </label>
            {authMode === 'register' && (
              <label style={{ display: 'grid', gap: '6px', fontSize: '13px' }}>
                Confirmar PIN
                <input
                  type="password"
                  value={form.confirmPin}
                  onChange={(e) => setForm((prev) => ({ ...prev, confirmPin: e.target.value }))}
                  placeholder="Repita el PIN"
                  style={{ padding: '12px', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: '#fff' }}
                />
              </label>
            )}
            <label style={{ display: 'grid', gap: '6px', fontSize: '13px' }}>
              Nombre del dispositivo
              <input
                value={form.deviceName}
                onChange={(e) => setForm((prev) => ({ ...prev, deviceName: e.target.value }))}
                placeholder="Ej. Samsung del campo"
                style={{ padding: '12px', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: '#fff' }}
              />
            </label>

            <div style={{ border: '1px solid #334155', borderRadius: '10px', padding: '12px', background: '#0f172a' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700 }}>Selfie obligatoria</div>
                <button type="button" className="btn btn-outline" onClick={cameraActive ? closeCamera : openCamera} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Camera size={16} />
                  {cameraActive ? 'Cerrar cámara' : selfiePreview ? 'Tomar otra' : 'Abrir cámara'}
                </button>
              </div>

              {cameraError && (
                <div style={{ marginBottom: '10px', padding: '10px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.12)', color: '#fecaca', border: '1px solid rgba(239, 68, 68, 0.22)' }}>
                  {cameraError}
                </div>
              )}

              {cameraActive ? (
                <div style={{ display: 'grid', gap: '10px' }}>
                  <video ref={cameraVideoRef} autoPlay playsInline muted style={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', borderRadius: '8px', background: '#000' }} />
                  <canvas ref={cameraCanvasRef} style={{ display: 'none' }} />
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button type="button" className="btn btn-primary" onClick={captureSelfie} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <Camera size={16} />
                      Capturar selfie
                    </button>
                    <button type="button" className="btn btn-outline" onClick={closeCamera}>Cancelar</button>
                  </div>
                </div>
              ) : selfiePreview ? (
                <div style={{ display: 'grid', gap: '8px' }}>
                  <img src={selfiePreview} alt="Selfie previa" style={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', borderRadius: '8px', border: '1px solid #334155' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#cbd5e1' }}>
                    <span>Selfie lista para validación.</span>
                    <button type="button" className="btn btn-outline" onClick={clearSelfie} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <Trash2 size={16} />
                      Limpiar
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ color: '#94a3b8', fontSize: '12px', lineHeight: 1.5 }}>
                  Antes de entrar, abre la cámara y toma una selfie. La sesión no se crea sin esa evidencia.
                </div>
              )}
            </div>

            {gpsStatus && (
              <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.25)', color: '#bfdbfe', fontSize: '13px' }}>
                {gpsStatus}
              </div>
            )}

            <button type="submit" className="btn btn-primary" disabled={loadingAuth} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              {loadingAuth ? 'Procesando...' : authMode === 'register' ? 'Crear acceso' : 'Iniciar sesión'}
            </button>
          </form>

          <div style={{ marginTop: '14px', color: '#94a3b8', fontSize: '12px', lineHeight: 1.5 }}>
            El acceso queda amarrado a este dispositivo. Si cambia el teléfono, el sistema debe volver a registrar el acceso para evitar suplantación.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a' }}>
            <CheckCircle2 size={18} color="#10b981" />
            <h2 style={{ margin: 0 }}>Bienvenido, {employeeName || 'empleado'}</h2>
          </div>
          <div style={{ color: '#64748b', fontSize: '13px', marginTop: '4px' }}>
            {session.empleado?.cargo || 'Sin cargo'} · GPS {session.gps_identificador}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="btn btn-outline" onClick={() => window.location.reload()} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <RefreshCw size={16} /> Refrescar
          </button>
          <button className="btn btn-outline" onClick={clearSession} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <LogOut size={16} /> Cerrar sesión
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '16px' }}>
        <aside style={{ background: 'var(--bg-card)', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
            <div style={{ color: '#64748b', fontSize: '12px' }}>Estado de sesión</div>
            <div style={{ fontWeight: 800, marginTop: '4px' }}>Activa hasta {formatTime(session.session_expires)}</div>
          </div>
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
            <div style={{ color: '#64748b', fontSize: '12px' }}>Dispositivo vinculado</div>
            <div style={{ fontWeight: 800, marginTop: '4px' }}>{session.device_name || 'Dispositivo móvil'}</div>
            <div style={{ color: '#64748b', fontSize: '12px', marginTop: '4px' }}>
              <Fingerprint size={14} style={{ verticalAlign: 'text-bottom' }} /> {deviceFingerprint.slice(0, 12)}...
            </div>
          </div>
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
            <div style={{ color: '#64748b', fontSize: '12px' }}>Compartición GPS</div>
            <div style={{ fontWeight: 800, marginTop: '4px', color: gpsSharing ? '#10b981' : '#0f172a' }}>
              {gpsSharing ? 'Activa' : 'Detenida'}
            </div>
            <div style={{ color: '#64748b', fontSize: '12px', marginTop: '6px' }}>
              {lastPingAt ? `Último ping: ${new Date(lastPingAt).toLocaleTimeString()}` : 'Sin ping todavía'}
            </div>
          </div>

          <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ fontWeight: 800 }}>Selfie de seguridad</div>
              <button type="button" className="btn btn-outline" onClick={cameraActive ? closeCamera : openCamera} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Camera size={16} />
                {cameraActive ? 'Cerrar cámara' : 'Actualizar selfie'}
              </button>
            </div>
            <div style={{ color: '#64748b', fontSize: '12px', marginBottom: '8px' }}>
              {selfieTakenAt ? `Tomada hace ${minutesSince(selfieTakenAt)} min` : 'No hay selfie registrada'}
            </div>
            {selfiePreview && !cameraActive && (
              <img src={selfiePreview} alt="Selfie de seguridad" style={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
            )}
            {cameraActive && (
              <div style={{ display: 'grid', gap: '10px' }}>
                <video ref={cameraVideoRef} autoPlay playsInline muted style={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', borderRadius: '8px', background: '#000' }} />
                <canvas ref={cameraCanvasRef} style={{ display: 'none' }} />
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button type="button" className="btn btn-primary" onClick={captureSelfie} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <Camera size={16} />
                    Capturar y validar
                  </button>
                  <button type="button" className="btn btn-outline" onClick={closeCamera}>Cancelar</button>
                </div>
              </div>
            )}
          </div>

          {gpsStatus && (
            <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.12)', color: '#065f46', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
              {gpsStatus}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={startGpsShare} disabled={gpsSharing} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <Play size={16} /> Iniciar GPS
            </button>
            <button className="btn btn-outline" onClick={stopGpsShare} disabled={!gpsSharing} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <Square size={16} /> Detener
            </button>
          </div>

          <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <ShieldAlert size={16} color="#f59e0b" />
              <strong>Controles de seguridad</strong>
            </div>
            <ul style={{ margin: 0, paddingLeft: '18px', color: '#475569', fontSize: '13px', lineHeight: 1.6 }}>
              <li>El acceso queda ligado al PIN y al dispositivo actual.</li>
              <li>Si el dispositivo cambia, debe volver a registrarse.</li>
              <li>La sesión expira automáticamente y exige reingreso.</li>
              <li>Se rechazan ubicaciones con precisión muy baja.</li>
            </ul>
          </div>
        </aside>

        <section style={{ background: 'var(--bg-card)', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
          <h3 style={{ marginTop: 0 }}>Mis labores de hoy</h3>
          {loading ? (
            <div style={{ color: '#64748b' }}>Cargando labores reales...</div>
          ) : labores.length === 0 ? (
            <div style={{ color: '#64748b' }}>No hay labores asignadas para este empleado en la base de datos.</div>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {labores.map((labor) => (
                <div key={labor.id_labor} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                    <strong>{labor.descripcion_labor}</strong>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: labor.estado === 'Completada' ? '#10b981' : labor.estado === 'Incumplida' ? '#ef4444' : '#2563eb' }}>
                      {labor.estado}
                    </span>
                  </div>
                  <div style={{ color: '#64748b', fontSize: '13px', marginTop: '8px', display: 'grid', gap: '4px' }}>
                    <div><MapPin size={14} style={{ verticalAlign: 'text-bottom' }} /> {labor.finca_nombre || 'Sin finca'} · {labor.lote_nombre || 'Sin lote'}</div>
                    <div>Fecha: {labor.fecha_planificada}</div>
                    {labor.categoria && <div>Categoría: {labor.categoria}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: '18px', borderTop: '1px solid #e2e8f0', paddingTop: '14px', color: '#64748b', fontSize: '13px' }}>
            {workerPoint ? (
              <>
                <div><strong style={{ color: '#0f172a' }}>Latitud:</strong> {workerPoint.lat.toFixed(6)}</div>
                <div><strong style={{ color: '#0f172a' }}>Longitud:</strong> {workerPoint.lng.toFixed(6)}</div>
                <div><strong style={{ color: '#0f172a' }}>Precisión:</strong> {workerPoint.accuracy} m</div>
              </>
            ) : (
              <div>Activa GPS para comenzar a compartir ubicación en tiempo real.</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
