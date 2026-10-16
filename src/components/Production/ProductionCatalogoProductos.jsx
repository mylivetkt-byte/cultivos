import React, { useState, useEffect } from 'react';
import { Package, Search, Filter, Download } from 'lucide-react';
import axios from 'axios';

const ProductionCatalogoProductos = () => {
  const id_tenant = localStorage.getItem('tenant_id') || 1;
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('');

  const formatCurrency = (val) => {
    if (!val || val === 0) return '—';
    return `$${parseFloat(val).toLocaleString('es-CO')}`;
  };

  useEffect(() => {
    const fetchProductos = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/produccion/catalogo-productos', {
          params: { id_tenant }
        });
        setProductos(response.data.data || []);
      } catch (err) {
        console.error('Error fetching productos:', err);
        setError(err.response?.data?.error || 'Error al cargar el catálogo');
      } finally {
        setLoading(false);
      }
    };
    fetchProductos();
  }, [id_tenant]);

  const filteredProductos = productos.filter(p => {
    const matchesSearch = p.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.codigo?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const exportCSV = () => {
    if (filteredProductos.length === 0) return;
    
    const headers = ['Código', 'Nombre', 'Categoría', 'Costo Unitario', 'Precio Venta Sugerido'];
    const rows = filteredProductos.map(p => [
      p.codigo || '',
      p.nombre || '',
      p.categoria || '',
      p.costo_unitario || '',
      p.precio_venta_sugerido || ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map(e => e.map(val => `"${val.toString().replace(/"/g, '""')}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `catalogo_productos_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-teal-400 to-indigo-400 bg-clip-text text-transparent">
              Catálogo de Productos Agrícolas
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Listado de materias primas y productos terminados con precios y costos
            </p>
          </div>
          <button
            onClick={exportCSV}
            disabled={filteredProductos.length === 0}
            className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition disabled:opacity-50"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </button>
        </div>

        {/* Filters */}
        <div className="bg-[#131b2e] border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2">Buscar Producto</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Nombre o código..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[#1b253b] border border-slate-700 rounded-lg px-3 py-2 pl-10 text-sm text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2">Filtrar por...</label>
              <select
                value={filterCategoria}
                onChange={(e) => setFilterCategoria(e.target.value)}
                className="w-full bg-[#1b253b] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
              >
                <option value="">Todas las categorías</option>
                <option value="insumo">Insumos Directos</option>
                <option value="producto_terminado">Productos Terminados</option>
              </select>
            </div>
          </div>
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-[#131b2e] p-4 rounded-xl border border-slate-800 animate-pulse">
                <div className="h-5 w-32 bg-slate-700 rounded mb-2"></div>
                <div className="h-4 w-48 bg-slate-700 rounded mb-3"></div>
                <div className="h-4 w-16 bg-slate-700 rounded"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-950/40 border border-red-500/20 text-red-300 rounded-lg p-4 text-sm">
            ⚠️ {error}
          </div>
        ) : filteredProductos.length === 0 ? (
          <div className="text-center py-20 text-slate-500 bg-[#131b2e] border border-slate-800 rounded-2xl">
            <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-semibold mb-2">No hay productos que coincidan</p>
            <p className="text-sm">Ajusta tus filtros de búsqueda</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProductos.map((producto) => (
              <div key={producto.id} className="bg-[#131b2e] border border-slate-800 rounded-2xl p-6 shadow-xl hover:shadow-indigo-500/10 transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-white">{producto.codigo || 'Sin código'}</h3>
                    <p className="text-slate-300 text-sm">{producto.nombre}</p>
                  </div>
                  <span className="px-2 py-1 text-xs font-bold rounded-full bg-indigo-900/40 text-indigo-300">
                    {producto.categoria || 'Insumo'}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mb-4 space-y-1">
                  <div className="flex justify-between">
                    <span>Unidad:</span>
                    <span className="font-mono">{producto.unidad_medida || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Costo:</span>
                    <span className="font-mono text-teal-400">{formatCurrency(producto.costo_unitario)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Venta Sugerido:</span>
                    <span className="font-mono text-emerald-400">{formatCurrency(producto.precio_venta_sugerido)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductionCatalogoProductos;