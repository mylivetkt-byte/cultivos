import React, { useState } from 'react';
import { Upload, Button, message, Card, Image } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { API_BASE } from '../utils/api';
import { authFetch } from '../utils/api';

export default function LogoUploader() {
  const [fileList, setFileList] = useState([]);
  const [logoUrl, setLogoUrl] = useState('');

  const handleChange = ({ fileList: newFileList }) => {
    setFileList(newFileList);
  };

  const beforeUpload = (file) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('Solo se permiten archivos de imagen');
    }
    return isImage || Upload.LIST_IGNORE;
  };

  const handleUpload = async () => {
    if (fileList.length === 0) {
      message.warning('Seleccione un archivo antes de subir');
      return;
    }
    const formData = new FormData();
    formData.append('logo', fileList[0].originFileObj);
    try {
      const res = await authFetch(`${API_BASE}/config/logo`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Error en la respuesta');
      const data = await res.json();
      setLogoUrl(data.url || '');
      message.success('Logo cargado correctamente');
    } catch (err) {
      console.error(err);
      message.error('Fallo al cargar el logo');
    }
  };

  return (
    <Card title="📤 Cargar Logo de la Empresa" style={{ maxWidth: 600, margin: 'auto' }}>
      <Upload
        name="logo"
        listType="picture"
        beforeUpload={beforeUpload}
        onChange={handleChange}
        fileList={fileList}
        maxCount={1}
      >
        <Button icon={<UploadOutlined />}>Seleccionar Imagen</Button>
      </Upload>
      <Button type="primary" onClick={handleUpload} style={{ marginTop: 16 }} disabled={fileList.length === 0}>
        Subir Logo
      </Button>
      {logoUrl && (
        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <Image src={logoUrl} alt="Logo" style={{ maxHeight: 200 }} />
        </div>
      )}
    </Card>
  );
}
