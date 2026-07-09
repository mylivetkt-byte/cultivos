import React, { useEffect, useState } from 'react';
import { Select, Spin, notification } from 'antd';
import { fetchTableData, API_BASE } from '../../utils/api';
import './BasculaSelector.css'; // we'll create a premium style sheet

/**
 * Componente premium para seleccionar una báscula.
 * - Carga la lista de básculas activas del tenant.
 * - Aplicación de glassmorphism y tipografía Inter.
 * - Micro‑animaciones en hover y foco.
 *
 * Props:
 *   tenantId   (string)  Identificador del tenant.
 *   value      (string|number)  id_bascula seleccionada.
 *   onChange   (func)   Callback(id_bascula).
 */
export default function BasculaSelector({ tenantId, value, onChange }) {
  const [basculas, setBasculas] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!tenantId) return;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetchTableData('basculas', { tenantId, activa: true });
        setBasculas(res.data || []);
      } catch (e) {
        console.error('Error cargando básculas', e);
        notification.error({ message: 'No se pudieron cargar las básculas' });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [tenantId]);

  return (
    <Select
      showSearch
      placeholder="Seleccionar báscula"
      optionFilterProp="children"
      loading={loading}
      value={value}
      onChange={onChange}
      filterOption={(input, option) =>
        (option?.children?.toString()?.toLowerCase() ?? '').includes(input.toLowerCase())
      }
      className="bascula-select"
    >
      {basculas.map(b => (
        <Select.Option key={b.id_bascula} value={b.id_bascula}>
          {b.codigo} - {b.nombre} ({b.capacidad_maxima} {b.unidad})
        </Select.Option>
      ))}
    </Select>
  );
}
