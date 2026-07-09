import React from 'react';
import { Home, ClipboardList, Package, CheckCircle, FileText, Wrench } from 'lucide-react';
import TallerOrdenes from './TallerOrdenes';
import TallerNuevaOT from './TallerNuevaOT';
import TallerCierreFinal from './TallerCierreFinal';
import TallerInventario from './TallerInventario';
import TallerHistorialPedidos from './TallerHistorialPedidos';
export default function JefeTallerDashboard({ tenantId, activeTab, setActiveTab }) {
  
  if (activeTab === 'ordenes') {
    return (
      <div style={{height: '100%', overflow: 'auto', background: '#fff'}}>
        <TallerOrdenes onBack={() => setActiveTab('home')} tenantId={tenantId} />
      </div>
    );
  }
  
  if (activeTab === 'nueva_ot') {
    return (
      <div style={{height: '100%', overflow: 'auto', background: '#fff'}}>
        <TallerNuevaOT onBack={() => setActiveTab('home')} tenantId={tenantId} />
      </div>
    );
  }

  if (activeTab === 'inventario') {
    return (
      <div style={{height: '100%', overflow: 'auto', background: '#fff'}}>
        <TallerInventario onBack={() => setActiveTab('home')} tenantId={tenantId} />
      </div>
    );
  }

  if (activeTab === 'historial_pedidos') {
    return (
      <div style={{height: '100%', overflow: 'auto', background: '#fff'}}>
        <TallerHistorialPedidos onBack={() => setActiveTab('home')} tenantId={tenantId} />
      </div>
    );
  }

  if (activeTab === 'cierre_final') {
    return (
      <div style={{height: '100%', overflow: 'auto', background: '#fff'}}>
        <TallerCierreFinal onBack={() => setActiveTab('home')} tenantId={tenantId} />
      </div>
    );
  }

  return (
    <>
      <div className="app-header">
        <h2>Hola, Jefe de Taller</h2>
        <p>Resumen de hoy</p>
        
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.1)', padding: 15, borderRadius: 12 }}>
            <div style={{ fontSize: 24, fontWeight: 'bold' }}>5</div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>OTs Activas</div>
          </div>
          <div style={{ flex: 1, background: 'rgba(239, 68, 68, 0.2)', padding: 15, borderRadius: 12 }}>
            <div style={{ fontSize: 24, fontWeight: 'bold' }}>2</div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>Varadas</div>
          </div>
          <div style={{ flex: 1, background: 'rgba(16, 185, 129, 0.2)', padding: 15, borderRadius: 12 }}>
            <div style={{ fontSize: 24, fontWeight: 'bold' }}>3</div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>Para Cierre</div>
          </div>
        </div>
      </div>

      <div className="dash-grid">
        <div className="action-card" onClick={() => setActiveTab('ordenes')}>
          <div className="icon-circle" style={{ background: '#eff6ff', color: '#3b82f6' }}>
            <ClipboardList size={28} />
          </div>
          <h4>Supervisar OTs</h4>
          <p>Ver todas las órdenes</p>
        </div>
        <div className="action-card" onClick={() => setActiveTab('nueva_ot')}>
          <div className="icon-circle" style={{ background: '#fef2f2', color: '#ef4444' }}>
            <Wrench size={28} />
          </div>
          <h4>Crear OT</h4>
          <p>Nueva orden de trabajo</p>
        </div>
        <div className="action-card" onClick={() => setActiveTab('inventario')}>
          <div className="icon-circle" style={{ background: '#fefce8', color: '#eab308' }}>
            <Package size={28} />
          </div>
          <h4>Repuestos</h4>
          <p>Solicitar a bodega</p>
        </div>
        <div className="action-card" onClick={() => setActiveTab('historial_pedidos')}>
          <div className="icon-circle" style={{ background: '#f5f3ff', color: '#8b5cf6' }}>
            <FileText size={28} />
          </div>
          <h4>Historial Pedidos</h4>
          <p>Consultar repuestos</p>
        </div>
        <div className="action-card" onClick={() => setActiveTab('cierre_final')}>
          <div className="icon-circle" style={{ background: '#ecfdf5', color: '#10b981' }}>
            <CheckCircle size={28} />
          </div>
          <h4>Cierre Final</h4>
          <p>Aprobar OTs listas</p>
        </div>
      </div>

      <div className="bottom-nav">
        <div className={`nav-item ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>
          <Home size={22} />
          <span>Inicio</span>
        </div>
        <div className={`nav-item ${activeTab === 'ordenes' ? 'active' : ''}`} onClick={() => setActiveTab('ordenes')}>
          <ClipboardList size={22} />
          <span>Órdenes</span>
        </div>
        <div className={`nav-item ${activeTab === 'inventario' ? 'active' : ''}`} onClick={() => setActiveTab('inventario')}>
          <Package size={22} />
          <span>Bodega</span>
        </div>
      </div>
    </>
  );
}
