import React from 'react';
import { Dropdown, Button, Space } from 'antd';
import { DownloadOutlined, DownOutlined, FileExcelOutlined, FilePdfOutlined, WhatsAppOutlined } from '@ant-design/icons';
import { exportToExcel } from '../utils/exportExcel';
import { exportToPdf } from '../utils/exportPdf';
import { useAuth } from '../context/AuthContext';

const ExportButtons = ({ data, columns, filename = 'Reporte' }) => {
  const { user, tenantId } = useAuth();
  const hasData = data && data.length > 0;

  const getMetadata = () => {
    return {
      empresa: 'SAS Agrícolas',
      finca: 'Finca Operativa', // Fallback, context can be used if available
      usuario: user?.nombre || user?.username || 'Administrador',
      rol: user?.rol || 'No asignado',
      reportName: filename
    };
  };

  const prepareData = () => {
    return data.map(item => {
      const row = {};
      columns.forEach(col => {
        const val = col.getter ? col.getter(item) : item[col.key];
        row[col.header] = val;
      });
      return row;
    });
  };

  const handleExportExcel = () => {
    if (!hasData) return;
    const exportData = prepareData();
    const exportColumns = columns.map(col => ({ name: col.header }));
    exportToExcel(filename, exportColumns, exportData, getMetadata());
  };

  const handleExportPDF = async () => {
    if (!hasData) return;
    const exportData = prepareData();
    const exportColumns = columns.map(col => ({ name: col.header }));
    await exportToPdf(filename, exportColumns, exportData, getMetadata());
  };

  const handleExportWhatsApp = () => {
    if (!hasData) return;
    let text = `*${filename}*\n\n`;
    
    const limit = Math.min(data.length, 10);
    for (let i = 0; i < limit; i++) {
      const item = data[i];
      columns.forEach(col => {
        const val = col.getter ? col.getter(item) : item[col.key];
        text += `*${col.header}:* ${val}\n`;
      });
      text += `-----------------\n`;
    }
    
    if (data.length > 10) {
      text += `\n_...y ${data.length - 10} registros más. Exporta a PDF/Excel para ver todo._`;
    }

    const encodedText = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encodedText}`, '_blank');
  };

  return (
    <Space style={{ opacity: hasData ? 1 : 0.5 }}>
      <Dropdown menu={{
        items: [
          { key: 'excel', icon: <FileExcelOutlined style={{color: '#16a34a'}}/>, label: 'Exportar a Excel', onClick: handleExportExcel, disabled: !hasData },
          { key: 'pdf', icon: <FilePdfOutlined style={{color: '#ef4444'}}/>, label: 'Exportar a PDF', onClick: handleExportPDF, disabled: !hasData },
          { key: 'whatsapp', icon: <WhatsAppOutlined style={{color: '#25d366'}}/>, label: 'Enviar por WhatsApp', onClick: handleExportWhatsApp, disabled: !hasData },
        ]
      }}>
        <Button type="primary" icon={<DownloadOutlined />} disabled={!hasData} style={{ background: '#3b82f6', borderColor: '#3b82f6', boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.4)', borderRadius: '6px', fontWeight: 'bold' }}>
          Exportar Reporte <DownOutlined />
        </Button>
      </Dropdown>
    </Space>
  );
};

export default ExportButtons;
