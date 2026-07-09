// src/pages/WaterManagement.jsx
import React, { useEffect, useState } from 'react';
import WaterForm from '../components/Agua/WaterForm.jsx';
import WaterList from '../components/Agua/WaterList.jsx';
import { fetchWaterRecords } from '../services/waterApi.js';
import '../components/Agua/WaterForm.css';

export default function WaterManagement({ tenantId, fincaId, nucleoId }) {
  const [records, setRecords] = useState([]);
  const [filters, setFilters] = useState({});
  const [refresh, setRefresh] = useState(0);

  const loadRecords = async () => {
    if (!tenantId) return;
    try {
      const queryParams = { ...filters, tenantId };
      if (fincaId) queryParams.fincaId = fincaId;
      // You could also map nucleoId if water records use it
      const data = await fetchWaterRecords(queryParams);
      setRecords(data);
    } catch (err) {
      console.error('Error cargando registros de agua:', err);
      alert('No se pudieron cargar los datos.');
    }
  };

  useEffect(() => {
    loadRecords();
  }, [filters, refresh]);

  const handleCreated = () => setRefresh(r => r + 1);
  const handleUpdated = () => setRefresh(r => r + 1);
  const handleDeleted = () => setRefresh(r => r + 1);

  return (
    <div className="water-management container">
      <h1 className="title">Gestión de Agua</h1>
      <WaterForm onSuccess={handleCreated} tenantId={tenantId} fincaId={fincaId} />
      <hr />
      <WaterList
        records={records}
        onUpdate={handleUpdated}
        onDelete={handleDeleted}
        setFilters={setFilters}
      />
    </div>
  );
}
