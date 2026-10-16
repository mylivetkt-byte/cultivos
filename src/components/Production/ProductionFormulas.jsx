import React, { useState, useEffect } from 'react';
import { FlaskConical, Search, Eye, Edit, Trash2, Plus, Package, Users, Wrench, Printer, Save, Trash } from 'lucide-react';
import axios from 'axios';
import { Select } from 'antd';
import { useAuth } from '../../context/AuthContext';

const { Option } = Select;

// Estilos globales para forzar el Select de antd al modo oscuro
const darkSelectStyles = `
  .dark-select .ant-select-selector {
    background-color: #131b2e !important;
    border-color: #334155 !important;
    color: white !important;
    height: 38px !important;
    padding-top: 3px !important;
    border-radius: 0.5rem !important;
  }
  .dark-select .ant-select-selection-search-input {
    color: white !important;
  }
  .dark-select .ant-select-selection-item {
    color: white !important;
  }
  .dark-select .ant-select-arrow {
    color: #94a3b8 !important;
  }
  .dark-select-dropdown {
    background-color: #1b253b !important;
  }
  .dark-select-dropdown .ant-select-item {
    color: #cbd5e1 !important;
  }
  .dark-select-dropdown .ant-select-item-option-active,
  .dark-select-dropdown .ant-select-item-option-selected {
    background-color: #1e293b !important;
    color: white !important;
  }
`;

const ProductionFormulas = () => {
  const { user } = useAuth();
  const id_tenant = localStorage.getItem('tenant_id') || 1;

  // List & Status States
  const [formulas, setFormulas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Dropdown Catalogs
  const [allInsumos, setAllInsumos] = useState([]);
  const [allMaquinas, setAllMaquinas] = useState([]);
  const [catalogoProductos, setCatalogoProductos] = useState([]);

  // Detail Modal States
  const [selectedFormula, setSelectedFormula] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  // Form Modal States
  const [showFormModal, setShowFormModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingFormulaId, setEditingFormulaId] = useState(null);

  // Form Fields
  const [formCodigo, setFormCodigo] = useState('');
  const [formNombre, setFormNombre] = useState('');
  const [formDescripcion, setFormDescripcion] = useState('');
  const [formIdInsumoProducto, setFormIdInsumoProducto] = useState('');
  const [formRendimiento, setFormRendimiento] = useState(1);
  const [formUnidadMedida, setFormUnidadMedida] = useState('UN');
  const [formEstado, setFormEstado] = useState('Activa');

  // Form Dynamic Lists
  const [formInsumos, setFormInsumos] = useState([]); // [{ id_insumo, cantidad_por_unidad, unidad_medida, factor_merma }]
  const [formMaquinarias, setFormMaquinarias] = useState([]); // [{ id_maquina_taller, tiempo_estandar_horas }]

  // Search filter states for dropdown selections (Rule of Searchable Selects)
  const [searchTargetProduct, setSearchTargetProduct] = useState('');
  const [searchInsumoIndex, setSearchInsumoIndex] = useState({}); // { idx: string }
  const [searchMaquinaIndex, setSearchMaquinaIndex] = useState({}); // { idx: string }

  const fetchFormulas = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/produccion/formulas', {
        params: { id_tenant }
      });
      setFormulas(response.data.data || []);
    } catch (err) {
      console.error('Error fetching formulas:', err);
      setError(err.response?.data?.error || 'Error al cargar las fórmulas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Load Catalogs
    const loadCatalogs = async () => {
      try {
        const [resInsumos, resMaquinas, resCatalogo] = await Promise.all([
          axios.get(`/api/table/insumos/data?tenantId=${id_tenant}&pageSize=1000`).catch(err => {
            console.error('Error fetching insumos:', err);
            return { data: { data: [] } };
          }),
          axios.get(`/api/produccion/maquinas?id_tenant=${id_tenant}`).catch(err => {
            console.error('Error fetching maquinas:', err);
            return { data: { data: [] } };
          }),
          axios.get(`/api/produccion/catalogo-productos?id_tenant=${id_tenant}`).catch(err => {
            console.error('Error fetching production products catalog:', err);
            return { data: { data: [] } };
          })
        ]);
        setAllInsumos(resInsumos.data.data || []);
        setAllMaquinas(resMaquinas.data.data || []);
        setCatalogoProductos(resCatalogo.data.data || []);
      } catch (err) {
        console.error('Error loading catalogs:', err);
      }
    };
    loadCatalogs();
    fetchFormulas();
  }, [id_tenant]);

  const fetchFormulaDetail = async (id) => {
    try {
      const response = await axios.get(`/api/produccion/formulas/${id}?id_tenant=${id_tenant}`);
      return response.data.data;
    } catch (err) {
      console.error('Error fetching formula detail:', err);
      return null;
    }
  };

  const handleViewDetail = async (formula) => {
    const detail = await fetchFormulaDetail(formula.id_formula);
    if (detail) {
      setSelectedFormula(detail);
      setShowDetail(true);
    }
  };

  // Open Form for Adding
  const handleOpenAdd = () => {
    setIsEditMode(false);
    setEditingFormulaId(null);
    setFormCodigo('');
    setFormNombre('');
    setFormDescripcion('');
    setFormIdInsumoProducto('');
    setFormRendimiento(1);
    setFormUnidadMedida('UN');
    setFormEstado('Activa');
    setFormInsumos([]);
    setFormMaquinarias([]);
    setSearchTargetProduct('');
    setSearchInsumoIndex({});
    setSearchMaquinaIndex({});
    setShowFormModal(true);
  };

  // Open Form for Editing
  const handleOpenEdit = async (formula) => {
    const detail = await fetchFormulaDetail(formula.id_formula);
    if (!detail) return;

    setIsEditMode(true);
    setEditingFormulaId(formula.id_formula);
    setFormCodigo(detail.codigo || '');
    setFormNombre(detail.nombre || '');
    setFormDescripcion(detail.descripcion || '');
    setFormIdInsumoProducto(detail.id_insumo_producto || '');
    setFormRendimiento(detail.rendimiento_esperado || 1);
    setFormUnidadMedida(detail.unidad_medida || 'UN');
    setFormEstado(detail.estado || 'Activa');
    setFormInsumos(detail.insumos || []);
    setFormMaquinarias(detail.maquinarias || []);

    // Set initial target product search text
    const targetProduct = catalogoProductos.find(i => i.id === detail.id_insumo_producto);
    setSearchTargetProduct(targetProduct ? targetProduct.nombre : '');

    // Set initial dynamic lists searches
    const insIndexes = {};
    detail.insumos?.forEach((ins, idx) => {
      insIndexes[idx] = ins.nombre || '';
    });
    setSearchInsumoIndex(insIndexes);

    const maqIndexes = {};
    detail.maquinarias?.forEach((maq, idx) => {
      maqIndexes[idx] = `${maq.marca_modelo} [${maq.placa}]`;
    });
    setSearchMaquinaIndex(maqIndexes);

    setShowFormModal(true);
  };

  // Delete Action
  const handleDeleteFormula = async (formulaId) => {
    if (!window.confirm('¿Está seguro de que desea eliminar esta receta? Esta acción no se puede deshacer.')) return;
    try {
      const response = await axios.delete(`/api/produccion/formulas/${formulaId}?id_tenant=${id_tenant}`);
      if (response.data.success) {
        alert('Fórmula eliminada con éxito.');
        fetchFormulas();
        if (showDetail) setShowDetail(false);
      } else {
        alert(response.data.error || 'No se pudo eliminar la fórmula.');
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Error al eliminar la fórmula de producción.');
    }
  };

  // Save/Submit Form
  const handleSaveFormula = async (e) => {
    e.preventDefault();
    if (!formIdInsumoProducto) {
      alert('Por favor selecciona el Producto Terminado.');
      return;
    }

    const insIds = formInsumos.map(i => parseInt(i.id_insumo)).filter(Boolean);
    if (new Set(insIds).size !== insIds.length) {
      alert('No se permiten materias primas o insumos duplicados en la receta.');
      return;
    }

    const maqIds = formMaquinarias.map(m => parseInt(m.id_maquina_taller)).filter(Boolean);
    if (new Set(maqIds).size !== maqIds.length) {
      alert('No se permiten maquinarias duplicadas en la receta.');
      return;
    }

    const payload = {
      id_tenant: parseInt(id_tenant),
      codigo: formCodigo,
      nombre: formNombre,
      descripcion: formDescripcion,
      id_insumo_producto: parseInt(formIdInsumoProducto),
      rendimiento_esperado: parseFloat(formRendimiento),
      unidad_medida: formUnidadMedida,
      estado: formEstado,
      insumos: formInsumos.map(i => ({
        id_insumo: parseInt(i.id_insumo),
        cantidad_por_unidad: parseFloat(i.cantidad_por_unidad),
        unidad_medida: i.unidad_medida || 'UN',
        factor_merma: parseFloat(i.factor_merma || 0)
      })),
      maquinarias: formMaquinarias.map(m => ({
        id_maquina_taller: parseInt(m.id_maquina_taller),
        tiempo_estandar_horas: parseFloat(m.tiempo_estandar_horas)
      }))
    };

    try {
      if (isEditMode) {
        await axios.put(`/api/produccion/formulas/${editingFormulaId}`, payload);
        alert('Fórmula actualizada correctamente.');
      } else {
        await axios.post('/api/produccion/formulas', payload);
        alert('Fórmula creada correctamente.');
      }
      setShowFormModal(false);
      fetchFormulas();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Error al guardar la fórmula.');
    }
  };

  // Dynamic Insumos List Mutators
  const addInsumoRow = () => {
    setFormInsumos([...formInsumos, { id_insumo: '', cantidad_por_unidad: 1, unidad_medida: 'UN', factor_merma: 0 }]);
  };

  const removeInsumoRow = (idx) => {
    setFormInsumos(formInsumos.filter((_, i) => i !== idx));
    const newIdx = { ...searchInsumoIndex };
    delete newIdx[idx];
    setSearchInsumoIndex(newIdx);
  };

  const updateInsumoRow = (idx, field, value) => {
    const updated = [...formInsumos];
    updated[idx] = { ...updated[idx], [field]: value };
    setFormInsumos(updated);
  };

  // Dynamic Maquinaria List Mutators
  const addMaquinaRow = () => {
    setFormMaquinarias([...formMaquinarias, { id_maquina_taller: '', tiempo_estandar_horas: 1 }]);
  };

  const removeMaquinaRow = (idx) => {
    setFormMaquinarias(formMaquinarias.filter((_, i) => i !== idx));
    const newIdx = { ...searchMaquinaIndex };
    delete newIdx[idx];
    setSearchMaquinaIndex(newIdx);
  };

  const updateMaquinaRow = (idx, field, value) => {
    const updated = [...formMaquinarias];
    updated[idx] = { ...updated[idx], [field]: value };
    setFormMaquinarias(updated);
  };

  // Premium PDF Generation (Print)
  const handlePrintFormula = async (formula) => {
    // Helper to fetch company logo in Base64
    const fetchLogoBase64 = async () => {
      try {
        const token = localStorage.getItem('token');
        const resPath = await axios.get('/api/config/logo', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const { logo_path } = resPath.data;
        if (logo_path) {
          const imgUrl = logo_path.startsWith('http') ? logo_path : `${logo_path.startsWith('/') ? '' : '/'}${logo_path}`;
          const imgRes = await fetch(imgUrl);
          if (imgRes.ok) {
            const blob = await imgRes.blob();
            return await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.readAsDataURL(blob);
            });
          }
        }
      } catch (e) {
        console.warn("Could not load logo", e);
      }
      return null;
    };

    const logoBase64 = await fetchLogoBase64();

    import('jspdf').then(({ jsPDF }) => {
      const doc = new jsPDF();
      doc.setFillColor(19, 27, 46); // Dark blue header
      doc.rect(0, 0, 210, 42, 'F');
      
      if (logoBase64) {
        try {
          doc.addImage(logoBase64, 'PNG', 165, 6, 30, 30);
        } catch (e) {
          try {
            doc.addImage(logoBase64, 'JPEG', 165, 6, 30, 30);
          } catch (err) {}
        }
      }
      
      doc.setTextColor(20, 184, 166); // Teal
      doc.setFontSize(16);
      doc.setFont('Helvetica-Bold');
      doc.text("FICHA TÉCNICA DE FÓRMULA (BPM)", 15, 14);
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      const companyName = user?.tenant_nombre || 'AgroPaccioli';
      const companyNit = user?.tenant_nit ? `NIT: ${user.tenant_nit}` : '';
      doc.text(`${companyName} ${companyNit ? ' - ' + companyNit : ''}`, 15, 21);
      
      doc.setTextColor(148, 163, 184);
      doc.setFontSize(8.5);
      doc.text(`Generado el: ${new Date().toLocaleString('es-CO')}`, 15, 28);
      doc.text(`Estado Receta: ${formula.estado || 'Activa'}  |  Control Maestro BPM`, 15, 34);
      
      doc.setDrawColor(226, 232, 240);
      doc.line(15, 47, 195, 47);
      
      // General Info
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      doc.text("Código de Receta:", 15, 55);
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(12);
      doc.text(formula.codigo || '—', 15, 62);
      
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      doc.text("Nombre de la Fórmula:", 100, 55);
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(12);
      doc.text(formula.nombre || '—', 100, 62);
      
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      doc.text("Producto Terminado:", 15, 75);
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(12);
      doc.text(formula.nombre_producto || formula.nombre_productivo || '—', 15, 82);
      
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      doc.text("Rendimiento Estándar:", 100, 75);
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(12);
      doc.text(`${formula.rendimiento_esperado} ${formula.unidad_medida}`, 100, 82);
      
      doc.line(15, 90, 195, 90);
      
      // Ingredients Table
      doc.setTextColor(20, 184, 166);
      doc.setFontSize(12);
      doc.text("1. INSUMOS Y MATERIAS PRIMAS REQUERIDAS", 15, 100);
      
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text("Insumo / Código", 15, 110);
      doc.text("Cantidad Requerida", 120, 110);
      doc.text("Factor Merma", 160, 110);
      
      doc.setDrawColor(203, 213, 225);
      doc.line(15, 113, 195, 113);
      
      let y = 120;
      doc.setTextColor(15, 23, 42);
      if (formula.insumos && formula.insumos.length > 0) {
        formula.insumos.forEach((ins) => {
          doc.text(`${ins.nombre} (${ins.codigo})`, 15, y);
          doc.text(`${ins.cantidad_por_unidad} ${ins.unidad_medida}`, 120, y);
          doc.text(`${(parseFloat(ins.factor_merma || 0) * 100).toFixed(0)}%`, 160, y);
          y += 8;
        });
      } else {
        doc.text("No requiere insumos registrados.", 15, y);
        y += 8;
      }
      
      y += 5;
      doc.line(15, y, 195, y);
      y += 10;
      
      // Machinery Table
      doc.setTextColor(99, 102, 241); // Indigo
      doc.text("2. PROCESAMIENTO Y MAQUINARIA (CIF)", 15, y);
      y += 10;
      
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text("Maquinaria / Equipo", 15, y);
      doc.text("Tiempo de Procesamiento Estándar", 120, y);
      
      y += 3;
      doc.line(15, y, 195, y);
      y += 7;
      
      doc.setTextColor(15, 23, 42);
      if (formula.maquinarias && formula.maquinarias.length > 0) {
        formula.maquinarias.forEach((maq) => {
          doc.text(`${maq.marca_modelo} [${maq.placa}]`, 15, y);
          doc.text(`${maq.tiempo_estandar_horas} Horas`, 120, y);
          y += 8;
        });
      } else {
        doc.text("No requiere maquinaria registrada.", 15, y);
        y += 8;
      }
      
      // Sign-off lines
      y = Math.max(y + 15, 250);
      doc.setDrawColor(148, 163, 184);
      doc.line(20, y, 80, y);
      doc.line(130, y, 190, y);
      
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("Firma de Responsable Técnico", 50, y + 5, { align: "center" });
      doc.text("Aprobación Control de Calidad (BPM)", 160, y + 5, { align: "center" });
      
      doc.save(`Ficha_Formula_${formula.codigo}.pdf`);
    });
  };

  const filteredFormulas = formulas.filter(f =>
    f.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.codigo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white p-6">
      <style>{darkSelectStyles}</style>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-teal-400 to-indigo-400 bg-clip-text text-transparent">
              Fórmulas de Producción
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Catálogo de recetas maestras con insumos, maquinaria y tiempos estándar
            </p>
          </div>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-600 hover:to-indigo-700 text-white font-bold rounded-lg transition"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva Fórmula
          </button>
        </div>

        {/* Search Bar */}
        <div className="bg-[#131b2e] border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar fórmula por nombre o código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#1b253b] border border-slate-700 rounded-lg px-3 py-2 pl-10 text-sm text-white focus:outline-none focus:border-teal-500"
            />
          </div>
        </div>

        {/* Formulas Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-[#131b2e] p-6 rounded-xl border border-slate-800 animate-pulse">
                <div className="h-5 w-40 bg-slate-700 rounded mb-2"></div>
                <div className="h-4 w-32 bg-slate-700 rounded mb-3"></div>
                <div className="h-4 w-24 bg-slate-700 rounded"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-950/40 border border-red-500/20 text-red-300 rounded-lg p-4 text-sm">
            ⚠️ {error}
          </div>
        ) : filteredFormulas.length === 0 ? (
          <div className="text-center py-20 text-slate-500 bg-[#131b2e] border border-slate-800 rounded-2xl">
            <FlaskConical className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-semibold mb-2">No hay fórmulas registradas</p>
            <p className="text-sm">Crea la primera fórmula de producción</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFormulas.map((formula) => (
              <div key={formula.id_formula} className="bg-[#131b2e] border border-slate-800 rounded-2xl p-6 shadow-xl hover:shadow-indigo-500/10 transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-white">{formula.codigo || 'Sin código'}</h3>
                    <p className="text-slate-300 text-sm mt-0.5">{formula.nombre}</p>
                  </div>
                  <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                    formula.estado === 'Activa' ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400 border border-slate-750'
                  }`}>
                    {formula.estado}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mb-4 space-y-1">
                  <div className="flex justify-between">
                    <span>Producto:</span>
                    <span className="font-mono text-teal-400">{formula.nombre_producto || formula.codigo_producto || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Rendimiento:</span>
                    <span className="font-mono">{formula.rendimiento_esperado || '—'} {formula.unidad_medida}</span>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => handleViewDetail(formula)}
                    className="flex-1 inline-flex items-center justify-center px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded transition"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1 text-slate-400" />
                    Detalle
                  </button>
                  <button
                    onClick={() => handleOpenEdit(formula)}
                    className="inline-flex items-center justify-center px-2.5 py-1.5 bg-indigo-650 hover:bg-indigo-600 text-white text-xs font-bold rounded transition"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteFormula(formula.id_formula)}
                    className="inline-flex items-center justify-center px-2.5 py-1.5 bg-red-950/40 text-red-400 border border-red-500/20 hover:bg-red-900 transition text-xs font-bold rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Detail Modal */}
        {showDetail && selectedFormula && (
          <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-[#131b2e] border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="bg-gradient-to-r from-teal-500/20 to-indigo-500/20 px-6 py-4 border-b border-slate-800 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-extrabold text-teal-400">Fórmula: {selectedFormula.nombre}</h3>
                  <p className="text-xs text-slate-400 font-mono mt-1">Código: {selectedFormula.codigo}</p>
                </div>
                <button
                  onClick={() => setShowDetail(false)}
                  className="text-slate-400 hover:text-white text-3xl font-bold leading-none"
                >
                  ×
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4 bg-[#1b253b] p-4 rounded-xl border border-slate-800">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Estado</p>
                    <p className="text-sm font-semibold text-white mt-0.5">{selectedFormula.estado}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Rendimiento Esperado</p>
                    <p className="text-sm font-semibold text-white mt-0.5">
                      {selectedFormula.rendimiento_esperado} {selectedFormula.unidad_medida}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Producto</p>
                    <p className="text-sm font-semibold text-white mt-0.5">
                      {selectedFormula.nombre_producto || selectedFormula.codigo_producto || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Descripción</p>
                    <p className="text-sm font-semibold text-white mt-0.5">
                      {selectedFormula.descripcion || '—'}
                    </p>
                  </div>
                </div>

                {/* Insumos */}
                {selectedFormula.insumos && selectedFormula.insumos.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-teal-400 flex items-center mb-3">
                      <Package className="w-5 h-5 mr-2" />
                      Insumos Requeridos (MP)
                    </h4>
                    <div className="space-y-2">
                      {selectedFormula.insumos.map((ins, idx) => (
                        <div key={idx} className="bg-[#1b253b] p-3 rounded-lg border border-slate-800 flex justify-between items-center">
                          <div>
                            <p className="text-sm font-semibold text-white">{ins.nombre}</p>
                            <p className="text-xs font-mono text-slate-400">Código: {ins.codigo}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-mono text-teal-400">
                              {ins.cantidad_por_unidad} {ins.unidad_medida}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">Factor merma: {ins.factor_merma || 0}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Maquinaria */}
                {selectedFormula.maquinarias && selectedFormula.maquinarias.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-purple-400 flex items-center mb-3">
                      <Wrench className="w-5 h-5 mr-2" />
                      Maquinaria Requerida (CIF)
                    </h4>
                    <div className="space-y-2">
                      {selectedFormula.maquinarias.map((maq, idx) => (
                        <div key={idx} className="bg-[#1b253b] p-3 rounded-lg border border-slate-800 flex justify-between items-center">
                          <div>
                            <p className="text-sm font-semibold text-white">{maq.marca_modelo}</p>
                            <p className="text-xs font-mono text-slate-400">Placa: {maq.placa}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-mono text-purple-400">
                              {maq.tiempo_estandar_horas} h / unidad
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-slate-800 flex gap-4">
                <button
                  onClick={() => handlePrintFormula(selectedFormula)}
                  className="flex-1 py-2.5 bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-600 hover:to-indigo-700 text-white font-bold rounded-lg transition flex items-center justify-center gap-2"
                >
                  <Printer className="w-5 h-5" />
                  Imprimir Ficha BPM
                </button>
                <button
                  onClick={() => setShowDetail(false)}
                  className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg transition"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add/Edit Form Modal */}
        {showFormModal && (
          <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <form onSubmit={handleSaveFormula} className="bg-[#131b2e] border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
              <div className="bg-gradient-to-r from-teal-500/20 to-indigo-500/20 px-6 py-4 border-b border-slate-800 flex justify-between items-center">
                <h3 className="text-xl font-extrabold text-teal-400">
                  {isEditMode ? 'Modificar Receta de Producción' : 'Crear Receta de Producción (BPM)'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="text-slate-400 hover:text-white text-3xl font-bold leading-none"
                >
                  ×
                </button>
              </div>

              <div className="p-6 space-y-6 flex-1">
                {/* General Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#1b253b] p-4 rounded-xl border border-slate-800">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Código Receta</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. FOR-PAL-BOT1"
                      value={formCodigo}
                      onChange={(e) => setFormCodigo(e.target.value)}
                      className="w-full bg-[#131b2e] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-teal-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nombre de la Receta</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Fórmula Aceite Botella 1L"
                      value={formNombre}
                      onChange={(e) => setFormNombre(e.target.value)}
                      className="w-full bg-[#131b2e] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-teal-500 text-sm"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Descripción / Método de Elaboración</label>
                    <textarea
                      placeholder="Indique detalladamente el proceso técnico de manufacturación..."
                      value={formDescripcion}
                      onChange={(e) => setFormDescripcion(e.target.value)}
                      rows={2}
                      className="w-full bg-[#131b2e] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-teal-500 text-sm resize-none"
                    />
                  </div>

                  {/* Searchable Target Product Selector (Rule of Uniqueness/Searchable selects) */}
                  <div className="md:col-span-2 border-t border-slate-800 pt-4 mt-2">
                    <label className="block text-xs font-bold text-teal-400 uppercase mb-1">Producto Terminado Producido</label>
                    <div className="space-y-2">
                      <Select
                        showSearch
                        value={formIdInsumoProducto || undefined}
                        onChange={(val) => {
                          setFormIdInsumoProducto(val);
                          const prod = catalogoProductos.find(i => i.id === parseInt(val));
                          if (prod) {
                            setFormUnidadMedida(prod.unidad_medida || 'UN');
                          }
                        }}
                        placeholder="-- Selecciona el producto final --"
                        optionFilterProp="children"
                        filterOption={(input, option) => (option?.children ?? '').toLowerCase().includes(input.toLowerCase())}
                        className="w-full dark-select"
                        popupClassName="dark-select-dropdown"
                      >
                        {catalogoProductos
                          .filter(i => {
                            const code = (i.codigo || '').toUpperCase();
                            if (!code.startsWith('PT-')) return false;
                            return true;
                          })
                          .slice(0, 50)
                          .map(i => (
                            <Option key={i.id} value={i.id}>
                              {i.nombre} ({i.codigo})
                            </Option>
                          ))
                        }
                      </Select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Rendimiento Esperado</label>
                    <input
                      type="number"
                      required
                      min="0.0001"
                      step="any"
                      value={formRendimiento}
                      onChange={(e) => setFormRendimiento(e.target.value)}
                      className="w-full bg-[#131b2e] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-teal-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Unidad Medida</label>
                    <select
                      value={formUnidadMedida}
                      onChange={(e) => setFormUnidadMedida(e.target.value)}
                      className="w-full bg-[#131b2e] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-teal-500 text-sm"
                    >
                      <option value="UN">UN (Unidad)</option>
                      <option value="KG">KG (Kilogramo)</option>
                      <option value="L">L (Litro)</option>
                      <option value="GL">GL (Galón)</option>
                      <option value="BTL">BTL (Botella)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Estado</label>
                    <select
                      value={formEstado}
                      onChange={(e) => setFormEstado(e.target.value)}
                      className="w-full bg-[#131b2e] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-teal-500 text-sm"
                    >
                      <option value="Activa">Activa (Vigente)</option>
                      <option value="Inactiva">Inactiva (Archivada)</option>
                    </select>
                  </div>
                </div>

                {/* Insumos Section */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-bold text-teal-400 flex items-center">
                      <Package className="w-5 h-5 mr-2" />
                      Insumos / Ingredientes de Receta (MP)
                    </h4>
                    <button
                      type="button"
                      onClick={addInsumoRow}
                      className="px-3 py-1 bg-indigo-650 hover:bg-indigo-650 text-white font-bold rounded text-xs flex items-center transition"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Añadir Insumo
                    </button>
                  </div>

                  <div className="space-y-3">
                    {formInsumos.map((item, idx) => (
                      <div key={idx} className="bg-[#1b253b] p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row gap-3 items-end">
                        <div className="flex-1 w-full">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Buscar Insumo / Materia Prima</label>
                          <div className="space-y-1">
                            <Select
                              showSearch
                              value={item.id_insumo || undefined}
                              onChange={(val) => {
                                const ins = allInsumos.find(i => i.id_insumo === parseInt(val));
                                if (ins) {
                                  updateInsumoRow(idx, 'id_insumo', ins.id_insumo);
                                  updateInsumoRow(idx, 'unidad_medida', ins.unidad_medida || 'UN');
                                }
                              }}
                              placeholder="-- Seleccione Insumo --"
                              optionFilterProp="children"
                              filterOption={(input, option) => (option?.children ?? '').toLowerCase().includes(input.toLowerCase())}
                              className="w-full dark-select"
                              popupClassName="dark-select-dropdown"
                            >
                              {allInsumos
                                .filter(i => {
                                  // Filtrar estrictamente materias primas y empaques de producción (MP-)
                                  const code = (i.codigo || '').toUpperCase();
                                  if (!code.startsWith('MP-')) return false;

                                  const isSelectedElsewhere = formInsumos.some((fi, fIdx) => fIdx !== idx && parseInt(fi.id_insumo) === i.id_insumo);
                                  if (isSelectedElsewhere) return false;
                                  return true;
                                })
                                .slice(0, 30)
                                .map(i => (
                                  <Option key={i.id_insumo} value={i.id_insumo}>
                                    {i.nombre} ({i.codigo})
                                  </Option>
                                ))
                              }
                            </Select>
                          </div>
                        </div>

                        <div className="w-full md:w-32">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Cantidad req.</label>
                          <input
                            type="number"
                            required
                            min="0.0001"
                            step="any"
                            value={item.cantidad_por_unidad}
                            onChange={(e) => updateInsumoRow(idx, 'cantidad_por_unidad', e.target.value)}
                            className="w-full bg-[#131b2e] border border-slate-750 rounded px-2.5 py-1 text-white text-xs focus:outline-none text-center"
                          />
                        </div>

                        <div className="w-full md:w-28">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Unidad</label>
                          <span className="w-full bg-slate-800/80 block border border-slate-750 rounded px-2.5 py-1 text-slate-300 text-xs text-center font-mono">
                            {item.unidad_medida || 'UN'}
                          </span>
                        </div>

                        <div className="w-full md:w-28">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Factor Merma</label>
                          <input
                            type="number"
                            min="0"
                            max="0.99"
                            step="0.01"
                            value={item.factor_merma}
                            onChange={(e) => updateInsumoRow(idx, 'factor_merma', e.target.value)}
                            className="w-full bg-[#131b2e] border border-slate-750 rounded px-2.5 py-1 text-white text-xs focus:outline-none text-center"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => removeInsumoRow(idx)}
                          className="p-1.5 bg-red-950/40 border border-red-500/20 text-red-400 hover:bg-red-900 rounded transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}

                    {formInsumos.length === 0 && (
                      <div className="text-center py-6 border border-dashed border-slate-800 rounded-xl text-slate-500 text-sm">
                        No se han añadido materias primas a esta fórmula.
                      </div>
                    )}
                  </div>
                </div>

                {/* Maquinaria Section */}
                <div className="space-y-4 border-t border-slate-800 pt-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-bold text-purple-400 flex items-center">
                      <Wrench className="w-5 h-5 mr-2" />
                      Maquinaria & Tiempos Estándar (CIF)
                    </h4>
                    <button
                      type="button"
                      onClick={addMaquinaRow}
                      className="px-3 py-1 bg-indigo-650 hover:bg-indigo-650 text-white font-bold rounded text-xs flex items-center transition"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Añadir Máquina
                    </button>
                  </div>

                  <div className="space-y-3">
                    {formMaquinarias.map((maq, idx) => (
                      <div key={idx} className="bg-[#1b253b] p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row gap-3 items-end">
                        <div className="flex-1 w-full">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Buscar Maquinaria</label>
                          <div className="space-y-1">
                            <Select
                              showSearch
                              value={maq.id_maquina_taller || undefined}
                              onChange={(val) => {
                                const m = allMaquinas.find(item => item.id === parseInt(val));
                                if (m) {
                                  updateMaquinaRow(idx, 'id_maquina_taller', m.id);
                                }
                              }}
                              placeholder="-- Seleccione Maquinaria --"
                              optionFilterProp="children"
                              filterOption={(input, option) => (option?.children ?? '').toLowerCase().includes(input.toLowerCase())}
                              className="w-full dark-select"
                              popupClassName="dark-select-dropdown"
                            >
                              {allMaquinas
                                .filter(m => {
                                  // Filtrar estrictamente maquinaria agroindustrial de procesamiento
                                  const type = (m.tipo || '').toLowerCase();
                                  const placa = (m.placa || '').toUpperCase();
                                  if (type !== 'procesamiento' && !placa.startsWith('MAQ-')) return false;

                                  const isSelectedElsewhere = formMaquinarias.some((fm, fIdx) => fIdx !== idx && parseInt(fm.id_maquina_taller) === m.id);
                                  if (isSelectedElsewhere) return false;
                                  return true;
                                })
                                .slice(0, 20)
                                .map(m => (
                                  <Option key={m.id} value={m.id}>
                                    {m.nombre} (Placa: {m.placa})
                                  </Option>
                                ))
                              }
                            </Select>
                          </div>
                        </div>

                        <div className="w-full md:w-48">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Horas estándar req.</label>
                          <input
                            type="number"
                            required
                            min="0.001"
                            step="any"
                            value={maq.tiempo_estandar_horas}
                            onChange={(e) => updateMaquinaRow(idx, 'tiempo_estandar_horas', e.target.value)}
                            className="w-full bg-[#131b2e] border border-slate-750 rounded px-2.5 py-1 text-white text-xs focus:outline-none text-center"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => removeMaquinaRow(idx)}
                          className="p-1.5 bg-red-950/40 border border-red-500/20 text-red-400 hover:bg-red-900 rounded transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}

                    {formMaquinarias.length === 0 && (
                      <div className="text-center py-6 border border-dashed border-slate-800 rounded-xl text-slate-500 text-sm">
                        No se ha asignado maquinaria a esta fórmula.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-800 flex gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-600 hover:to-indigo-700 text-white font-bold rounded-lg transition flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  {isEditMode ? 'Actualizar Ficha Receta' : 'Guardar Ficha Receta'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg transition"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductionFormulas;