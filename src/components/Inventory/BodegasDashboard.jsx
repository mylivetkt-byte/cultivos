import React, { useState, useEffect } from 'react';
import TransaccionesBodega from './TransaccionesBodega';
import ConsultaExistencias from './ConsultaExistencias';
import AprobacionPedidos from './AprobacionPedidos';
import HistoricoCostos from './HistoricoCostos';
import ControlRepuestosUsados from './ControlRepuestosUsados';

export default function BodegasDashboard({ tenantId, fincaId }) {
  const [activeTab, setActiveTab] = useState('existencias');

  if (!tenantId) {
    return (
      <div style={{ padding: '24px', color: 'var(--text-muted)' }}>
        Seleccione un cliente (tenant) en la barra superior para gestionar el inventario.
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--sidebar-bg)' }}>📦 Módulo de Bodegas e Inventario</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)' }}>
            Gestión avanzada de stock, transferencias inter-bodegas y pedidos automáticos
          </p>
        </div>
      </div>

      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        marginBottom: '24px', 
        borderBottom: '1px solid var(--border)' 
      }}>
        <TabButton active={activeTab === 'existencias'} onClick={() => setActiveTab('existencias')}>
          🔍 Consulta Existencias
        </TabButton>
        <TabButton active={activeTab === 'transacciones'} onClick={() => setActiveTab('transacciones')}>
          📝 Transacciones (Ent/Sal/Tra)
        </TabButton>
        <TabButton active={activeTab === 'pedidos'} onClick={() => setActiveTab('pedidos')}>
          📥 Aprobación de Pedidos
        </TabButton>
        <TabButton active={activeTab === 'historico'} onClick={() => setActiveTab('historico')}>
          📊 Histórico y Costos
        </TabButton>
        <TabButton active={activeTab === 'repuestos'} onClick={() => setActiveTab('repuestos')}>
          🔧 Logística Inversa (Repuestos)
        </TabButton>
      </div>

      <div style={{ background: 'var(--card-bg)', borderRadius: 'var(--radius)', padding: '24px', boxShadow: 'var(--shadow)' }}>
        {activeTab === 'existencias' && <ConsultaExistencias tenantId={tenantId} fincaId={fincaId} />}
        {activeTab === 'transacciones' && <TransaccionesBodega tenantId={tenantId} fincaId={fincaId} />}
        {activeTab === 'pedidos' && <AprobacionPedidos tenantId={tenantId} fincaId={fincaId} />}
        {activeTab === 'historico' && <HistoricoCostos tenantId={tenantId} fincaId={fincaId} />}
        {activeTab === 'repuestos' && <ControlRepuestosUsados tenantId={tenantId} />}
      </div>
    </div>
  );
}

function TabButton({ children, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '12px 24px',
        background: active ? 'var(--primary)' : 'transparent',
        color: active ? 'white' : 'var(--text-secondary)',
        border: 'none',
        borderRadius: 'var(--radius) var(--radius) 0 0',
        cursor: 'pointer',
        fontWeight: 600,
        fontSize: '14px',
        transition: 'all 0.2s ease',
        borderBottom: active ? '3px solid var(--primary-dark)' : '3px solid transparent'
      }}
    >
      {children}
    </button>
  );
}
