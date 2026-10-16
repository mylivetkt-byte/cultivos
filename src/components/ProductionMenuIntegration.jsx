/**
 * ProductionMenuIntegration.jsx
 * Componente para integrar Producción en el menú principal del Sidebar
 *
 * Uso en Sidebar.jsx:
 * import ProductionMenuItems from './ProductionMenuIntegration';
 *
 * Dentro del renderizado del menú:
 * <ProductionMenuItems onSelectTable={onSelectTable} />
 */

import React from 'react';
import { Package, TrendingUp, BarChart3, Settings } from 'lucide-react';

const ProductionMenuItems = ({ onSelectTable }) => {
  const menuItems = [
    {
      id: 'produccion-historico',
      label: 'Histórico de Producciones',
      icon: BarChart3,
      path: '/produccion/historico',
      description: 'Dashboard de órdenes de producción con análisis de rentabilidad',
      subcategory: 'Producción'
    },
    {
      id: 'produccion-crear-orden',
      label: 'Crear Orden de Producción',
      icon: Package,
      path: '/produccion/crear-orden',
      description: 'Nueva orden de producción con validación de inventario FIFO',
      subcategory: 'Producción'
    },
    {
      id: 'produccion-precios-mercado',
      label: 'Precios de Mercado',
      icon: TrendingUp,
      path: '/produccion/precios-mercado',
      description: 'Gestión de precios referenciales e inteligencia de mercado',
      subcategory: 'Producción'
    },
    {
      id: 'produccion-configuracion',
      label: 'Configuración de Producción',
      icon: Settings,
      path: '/produccion/configuracion',
      description: 'Parámetros y configuración del módulo por tenant',
      subcategory: 'Producción'
    }
  ];

  return (
    <div className="produccion-menu-group">
      {menuItems.map((item) => (
        <div
          key={item.id}
          onClick={() => onSelectTable(item.id)}
          className="menu-item produccion-item"
          title={item.description}
        >
          <item.icon size={18} className="menu-icon" />
          <span className="menu-label">{item.label}</span>
        </div>
      ))}
    </div>
  );
};

export default ProductionMenuItems;
