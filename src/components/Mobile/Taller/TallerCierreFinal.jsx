import React, { useState, useEffect } from 'react';
import { authFetch } from '../../../utils/api';
import { CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react';
import { Button, List, Tag, Typography, message, Modal, Input, Rate } from 'antd';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const TallerCierreFinal = ({ onBack, tenantId }) => {
  const [ordenes, setOrdenes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [closeModalVisible, setCloseModalVisible] = useState(false);
  const [selectedOT, setSelectedOT] = useState(null);
  const [notasCierre, setNotasCierre] = useState('');

  useEffect(() => {
    loadOrdenes();
  }, []);

  const loadOrdenes = async () => {
    setLoading(true);
    try {
      // Fetch all OTs and filter those ready for closure
      // Usually estado = 'Completado', 'Finalizado', 'Para Cierre', or similar.
      // For now we'll fetch all and filter anything that is not 'Cerrado' or 'Cancelado'
      const res = await authFetch(`/api/taller/ordenes-trabajo?tenantId=${tenantId}`);
      const { success, data } = await res.json();
      if (success) {
        // Asumiendo que el jefe puede cerrar las que están Completadas o En Progreso 
        const paraCierre = data.filter(ot => ot.estado !== 'Cerrado' && ot.estado !== 'Cancelado');
        setOrdenes(paraCierre);
      }
    } catch (e) {
      console.error(e);
      message.error("Error al cargar OTs pendientes de cierre");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCloseModal = (ot) => {
    setSelectedOT(ot);
    setNotasCierre('');
    setCloseModalVisible(true);
  };

  const handleConfirmCierre = async () => {
    if (!selectedOT) return;
    try {
      // Usamos el endpoint PUT para actualizar el estado
      const res = await authFetch(`/api/taller/ordenes-trabajo/${selectedOT.id_orden_trabajo}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'Cerrado' })
      });
      const data = await res.json();
      if (data.success) {
        message.success(`OT #${selectedOT.numero_orden || selectedOT.id_orden_trabajo} cerrada correctamente`);
        setCloseModalVisible(false);
        loadOrdenes();
      } else {
        message.error("Error al cerrar: " + data.error);
      }
    } catch (e) {
      console.error(e);
      message.error("Error en la conexión");
    }
  };

  return (
    <div style={{ padding: '20px', background: '#f8fafc', minHeight: '100%' }}>
      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', padding: 0, color: '#10b981' }}>←</button>
        <Title level={3} style={{ margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle size={24} color="#10b981" /> 
          Cierre Final de OTs
        </Title>
      </div>

      <p style={{ color: '#64748b', marginBottom: '20px' }}>
        Revisa las órdenes completadas por los mecánicos y apruébalas para su cierre definitivo en el sistema.
      </p>

      {loading ? (
        <p>Cargando órdenes pendientes...</p>
      ) : (
        <List
          dataSource={ordenes}
          renderItem={ot => (
            <div style={{ background: 'white', padding: '15px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '15px', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <Text strong style={{ fontSize: '1.1rem' }}>
                  OT #{ot.numero_orden || ot.id_orden_trabajo}
                </Text>
                <Tag color={ot.estado === 'Completado' ? 'green' : 'orange'}>{ot.estado || 'Activo'}</Tag>
              </div>
              
              <div style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '12px' }}>
                <div><b>Máquina:</b> {ot.maquina_nombre ? `[${ot.placa}] ${ot.maquina_nombre}` : 'N/A'}</div>
                <div><b>Mecánico:</b> {ot.mecanico_nombre} {ot.mecanico_apellido}</div>
                <div><b>Fecha:</b> {dayjs(ot.fecha_inicio).format('DD/MM/YYYY')}</div>
                <div style={{ marginTop: '8px', background: '#f1f5f9', padding: '8px', borderRadius: '6px' }}>
                  <b>Problema:</b> {ot.descripcion_problema}
                </div>
              </div>

              <Button 
                type="primary" 
                style={{ width: '100%', background: '#10b981', borderColor: '#10b981' }}
                onClick={() => handleOpenCloseModal(ot)}
              >
                Aprobar y Cerrar <ArrowRight size={16} style={{ marginLeft: 5 }} />
              </Button>
            </div>
          )}
          locale={{ emptyText: 'No hay órdenes pendientes de cierre.' }}
        />
      )}

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle color="#10b981" /> Cerrar Orden Definitivamente
          </div>
        }
        open={closeModalVisible}
        onOk={handleConfirmCierre}
        onCancel={() => setCloseModalVisible(false)}
        okText="Cerrar OT"
        cancelText="Cancelar"
        okButtonProps={{ style: { background: '#10b981', borderColor: '#10b981' } }}
      >
        {selectedOT && (
          <div>
            <p>Estás a punto de cerrar la <b>OT #{selectedOT.numero_orden || selectedOT.id_orden_trabajo}</b> correspondiente a la máquina <b>[{selectedOT.placa}] {selectedOT.maquina_nombre}</b>.</p>
            <p>Una vez cerrada, no se podrán solicitar más repuestos ni cargar más horas laboradas a esta orden.</p>
            
            <div style={{ marginTop: '20px' }}>
              <Text strong>Calificación del Trabajo (Opcional)</Text>
              <br/>
              <Rate defaultValue={5} style={{ marginBottom: '15px' }} />
            </div>
            
            <div style={{ marginTop: '10px' }}>
              <Text strong>Notas del Jefe de Taller</Text>
              <Input.TextArea 
                rows={3} 
                placeholder="Observaciones finales sobre la reparación..." 
                value={notasCierre}
                onChange={e => setNotasCierre(e.target.value)}
                style={{ marginTop: '5px' }}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default TallerCierreFinal;
