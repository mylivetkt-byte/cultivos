// src/components/Agua/WaterList.jsx
import React, { useState } from 'react';
import { deleteWaterRecord, updateWaterRecord, fetchWaterOptions } from '../../services/waterApi.js';
import WaterForm from './WaterForm.jsx';
import './WaterList.css';

export default function WaterList({ records, onUpdate, onDelete, setFilters }) {
  // Estado para edición en línea
  const [editingId, setEditingId] = useState(null);

  const [options, setOptions] = React.useState([]);

  React.useEffect(() => {
    fetchWaterOptions().then(setOptions).catch(console.error);
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este registro?')) return;
    try {
      await deleteWaterRecord(id);
      onDelete();
    } catch (err) {
      console.error('Error al eliminar:', err);
      alert('No se pudo eliminar el registro.');
    }
  };

  const startEdit = (id) => {
    setEditingId(id);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleSuccess = () => {
    setEditingId(null);
    onUpdate();
  };

  // Filtros rápidos por tipo de agua
  const applyFilter = (option) => {
    setFilters((prev) => ({ ...prev, waterOption: option }));
  };

  return (
    <div className="water-list glass">
      <h2 className="section-title">Registros de Agua</h2>
      <div className="filter-bar">
        <button onClick={() => applyFilter('')}>Todos</button>
        {options.map((opt) => (
          <button key={opt} onClick={() => applyFilter(opt)}>{opt}</button>
        ))}
      </div>
      <table className="records-table">
        <thead>
          <tr>
            <th>Finca</th>
            <th>Lote</th>
            <th>Semillero</th>
            <th>Tipo</th>
            <th>Inicio</th>
            <th>Fin</th>
            <th>Nivel</th>
            <th>Capacidad</th>
            <th>Ubicación</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {records.map((rec) => (
            <tr key={rec.id}>
              <td>{rec.id_finca}</td>
              <td>{rec.id_lote || '-'} </td>
              <td>{rec.id_semillero || '-'} </td>
              <td>{rec.water_option}</td>
              <td>{rec.fecha_inicio?.split('T')[0]}</td>
              <td>{rec.fecha_fin?.split('T')[0]}</td>
              <td>{rec.nivel || '-'} </td>
              <td>{rec.capacidad || '-'} </td>
              <td>{rec.ubicacion || '-'} </td>
              <td className="actions-cell">
                <button className="edit-btn" onClick={() => startEdit(rec.id)} title="Editar">✏️</button>
                <button className="delete-btn" onClick={() => handleDelete(rec.id)} title="Eliminar">🗑️</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Formulario de edición emergente */}
      {editingId && (
        <div className="modal-backdrop">
          <div className="modal-content glass">
            <button className="close-modal" onClick={cancelEdit}>✖️</button>
            <WaterForm
              initialData={records.find((r) => r.id === editingId)}
              onSuccess={handleSuccess}
            />
          </div>
        </div>
      )}
    </div>
  );
}
