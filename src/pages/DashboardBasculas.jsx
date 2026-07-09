import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Table, Button, DatePicker, message, Spin } from 'antd';
import { DownloadOutlined, FileExcelOutlined, FilePdfOutlined } from '@ant-design/icons';
import './DashboardBasculas.css';

const { RangePicker } = DatePicker;

const DashboardBasculas = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState(null);

  const tenantId = localStorage.getItem('selectedTenant') || '';

  const fetchData = async (startDate, endDate) => {
    if (!tenantId) {
      message.warning('Seleccione un cliente (tenant) antes de cargar el reporte');
      return;
    }
    setLoading(true);
    try {
      const params = { tenantId };
      if (startDate && endDate) {
        params.startDate = startDate;
        params.endDate = endDate;
      }
      const res = await axios.get('/api/basculas/reportes/pesos-diarios', { params });
      // Transformar filas para AntD Table (key)
      const rows = res.data.map((r, idx) => ({
        key: idx,
        fecha: r.fecha,
        id_bascula: r.id_bascula,
        codigo: r.codigo,
        nombre: r.nombre,
        peso_total: r.peso_total,
      }));
      setData(rows);
    } catch (err) {
      console.error(err);
      message.error('Error al cargar el reporte');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Cargar sin filtro al montar
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRangeChange = (dates) => {
    if (dates) {
      const [start, end] = dates;
      const startStr = start.format('YYYY-MM-DD');
      const endStr = end.format('YYYY-MM-DD');
      setDateRange([startStr, endStr]);
      fetchData(startStr, endStr);
    } else {
      setDateRange(null);
      fetchData();
    }
  };

  const exportFile = async (format) => {
    if (!tenantId) {
      message.warning('Seleccione un cliente antes de exportar');
      return;
    }
    const params = { tenantId, format };
    if (dateRange) {
      params.startDate = dateRange[0];
      params.endDate = dateRange[1];
    }
    try {
      const res = await axios.get('/api/basculas/export', {
        params,
        responseType: 'blob',
      });
      const disposition = res.headers['content-disposition'];
      let filename = `pesos_basculas_${Date.now()}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      if (disposition) {
        const match = disposition.match(/filename="?([^";]+)"?/);
        if (match) filename = match[1];
      }
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      message.error('Error al exportar el reporte');
    }
  };

  const columns = [
    { title: 'Fecha', dataIndex: 'fecha', key: 'fecha' },
    { title: 'Id Báscula', dataIndex: 'id_bascula', key: 'id_bascula' },
    { title: 'Código', dataIndex: 'codigo', key: 'codigo' },
    { title: 'Nombre', dataIndex: 'nombre', key: 'nombre' },
    { title: 'Peso Total (kg)', dataIndex: 'peso_total', key: 'peso_total' },
  ];

  return (
    <div className="dashboard-basculas">
      <h2>Reporte de Pesos de Básculas</h2>
      <div className="controls">
        <RangePicker onChange={handleRangeChange} style={{ marginRight: '12px' }} />
        <Button
          type="primary"
          icon={<FileExcelOutlined />}
          onClick={() => exportFile('excel')}
          style={{ marginRight: '8px' }}
        >
          Exportar a Excel
        </Button>
        <Button
          type="primary"
          icon={<FilePdfOutlined />}
          onClick={() => exportFile('pdf')}
        >
          Exportar a PDF
        </Button>
      </div>
      <Spin spinning={loading} tip="Cargando...">
        <Table columns={columns} dataSource={data} pagination={{ pageSize: 20 }} />
      </Spin>
    </div>
  );
};

export default DashboardBasculas;
