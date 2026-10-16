import React, { useState, useEffect, useCallback, useRef } from 'react';
import Select from 'react-select';
import AsyncSelect from 'react-select/async';
import Modal from './Modal';
import QuickAddModal from './QuickAddModal';
import PolygonEditor from './PolygonEditor';
import {
  fetchTableStructure,
  fetchTableData,
  insertRecord,
  updateRecord,
  deleteRecord,
  fetchFKLookup,
  checkUniqueValue,
  fetchUniquenessRules,
  formatTableName,
  formatColumnName,
} from '../utils/api';
import { exportToPdf } from '../utils/exportPdf';
import { exportFichasPdf } from '../utils/exportFichasPdf';
import { exportToExcel } from '../utils/exportExcel';
import { QRCodeSVG } from 'qrcode.react';
import { calcularDV } from '../utils/dian';
import FichaTecnicaModal from './Inventory/FichaTecnicaModal';
import HistorialRepuestosModal from './Inventory/HistorialRepuestosModal';
import HistorialLaboresModal from './Inventory/HistorialLaboresModal';
import HistorialMantenimientosModal from './Inventory/HistorialMantenimientosModal';
import HojaDeVidaModal from './Inventory/HojaDeVidaModal';
import HistoriaClinicaModal from './Ganado/HistoriaClinicaModal';
import DroneDetailsModal from './Drones/DroneDetailsModal';
import { authFetch } from '../utils/api';
import { useAuth } from '../context/AuthContext';

function DynamicCatalog({ tableName, tenantId, fincaId, nucleoId }) {
  const { user } = useAuth();
  const [structure, setStructure] = useState(null);
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [sortColumn, setSortColumn] = useState('');
  const [sortDirection, setSortDirection] = useState('ASC');

  // Custom filters for insumos
  const [filterGrupo, setFilterGrupo] = useState('');
  const [filterSubgrupo, setFilterSubgrupo] = useState('');

  // Global filters
  const [filterFinca, setFilterFinca] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  
  // Agricultural specific filters
  const [filterLote, setFilterLote] = useState('');
  const [filterLoteInput, setFilterLoteInput] = useState('');
  const [filterSiembra, setFilterSiembra] = useState('');
  const [filterSiembraInput, setFilterSiembraInput] = useState('');

  const hasDateColumn = structure?.columns.some(c => ['date', 'datetime', 'timestamp'].includes(c.displayType));
  const hasFincaColumn = structure?.columns.some(c => c.name === 'id_finca');
  const hasLoteColumn = structure?.columns.some(c => c.name === 'id_lote');
  const hasSiembraColumn = structure?.columns.some(c => c.name === 'id_siembra');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit'
  const [formData, setFormData] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [uniquenessRules, setUniquenessRules] = useState([]);
  const [uniqueChecking, setUniqueChecking] = useState({});
  const [fkOptions, setFkOptions] = useState({});
  const [fkLoading, setFkLoading] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Geo state for dependent dropdowns
  const [geoDepartamentos, setGeoDepartamentos] = useState([]);
  const [geoMunicipios, setGeoMunicipios] = useState([]);

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Toast
  const [toast, setToast] = useState(null);

  // Polygon Editor state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingField, setEditingField] = useState(null);
  // QR Modal state
  const [qrModalData, setQrModalData] = useState(null);
  
  // Modals state
  const [activeMachineForFicha, setActiveMachineForFicha] = useState(null);
  const [activeMachineForRepuestos, setActiveMachineForRepuestos] = useState(null);
  const [activeMachineForLabores, setActiveMachineForLabores] = useState(null);
  const [activeMachineForManttos, setActiveMachineForManttos] = useState(null);
  const [activeEmployeeForHojaVida, setActiveEmployeeForHojaVida] = useState(null);
  const [activeAnimalForHistoria, setActiveAnimalForHistoria] = useState(null);
  const [activeDroneForDetails, setActiveDroneForDetails] = useState(null);

  // Generic Quick Add Modal State
  const [quickAddModal, setQuickAddModal] = useState({ isOpen: false, tableName: null, sourceField: null, defaultValues: {} });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSavePolygon = (polygonWKT, centerPointWKT, calculatedArea) => {
    setFormData(prev => {
      const updated = { ...prev };
      updated[editingField] = polygonWKT;
      
      // Auto-populate centro_gps if it exists in the table structure
      if (structure && structure.columns.some(c => c.name === 'centro_gps')) {
        updated['centro_gps'] = centerPointWKT;
      }
      
      // Auto-populate hectareas if it exists in the table structure
      if (structure && structure.columns.some(c => c.name === 'hectareas')) {
        updated['hectareas'] = calculatedArea.toFixed(2);
      }
      
      return updated;
    });
    setEditorOpen(false);
    showToast('Polígono y cálculos de área actualizados correctamente.');
  };

  // Load structure
  useEffect(() => {
    setLoading(true);
    setError(null);
    setData([]);
    fetchTableStructure(tableName)
      .then((s) => {
        setStructure(s);
        // Set default sort to PK
        if (s.primaryKey) {
          setSortColumn(s.primaryKey);
        }
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [tableName]);

  // Reset pagination to page 1 when tenant/finca/nucleo filters change
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [tenantId, fincaId, nucleoId]);

  // Load data when structure, pagination, search, sort, or filters change
  const loadData = useCallback(async () => {
    if (!structure) return;
    setLoading(true);
    try {
      const result = await fetchTableData(tableName, {
        page: pagination.page,
        pageSize: pagination.pageSize,
        search,
        sortColumn,
        sortDirection,
        tenantId,
        fincaId,
        nucleoId,
        filterGrupo,
        filterSubgrupo,
        filterFinca,
        filterDateFrom,
        filterDateTo
      });
      setData(result.data);
      setPagination((prev) => ({
        ...prev,
        total: result.pagination.total,
        totalPages: result.pagination.totalPages,
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tableName, structure, pagination.page, pagination.pageSize, search, sortColumn, sortDirection, tenantId, fincaId, nucleoId, filterGrupo, filterSubgrupo, filterFinca, filterDateFrom, filterDateTo]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    let cancelled = false;
    fetchUniquenessRules(tableName)
      .then((result) => {
        if (!cancelled) setUniquenessRules(result.data || []);
      })
      .catch(() => {
        if (!cancelled) setUniquenessRules([]);
      });
    return () => {
      cancelled = true;
    };
  }, [tableName]);

  // Fetch departments
  useEffect(() => {
    let cancelled = false;
    authFetch('/api/municipios/departamentos')
      .then(res => res.json())
      .then(data => {
        if (!cancelled && Array.isArray(data)) setGeoDepartamentos(data);
      })
      .catch(console.error);
    return () => { cancelled = true; };
  }, []);

  // Fetch municipalities when department changes
  useEffect(() => {
    let cancelled = false;
    if (formData.departamento) {
      authFetch(`/api/municipios/departamentos/${formData.departamento}/municipios`)
        .then(res => res.json())
        .then(data => {
          if (!cancelled && Array.isArray(data)) {
             setGeoMunicipios(data.map(m => m.municipio));
          }
        })
        .catch(console.error);
    } else {
      setGeoMunicipios([]);
    }
    return () => { cancelled = true; };
  }, [formData.departamento]);

  const handleSearch = (e) => {
    const val = e.target.value;
    setSearch(val);
    if (searchTimeout) clearTimeout(searchTimeout);
    setSearchTimeout(
      setTimeout(() => {
        setPagination((prev) => ({ ...prev, page: 1 }));
      }, 400)
    );
  };

  const handleSort = (colName) => {
    if (sortColumn === colName) {
      setSortDirection((d) => (d === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setSortColumn(colName);
      setSortDirection('ASC');
    }
  };

  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  // Form helpers
  const openAddModal = () => {
    if (!structure) return;
    const initial = {};
    for (const col of structure.columns) {
      if (col.isAutoIncrement) continue;
      initial[col.name] = col.defaultValue !== null ? col.defaultValue : (col.displayType === 'boolean' ? false : '');
    }

    // Auto-populate SaaS tenant context
    if ('id_tenant' in initial && tenantId) initial['id_tenant'] = tenantId;
    if ('id_finca' in initial && fincaId) initial['id_finca'] = fincaId;
    if ('id_nucleo' in initial && nucleoId) initial['id_nucleo'] = nucleoId;

    setFormData(initial);
    setFormErrors({});
    setModalMode('add');
    setModalOpen(true);
    loadFkOptions();
  };

  const openEditModal = (record) => {
    if (!structure) return;
    setFormData({ ...record });
    setFormErrors({});
    setModalMode('edit');
    setModalOpen(true);
    loadFkOptions();
  };

  const loadFkOptions = useCallback(async () => {
    if (!structure) return;
    const fkCols = structure.columns.filter((c) => c.isForeignKey);
    for (const col of fkCols) {
      setFkLoading((prev) => ({ ...prev, [col.name]: true }));
      try {
        const lookup = await fetchFKLookup(tableName, col.name, { tenantId, fincaId, nucleoId });
        setFkOptions((prev) => ({ ...prev, [col.name]: lookup.options }));
      } catch (err) {
        console.error(`Error loading FK options for ${col.name}:`, err);
      } finally {
        setFkLoading((prev) => ({ ...prev, [col.name]: false }));
      }
    }
  }, [structure, tableName, tenantId, fincaId, nucleoId]);

  useEffect(() => {
    if (structure) {
      loadFkOptions();
    }
  }, [structure, loadFkOptions]);

  // Handle auto-generation of intelligent code for insumos
  useEffect(() => {
    if (tableName === 'insumos' && modalOpen && modalMode === 'add') {
      const g = formData.id_grupo;
      const s = formData.id_subgrupo;
      if (g && s) {
        authFetch(`/api/table/insumos/next-code?grupo=${g}&subgrupo=${s}`)
          .then(res => res.json())
          .then(data => {
            if (data.nextCode) {
              setFormData(prev => ({ ...prev, codigo: data.nextCode }));
            }
          })
          .catch(err => console.error('Error fetching next code:', err));
      }
    }
  }, [tableName, modalOpen, modalMode, formData.id_grupo, formData.id_subgrupo]);

  const handleFormChange = (colName, value) => {
    setFormData((prev) => {
      const updated = { ...prev, [colName]: value };
      
      // Auto-clear subgroup if group changes
      if (tableName === 'insumos' && colName === 'id_grupo') {
        updated.id_subgrupo = null;
      }

      // DIAN Auto-calculate DV
      if ((colName === 'documento' || colName === 'documento_identidad') && value) {
        updated.dv = calcularDV(value);
      }
      
      return updated;
    });
    setFormErrors((prev) => ({ ...prev, [colName]: undefined }));
  };

  const checkFieldUniqueness = async (colName, rawValue = formData[colName]) => {
    const value = rawValue === undefined || rawValue === null ? '' : String(rawValue).trim();
    if (!value || !structure) return;

    const rules = uniquenessRules.filter((rule) => (rule.columnas_unicas || []).includes(colName));
    if (rules.length === 0) return;

    setUniqueChecking((prev) => ({ ...prev, [colName]: true }));

    try {
      for (const rule of rules) {
        const uniqueColumns = rule.columnas_unicas || [];
        const scopeColumns = rule.columnas_ambito || [];
        const comparisonColumns = [...uniqueColumns.filter((name) => name !== colName), ...scopeColumns];
        const scope = {};

        let hasRequiredScope = true;
        for (const comparisonColumn of comparisonColumns) {
          const comparisonValue = formData[comparisonColumn];
          if (comparisonValue === undefined || comparisonValue === null || String(comparisonValue).trim() === '') {
            hasRequiredScope = false;
            break;
          }
          scope[comparisonColumn] = comparisonValue;
        }

        if (!hasRequiredScope) continue;

        const excludeId = modalMode === 'edit' ? formData[structure.primaryKey] : '';
        const result = await checkUniqueValue(tableName, colName, value, excludeId, scope);
        if (result.exists) {
          setFormErrors((prev) => ({
            ...prev,
            [colName]: rule.mensaje_error || `${formatColumnName(colName)} ya existe.`
          }));
          return;
        }
      }

      setFormErrors((prev) => ({ ...prev, [colName]: undefined }));
    } catch (err) {
      setFormErrors((prev) => ({ ...prev, [colName]: err.message }));
    } finally {
      setUniqueChecking((prev) => ({ ...prev, [colName]: false }));
    }
  };

  const hasBlockingFormErrors = Object.values(formErrors).some(Boolean);

  const handleSubmit = async () => {
    if (!structure) return;

    // Validate required fields
    const errors = {};
    for (const col of structure.columns) {
      if (col.isAutoIncrement) continue;
      if (!col.isNullable && formData[col.name] === '' && col.defaultValue === null) {
        errors[col.name] = 'Este campo es requerido';
      }
    }
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      // Prepare data - convert empty strings to null for non-text fields
      const submitData = { ...formData };
      for (const col of structure.columns) {
        if (submitData[col.name] === '' && col.isNullable) {
          submitData[col.name] = null;
        }
        if (col.displayType === 'boolean') {
          submitData[col.name] = submitData[col.name] ? 1 : 0;
        }
      }

      let res;
      if (modalMode === 'add') {
        res = await insertRecord(tableName, submitData);
        showToast('Registro creado exitosamente');
      } else {
        const pkValue = formData[structure.primaryKey];
        res = await updateRecord(tableName, pkValue, submitData);
        showToast('Registro guardado exitosamente', 'success');
        setModalOpen(false);
        // If we saved the ficha tecnica from the modal, we need to close it too
        if (activeMachineForFicha && activeMachineForFicha[structure.primaryKey] === editingId) {
           setActiveMachineForFicha(null);
        }
      }
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm || !structure) return;
    try {
      await deleteRecord(tableName, deleteConfirm);
      showToast('Registro eliminado exitosamente');
      setDeleteConfirm(null);
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const getExportMetadata = () => ({
    empresa: 'AgroPaccioli', // Ideally from context or config
    finca: fincaId ? `Finca ID ${fincaId}` : 'Todas las Fincas',
    usuario: user?.nombre || user?.username || 'Usuario del Sistema',
    reportName: tableName.replace(/_/g, ' ').toUpperCase()
  });

  const fetchAllForExport = async () => {
    try {
      showToast('Preparando datos para exportar...', 'info');
      const result = await fetchTableData(tableName, {
        page: 1,
        pageSize: 10000,
        search,
        sortColumn,
        sortDirection,
        tenantId,
        fincaId,
        nucleoId,
        filterGrupo,
        filterSubgrupo,
        filterFinca,
        filterDateFrom,
        filterDateTo
      });
      return result.data;
    } catch (err) {
      showToast('Error obteniendo datos: ' + err.message, 'error');
      return null;
    }
  };

  const handleExportPdf = async () => {
    if (!structure) return;
    const exportData = await fetchAllForExport();
    if (!exportData || exportData.length === 0) return;
    
    if (['enfermedades', 'plagas', 'malezas'].includes(tableName)) {
       exportFichasPdf(tableName, structure.columns, exportData, getExportMetadata(), fkOptions);
    } else {
       let exportCols = structure.columns;
       
       if (tableName === 'insumos') {
         const importantCols = ['codigo', 'nombre', 'id_grupo', 'id_proveedor', 'es_nocivo', 'stock_actual', 'precio_venta_1'];
         exportCols = structure.columns.filter(c => importantCols.includes(c.name));
       } else if (tableName === 'rrhh_empleados') {
         const importantCols = ['documento', 'nombres', 'apellidos', 'id_cargo', 'estado_activo', 'salario_base', 'telefono'];
         exportCols = structure.columns.filter(c => importantCols.includes(c.name));
       } else if (tableName === 'fincas' || tableName === 'lotes') {
         const importantCols = ['codigo', 'nombre', 'id_finca', 'area_total_ha', 'area_cultivable_ha', 'departamento', 'municipio'];
         exportCols = structure.columns.filter(c => importantCols.includes(c.name));
       } else if (tableName === 'maquinaria' || tableName === 'agroind_maquinaria_equipo') {
         const importantCols = ['codigo', 'nombre', 'marca', 'modelo', 'estado', 'horas_motor_totales'];
         exportCols = structure.columns.filter(c => importantCols.includes(c.name));
       } else if (tableName === 'terceros') {
         const importantCols = ['documento', 'nombre_completo', 'tipo_tercero', 'telefono', 'email'];
         exportCols = structure.columns.filter(c => importantCols.includes(c.name));
       } else if (tableName === 'vehiculos') {
         const importantCols = ['placa', 'tipo_vehiculo', 'marca', 'modelo', 'ano', 'kilometraje_actual', 'soat_vencimiento', 'tecnicomecanica_vencimiento'];
         exportCols = structure.columns.filter(c => importantCols.includes(c.name));
       }
       
       exportToPdf(tableName, exportCols, exportData, getExportMetadata(), fkOptions);
    }
  };

  const handleExportExcel = async () => {
    if (!structure) return;
    const exportData = await fetchAllForExport();
    if (!exportData || exportData.length === 0) return;
    
    exportToExcel(tableName, structure.columns, exportData, getExportMetadata());
  };

  const handleExportWhatsApp = async () => {
    if (!structure) return;
    const exportData = await fetchAllForExport();
    if (!exportData || exportData.length === 0) return;
    
    let text = `*Reporte: ${tableName.replace(/_/g, ' ').toUpperCase()}*\n\n`;
    const limit = Math.min(exportData.length, 10);
    
    if (['enfermedades', 'plagas', 'malezas'].includes(tableName)) {
      let icon = '🍄';
      if (tableName === 'plagas') icon = '🐛';
      if (tableName === 'malezas') icon = '🌿';
      
      text = `*Catálogo de Campo: ${tableName.replace(/_/g, ' ').toUpperCase()}* ${icon}\n\n`;
      for (let i = 0; i < limit; i++) {
        const item = exportData[i];
        let cultivoName = 'General';
        if (item.id_cultivo && fkOptions['id_cultivo']) {
           const opt = fkOptions['id_cultivo'].find(o => String(o.id) === String(item.id_cultivo));
           if (opt) cultivoName = opt.display || opt.label;
        }
        text += `🌴 *Cultivo:* ${cultivoName}\n`;
        text += `🔹 *Nombre:* ${item.nombre_comun || ''} (${item.nombre_cientifico || ''})\n`;
        text += `⚠️ *Agresividad/Gravedad:* ${item.gravedad || item.nivel_agresividad || ''}\n`;
        text += `📋 *Descripción:* ${item.sintomas || item.descripcion || ''}\n`;
        text += `----------------------\n\n`;
      }
    } else {
      for (let i = 0; i < limit; i++) {
        const item = exportData[i];
        structure.columns.forEach(col => {
          if (['json', 'polygon', 'point', 'longtext', 'mediumtext'].includes(col.type?.toLowerCase())) return;
          if (['fotografia', 'imagen_url', 'contrasena'].includes(col.name)) return;
          
          let val = item[col.name];
          if (fkOptions[col.name]) {
            const opt = fkOptions[col.name].find(o => String(o.id) === String(val) || String(o.value) === String(val));
            if (opt) val = opt.display || opt.label;
          }
          if (val !== null && val !== undefined && val !== '') {
            text += `*${formatColumnName(col.name)}:* ${val}\n`;
          }
        });
        text += `\n`;
      }
    }
    
    if (exportData.length > 10) {
      text += `_...y ${exportData.length - 10} registros más. Exporta a PDF para ver el catálogo completo._`;
    }

    const encodedText = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encodedText}`, '_blank');
  };

  const isMinor = () => {
    if (!formData.fecha_nacimiento) return false;
    const today = new Date();
    const birthDate = new Date(formData.fecha_nacimiento);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age < 18;
  };

  // Render form field
  const renderFormField = (col, forceRender = false) => {
    if (!forceRender && tableName === 'rrhh_empleados' && ['tiene_permiso_mintrabajo', 'nombre_tutor_legal', 'identificacion_tutor', 'restriccion_horaria'].includes(col.name)) {
      return null;
    }

    const value = formData[col.name];
    const error = formErrors[col.name];
    const checkingUnique = uniqueChecking[col.name];

    if (col.isAutoIncrement) return null;

    // Fotografía Field (Image Upload)
    if (col.name === 'fotografia') {
      const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
            handleFormChange(col.name, reader.result);
          };
          reader.readAsDataURL(file);
        }
      };
      
      return (
        <div key={col.name} className="form-group full-width">
          <label>
            {formatColumnName(col.name)}
            {!col.isNullable && <span className="required">*</span>}
          </label>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <input type="file" accept="image/*" onChange={handleImageUpload} style={{ width: '100%', padding: '8px' }} />
            </div>
            {value && (
              <div style={{ width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                <img src={value} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}
          </div>
          {error && <span className="form-error">{error}</span>}
        </div>
      );
    }

    if (col.isForeignKey) {
      let options = fkOptions[col.name] || [];
      if (tableName === 'insumos' && col.name === 'id_subgrupo' && formData.id_grupo) {
        options = options.filter(opt => String(opt.id_grupo) === String(formData.id_grupo));
      }
      const isLoading = fkLoading[col.name];
      const reactSelectOptions = options.map(opt => ({
        value: opt.id,
        label: opt.display || String(opt.id),
        shortLabel: opt.short_display || opt.display || String(opt.id)
      }));
      const currentSelected = reactSelectOptions.find(o => String(o.value) === String(value)) || null;

      return (
        <div key={col.name} className="form-group">
          <label>
            {formatColumnName(col.name)}
            {!col.isNullable && <span className="required">*</span>}
          </label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <Select
                placeholder="-- Buscar... --"
                options={reactSelectOptions}
                value={currentSelected}
                onChange={(selected) => handleFormChange(col.name, selected ? selected.value : null)}
                formatOptionLabel={(option, { context }) => context === 'menu' ? option.label : (option.shortLabel || option.label)}
                onBlur={() => checkFieldUniqueness(col.name)}
                isDisabled={isLoading}
                isClearable={col.isNullable}
                menuPosition="fixed"
                styles={{
                  control: (base) => ({ ...base, background: 'var(--card-bg)', borderColor: 'var(--border)', color: 'var(--text)' }),
                  menu: (base) => ({ ...base, background: 'var(--card-bg)', color: 'var(--text)', zIndex: 9999 }),
                  option: (base, state) => ({ ...base, background: state.isFocused ? 'var(--primary-light)' : 'transparent', color: 'var(--text)' }),
                  singleValue: (base) => ({ ...base, color: 'var(--text)' })
                }}
              />
            </div>
            {col.referencedTable && (
              <button 
                type="button" 
                className="btn btn-outline" 
                onClick={() => setQuickAddModal({ 
                  isOpen: true, 
                  tableName: col.referencedTable, 
                  sourceField: col.name,
                  defaultValues: col.referencedTable === 'terceros' ? { es_empleado: 1 } : {}
                })} 
                title="Nuevo" 
                style={{ padding: '8px 12px' }}
              >
                + Nuevo
              </button>
            )}
          </div>
          {isLoading && <span className="fk-loading">Cargando opciones...</span>}
          {checkingUnique && <span className="form-hint">Validando unicidad...</span>}
          {error && <span className="form-error">{error}</span>}
        </div>
      );
    }

    // ENUM field
    if (col.enumValues) {
      return (
        <div key={col.name} className="form-group">
          <label>
            {formatColumnName(col.name)}
            {!col.isNullable && <span className="required">*</span>}
          </label>
          <select value={value || ''} onChange={(e) => handleFormChange(col.name, e.target.value)} onBlur={() => checkFieldUniqueness(col.name)}>
            <option value="">-- Seleccionar --</option>
            {col.enumValues.map((v) => (
              <option key={v} value={v}>
                {v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </option>
            ))}
          </select>
          {checkingUnique && <span className="form-hint">Validando unicidad...</span>}
          {error && <span className="form-error">{error}</span>}
        </div>
      );
    }

    // Boolean
    if (col.displayType === 'boolean') {
      return (
        <div key={col.name} className="form-group checkbox-group">
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => handleFormChange(col.name, e.target.checked)}
          />
          <label style={{ marginBottom: 0 }}>
            {formatColumnName(col.name)}
          </label>
          {error && <span className="form-error">{error}</span>}
        </div>
      );
    }

    // Special geo fields
    if (col.name === 'departamento' || col.name === 'departamento_fiscal') {
      return (
        <div key={col.name} className="form-group">
          <label>
            {formatColumnName(col.name)}
            {!col.isNullable && <span className="required">*</span>}
          </label>
          <select value={value || ''} onChange={(e) => handleFormChange(col.name, e.target.value)}>
            <option value="">-- Seleccionar --</option>
            {geoDepartamentos.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          {error && <span className="form-error">{error}</span>}
        </div>
      );
    }

    if (col.name === 'municipio' || col.name === 'municipio_fiscal') {
      const parentDepto = formData.departamento || formData.departamento_fiscal;
      return (
        <div key={col.name} className="form-group">
          <label>
            {formatColumnName(col.name)}
            {!col.isNullable && <span className="required">*</span>}
          </label>
          <select 
            value={value || ''} 
            onChange={(e) => handleFormChange(col.name, e.target.value)}
            disabled={!parentDepto}
          >
            <option value="">-- Seleccionar --</option>
            {geoMunicipios.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          {error && <span className="form-error">{error}</span>}
        </div>
      );
    }

    // Textarea
    if (col.displayType === 'textarea') {
      return (
        <div key={col.name} className="form-group full-width">
          <label>
            {formatColumnName(col.name)}
            {!col.isNullable && <span className="required">*</span>}
          </label>
          <textarea
            value={value || ''}
            onChange={(e) => handleFormChange(col.name, e.target.value)}
            onBlur={() => checkFieldUniqueness(col.name)}
            rows={3}
          />
          {checkingUnique && <span className="form-hint">Validando unicidad...</span>}
          {error && <span className="form-error">{error}</span>}
        </div>
      );
    }

    // Date
    if (col.displayType === 'date') {
      return (
        <div key={col.name} className="form-group">
          <label>
            {formatColumnName(col.name)}
            {!col.isNullable && <span className="required">*</span>}
          </label>
          <input
            type="date"
            value={value ? value.toString().slice(0, 10) : ''}
            onChange={(e) => handleFormChange(col.name, e.target.value)}
            onBlur={() => checkFieldUniqueness(col.name)}
          />
          {checkingUnique && <span className="form-hint">Validando unicidad...</span>}
          {error && <span className="form-error">{error}</span>}
        </div>
      );
    }

    // DateTime
    if (col.displayType === 'datetime') {
      return (
        <div key={col.name} className="form-group">
          <label>
            {formatColumnName(col.name)}
            {!col.isNullable && <span className="required">*</span>}
          </label>
          <input
            type="datetime-local"
            value={value ? value.toString().slice(0, 16).replace(' ', 'T') : ''}
            onChange={(e) => handleFormChange(col.name, e.target.value)}
            onBlur={() => checkFieldUniqueness(col.name)}
          />
          {checkingUnique && <span className="form-hint">Validando unicidad...</span>}
          {error && <span className="form-error">{error}</span>}
        </div>
      );
    }

    // Time
    if (col.displayType === 'time') {
      return (
        <div key={col.name} className="form-group">
          <label>
            {formatColumnName(col.name)}
            {!col.isNullable && <span className="required">*</span>}
          </label>
          <input
            type="time"
            value={value || ''}
            onChange={(e) => handleFormChange(col.name, e.target.value)}
            onBlur={() => checkFieldUniqueness(col.name)}
          />
          {checkingUnique && <span className="form-hint">Validando unicidad...</span>}
          {error && <span className="form-error">{error}</span>}
        </div>
      );
    }

    // Number
    if (col.displayType === 'number') {
      return (
        <div key={col.name} className="form-group">
          <label>
            {formatColumnName(col.name)}
            {!col.isNullable && <span className="required">*</span>}
          </label>
          <input
            type="number"
            value={value || ''}
            onChange={(e) => handleFormChange(col.name, e.target.value)}
            onBlur={() => checkFieldUniqueness(col.name)}
            step="1"
          />
          {checkingUnique && <span className="form-hint">Validando unicidad...</span>}
          {error && <span className="form-error">{error}</span>}
        </div>
      );
    }

    // Decimal
    if (col.displayType === 'decimal') {
      const decimals = col.numericScale || 2;
      const isCurrency = /costo|precio|valor|total|salario|pago|monto|tarifa/i.test(col.name) && !/hectarea|cantidad/i.test(col.name) && !col.name.startsWith('id_') && !col.name.endsWith('_id');
      
      return (
        <div key={col.name} className="form-group">
          <label>
            {formatColumnName(col.name)}
            {!col.isNullable && <span className="required">*</span>}
          </label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            {isCurrency && <span style={{ position: 'absolute', left: '12px', color: '#64748b' }}>$</span>}
            <input
              type="number"
              value={value || ''}
              onChange={(e) => handleFormChange(col.name, e.target.value)}
              onBlur={() => checkFieldUniqueness(col.name)}
              step={1 / Math.pow(10, decimals)}
              style={{ paddingLeft: isCurrency ? '28px' : '12px' }}
            />
          </div>
          {col.comment && <span className="form-hint">{col.comment}</span>}
          {checkingUnique && <span className="form-hint">Validando unicidad...</span>}
          {error && <span className="form-error">{error}</span>}
        </div>
      );
    }

    // Handle Imagen URL
    if (col.name === 'imagen_url') {
      return (
        <div key={col.name} className="form-group full-width">
          <label>
            Fotografía / Imagen del Producto
          </label>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
            {value ? (
              <img src={value} alt="Preview" style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border)' }} />
            ) : (
              <div style={{ width: '100px', height: '100px', borderRadius: '8px', border: '1px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                Sin foto
              </div>
            )}
            <div style={{ flex: 1 }}>
              <input
                type="text"
                placeholder="URL de la imagen o Base64..."
                value={value || ''}
                onChange={(e) => handleFormChange(col.name, e.target.value)}
                onBlur={() => checkFieldUniqueness(col.name)}
                style={{ marginBottom: '8px' }}
              />
              <small className="form-hint">Pega la URL de la imagen. (El soporte para subida de archivo local requeriría un bucket S3 o similar en backend, por ahora puedes usar URLs externas).</small>
            </div>
          </div>
          {checkingUnique && <span className="form-hint">Validando unicidad...</span>}
          {error && <span className="form-error">{error}</span>}
        </div>
      );
    }

    // JSON
    if (col.displayType === 'json') {
      return (
        <div key={col.name} className="form-group full-width">
          <label>
            {formatColumnName(col.name)}
          </label>
          <textarea
            value={typeof value === 'object' ? JSON.stringify(value, null, 2) : (value || '')}
            onChange={(e) => {
              try {
                handleFormChange(col.name, JSON.parse(e.target.value));
              } catch {
                handleFormChange(col.name, e.target.value);
              }
            }}
            rows={4}
            placeholder="JSON válido"
          />
          {error && <span className="form-error">{error}</span>}
        </div>
      );
    }

    // Spatial (Polygon / Point) fields
    if (col.name === 'poligono_gps' || col.type?.toLowerCase() === 'polygon') {
      return (
        <div key={col.name} className="form-group full-width">
          <label>
            {formatColumnName(col.name)}
            {!col.isNullable && <span className="required">*</span>}
          </label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="text"
              value={value || ''}
              readOnly
              placeholder="No definido (abre el editor para dibujar)"
              style={{
                flex: 1,
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                cursor: 'not-allowed',
                color: value ? '#00F0FF' : '#718096',
                borderColor: value ? '#00F0FF' : undefined
              }}
            />
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                setEditingField(col.name);
                setEditorOpen(true);
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
            >
              🗺️ Dibujar Polígono
            </button>
          </div>
          {error && <span className="form-error">{error}</span>}
        </div>
      );
    }

    if (col.name === 'centro_gps' || col.type?.toLowerCase() === 'point') {
      return (
        <div key={col.name} className="form-group">
          <label>
            {formatColumnName(col.name)}
            {!col.isNullable && <span className="required">*</span>}
          </label>
          <input
            type="text"
            value={value || ''}
            readOnly
            placeholder="Auto-calculado desde el polígono"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              cursor: 'not-allowed',
              color: value ? '#A78BFA' : '#718096'
            }}
          />
          {error && <span className="form-error">{error}</span>}
        </div>
      );
    }

    // Special handling for codigo_municipio (DIAN DANE codes)
    if (col.name === 'codigo_municipio') {
      return (
        <div key={col.name} className="form-group">
          <label>
            {formatColumnName(col.name)} (DIAN)
            {!col.isNullable && <span className="required">*</span>}
          </label>
          <AsyncSelect
            cacheOptions
            defaultOptions={false}
            loadOptions={loadOptionsMunicipios}
            onChange={(selected) => handleFormChange(col.name, selected ? selected.value : null)}
            placeholder="Buscar ciudad o código..."
            menuPosition="fixed"
            styles={{
              control: (base) => ({ ...base, background: 'var(--card-bg)', borderColor: 'var(--border)', color: 'var(--text)' }),
              menu: (base) => ({ ...base, background: 'var(--card-bg)', color: 'var(--text)', zIndex: 9999 }),
              option: (base, state) => ({ ...base, background: state.isFocused ? 'var(--primary-light)' : 'transparent', color: 'var(--text)' }),
              singleValue: (base) => ({ ...base, color: 'var(--text)' })
            }}
          />
          {value && <div style={{marginTop: '4px', fontSize: '12px', color: 'var(--primary)'}}>Código actual: {value}</div>}
          {error && <span className="form-error">{error}</span>}
        </div>
      );
    }

    // Default text input
    return (
      <div key={col.name} className="form-group">
        <label>
          {formatColumnName(col.name)}
          {!col.isNullable && <span className="required">*</span>}
        </label>
          <input
            type="text"
            value={value || ''}
            onChange={(e) => handleFormChange(col.name, e.target.value)}
            onBlur={() => checkFieldUniqueness(col.name)}
            maxLength={col.maxLength || undefined}
          />
          {col.comment && <span className="form-hint">{col.comment}</span>}
          {checkingUnique && <span className="form-hint">Validando unicidad...</span>}
          {error && <span className="form-error">{error}</span>}
        </div>
    );
  };

  // Render cell value
  const renderCellValue = (col, row) => {
    const val = row[col.name];

    if (val === null || val === undefined) {
      return <span className="cell-null">NULL</span>;
    }

    if (col.name === 'fotografia' && typeof val === 'string' && val.startsWith('data:image')) {
      return (
        <img src={val} alt="Foto" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #e2e8f0' }} />
      );
    }
    
    if (col.name === 'imagen_url' && typeof val === 'string' && val.startsWith('http')) {
      return (
        <a href={val} target="_blank" rel="noreferrer">
          <img src={val} alt="Imagen URL" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #e2e8f0' }} />
        </a>
      );
    }
    
    // Resolve Foreign Keys dynamically
    if (fkOptions[col.name]) {
      const option = fkOptions[col.name].find(opt => String(opt.id) === String(val) || String(opt.value) === String(val));
      if (option) {
        return (
          <span className="badge" style={{ backgroundColor: 'var(--card-bg-hover)', color: 'var(--primary)', border: '1px solid var(--border)' }}>
            {option.display || option.label}
          </span>
        );
      }
    }

    if (col.name === 'es_nocivo') {
      return val ? (
        <span 
          className="badge" 
          style={{ backgroundColor: '#fee2e2', color: '#ef4444', border: '1px solid #f87171', cursor: 'help', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }} 
          title={row.anotacion_prevencion || 'Sustancia Nociva / Peligrosa'}
        >
          ⚠️ Peligroso
        </span>
      ) : (
        <span style={{ color: '#94a3b8' }}>No</span>
      );
    }

    if (col.name === 'url_hoja_seguridad') {
      return val ? (
        <a href={val} target="_blank" rel="noreferrer" style={{ color: '#38bdf8', textDecoration: 'underline', display: 'flex', alignItems: 'center', gap: '4px' }}>
          📄 PDF
        </a>
      ) : (
        <span style={{ color: '#94a3b8' }}>-</span>
      );
    }

    if (col.displayType === 'boolean') {
      return val ? (
        <span className="cell-boolean-true">✓ Sí</span>
      ) : (
        <span className="cell-boolean-false">✗ No</span>
      );
    }

    if (col.enumValues) {
      const cssClass = `cell-enum enum-${String(val).toLowerCase()}`;
      return (
        <span className={cssClass}>
          {String(val).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
        </span>
      );
    }

    if (col.displayType === 'datetime' || col.displayType === 'timestamp') {
      try {
        return new Date(val).toLocaleString('es-ES', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      } catch {
        return String(val);
      }
    }

    if (col.displayType === 'date') {
      try {
        return new Date(val).toLocaleDateString('es-ES', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      } catch {
        return String(val);
      }
    }

    if (col.displayType === 'decimal' || col.displayType === 'number') {
      const num = parseFloat(val);
      if (isNaN(num)) return String(val);
      const isCurrency = /costo|precio|valor|total|salario|pago|monto|tarifa/i.test(col.name) && !/hectarea|cantidad/i.test(col.name) && !col.name.startsWith('id_') && !col.name.endsWith('_id');
      
      if (isCurrency) {
        return new Intl.NumberFormat('es-CO', {
          style: 'currency',
          currency: 'COP',
          minimumFractionDigits: col.numericScale || 0,
          maximumFractionDigits: col.numericScale || 0,
        }).format(num);
      } else {
        const colName = col.name || '';
        if (colName.startsWith('id_') || colName.endsWith('_id') || colName === 'id' || (col.displayType === 'number' && !col.numericScale)) {
          return String(val);
        }
        return new Intl.NumberFormat('es-CO', {
          minimumFractionDigits: col.numericScale || 2,
          maximumFractionDigits: col.numericScale || 2,
        }).format(num);
      }
    }

    if (col.displayType === 'json') {
      try {
        return <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{JSON.stringify(val).slice(0, 60)}...</span>;
      } catch {
        return String(val);
      }
    }

    if (col.name === 'poligono_gps' || col.type?.toLowerCase() === 'polygon') {
      const pointsCount = (val.match(/,/g) || []).length;
      return (
        <div style={{ minWidth: '140px', display: 'inline-block' }}>
          <span className="badge badge-poly" style={{
            backgroundColor: 'rgba(0, 240, 255, 0.1)',
            border: '1px solid rgba(0, 240, 255, 0.4)',
            color: '#00F0FF',
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 'bold',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            🗺️ Polígono ({pointsCount > 0 ? pointsCount + 1 : 0} pts)
          </span>
        </div>
      );
    }

    if (col.name === 'centro_gps' || col.type?.toLowerCase() === 'point') {
      const match = val.match(/point\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
      if (match) {
        const lng = parseFloat(match[1]);
        const lat = parseFloat(match[2]);
        return (
          <span className="badge badge-point" style={{
            backgroundColor: 'rgba(167, 139, 250, 0.1)',
            border: '1px solid rgba(167, 139, 250, 0.4)',
            color: '#A78BFA',
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 'bold',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            📍 {lat.toFixed(4)}, {lng.toFixed(4)}
          </span>
        );
      }
      return String(val);
    }

    return String(val);
  };

  // Generate pagination pages
  const getPageNumbers = () => {
    const { page, totalPages } = pagination;
    const pages = [];
    const maxVisible = 7;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      let start = Math.max(2, page - 2);
      let end = Math.min(totalPages - 1, page + 2);

      if (page <= 3) {
        end = Math.min(5, totalPages - 1);
      }
      if (page >= totalPages - 2) {
        start = Math.max(totalPages - 4, 2);
      }

      if (start > 2) pages.push('...');
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < totalPages - 1) pages.push('...');
      pages.push(totalPages);
    }

    return pages;
  };

  if (error && !structure) {
    return (
      <div className="error-container">
        <div className="error-icon">⚠️</div>
        <div className="error-message">Error al cargar la tabla</div>
        <div className="error-detail">{error}</div>
      </div>
    );
  }

  return (
    <div className="catalog-container">
      {/* Toast */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.type === 'success' ? '✓' : '✗'} {toast.message}
        </div>
      )}

      {/* Toolbar */}
      <div className="catalog-toolbar">
        <h2 className="catalog-title">{formatTableName(tableName)}</h2>
          <div className="catalog-search" style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'transparent', padding: 0, border: 'none' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '6px 12px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px', color: 'var(--text-muted)' }}>
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Buscar registros..."
                value={search}
                onChange={handleSearch}
                style={{ border: 'none', outline: 'none', background: 'transparent' }}
              />
            </div>
            
            {tableName === 'insumos' && fkOptions['id_grupo'] && (
              <select 
                className="form-input" 
                style={{ width: 'auto', padding: '6px 12px', minWidth: '150px', backgroundColor: '#1e293b', color: '#fff' }}
                value={filterGrupo}
                onChange={(e) => { 
                  setFilterGrupo(e.target.value); 
                  setFilterSubgrupo(''); 
                  setPagination(p => ({...p, page: 1})); 
                }}
              >
                <option value="">-- Todos los Grupos --</option>
                {fkOptions['id_grupo'].map(opt => (
                  <option key={opt.id} value={opt.id}>{opt.display}</option>
                ))}
              </select>
            )}

            {tableName === 'insumos' && fkOptions['id_subgrupo'] && (
              <select 
                className="form-input" 
                style={{ width: 'auto', padding: '6px 12px', minWidth: '150px', backgroundColor: '#1e293b', color: '#fff' }}
                value={filterSubgrupo}
                onChange={(e) => { setFilterSubgrupo(e.target.value); setPagination(p => ({...p, page: 1})); }}
              >
                <option value="">-- Todos los Subgrupos --</option>
                {fkOptions['id_subgrupo']
                  .filter(opt => !filterGrupo || (String(opt.id_grupo) === String(filterGrupo)))
                  .map(opt => (
                  <option key={opt.id} value={opt.id}>{opt.display}</option>
                ))}
              </select>
            )}

            {hasFincaColumn && fkOptions['id_finca'] && (
              <select 
                className="form-input" 
                style={{ width: 'auto', padding: '6px 12px', minWidth: '150px', backgroundColor: '#1e293b', color: '#fff' }}
                value={filterFinca}
                onChange={(e) => { 
                  setFilterFinca(e.target.value); 
                  setPagination(p => ({...p, page: 1})); 
                }}
              >
                <option value="">-- Todas las Fincas --</option>
                {fkOptions['id_finca'].map(opt => (
                  <option key={opt.id} value={opt.id}>{opt.display}</option>
                ))}
              </select>
            )}

            {hasDateColumn && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Desde:</span>
                  <input 
                    type="date" 
                    className="form-input" 
                    style={{ padding: '4px 8px', width: 'auto' }}
                    value={filterDateFrom}
                    onChange={(e) => { setFilterDateFrom(e.target.value); setPagination(p => ({...p, page: 1})); }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Hasta:</span>
                  <input 
                    type="date" 
                    className="form-input" 
                    style={{ padding: '4px 8px', width: 'auto' }}
                    value={filterDateTo}
                    onChange={(e) => { setFilterDateTo(e.target.value); setPagination(p => ({...p, page: 1})); }}
                  />
                </div>
              </div>
            )}
          </div>
        <div className="catalog-actions">
          <button className="btn btn-success" onClick={openAddModal}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Nuevo
          </button>
          <button className="btn-action-base btn-pdf" onClick={handleExportPdf}>
            📄 PDF
          </button>
          <button className="btn-action-base btn-excel" onClick={handleExportExcel}>
            📊 Excel
          </button>
          <button className="btn-action-base btn-whatsapp" onClick={handleExportWhatsApp}>
            💬 WhatsApp
          </button>
        </div>
      </div>

      {/* Table info */}
      {structure && (
        <div style={{ marginBottom: '12px', fontSize: '13px', color: 'var(--text-muted)' }}>
          {structure.columns.length} columnas · {pagination.total.toLocaleString('es-ES')} registros totales
          {search && ` · Filtrando: "${search}"`}
        </div>
      )}

      {/* Data Table */}
      {loading && !structure ? (
        <div className="loading-container">
          <div className="spinner" />
          <span className="loading-text">Cargando estructura de la tabla...</span>
        </div>
      ) : structure ? (
        <div className="table-wrapper">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  {structure.columns
                    .filter(col => {
                      if (tableName === 'agroind_maquinaria_equipo' || tableName === 'maquinaria') {
                        return !['id_maq_agro', 'id_maquinaria', 'id_finca', 'odometro_actual', 'es_alquilada', 'combustible_tipo', 'valor_comercial', 'ficha_tecnica', 'ano_fabricacion', 'horas_motor_totales', 'ultimo_mantenimiento', 'proximo_mantenimiento_horas', 'valor_compra', 'valor_actual'].includes(col.name);
                      }
                      return true;
                    })
                    .map((col) => (
                    <th
                      key={col.name}
                      onClick={() => handleSort(col.name)}
                      className={sortColumn === col.name ? 'sorted' : ''}
                      title={`${col.type}${col.comment ? ' - ' + col.comment : ''}`}
                      style={(col.name === 'poligono_gps' || col.type?.toLowerCase() === 'polygon') ? { width: '200px', minWidth: '200px' } : undefined}
                    >
                      {formatColumnName(col.name)}
                      {col.isPrimaryKey && ' 🔑'}
                      {sortColumn === col.name && (
                        <span className="sort-indicator">
                          {sortDirection === 'ASC' ? ' ↑' : ' ↓'}
                        </span>
                      )}
                    </th>
                  ))}
                  <th style={{ 
                    width: '260px', 
                    minWidth: '260px', 
                    cursor: 'default', 
                    position: 'sticky', 
                    right: 0, 
                    backgroundColor: 'var(--card-bg)', 
                    zIndex: 2, 
                    borderLeft: '1px solid var(--border)',
                    boxShadow: '-4px 0 8px rgba(0,0,0,0.05)'
                  }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={structure.columns.length + 1}>
                      <div className="loading-container" style={{ padding: '30px' }}>
                        <div className="spinner" />
                        <span className="loading-text">Cargando datos...</span>
                      </div>
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={structure.columns.length + 1}>
                      <div className="empty-state">
                        <div className="empty-state-icon">📭</div>
                        <p>{search ? 'No se encontraron registros con ese filtro' : 'No hay registros en esta tabla'}</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  data.map((row, rowIndex) => (
                    <tr key={row[structure.primaryKey] || rowIndex}>
                      {structure.columns
                        .filter(col => {
                          if (tableName === 'agroind_maquinaria_equipo' || tableName === 'maquinaria') {
                            return !['id_maq_agro', 'id_maquinaria', 'id_finca', 'odometro_actual', 'es_alquilada', 'combustible_tipo', 'valor_comercial', 'ficha_tecnica', 'ano_fabricacion', 'horas_motor_totales', 'ultimo_mantenimiento', 'proximo_mantenimiento_horas', 'valor_compra', 'valor_actual'].includes(col.name);
                          }
                          return true;
                        })
                        .map((col) => (
                        <td key={col.name} title={row[col.name] != null ? String(row[col.name]) : 'NULL'} style={(col.name === 'poligono_gps' || col.type?.toLowerCase() === 'polygon') ? { width: '200px', minWidth: '200px', overflow: 'visible', whiteSpace: 'nowrap' } : undefined}>
                          {renderCellValue(col, row)}
                        </td>
                      ))}
                      <td style={{ position: 'sticky', right: 0, backgroundColor: 'var(--card-bg)', zIndex: 1, borderLeft: '1px solid var(--border)', padding: '8px' }}>
                        <div className="cell-actions" style={{ display: 'flex', gap: '4px', flexWrap: 'nowrap', alignItems: 'center' }}>
                          <button
                            className="btn btn-outline btn-sm btn-edit"
                            onClick={() => openEditModal(row)}
                            title="Editar"
                          >
                            ✏️ <span className="btn-text">Editar</span>
                          </button>
                          
                          {(tableName === 'empleados' || tableName === 'rrhh_empleados') && (
                            <>
                              <button
                                className="btn btn-outline btn-sm"
                                style={{ borderColor: '#3b82f6', color: '#3b82f6' }}
                                onClick={() => setQrModalData(row)}
                                title="QR Carnet"
                              >
                                🎫 <span className="btn-text">Carnet</span>
                              </button>
                              <button
                                className="btn btn-outline btn-sm"
                                style={{ borderColor: '#10b981', color: '#10b981' }}
                                onClick={async () => {
                                  try {
                                    const res = await authFetch('/api/rrhh/biometria/simular', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ id_empleado: row.id_empleado || row.id })
                                    });
                                    const data = await res.json();
                                    if (data.success) {
                                      showToast(`${data.tipo_marcacion} registrada para ${row.nombres || row.nombre_completo || 'Empleado'}`, 'success');
                                    } else {
                                      showToast(`Error: ${data.error}`, 'error');
                                    }
                                  } catch (err) {
                                    showToast('Error de conexión al simular.', 'error');
                                  }
                                }}
                                title="Simular Huella"
                              >
                                👆 <span className="btn-text">Huella</span>
                              </button>
                            </>
                          )}

                          {(tableName === 'agroind_maquinaria_equipo' || tableName === 'maquinaria' || tableName === 'vehiculos') && (
                            <>
                              <button
                                className="btn btn-outline btn-sm btn-icon"
                                onClick={() => setActiveMachineForRepuestos(row)}
                                title="Historial de Repuestos"
                                style={{ padding: '4px', fontSize: '14px', lineHeight: 1 }}
                              >📦</button>
                              <button
                                className="btn btn-outline btn-sm btn-icon"
                                onClick={() => setActiveMachineForLabores(row)}
                                title="Historial de Labores"
                                style={{ padding: '4px', fontSize: '14px', lineHeight: 1 }}
                              >🚜</button>
                              <button
                                className="btn btn-outline btn-sm btn-icon"
                                onClick={() => setActiveMachineForManttos(row)}
                                title="Historial de Mantenimientos"
                                style={{ padding: '4px', fontSize: '14px', lineHeight: 1 }}
                              >🔧</button>
                              {row.categoria === 'DRON' && (
                                <button
                                  className="btn btn-outline btn-sm btn-icon"
                                  onClick={() => setActiveDroneForDetails(row)}
                                  title="Ficha del Dron"
                                  style={{ padding: '4px', fontSize: '14px', lineHeight: 1, borderColor: '#0ea5e9', color: '#0ea5e9' }}
                                >🚁</button>
                              )}
                            </>
                          )}

                          {tableName === 'ganado_animales' && (
                            <button
                              className="btn btn-outline btn-sm btn-icon"
                              onClick={() => setActiveAnimalForHistoria(row.id_animal || row.id)}
                              title="Historia Clínica y Reproductiva"
                              style={{ padding: '4px', fontSize: '14px', lineHeight: 1, borderColor: '#ec4899', color: '#ec4899' }}
                            >🏥</button>
                          )}

                          {tableName === 'mecanicos' && (
                            <>
                              <button
                                className="btn btn-outline btn-sm btn-icon"
                                style={{ borderColor: '#3b82f6', color: '#3b82f6', padding: '6px' }}
                                onClick={() => setActiveEmployeeForHojaVida(row)}
                                title="Hoja de Vida"
                              >
                                📋
                              </button>
                              <button
                                className="btn btn-outline btn-sm btn-icon"
                                style={{ borderColor: '#8b5cf6', color: '#8b5cf6', padding: '6px' }}
                                onClick={() => setActiveMachineForLabores(row)}
                                title="Mano de Obra y Vehículos Atendidos"
                              >
                                👨‍🔧
                              </button>
                              <button
                                className="btn btn-outline btn-sm btn-icon"
                                style={{ borderColor: '#10b981', color: '#10b981', padding: '6px' }}
                                onClick={() => setActiveMachineForManttos(row)}
                                title="Órdenes de Trabajo (Mantenimientos Asignados)"
                              >
                                🔧
                              </button>
                            </>
                          )}

                          <button
                            className="btn btn-outline btn-sm btn-delete"
                            onClick={() => setDeleteConfirm(row[structure.primaryKey] || rowIndex)}
                            title="Eliminar"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 0 && (
            <div className="table-footer">
              <div className="table-info">
                Mostrando {((pagination.page - 1) * pagination.pageSize) + 1} - {Math.min(pagination.page * pagination.pageSize, pagination.total)} de {pagination.total.toLocaleString('es-ES')}
              </div>
              <div className="pagination">
                <button
                  className="page-btn"
                  onClick={() => handlePageChange(1)}
                  disabled={pagination.page === 1}
                >
                  ««
                </button>
                <button
                  className="page-btn"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                >
                  ‹
                </button>
                {getPageNumbers().map((p, i) =>
                  p === '...' ? (
                    <span key={`dots-${i}`} style={{ padding: '0 4px', color: 'var(--text-muted)' }}>
                      ...
                    </span>
                  ) : (
                    <button
                      key={p}
                      className={`page-btn ${pagination.page === p ? 'active' : ''}`}
                      onClick={() => handlePageChange(p)}
                    >
                      {p}
                    </button>
                  )
                )}
                <button
                  className="page-btn"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                >
                  ›
                </button>
                <button
                  className="page-btn"
                  onClick={() => handlePageChange(pagination.totalPages)}
                  disabled={pagination.page === pagination.totalPages}
                >
                  »»
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalMode === 'add' ? `Nuevo Registro — ${formatTableName(tableName)}` : `Editar Registro — ${formatTableName(tableName)}`}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setModalOpen(false)} disabled={submitting}>
              Cancelar
            </button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting || hasBlockingFormErrors}>
              {submitting ? (
                <>
                  <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                  Guardando...
                </>
              ) : modalMode === 'add' ? (
                '✓ Crear'
              ) : (
                '✓ Actualizar'
              )}
            </button>
          </>
        }
      >
        {structure && (
          <div className="form-grid">
            {structure.columns
              .filter((col) => !col.isAutoIncrement)
              .map((col) => renderFormField(col))}

            {tableName === 'rrhh_empleados' && isMinor() && (
              <div className="form-group full-width" style={{ border: '1px solid var(--warning)', padding: '16px', borderRadius: '8px', background: 'rgba(234, 179, 8, 0.05)', marginTop: '16px' }}>
                <h4 style={{ color: 'var(--warning)', marginTop: 0, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  ⚠️ Cumplimiento Normativo (MinTrabajo) - Menor de Edad
                </h4>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.5 }}>
                  Según la ley colombiana, la contratación de menores de 18 años requiere autorización del Inspector de Trabajo. Las labores agrícolas, ganaderas o acuícolas que impliquen esfuerzo físico extremo, manejo de agroquímicos, maquinaria pesada o riesgo biológico están prohibidas para menores.
                </p>
                <div className="form-grid">
                  {structure.columns.filter(c => ['tiene_permiso_mintrabajo', 'nombre_tutor_legal', 'identificacion_tutor', 'restriccion_horaria'].includes(c.name)).map(c => renderFormField(c, true))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Universal Quick Add Modal */}
      {quickAddModal.isOpen && (
        <QuickAddModal
          isOpen={quickAddModal.isOpen}
          onClose={() => setQuickAddModal({ isOpen: false, tableName: null, sourceField: null, defaultValues: {} })}
          tableName={quickAddModal.tableName}
          tenantId={tenantId}
          fincaId={fincaId}
          nucleoId={nucleoId}
          defaultValues={quickAddModal.defaultValues}
          onSuccess={async (newId) => {
            showToast('Registro creado exitosamente');
            const sourceField = quickAddModal.sourceField;
            setQuickAddModal({ isOpen: false, tableName: null, sourceField: null, defaultValues: {} });
            await loadFkOptions();
            handleFormChange(sourceField, newId);
          }}
        />
      )}

      {/* Delete Confirm Dialog */}
      {deleteConfirm && (
        <div className="modal-overlay">
          <div className="modal confirm-dialog">
            <div className="modal-body">
              <div className="error-icon" style={{ fontSize: '48px', color: 'var(--warning)', marginBottom: '16px' }}>⚠️</div>
              <h4>¿Estás seguro?</h4>
              <p>Esta acción no se puede deshacer. ¿Deseas eliminar este registro?</p>
              <div className="modal-footer" style={{ marginTop: '24px', justifyContent: 'center', display: 'flex', gap: '12px' }}>
                <button className="btn btn-outline" onClick={() => setDeleteConfirm(null)}>Cancelar</button>
                <button className="btn btn-danger" onClick={handleDelete}>Sí, Eliminar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Polygon Editor Modal Overlay */}
      {editorOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '900px', width: '90vw', height: '90vh', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px', color: '#00F0FF', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🗺️ Editor de Geocercas (Polígono)
            </h3>
            <PolygonEditor
              initialPolygon={formData[editingField]}
              existingPolygons={data.filter(d => d[editingField] && d[structure?.primaryKey] !== formData[structure?.primaryKey]).map(d => ({
                wkt: d[editingField],
                label: d.nombre || d.descripcion || `ID: ${d[structure?.primaryKey]}`
              }))}
              onSave={handleSavePolygon}
              onClose={() => setEditorOpen(false)}
            />
          </div>
        </div>
      )}

      {/* QR Code Modal for Employees */}
      {qrModalData && (
        <div className="modal-overlay" onClick={() => setQrModalData(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', textAlign: 'center', padding: '32px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '24px', color: '#1e293b' }}>Carnet Virtual de Empleado</h3>
            
            {qrModalData.fotografia && qrModalData.fotografia.startsWith('data:image') && (
              <img 
                src={qrModalData.fotografia} 
                alt="Foto" 
                style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', marginBottom: '16px', border: '3px solid #e2e8f0' }} 
              />
            )}

            <h4 style={{ margin: '0 0 8px 0', fontSize: '20px', color: '#334155' }}>
              {qrModalData.nombres ? `${qrModalData.nombres} ${qrModalData.apellidos || ''}` : qrModalData.nombre}
            </h4>
            <p style={{ margin: '0 0 24px 0', color: '#64748b' }}>
              CC / ID: {qrModalData.documento_identidad || qrModalData.documento || 'No registrado'}
            </p>

            <div style={{ background: 'white', padding: '16px', display: 'inline-block', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
              <QRCodeSVG 
                value={JSON.stringify({
                  id: qrModalData.id_empleado,
                  doc: qrModalData.documento_identidad || qrModalData.documento || '',
                  nombres: qrModalData.nombres || qrModalData.nombre || '',
                  apellidos: qrModalData.apellidos || ''
                })} 
                size={200}
                level="M"
              />
            </div>
            
            <p style={{ marginTop: '16px', fontSize: '12px', color: '#94a3b8' }}>Escanea este código para validar la identidad</p>

            <button className="btn btn-primary" style={{ width: '100%', marginTop: '16px' }} onClick={() => setQrModalData(null)}>
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Machinery Sub-modules */}
      <FichaTecnicaModal 
        machine={activeMachineForFicha} 
        onClose={() => setActiveMachineForFicha(null)} 
        onSave={(id, field, val) => {
          setEditingId(id);
          // Note: API save implementation
          authFetch(`/api/table/${tableName}/data/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ [field]: val })
          }).then(res => {
            if(res.ok) {
               showToast('Ficha Técnica actualizada', 'success');
               loadData();
            }
          });
        }}
      />
      <HistorialRepuestosModal machine={activeMachineForRepuestos} onClose={() => setActiveMachineForRepuestos(null)} />
      {activeMachineForLabores && (
        <HistorialLaboresModal machine={activeMachineForLabores} onClose={() => setActiveMachineForLabores(null)} />
      )}
      {activeMachineForManttos && (
        <HistorialMantenimientosModal machine={activeMachineForManttos} onClose={() => setActiveMachineForManttos(null)} />
      )}
      {activeEmployeeForHojaVida && (
        <HojaDeVidaModal
          empleadoId={activeEmployeeForHojaVida.id_empleado || activeEmployeeForHojaVida.id}
          onClose={() => setActiveEmployeeForHojaVida(null)}
        />
      )}

      {activeAnimalForHistoria && (
        <HistoriaClinicaModal
          animalId={activeAnimalForHistoria}
          onClose={() => setActiveAnimalForHistoria(null)}
        />
      )}

      {activeDroneForDetails && (
        <DroneDetailsModal 
          drone={activeDroneForDetails} 
          onClose={() => setActiveDroneForDetails(null)} 
        />
      )}

      {/* Delete Confirmation Modal */}
    </div>
  );
}

export default DynamicCatalog;
