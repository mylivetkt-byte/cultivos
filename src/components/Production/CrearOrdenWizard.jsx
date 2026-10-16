import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Select } from 'antd';
import { Play, Check, ChevronRight, ChevronLeft, Calculator, Plus, Trash2, ShieldCheck, HelpCircle, FileText, Download, Send } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { useAuth } from '../../context/AuthContext';

const { Option } = Select;

const darkSelectStyles = `
  .dark-select .ant-select-selector {
    background-color: #1b253b !important;
    border-color: #334155 !important;
    color: white !important;
    height: 42px !important;
    padding-top: 5px !important;
    border-radius: 0.5rem !important;
  }
  .dark-select .ant-select-selection-search-input {
    color: white !important;
    height: 40px !important;
  }
  .dark-select .ant-select-selection-item {
    color: white !important;
    line-height: 30px !important;
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

const CrearOrdenWizard = () => {
  const { user } = useAuth();
  const id_tenant = localStorage.getItem('tenant_id') || 1;
  const creado_por = 1; // Default user id for demo

  // Wizard state
  const [step, setStep] = useState(1);
  const [formulas, setFormulas] = useState([]);
  const [bodegas, setBodegas] = useState([]);
  const [fincas, setFincas] = useState([]);
  const [empleadosDisponibles, setEmpleadosDisponibles] = useState([]);
  const [maquinasDisponibles, setMaquinasDisponibles] = useState([]);

  // Form selections
  const [selectedFormulaId, setSelectedFormulaId] = useState('');
  const [cantidadOrdenada, setCantidadOrdenada] = useState(100);
  const [idBodegaOrigen, setIdBodegaOrigen] = useState('');
  const [idBodegaDestino, setIdBodegaDestino] = useState('');
  const [idFinca, setIdFinca] = useState('');
  const [fechaOrden, setFechaOrden] = useState(new Date().toISOString().split('T')[0]);

  // Step 2: Insumos (con Lotes)
  const [insumosSeleccionados, setInsumosSeleccionados] = useState([]);
  const [lotesPorInsumo, setLotesPorInsumo] = useState({}); // { id_insumo: [lotes] }

  // Step 3: MOD (Mano de Obra)
  const [manoObra, setManoObra] = useState([]); // [{ id_empleado, nombre, horas_jornales, tarifa_por_hora }]

  // Step 4: CIF (Maquinaria)
  const [maquinaria, setMaquinaria] = useState([]); // [{ id_maquina_taller, nombre, horas_reales, costo_hora }]

  // Step 5: QA & BPM Checklist
  const [cantidadPrimera, setCantidadPrimera] = useState(90);
  const [cantidadSegunda, setCantidadSegunda] = useState(8);
  const [merma, setMerma] = useState(2);
  const [checklistBPM, setChecklistBPM] = useState({
    higieneOperarios: true,
    temperaturaProceso: true,
    limpiezaMaquinas: true,
    calidadEmpaque: true,
  });

  // Costos adicionales CIF
  const [costoEnergia, setCostoEnergia] = useState(0);
  const [costoAgua, setCostoAgua] = useState(0);
  const [costoImpuestos, setCostoImpuestos] = useState(0);

  // Success details for BPM Label
  const [createdOrderDetails, setCreatedOrderDetails] = useState(null);

  // Simulator state
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [simCantidad, setSimCantidad] = useState(100);
  const [simFormula, setSimFormula] = useState(null);

  // Status/Messages
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Load initial options
  useEffect(() => {
    const loadData = async () => {
      try {
        const [resFormulas, resBodegas, resFincas, resEmpleados, resMaquinas] = await Promise.all([
          axios.get(`/api/produccion/formulas?id_tenant=${id_tenant}`).catch(err => {
            console.error('Error fetching formulas:', err);
            return { data: { data: [] } };
          }),
          axios.get(`/api/table/bod_bodegas/data?tenantId=${id_tenant}&pageSize=100`).catch(err => {
            console.error('Error fetching bodegas:', err);
            return { data: { data: [] } };
          }),
          axios.get(`/api/table/fincas/data?tenantId=${id_tenant}&pageSize=100`).catch(err => {
            console.error('Error fetching fincas:', err);
            return { data: { data: [] } };
          }),
          axios.get(`/api/produccion/empleados?id_tenant=${id_tenant}`).catch(err => {
            console.error('Error fetching empleados:', err);
            return { data: { data: [] } };
          }),
          axios.get(`/api/produccion/maquinas?id_tenant=${id_tenant}`).catch(err => {
            console.error('Error fetching maquinas:', err);
            return { data: { data: [] } };
          }),
        ]);

        setFormulas(resFormulas.data.data || []);
        setBodegas(resBodegas.data.data || []);
        setFincas(resFincas.data.data || []);
        setEmpleadosDisponibles(resEmpleados.data.data || []);
        setMaquinasDisponibles(resMaquinas.data.data || []);

        if (resBodegas.data.data?.length > 0) {
          setIdBodegaOrigen(resBodegas.data.data[0].id_bodega);
          setIdBodegaDestino(resBodegas.data.data[0].id_bodega);
        }
        if (resFincas.data.data?.length > 0) {
          setIdFinca(resFincas.data.data[0].id_finca);
        }

        // Restore wizard draft if exists
        const saved = localStorage.getItem('production_order_wizard_draft');
        if (saved) {
          try {
            const draft = JSON.parse(saved);
            if (draft.step) setStep(draft.step);
            if (draft.selectedFormulaId) setSelectedFormulaId(draft.selectedFormulaId);
            if (draft.cantidadOrdenada) setCantidadOrdenada(draft.cantidadOrdenada);
            if (draft.idBodegaOrigen) setIdBodegaOrigen(draft.idBodegaOrigen);
            if (draft.idBodegaDestino) setIdBodegaDestino(draft.idBodegaDestino);
            if (draft.idFinca) setIdFinca(draft.idFinca);
            if (draft.fechaOrden) setFechaOrden(draft.fechaOrden);
            if (draft.insumosSeleccionados) setInsumosSeleccionados(draft.insumosSeleccionados);
            if (draft.manoObra) setManoObra(draft.manoObra);
            if (draft.maquinaria) setMaquinaria(draft.maquinaria);
            if (draft.costoEnergia) setCostoEnergia(draft.costoEnergia);
            if (draft.costoAgua) setCostoAgua(draft.costoAgua);
            if (draft.costoImpuestos) setCostoImpuestos(draft.costoImpuestos);
            if (draft.cantidadPrimera) setCantidadPrimera(draft.cantidadPrimera);
            if (draft.cantidadSegunda) setCantidadSegunda(draft.cantidadSegunda);
            if (draft.merma) setMerma(draft.merma);
            if (draft.checklistBPM) setChecklistBPM(draft.checklistBPM);
          } catch (e) {
            console.warn("Could not restore wizard draft", e);
          }
        }
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Error al conectar con la base de datos');
      }
    };
    loadData();
  }, [id_tenant]);

  // Save wizard draft state to localStorage
  useEffect(() => {
    if (step === 6) return; // Don't save draft if completed
    const draft = {
      step,
      selectedFormulaId,
      cantidadOrdenada,
      idBodegaOrigen,
      idBodegaDestino,
      idFinca,
      fechaOrden,
      insumosSeleccionados,
      manoObra,
      maquinaria,
      costoEnergia,
      costoAgua,
      costoImpuestos,
      cantidadPrimera,
      cantidadSegunda,
      merma,
      checklistBPM,
    };
    localStorage.setItem('production_order_wizard_draft', JSON.stringify(draft));
  }, [
    step, selectedFormulaId, cantidadOrdenada, idBodegaOrigen, idBodegaDestino, idFinca, fechaOrden,
    insumosSeleccionados, manoObra, maquinaria, costoEnergia, costoAgua, costoImpuestos,
    cantidadPrimera, cantidadSegunda, merma, checklistBPM
  ]);

  // Autocomplete ingredients and machinery when formula is selected
  useEffect(() => {
    if (!selectedFormulaId) return;

    const loadFormulaDetails = async () => {
      try {
        const res = await axios.get(`/api/produccion/formulas/${selectedFormulaId}?id_tenant=${id_tenant}`);
        const fDetails = res.data.data;
        if (!fDetails) return;

        // Auto prep step 2 insumos
        const mappedInsumos = fDetails.insumos.map((ins) => ({
          id_insumo: ins.id_insumo,
          nombre: ins.nombre,
          codigo: ins.codigo,
          unidad_medida: ins.unidad_medida,
          cantidad_por_unidad: ins.cantidad_por_unidad,
          factor_merma: ins.factor_merma,
          cantidad_consumida: (ins.cantidad_por_unidad * cantidadOrdenada * (1 + parseFloat(ins.factor_merma))).toFixed(2),
          costo_unitario: ins.costo_estandar || 0,
          lote_insumo_origen: '',
        }));
        setInsumosSeleccionados(mappedInsumos);

        // Fetch lots for each insumo
        mappedInsumos.forEach((ins) => {
          fetchLotsForInsumo(ins.id_insumo);
        });

        // Auto prep step 4 machinery
        const mappedMaq = fDetails.maquinarias.map((maq) => ({
          id_maquina_taller: maq.id_maquina_taller,
          nombre: `${maq.marca_modelo} [${maq.placa}]`,
          horas_reales: (maq.tiempo_estandar_horas * cantidadOrdenada).toFixed(2),
          costo_hora: maq.costo_hora || 5000,
        }));
        setMaquinaria(mappedMaq);

        // Pre-fill simulator
        setSimFormula(fDetails);
      } catch (err) {
        console.error('Error loading formula details:', err);
      }
    };
    loadFormulaDetails();
  }, [selectedFormulaId, cantidadOrdenada]);

  const fetchLotsForInsumo = async (id_insumo) => {
    try {
      const res = await axios.get(`/api/produccion/lotes-insumo/${id_insumo}?id_tenant=${id_tenant}&id_bodega=${idBodegaOrigen}`);
      setLotesPorInsumo((prev) => ({
        ...prev,
        [id_insumo]: res.data.data || [],
      }));
    } catch (err) {
      console.error(`Error loading lots for insumo ${id_insumo}:`, err);
    }
  };

  const handleAddEmpleado = () => {
    setManoObra([...manoObra, { id_empleado: '', nombre: '', horas_jornales: 8, tarifa_por_hora: 12000 }]);
  };

  const handleRemoveEmpleado = (index) => {
    setManoObra(manoObra.filter((_, i) => i !== index));
  };

  const handleEmpleadoChange = (index, id_empleado) => {
    const emp = empleadosDisponibles.find((e) => e.id === parseInt(id_empleado));
    if (!emp) return;
    const updated = [...manoObra];
    updated[index] = {
      ...updated[index],
      id_empleado: emp.id,
      nombre: emp.nombre,
      tarifa_por_hora: emp.valor_hora || 10000,
    };
    setManoObra(updated);
  };

  const handleMODHoursChange = (index, value) => {
    const updated = [...manoObra];
    updated[index].horas_jornales = value;
    setManoObra(updated);
  };

  const handleAddMaquina = () => {
    setMaquinaria([...maquinaria, { id_maquina_taller: '', nombre: '', horas_reales: 4, costo_hora: 15000 }]);
  };

  const handleRemoveMaquina = (index) => {
    setMaquinaria(maquinaria.filter((_, i) => i !== index));
  };

  const handleMaquinaChange = (index, id_maquina) => {
    const maq = maquinasDisponibles.find((m) => m.id === parseInt(id_maquina));
    if (!maq) return;
    const updated = [...maquinaria];
    updated[index] = {
      ...updated[index],
      id_maquina_taller: maq.id,
      nombre: `${maq.nombre} [${maq.placa}]`,
      costo_hora: maq.costo_hora || 15000,
    };
    setMaquinaria(updated);
  };

  const handleMaqHoursChange = (index, value) => {
    const updated = [...maquinaria];
    updated[index].horas_reales = value;
    setMaquinaria(updated);
  };

  const handleLoteOrigenChange = (id_insumo, lote) => {
    const updated = insumosSeleccionados.map((ins) => {
      if (ins.id_insumo === id_insumo) {
        // Encontrar costo del lote seleccionado
        const availableLots = lotesPorInsumo[id_insumo] || [];
        const selectedLotObj = availableLots.find((l) => l.lote === lote);
        return {
          ...ins,
          lote_insumo_origen: lote,
          costo_unitario: selectedLotObj ? selectedLotObj.costo_unitario : ins.costo_unitario,
        };
      }
      return ins;
    });
    setInsumosSeleccionados(updated);
  };

  const executeOrderCreation = async () => {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    // Validar lote origen en insumos
    const missingLot = insumosSeleccionados.find((i) => !i.lote_insumo_origen);
    if (missingLot) {
      setError(`Debes seleccionar el Lote Origen para el insumo: ${missingLot.nombre}`);
      setStep(2);
      setLoading(false);
      return;
    }

    try {
      const payload = {
        id_tenant,
        id_formula: selectedFormulaId,
        cantidad_ordenada: parseFloat(cantidadOrdenada),
        unidad_medida: formulas.find((f) => f.id_formula === parseInt(selectedFormulaId))?.unidad_medida || 'KG',
        fecha_orden: fechaOrden,
        id_bodega_origen: idBodegaOrigen,
        id_bodega_destino: idBodegaDestino,
        id_finca: idFinca,
        creado_por,
        insumos: insumosSeleccionados.map((i) => ({
          id_insumo: i.id_insumo,
          cantidad_consumida: parseFloat(i.cantidad_consumida),
          unidad_medida: i.unidad_medida,
          costo_unitario: parseFloat(i.costo_unitario),
          lote_insumo_origen: i.lote_insumo_origen,
        })),
        mano_obra: manoObra.map((m) => ({
          id_empleado: m.id_empleado,
          horas_jornales: parseFloat(m.horas_jornales),
          tarifa_por_hora: parseFloat(m.tarifa_por_hora),
        })),
        maquinaria: maquinaria.map((q) => ({
          id_maquina_taller: q.id_maquina_taller,
          horas_reales: parseFloat(q.horas_reales),
          costo_hora: parseFloat(q.costo_hora),
        })),
        costo_energia: parseFloat(costoEnergia),
        costo_agua: parseFloat(costoAgua),
        costo_impuestos: parseFloat(costoImpuestos),
        calidad: {
          cantidad_primera: parseFloat(cantidadPrimera),
          cantidad_segunda: parseFloat(cantidadSegunda),
          merma: parseFloat(merma),
          checklist_bpm_json: checklistBPM,
        },
        finalizar: true, // Registrar y cerrar directamente
      };

      const response = await axios.post('/api/produccion/crear-orden', payload);
      if (response.data.success) {
        setSuccessMsg(`¡Orden de Producción ${response.data.codigo_orden} creada y finalizada exitosamente!`);
        
        const formulaObj = formulas.find(f => f.id_formula === parseInt(selectedFormulaId));
        setCreatedOrderDetails({
          codigo_orden: response.data.codigo_orden,
          lote_generado: response.data.lote_generado,
          producto: formulaObj ? formulaObj.nombre_producto : 'Producto Terminado',
          fecha_cierre: new Date().toLocaleDateString('es-CO'),
          cantidad: parseFloat(cantidadPrimera) + parseFloat(cantidadSegunda),
          unidad_medida: formulaObj ? formulaObj.unidad_medida : 'UN',
        });

        // Go to step 6 (Success and export options screen)
        setStep(6);
        localStorage.removeItem('production_order_wizard_draft');
        
        // Reset inputs for next run
        setManoObra([]);
        setMaquinaria([]);
        setCostoEnergia(0);
        setCostoAgua(0);
        setCostoImpuestos(0);
      }
    } catch (err) {
      console.error(err);
      if (err.response?.data?.code === 'STOCK_SHORTAGE') {
        const missingList = err.response.data.shortages.map(s => `${s.nombre} (Req: ${s.requerido}, Disp: ${s.disponible})`).join(', ');
        setError(`Faltantes de stock en bodega: ${missingList}. Se envió un reporte PDF de desabastecimiento automático al celular del Jefe de Compras.`);
      } else {
        setError(err.response?.data?.error || 'Error al crear la orden de producción');
      }
    } finally {
      setLoading(false);
    }
  };

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

  const downloadLabelPdf = async (details) => {
    const logoBase64 = await fetchLogoBase64();
    import('jspdf').then(({ jsPDF }) => {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [100, 150]
      });

      doc.setFillColor(11, 15, 25);
      doc.rect(0, 0, 100, 150, 'F');

      if (logoBase64) {
        try {
          doc.addImage(logoBase64, 'PNG', 75, 4, 16, 16);
        } catch (e) {
          try {
            doc.addImage(logoBase64, 'JPEG', 75, 4, 16, 16);
          } catch (err) {}
        }
      }

      doc.setTextColor(20, 184, 166);
      doc.setFontSize(14);
      doc.text("AGROPACCIOLI", 15, 15);

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.text("ETIQUETA DE TRAZABILIDAD BPM", 15, 22);

      doc.setDrawColor(51, 65, 85);
      doc.line(10, 27, 90, 27);

      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184);
      doc.text("Producto:", 15, 35);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.text(details.producto, 15, 41);

      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184);
      doc.text("Lote Generado:", 15, 52);
      doc.setTextColor(45, 212, 191);
      doc.setFontSize(12);
      doc.text(details.lote_generado, 15, 58);

      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184);
      doc.text("Cantidad Producida:", 15, 69);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.text(`${details.cantidad} ${details.unidad_medida}`, 15, 75);

      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184);
      doc.text("Fecha Empaque:", 15, 86);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.text(details.fecha_cierre, 15, 92);

      doc.setDrawColor(20, 184, 166);
      doc.rect(35, 105, 30, 30);
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text("[ Escanear QR BPM ]", 50, 140, { align: "center" });

      doc.save(`Etiqueta_BPM_${details.lote_generado}.pdf`);
    });
  };

  // Unified professional order PDF printing (supporting Draft Work Order and Finalized Report)
  const printProfessionalOrder = async (isDraft = true) => {
    const logoBase64 = await fetchLogoBase64();
    const formulaObj = formulas.find(f => f.id_formula === parseInt(selectedFormulaId));
    
    const details = isDraft ? {
      codigo_orden: 'BORRADOR-OT',
      lote_generado: 'LOTE-PROYECTADO',
      producto: formulaObj ? formulaObj.nombre_producto : 'Producto Terminado',
      fecha_cierre: fechaOrden || new Date().toLocaleDateString('es-CO'),
      cantidad: parseFloat(cantidadOrdenada) || 0,
      unidad_medida: formulaObj ? formulaObj.unidad_medida : 'UN',
    } : createdOrderDetails;

    if (!details) return;

    import('jspdf').then(({ jsPDF }) => {
      const doc = new jsPDF();
      
      // Header Banner - Navy Blue
      doc.setFillColor(19, 27, 46);
      doc.rect(0, 0, 210, 42, 'F');
      
      // Logo
      if (logoBase64) {
        try {
          doc.addImage(logoBase64, 'PNG', 165, 6, 30, 30);
        } catch (e) {
          try {
            doc.addImage(logoBase64, 'JPEG', 165, 6, 30, 30);
          } catch (err) {}
        }
      }
      
      // Header text
      doc.setTextColor(20, 184, 166); // Teal
      doc.setFontSize(15);
      doc.setFont('Helvetica-Bold');
      doc.text(isDraft ? "ORDEN DE TRABAJO (PLANIFICACIÓN DE PRODUCCIÓN)" : "FICHA DE ORDEN DE PRODUCCIÓN REGISTRADA", 15, 14);
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      const companyName = user?.tenant_nombre || 'AgroPaccioli';
      const companyNit = user?.tenant_nit ? `NIT: ${user.tenant_nit}` : '';
      doc.text(`${companyName} ${companyNit ? ' - ' + companyNit : ''}`, 15, 21);
      
      doc.setTextColor(148, 163, 184);
      doc.setFontSize(8.5);
      doc.text(`Identificador: ${details.codigo_orden}  |  Lote BPM: ${details.lote_generado}`, 15, 28);
      doc.text(`Fecha Ejecución: ${details.fecha_cierre}  |  Estado: ${isDraft ? 'Planificada' : 'Finalizada'}`, 15, 34);
      
      // Grid line
      doc.setDrawColor(226, 232, 240);
      doc.line(15, 47, 195, 47);

      // SECTION 1: DATOS GENERALES
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      doc.text("Producto a Elaborar:", 15, 54);
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(11);
      doc.setFont('Helvetica-Bold');
      doc.text(details.producto, 15, 60);

      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      doc.setFont('Helvetica-Bold');
      doc.text("Cantidad Total Proyectada:", 120, 54);
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(11);
      doc.text(`${details.cantidad} ${details.unidad_medida}`, 120, 60);

      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      const fincaName = fincas.find(f => f.id_finca === idFinca || f.id === idFinca)?.nombre || 'Principal';
      const bodegaName = bodegas.find(b => b.id_bodega === idBodegaOrigen)?.nombre || 'Bodega General';
      doc.text(`Finca Ejecutora: ${fincaName}  |  Bodega Insumos: ${bodegaName}`, 15, 66);

      doc.line(15, 70, 195, 70);

      // SECTION 2: INSUMOS
      doc.setTextColor(20, 184, 166);
      doc.setFontSize(11);
      doc.setFont('Helvetica-Bold');
      doc.text("1. INSUMOS Y MATERIAS PRIMAS ASIGNADAS", 15, 78);

      doc.setFillColor(241, 245, 249);
      doc.rect(15, 82, 180, 7, 'F');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text("Insumo / Ingrediente", 18, 86.5);
      doc.text("Lote Origen", 95, 86.5);
      doc.text("Cantidad Requerida", 145, 86.5);
      doc.text("Unidad", 180, 86.5);

      let currentY = 93;
      if (insumosSeleccionados.length === 0) {
        doc.setTextColor(150);
        doc.text("No se han seleccionado insumos en esta orden.", 20, currentY);
        currentY += 7;
      } else {
        doc.setTextColor(15, 23, 42);
        insumosSeleccionados.forEach((ins) => {
          doc.text(ins.nombre || 'Insumo', 18, currentY);
          doc.text(ins.lote_insumo_origen || 'No Asignado', 95, currentY);
          doc.text(parseFloat(ins.cantidad_consumida).toFixed(2), 145, currentY);
          doc.text(ins.unidad_medida || 'KG', 180, currentY);
          currentY += 6.5;
        });
      }

      doc.line(15, currentY, 195, currentY);
      currentY += 7.5;

      // SECTION 3: MANO DE OBRA
      doc.setTextColor(20, 184, 166);
      doc.setFontSize(11);
      doc.setFont('Helvetica-Bold');
      doc.text("2. PERSONAL Y MANO DE OBRA DIRECTA (MOD)", 15, currentY);
      currentY += 4;

      doc.setFillColor(241, 245, 249);
      doc.rect(15, currentY, 180, 7, 'F');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text("Colaborador / Operario", 18, currentY + 4.5);
      doc.text("Rol / Cédula", 95, currentY + 4.5);
      doc.text("Horas Planificadas", 145, currentY + 4.5);
      currentY += 11;

      if (manoObra.length === 0) {
        doc.setTextColor(150);
        doc.text("No se ha asignado personal a esta orden.", 20, currentY);
        currentY += 7;
      } else {
        doc.setTextColor(15, 23, 42);
        manoObra.forEach((mo) => {
          const empObj = empleadosDisponibles.find(e => e.id === mo.id_empleado);
          doc.text(empObj ? empObj.nombre : 'Operario', 18, currentY);
          doc.text(empObj ? `Cédula: ${empObj.cedula}` : 'Asistente de Planta', 95, currentY);
          doc.text(`${parseFloat(mo.horas_jornales).toFixed(1)} Horas`, 145, currentY);
          currentY += 6.5;
        });
      }

      doc.line(15, currentY, 195, currentY);
      currentY += 7.5;

      // SECTION 4: MAQUINARIA
      doc.setTextColor(20, 184, 166);
      doc.setFontSize(11);
      doc.setFont('Helvetica-Bold');
      doc.text("3. EQUIPOS Y MAQUINARIA INVOLUCRADA (CIF)", 15, currentY);
      currentY += 4;

      doc.setFillColor(241, 245, 249);
      doc.rect(15, currentY, 180, 7, 'F');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text("Equipo / Recurso", 18, currentY + 4.5);
      doc.text("Placa / Identificador", 95, currentY + 4.5);
      doc.text("Tiempo Uso Proyectado", 145, currentY + 4.5);
      currentY += 11;

      if (maquinaria.length === 0) {
        doc.setTextColor(150);
        doc.text("No se ha asignado maquinaria a esta orden.", 20, currentY);
        currentY += 7;
      } else {
        doc.setTextColor(15, 23, 42);
        maquinaria.forEach((maq) => {
          const maqObj = maquinasDisponibles.find(m => m.id === maq.id_maquina_taller);
          doc.text(maqObj ? maqObj.nombre : 'Maquinaria', 18, currentY);
          doc.text(maqObj ? `Placa: ${maqObj.placa}` : 'Planta General', 95, currentY);
          doc.text(`${parseFloat(maq.horas_reales).toFixed(1)} Horas`, 145, currentY);
          currentY += 6.5;
        });
      }

      doc.line(15, currentY, 195, currentY);
      currentY += 7.5;

      // SECTION 5: BPM checklist compliance
      doc.setTextColor(20, 184, 166);
      doc.setFontSize(11);
      doc.setFont('Helvetica-Bold');
      doc.text("4. CUMPLIMIENTO BPM Y CONTROL DE CALIDAD", 15, currentY);
      currentY += 5;

      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(`• Limpieza de Maquinaria previa: ${checklistBPM.limpiezaMaquinas ? 'Cumple ✅' : 'No Registrado ❌'}`, 18, currentY);
      doc.text(`• Higiene y Vestimenta de Operarios: ${checklistBPM.higieneOperarios ? 'Cumple ✅' : 'No Registrado ❌'}`, 95, currentY);
      currentY += 5.5;
      doc.text(`• Control de Sellado y Empaque BPM: ${checklistBPM.calidadEmpaque ? 'Cumple ✅' : 'No Registrado ❌'}`, 18, currentY);
      doc.text(`• Control de Temperatura en Proceso: ${checklistBPM.temperaturaProceso ? 'Cumple ✅' : 'No Registrado ❌'}`, 95, currentY);
      currentY += 8;

      // SECTION 6: FIRMAS
      doc.setDrawColor(203, 213, 225);
      doc.line(20, 260, 80, 260);
      doc.line(120, 260, 180, 260);

      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text("Responsable de Planta", 50, 264, { align: "center" });
      doc.text("Auditor Calidad BPM", 150, 264, { align: "center" });

      doc.save(isDraft ? `Orden_Trabajo_Plan_${details.codigo_orden}.pdf` : `Reporte_Final_Orden_${details.codigo_orden}.pdf`);
    });
  };

  // Export created order details to Excel CSV
  const exportOrderExcel = (isDraft = true) => {
    const formulaObj = formulas.find(f => f.id_formula === parseInt(selectedFormulaId));
    const details = isDraft ? {
      codigo_orden: 'BORRADOR-OT',
      lote_generado: 'LOTE-PROYECTADO',
      producto: formulaObj ? formulaObj.nombre_producto : 'Producto Terminado',
      fecha_cierre: fechaOrden || new Date().toLocaleDateString('es-CO'),
      cantidad: parseFloat(cantidadOrdenada) || 0,
      unidad_medida: formulaObj ? formulaObj.unidad_medida : 'UN',
    } : createdOrderDetails;

    if (!details) return;

    const headers = ['Campo', 'Valor'];
    const rows = [
      ['Tipo Reporte', isDraft ? 'Planificación de Orden de Trabajo' : 'Ficha de Producción Registrada'],
      ['Código Orden', details.codigo_orden],
      ['Lote Generado', details.lote_generado],
      ['Producto Producido', details.producto],
      ['Cantidad Producida', `${details.cantidad} ${details.unidad_medida}`],
      ['Fecha Registro', details.fecha_cierre],
      ['Estado', isDraft ? 'Planificada' : 'Finalizada'],
      ['Cumplimiento BPM', isDraft ? 'Proyectado' : 'Aprobado (100%)'],
    ];

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `orden_produccion_${details.codigo_orden}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Share order details via WhatsApp
  const shareOrderWhatsApp = (isDraft = true) => {
    const formulaObj = formulas.find(f => f.id_formula === parseInt(selectedFormulaId));
    const details = isDraft ? {
      codigo_orden: 'BORRADOR-PLANIFICACION',
      lote_generado: 'LOTE-PENDIENTE',
      producto: formulaObj ? formulaObj.nombre_producto : 'Producto Terminado',
      fecha_cierre: fechaOrden || new Date().toLocaleDateString('es-CO'),
      cantidad: parseFloat(cantidadOrdenada) || 0,
      unidad_medida: formulaObj ? formulaObj.unidad_medida : 'UN',
    } : createdOrderDetails;

    if (!details) return;

    let text = isDraft ? `*PLANIFICACIÓN / ORDEN DE TRABAJO (BORRADOR)*\n\n` : `*REPORTE DE ORDEN DE PRODUCCIÓN FINALIZADA*\n\n`;
    text += `• *Orden:* ${details.codigo_orden}\n`;
    text += `• *Lote Generado:* ${details.lote_generado}\n`;
    text += `• *Producto:* ${details.producto}\n`;
    text += `• *Cantidad:* ${details.cantidad} ${details.unidad_medida}\n`;
    text += `• *Fecha Programada:* ${details.fecha_cierre}\n`;
    text += `• *Estado:* ${isDraft ? 'Planificada/Borrador' : 'Finalizada y Cerrada'}\n`;
    text += `• *BPM Checklist:* ${isDraft ? 'Pendiente Firma' : 'Aprobado ✅ (100%)'}\n\n`;
    text += `_Gestionado vía Módulo de Producción AgroPaccioli_`;

    const encoded = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  // Simulator helper formulas
  const simulatorSummary = () => {
    if (!simFormula) return null;
    const formulaInsumosCosto = simFormula.insumos?.reduce(
      (sum, item) => sum + (parseFloat(item.cantidad_por_unidad) * simCantidad * (1 + parseFloat(item.factor_merma)) * parseFloat(item.costo_estandar)),
      0
    ) || 0;

    const formulaMODCosto = simFormula.maquinarias?.length * 10000; // Mock standard MOD
    const formulaCIFCosto = simFormula.maquinarias?.reduce(
      (sum, item) => sum + (parseFloat(item.tiempo_estandar_horas) * simCantidad * 15000),
      0
    ) || 0;

    const costoTotal = formulaInsumosCosto + formulaMODCosto + formulaCIFCosto;
    const precioVentaSugerido = (costoTotal / simCantidad) * 1.35; // +35% margen
    const precioMercadoTotal = precioVentaSugerido * simCantidad;
    const utilidad = precioMercadoTotal - costoTotal;
    const esRentable = utilidad > 0;

    return {
      materiales: formulaInsumosCosto,
      mod: formulaMODCosto,
      cif: formulaCIFCosto,
      total: costoTotal,
      utilidad,
      esRentable,
    };
  };

  const simResult = simulatorSummary();

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white p-6">
      <div className="max-w-5xl mx-auto bg-[#131b2e]/90 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-500/20 via-indigo-500/20 to-purple-500/20 px-8 py-6 border-b border-slate-800 flex flex-wrap gap-4 justify-between items-center animate-fade-in">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-teal-400 to-indigo-400 bg-clip-text text-transparent">
              Crear Orden de Producción
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Wizard guiado para control de calidad, trazabilidad y BPM
            </p>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            {selectedFormulaId && step <= 5 && (
              <>
                <button
                  onClick={() => printProfessionalOrder(true)}
                  className="inline-flex items-center px-3 py-1.5 bg-red-950/40 text-red-400 border border-red-500/20 hover:bg-red-900 rounded-lg text-xs font-bold transition"
                  title="Imprimir Borrador / Ficha Técnica"
                >
                  <FileText className="w-3.5 h-3.5 mr-1" />
                  Imprimir PDF
                </button>
                <button
                  onClick={() => exportOrderExcel(true)}
                  className="inline-flex items-center px-3 py-1.5 bg-emerald-950/40 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-900 rounded-lg text-xs font-bold transition"
                  title="Exportar Excel del Borrador"
                >
                  <Download className="w-3.5 h-3.5 mr-1" />
                  Excel
                </button>
                <button
                  onClick={() => shareOrderWhatsApp(true)}
                  className="inline-flex items-center px-3 py-1.5 bg-teal-950/40 text-teal-400 border border-teal-500/20 hover:bg-teal-900 rounded-lg text-xs font-bold transition"
                  title="Enviar por WhatsApp"
                >
                  <Send className="w-3.5 h-3.5 mr-1" />
                  WhatsApp
                </button>
              </>
            )}

            <button
              onClick={() => setIsSimulatorOpen(true)}
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold rounded-lg transition shadow-lg shadow-teal-500/20 text-xs"
            >
              <Calculator className="w-4 h-4 mr-1.5" />
              Simulador de Costos
            </button>
          </div>
        </div>

        {/* Step Indicator */}
        {step <= 5 && (
          <div className="px-8 py-4 bg-slate-900/50 border-b border-slate-800 flex justify-between">
            {[
              { num: 1, label: 'Fórmula & Bodega' },
              { num: 2, label: 'Lotes Origen (MP)' },
              { num: 3, label: 'Mano de Obra (MOD)' },
              { num: 4, label: 'Maquinaria (CIF)' },
              { num: 5, label: 'Calidad & BPM' },
            ].map((s) => (
              <div key={s.num} className="flex items-center space-x-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold transition ${
                    step === s.num
                      ? 'bg-teal-500 text-[#0b0f19] shadow-lg shadow-teal-500/30'
                      : step > s.num
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {step > s.num ? <Check className="w-4 h-4" /> : s.num}
                </div>
                <span className={`text-xs font-semibold ${step === s.num ? 'text-teal-400' : 'text-slate-400'}`}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Notification alerts */}
        {error && (
          <div className="m-6 p-4 bg-red-950/50 border border-red-500/40 text-red-300 rounded-lg text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* Body Sections */}
        <div className="p-8">
          <style>{darkSelectStyles}</style>
          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-teal-400">Paso 1: Configurar Fórmula y Destinos</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Fórmula de Producción</label>
                  <Select showSearch optionFilterProp="children"
                    value={selectedFormulaId}
                    onChange={(e) => setSelectedFormulaId(e.target.value)}
                    className="w-full dark-select"
                  >
                    <Option value="">Selecciona una fórmula...</Option>
                    {formulas.map((f) => (
                      <Option key={f.id_formula} value={f.id_formula}>
                        {f.nombre} ({f.codigo})
                      </Option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Cantidad a Producir</label>
                  <input
                    type="number"
                    value={cantidadOrdenada}
                    onChange={(e) => setCantidadOrdenada(parseFloat(e.target.value))}
                    className="w-full bg-[#1b253b] border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Bodega de Origen (Materias Primas)</label>
                  <Select showSearch optionFilterProp="children"
                    value={idBodegaOrigen}
                    onChange={(e) => setIdBodegaOrigen(e.target.value)}
                    className="w-full dark-select"
                  >
                    {bodegas.map((b) => (
                      <Option key={b.id_bodega} value={b.id_bodega}>
                        {b.nombre}
                      </Option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Bodega de Destino (Producto Terminado)</label>
                  <Select showSearch optionFilterProp="children"
                    value={idBodegaDestino}
                    onChange={(e) => setIdBodegaDestino(e.target.value)}
                    className="w-full dark-select"
                  >
                    {bodegas.map((b) => (
                      <Option key={b.id_bodega} value={b.id_bodega}>
                        {b.nombre}
                      </Option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Finca Ejecutora</label>
                  <Select showSearch optionFilterProp="children"
                    value={idFinca}
                    onChange={(e) => setIdFinca(e.target.value)}
                    className="w-full dark-select"
                  >
                    {fincas.map((f) => (
                      <Option key={f.id_finca} value={f.id_finca}>
                        {f.nombre}
                      </Option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Fecha de Orden</label>
                  <input
                    type="date"
                    value={fechaOrden}
                    onChange={(e) => setFechaOrden(e.target.value)}
                    className="w-full bg-[#1b253b] border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-teal-400">Paso 2: Trazabilidad BPM (Seleccionar Lotes de Origen)</h2>
              <div className="overflow-x-auto border border-slate-800 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-[#1b253b] text-slate-300 border-b border-slate-850">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold">Materia Prima</th>
                      <th className="px-6 py-3 text-right font-semibold">Cantidad Req (c/Merma)</th>
                      <th className="px-6 py-3 text-left font-semibold">Seleccionar Lote de Origen (BPM)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 bg-slate-900/40">
                    {insumosSeleccionados.map((ins) => {
                      const lotes = lotesPorInsumo[ins.id_insumo] || [];
                      return (
                        <tr key={ins.id_insumo} className="hover:bg-slate-800/40 transition">
                          <td className="px-6 py-4 font-medium text-slate-200">
                            {ins.nombre} <span className="text-slate-500 text-xs font-mono">({ins.codigo})</span>
                          </td>
                          <td className="px-6 py-4 text-right font-mono text-teal-400">
                            {ins.cantidad_consumida} {ins.unidad_medida}
                          </td>
                          <td className="px-6 py-4">
                            <Select showSearch optionFilterProp="children"
                              value={ins.lote_insumo_origen}
                              onChange={(e) => handleLoteOrigenChange(ins.id_insumo, e.target.value)}
                              className="w-full dark-select"
                            >
                              <Option value="">Selecciona Lote...</Option>
                              {lotes.map((l) => (
                                <Option key={l.id} value={l.lote}>
                                  Lote: {l.lote} (Stock: {parseFloat(l.cantidad).toFixed(2)})
                                </Option>
                              ))}
                            </Select>
                            {lotes.length === 0 && (
                              <span className="text-xs text-red-400 block mt-1">
                                ❌ Sin existencias vigentes en bodega de origen.
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-teal-400">Paso 3: Mano de Obra Directa (Asignación MOD)</h2>
                <button
                  onClick={handleAddEmpleado}
                  className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition"
                >
                  <Plus className="w-5 h-5 mr-1" />
                  Agregar Empleado
                </button>
              </div>

              <div className="space-y-4">
                {manoObra.map((mo, index) => (
                  <div key={index} className="flex gap-4 items-center bg-[#131b2e] p-4 rounded-xl border border-slate-800">
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Empleado</label>
                      <Select showSearch optionFilterProp="children"
                        value={mo.id_empleado}
                        onChange={(e) => handleEmpleadoChange(index, e.target.value)}
                        className="w-full dark-select"
                      >
                        <Option value="">Buscar empleado...</Option>
                        {empleadosDisponibles.map((e) => (
                          <Option key={e.id} value={e.id}>
                            {e.nombre} - Cédula: {e.cedula}
                          </Option>
                        ))}
                      </Select>
                    </div>

                    <div className="w-32">
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Horas/Jornal</label>
                      <input
                        type="number"
                        value={mo.horas_jornales}
                        onChange={(e) => handleMODHoursChange(index, parseFloat(e.target.value))}
                        className="w-full bg-[#1b253b] border border-slate-700 rounded-lg px-3 py-2 text-white text-center focus:outline-none"
                      />
                    </div>

                    <div className="w-40">
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Costo Unitario ($/h)</label>
                      <p className="bg-slate-800/80 px-3 py-2 rounded-lg text-slate-200 font-mono text-center">
                        ${parseFloat(mo.tarifa_por_hora).toLocaleString('es-CO')}
                      </p>
                    </div>

                    <button
                      onClick={() => handleRemoveEmpleado(index)}
                      className="p-2 bg-red-950/40 text-red-400 border border-red-500/20 hover:bg-red-900 rounded-lg transition mt-4"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}

                {manoObra.length === 0 && (
                  <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl text-slate-500">
                    No se han asignado empleados a esta orden.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 4 */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-teal-400">Paso 4: CIF (Maquinaria y Taller)</h2>
                <button
                  onClick={handleAddMaquina}
                  className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition"
                >
                  <Plus className="w-5 h-5 mr-1" />
                  Agregar Maquinaria
                </button>
              </div>

              <div className="space-y-4">
                {maquinaria.map((maq, index) => (
                  <div key={index} className="flex gap-4 items-center bg-[#131b2e] p-4 rounded-xl border border-slate-800">
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Equipo/Máquina</label>
                      <Select showSearch optionFilterProp="children"
                        value={maq.id_maquina_taller}
                        onChange={(e) => handleMaquinaChange(index, e.target.value)}
                        className="w-full dark-select"
                      >
                        <Option value="">Buscar máquina...</Option>
                        {maquinasDisponibles
                          .filter(m => {
                            const type = (m.tipo || '').toLowerCase();
                            const placa = (m.placa || '').toUpperCase();
                            return type === 'procesamiento' || placa.startsWith('MAQ-');
                          })
                          .map((m) => (
                            <Option key={m.id} value={m.id}>
                              {m.nombre} - Placa: {m.placa}
                            </Option>
                          ))
                        }
                      </Select>
                    </div>

                    <div className="w-32">
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Horas Reales</label>
                      <input
                        type="number"
                        value={maq.horas_reales}
                        onChange={(e) => handleMaqHoursChange(index, parseFloat(e.target.value))}
                        className="w-full bg-[#1b253b] border border-slate-700 rounded-lg px-3 py-2 text-white text-center focus:outline-none"
                      />
                    </div>

                    <div className="w-40">
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Costo Hora CIF</label>
                      <p className="bg-slate-800/80 px-3 py-2 rounded-lg text-slate-200 font-mono text-center">
                        ${parseFloat(maq.costo_hora).toLocaleString('es-CO')}
                      </p>
                    </div>

                    <button
                      onClick={() => handleRemoveMaquina(index)}
                      className="p-2 bg-red-950/40 text-red-400 border border-red-500/20 hover:bg-red-900 rounded-lg transition mt-4"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}

                {maquinaria.length === 0 && (
                  <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl text-slate-500">
                    No se han asignado maquinarias a esta orden.
                  </div>
                )}
              </div>

              {/* Costos adicionales CIF */}
              <div className="border-t border-slate-800 pt-6 mt-6 space-y-4">
                <h3 className="text-lg font-bold text-slate-200">Servicios e Impuestos Indirectos</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Costo de Energía ($)</label>
                    <input
                      type="number"
                      value={costoEnergia}
                      onChange={(e) => setCostoEnergia(parseFloat(e.target.value) || 0)}
                      className="w-full bg-[#1b253b] border border-slate-700 rounded-lg px-3 py-2.5 text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Costo de Agua ($)</label>
                    <input
                      type="number"
                      value={costoAgua}
                      onChange={(e) => setCostoAgua(parseFloat(e.target.value) || 0)}
                      className="w-full bg-[#1b253b] border border-slate-700 rounded-lg px-3 py-2.5 text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Impuestos Indirectos / Otros ($)</label>
                    <input
                      type="number"
                      value={costoImpuestos}
                      onChange={(e) => setCostoImpuestos(parseFloat(e.target.value) || 0)}
                      className="w-full bg-[#1b253b] border border-slate-700 rounded-lg px-3 py-2.5 text-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5 */}
          {step === 5 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-teal-400">Paso 5: Control de Calidad y Checklist BPM</h2>
              
              {/* QA Rendimientos */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-[#131b2e] p-6 rounded-xl border border-slate-800">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Cantidad de "Primera" (Exportación)</label>
                  <input
                    type="number"
                    value={cantidadPrimera}
                    onChange={(e) => setCantidadPrimera(parseFloat(e.target.value))}
                    className="w-full bg-[#1b253b] border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Cantidad de "Segunda" (Local)</label>
                  <input
                    type="number"
                    value={cantidadSegunda}
                    onChange={(e) => setCantidadSegunda(parseFloat(e.target.value))}
                    className="w-full bg-[#1b253b] border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Merma</label>
                  <input
                    type="number"
                    value={merma}
                    onChange={(e) => setMerma(parseFloat(e.target.value))}
                    className="w-full bg-[#1b253b] border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Checklist BPM */}
              <div>
                <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center">
                  <ShieldCheck className="w-6 h-6 mr-2 text-teal-400" />
                  Checklist Higiene y BPM
                </h3>
                <div className="space-y-4 bg-slate-900/50 p-6 rounded-xl border border-slate-800">
                  {[
                    { key: 'higieneOperarios', label: '¿Los operarios cumplen con la vestimenta e higiene requerida?' },
                    { key: 'temperaturaProceso', label: '¿La temperatura de proceso y almacenamiento es la adecuada?' },
                    { key: 'limpiezaMaquinas', label: '¿Las máquinas pasaron por la inspección de inocuidad y lavado previo?' },
                    { key: 'calidadEmpaque', label: '¿Los contenedores de empaque y sellos de lote están correctos?' },
                  ].map((chk) => (
                    <div key={chk.key} className="flex justify-between items-center p-3 hover:bg-slate-800/40 rounded-lg transition">
                      <span className="text-slate-300 text-sm font-medium">{chk.label}</span>
                      <input
                        type="checkbox"
                        checked={checklistBPM[chk.key]}
                        onChange={(e) =>
                          setChecklistBPM({
                            ...checklistBPM,
                            [chk.key]: e.target.checked,
                          })
                        }
                        className="w-5 h-5 accent-teal-500 rounded focus:ring-0"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: Success & Export Screen */}
          {step === 6 && createdOrderDetails && (
            <div className="space-y-6 text-center py-6">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/20 mb-3 animate-bounce">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-extrabold text-emerald-400">¡Orden Registrada Exitosamente!</h2>
              <p className="text-slate-400 max-w-md mx-auto text-xs">
                La orden de producción y su lote BPM han sido registrados en la base de datos y traspasados a contabilidad y Kardex.
              </p>
              
              <div className="max-w-lg mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row gap-6 items-center justify-center my-6 text-left shadow-inner">
                <div className="bg-[#1b253b] p-4 rounded-xl border border-slate-700 text-center w-40 shadow-lg">
                  <div className="flex justify-center mb-2">
                    <QRCodeCanvas value={createdOrderDetails.lote_generado} size={100} includeMargin={true} />
                  </div>
                  <span className="text-[9px] text-slate-500 font-mono block">LOTE ESCANER QR</span>
                </div>
                
                <div className="flex-1 space-y-2">
                  <h3 className="text-base font-bold text-teal-400">Detalles de Trazabilidad BPM</h3>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                    <span className="text-slate-400 font-semibold">Código Orden:</span>
                    <span className="font-mono text-indigo-400 font-bold">{createdOrderDetails.codigo_orden}</span>
                    <span className="text-slate-400 font-semibold">Lote Generado:</span>
                    <span className="font-mono text-teal-300 font-bold">{createdOrderDetails.lote_generado}</span>
                    <span className="text-slate-400 font-semibold">Producto:</span>
                    <span className="text-white font-medium">{createdOrderDetails.producto}</span>
                    <span className="text-slate-400 font-semibold">Cantidad Total:</span>
                    <span className="text-slate-300">{createdOrderDetails.cantidad} {createdOrderDetails.unidad_medida}</span>
                    <span className="text-slate-400 font-semibold">Fecha Registro:</span>
                    <span className="text-slate-300">{createdOrderDetails.fecha_cierre}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 justify-center pt-2">
                <button
                  onClick={() => downloadLabelPdf(createdOrderDetails)}
                  className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-600 hover:to-indigo-700 text-white font-extrabold rounded-lg text-xs shadow-md transition"
                >
                  <Printer className="w-3.5 h-3.5 mr-1.5" />
                  Descargar PDF Etiqueta
                </button>
                <button
                  onClick={() => exportOrderPDF(createdOrderDetails)}
                  className="inline-flex items-center px-4 py-2 bg-red-950/40 text-red-400 border border-red-500/20 hover:bg-red-900 font-bold rounded-lg text-xs transition"
                >
                  <FileText className="w-3.5 h-3.5 mr-1.5" />
                  Descargar Ficha PDF
                </button>
                <button
                  onClick={() => exportOrderExcel(createdOrderDetails)}
                  className="inline-flex items-center px-4 py-2 bg-emerald-950/40 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-900 font-bold rounded-lg text-xs transition"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  Exportar Excel
                </button>
                <button
                  onClick={() => shareOrderWhatsApp(createdOrderDetails)}
                  className="inline-flex items-center px-4 py-2 bg-teal-950/40 text-teal-400 border border-teal-500/20 hover:bg-teal-900 font-bold rounded-lg text-xs transition"
                >
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  Compartir WhatsApp
                </button>
              </div>

              <div className="pt-6 border-t border-slate-800 max-w-xs mx-auto">
                <button
                  onClick={() => {
                    setSuccessMsg(null);
                    setCreatedOrderDetails(null);
                    setStep(1);
                    setSelectedFormulaId('');
                  }}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold rounded-lg transition border border-slate-700 text-xs shadow-sm"
                >
                  Registrar Nueva Orden
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Controls */}
        {step <= 5 && (
          <div className="px-8 py-6 bg-slate-900/40 border-t border-slate-800 flex justify-between">
            {step > 1 ? (
              <button
                onClick={() => setStep(step - 1)}
                className="inline-flex items-center px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg transition"
              >
                <ChevronLeft className="w-5 h-5 mr-1" />
                Anterior
              </button>
            ) : (
              <div />
            )}

            {step < 5 ? (
              <button
                onClick={() => setStep(step + 1)}
                className="inline-flex items-center px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition shadow-lg shadow-indigo-500/10"
              >
                Siguiente
                <ChevronRight className="w-5 h-5 ml-1" />
              </button>
            ) : (
              <button
                onClick={executeOrderCreation}
                disabled={loading}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-600 hover:to-indigo-700 text-white font-extrabold rounded-lg transition shadow-lg shadow-teal-500/20"
              >
                {loading ? 'Guardando...' : 'Finalizar y Cerrar Lote'}
                <Check className="w-5 h-5 ml-2" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Simulator Modal */}
      {isSimulatorOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-[#131b2e] border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-r from-teal-500/20 to-indigo-500/20 px-6 py-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-xl font-extrabold text-teal-400">¿Voy a Ganar o Perder? (Simulador)</h3>
              <button
                onClick={() => setIsSimulatorOpen(false)}
                className="text-slate-400 hover:text-white text-2xl font-bold leading-none"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Fórmula a Simular</label>
                  <Select showSearch optionFilterProp="children"
                    value={selectedFormulaId}
                    onChange={(e) => setSelectedFormulaId(e.target.value)}
                    className="w-full dark-select"
                  >
                    <Option value="">Selecciona una fórmula...</Option>
                    {formulas.map((f) => (
                      <Option key={f.id_formula} value={f.id_formula}>
                        {f.nombre}
                      </Option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Cantidad Estimada</label>
                  <input
                    type="number"
                    value={simCantidad}
                    onChange={(e) => setSimCantidad(parseFloat(e.target.value))}
                    className="w-full bg-[#1b253b] border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                  />
                </div>
              </div>

              {simResult ? (
                <div className="space-y-6">
                  {/* Cards */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-[#1b253b] p-4 rounded-xl border border-slate-800 text-center">
                      <p className="text-slate-400 text-xs font-semibold">Materia Prima (MP)</p>
                      <p className="text-lg font-bold text-teal-400 mt-1">${simResult.materiales.toLocaleString('es-CO')}</p>
                    </div>
                    <div className="bg-[#1b253b] p-4 rounded-xl border border-slate-800 text-center">
                      <p className="text-slate-400 text-xs font-semibold">Mano de Obra (MOD)</p>
                      <p className="text-lg font-bold text-indigo-400 mt-1">${simResult.mod.toLocaleString('es-CO')}</p>
                    </div>
                    <div className="bg-[#1b253b] p-4 rounded-xl border border-slate-800 text-center">
                      <p className="text-slate-400 text-xs font-semibold">Costos Indirectos (CIF)</p>
                      <p className="text-lg font-bold text-purple-400 mt-1">${simResult.cif.toLocaleString('es-CO')}</p>
                    </div>
                  </div>

                  {/* Profit Bar */}
                  <div className="bg-[#1b253b] p-4 rounded-xl border border-slate-800">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-slate-400">Rendimiento Proyectado</span>
                      <span className={`text-sm font-extrabold ${simResult.esRentable ? 'text-green-400' : 'text-red-400'}`}>
                        {simResult.esRentable ? '¡Rentable!' : '¡Pérdida/Marginal!'}
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-3.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          simResult.esRentable ? 'bg-green-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(10, (simResult.utilidad / simResult.total) * 100))}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-slate-400 mt-2 font-mono">
                      <span>Costo Total: ${simResult.total.toLocaleString('es-CO')}</span>
                      <span className={simResult.esRentable ? 'text-green-400' : 'text-red-400'}>
                        Utilidad: ${simResult.utilidad.toLocaleString('es-CO')}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  Selecciona una fórmula para proyectar costos y ganancias.
                </div>
              )}

              <button
                onClick={() => setIsSimulatorOpen(false)}
                className="w-full py-2.5 bg-slate-850 hover:bg-slate-800 text-white font-bold rounded-lg border border-slate-700 transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CrearOrdenWizard;
