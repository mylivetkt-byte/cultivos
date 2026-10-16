import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';

export default function usePermissions(rutaPersonalizada = null) {
  const { user, granular } = useAuth();
  const location = useLocation();

  // Siempre permitir todo al Super Admin o Administrador de Empresa
  if (user?.rol === 'Super_Admin' || user?.rol === 'Administrador_Empresa') {
    return {
      acceder: true,
      consultar: true,
      nuevo: true,
      editar: true,
      eliminar: true,
      imprimir: true,
      excel: true,
      pdf: true,
      whatsapp: true
    };
  }

  // Buscar el permiso correspondiente a la ruta actual
  const rutaAControlar = rutaPersonalizada || location.pathname;
  
  if (!granular || !Array.isArray(granular)) {
    return {
      acceder: false, consultar: false, nuevo: false, editar: false, eliminar: false, imprimir: false, excel: false, pdf: false, whatsapp: false
    };
  }

  const permisos = granular.find(p => p.ruta === rutaAControlar);

  if (!permisos) {
    // Si no está registrado en la base de datos granular, por seguridad se niega (o se podría permitir temporalmente)
    return {
      acceder: false, consultar: false, nuevo: false, editar: false, eliminar: false, imprimir: false, excel: false, pdf: false, whatsapp: false
    };
  }

  return {
    acceder: !!permisos.acceder,
    consultar: !!permisos.consultar,
    nuevo: !!permisos.nuevo,
    editar: !!permisos.editar,
    eliminar: !!permisos.eliminar,
    imprimir: !!permisos.imprimir,
    excel: !!permisos.excel,
    pdf: !!permisos.pdf,
    whatsapp: !!permisos.whatsapp
  };
}
