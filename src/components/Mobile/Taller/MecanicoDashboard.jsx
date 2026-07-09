import React from 'react';
import { Home, Wrench, PlayCircle, CheckCircle, Clock } from 'lucide-react';
import TallerOrdenes from './TallerOrdenes';

export default function MecanicoDashboard({ tenantId, activeTab, setActiveTab }) {

  if (activeTab === 'mis_ots') {
    return (
      <div style={{height: '100%', overflow: 'auto', background: '#fff'}}>
        {/* We can reuse TallerOrdenes and pass a prop to hide things or just use it as is for the demo */}
        <TallerOrdenes onBack={() => setActiveTab('home')} tenantId={tenantId} isMecanico={true} />
      </div>
    );
  }

  return (
    <>
      <div className="app-header" style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)' }}>
        <h2>Hola, Mecánico</h2>
        <p>Tu área de trabajo de hoy</p>
        
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.15)', padding: 15, borderRadius: 12 }}>
            <div style={{ fontSize: 24, fontWeight: 'bold' }}>1</div>
            <div style={{ fontSize: 11, opacity: 0.9 }}>En Progreso</div>
          </div>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.15)', padding: 15, borderRadius: 12 }}>
            <div style={{ fontSize: 24, fontWeight: 'bold' }}>3</div>
            <div style={{ fontSize: 11, opacity: 0.9 }}>Asignadas</div>
          </div>
        </div>
      </div>

      <h3 style={{ margin: '10px 20px', fontSize: '1.1rem', color: '#1e293b' }}>Mis Tareas Pendientes</h3>
      
      <div className="task-list">
        <div className="task-card urgent">
          <div className="task-title">[JJD-001] Falla en Motor</div>
          <div className="task-desc">Pérdida de fuerza al acelerar. Revisar inyectores.</div>
          <div className="task-meta">
            <span className="task-badge urgent">URGENTE</span>
            <span>Hace 2 hrs</span>
          </div>
          <button className="btn-primary-mobile">Iniciar Trabajo</button>
        </div>

        <div className="task-card">
          <div className="task-title">[TCI-002] Mantenimiento 250H</div>
          <div className="task-desc">Cambio de aceite, filtros y engrase general.</div>
          <div className="task-meta">
            <span className="task-badge progress">En Progreso</span>
            <span>Inició 08:00 AM</span>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            <button className="btn-primary-mobile" style={{ background: '#f59e0b' }}>Pausar</button>
            <button className="btn-primary-mobile" style={{ background: '#10b981' }}>Finalizar</button>
          </div>
        </div>
      </div>

      <div className="bottom-nav">
        <div className={`nav-item ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>
          <Home size={22} />
          <span>Inicio</span>
        </div>
        <div className={`nav-item ${activeTab === 'mis_ots' ? 'active' : ''}`} onClick={() => setActiveTab('mis_ots')}>
          <Wrench size={22} />
          <span>Mis Trabajos</span>
        </div>
        <div className="nav-item">
          <Clock size={22} />
          <span>Historial</span>
        </div>
      </div>
    </>
  );
}
