import React, { useState } from 'react';
import { Upload, Button, message, Spin } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { authFetch } from '../../utils/api';
import './Harvest.css';

export default function CosechasImport() {
  const [loading, setLoading] = useState(false);

  const handleUpload = async ({ file }) => {
    const formData = new FormData();
    formData.append('file', file);
    setLoading(true);
    try {
      const res = await authFetch('/cosechas/import', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error en la importación');
      }
      const data = await res.json();
      message.success(`Importación exitosa: ${data.inserted} filas insertadas`);
    } catch (err) {
      message.error(err.message || 'Error al subir el archivo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="harvest-import glass">
      <h2 className="title">Importar Cosechas (CSV)</h2>
      <Spin spinning={loading}>
        <Upload
          accept=".csv"
          customRequest={handleUpload}
          showUploadList={false}
          maxCount={1}
        >
          <Button icon={<UploadOutlined />}>Seleccionar archivo CSV</Button>
        </Upload>
        <p style={{ marginTop: '12px', color: 'var(--text-color)' }}>
          El archivo debe incluir columnas: id_parcela, id_cultivo, codigoCosecha, fecha_cosecha, peso_total_kg.
        </p>
      </Spin>
    </div>
  );
}
