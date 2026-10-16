import React, { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Search, CreditCard, Trash2, X, Plus, Minus, User, Monitor, Hash, CheckCircle, Clock, Eye, EyeOff, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authFetch } from '../../utils/api';
import Select from 'react-select';
import { useWebSerialScale } from '../../hooks/useWebSerialScale';

function POSConsole() {
  const { user, tenantId } = useAuth();
  const [arqueo, setArqueo] = useState(null);
  const [cajas, setCajas] = useState([]);
  const boundId = localStorage.getItem('pos_terminal_caja_id');
  const [selectedCaja, setSelectedCaja] = useState(boundId || '');
  const [turno, setTurno] = useState('Mañana');
  const [saldoInicialInput, setSaldoInicialInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [locked, setLocked] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  let inactivityTimer = useRef(null);
  const [fincas, setFincas] = useState([]);
  const [selectedFinca, setSelectedFinca] = useState('');
  const [requirePasswordChange, setRequirePasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [boundCajaId, setBoundCajaId] = useState(localStorage.getItem('pos_terminal_caja_id') || null);
  const [boundCajaNombre, setBoundCajaNombre] = useState(localStorage.getItem('pos_terminal_caja_nombre') || null);
  
  // Retiros
  const [showRetiro, setShowRetiro] = useState(false);
  const [retiroData, setRetiroData] = useState({ monto: '', observaciones: '', clave: '' });
  
  
  const [loading, setLoading] = useState(true);

  // Catalogs
  const [productos, setProductos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [bodegas, setBodegas] = useState([]);
  const [trm, setTrm] = useState(1);
  const [selectedBodega, setSelectedBodega] = useState('');
  
  // Cart & Sales state
  const [carrito, setCarrito] = useState([]);
  const [ultimoItem, setUltimoItem] = useState(null);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [tipoPago, setTipoPago] = useState('Contado');
  const [observaciones, setObservaciones] = useState('');
  const [barcode, setBarcode] = useState('');
  const barcodeRef = useRef(null);

  // Modals
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);

  // Checkout State
  const [montoRecibido, setMontoRecibido] = useState('');
  const [tarjetaBanco, setTarjetaBanco] = useState('');
  const [tarjetaNumero, setTarjetaNumero] = useState('');
  const [comprobanteTrans, setComprobanteTrans] = useState('');
  const [pagosVenta, setPagosVenta] = useState([]);
  const [referenciaPagoInput, setReferenciaPagoInput] = useState('');
  const [showVentasEnEsperaModal, setShowVentasEnEsperaModal] = useState(false);
  const [ventasEnEspera, setVentasEnEspera] = useState(() => JSON.parse(localStorage.getItem('pos_ventas_espera')) || []);
  const [enviarDian, setEnviarDian] = useState(true);

  // Scale Integration
  const { connect: connectScale, disconnect: disconnectScale, isConnected: isScaleConnected, weight: scaleWeight, error: scaleError } = useWebSerialScale();
  const [basculas, setBasculas] = useState([]);
  const [selectedBascula, setSelectedBascula] = useState('');
  const [showWeighingModal, setShowWeighingModal] = useState(false);
  const [pendingWeighItem, setPendingWeighItem] = useState(null);
  const [supervisorOverride, setSupervisorOverride] = useState(false);
  const [supervisorPassword, setSupervisorPassword] = useState('');
  const [manualWeight, setManualWeight] = useState('');

  // New Client State
  const [newClient, setNewClient] = useState({
    tipo_persona: 'Natural',
    tipo_documento: 'CC',
    documento: '',
    dv: '',
    primer_nombre: '',
    segundo_nombre: '',
    primer_apellido: '',
    segundo_apellido: '',
    nombre_comercial: '',
    email: '',
    telefono: '',
    direccion: '',
    codigo_municipio: ''
  });

  const calculateDV = (nit) => {
    if (!nit || isNaN(nit)) return '';
    const vpri = [0, 3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];
    let x = 0, y = 0, z = nit.length;
    for (let i = 0; i < z; i++) {
      y = parseInt(nit.substring(i, i + 1));
      x += (y * vpri[z - i]);
    }
    y = x % 11;
    return (y > 1) ? (11 - y).toString() : y.toString();
  };

  const resetTimer = () => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    if (!locked) {
      // 5 minutes timer
      inactivityTimer.current = setTimeout(() => {
        setLocked(true);
        setPasswordInput('');
      }, 5 * 60 * 1000);
    }
  };

  useEffect(() => {
    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keypress', resetTimer);
    return () => {
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keypress', resetTimer);
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, [locked]);


  useEffect(() => {
    if (user) {
      checkArqueoStatus();
      loadCatalogData();
      
      authFetch(`/api/pos/cajas?tenantId=${tenantId || 1}&_t=${Date.now()}`)
        .then(r => r.json())
        .then(data => { 
          if (data.success) {
            const cajasCargadas = data.data;
            setCajas(cajasCargadas);
            if (cajasCargadas.length > 0) {
              setSelectedCaja(cajasCargadas[0].id_caja);
            }
          } 
        })
        .catch(err => console.error(err));

      authFetch('/api/pos/trm-dia')
        .then(r => r.json())
        .then(d => { if (d.success) setTrm(d.trm || 1); })
        .catch(() => {});
    }
  }, [user, tenantId]);

  const checkArqueoStatus = async () => {
    try {
      const res = await authFetch(`/api/pos/arqueo/estado/${user.id_usuario}?tenantId=${tenantId || 1}`);
      const data = await res.json();
      if (data.success) {
        if (data.arqueo) {
          const storedCajaId = localStorage.getItem('pos_terminal_caja_id');
          if (storedCajaId && data.arqueo.id_caja.toString() !== storedCajaId) {
            setErrorMsg(`Tienes un turno abierto en otra caja (${data.arqueo.caja_nombre || 'ID: ' + data.arqueo.id_caja}). Cierra ese turno primero o ve a la computadora correspondiente.`);
            setArqueo(null);
          } else {
            setArqueo(data.arqueo);
            setSelectedCaja(data.arqueo.id_caja);
            setSelectedBodega(data.arqueo.id_bodega || 1);
          }
        } else {
          setArqueo(null);
        }
      } else {
        setErrorMsg(data.error);
      }
    } catch (e) {
      setErrorMsg('Error de red al verificar estado de caja');
    }
    setLoading(false);
  };

  const loadCatalogData = async () => {
    try {
      const [resP, resC, resB, resF] = await Promise.all([
        authFetch(`/api/pos/productos?tenantId=${tenantId || 1}`),
        authFetch(`/api/table/terceros/data?tenantId=${tenantId || 1}&pageSize=1000`),
        authFetch(`/api/basculas?tenantId=${tenantId || 1}&activa=true`),
        authFetch(`/api/table/fincas/data?tenantId=${tenantId || 1}&pageSize=100`)
      ]);
      const dataP = await resP.json();
      const dataC = await resC.json();
      const dataB = await resB.json();
      const dataF = await resF.json();
      if (dataP.success) setProductos(dataP.insumos || []);
      if (dataC.data) {
        const clients = dataC.data.filter(c => c.es_cliente === 1);
        setClientes(clients);
        const defaultClient = clients.find(c => c.documento === '222222222222') || clients[0];
        if (defaultClient) setSelectedCliente(defaultClient);
      }
      if (Array.isArray(dataB)) {
        setBasculas(dataB);
      }
      if (dataF.data) {
        setFincas(dataF.data);
        if (dataF.data.length > 0) setSelectedFinca(dataF.data[0].id_finca);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!showSearchModal && !showClientModal && !showCheckoutModal && arqueo && barcodeRef.current) {
      barcodeRef.current.focus();
    }
  }, [showSearchModal, showClientModal, showCheckoutModal, arqueo]);

  const handleGlobalKeyDown = (e) => {
    // Evitar que los atajos se activen si hay un modal abierto o si no hay arqueo
    if (!arqueo || showSearchModal || showClientModal || showCheckoutModal || showVentasEnEsperaModal) {
      return;
    }

    if (e.key === 'F2' || e.code === 'F2') {
      e.preventDefault();
      setShowSearchModal(true);
      setTimeout(() => searchInputRef.current?.focus(), 100);
    } else if (e.key === 'F4' || e.code === 'F4') {
      e.preventDefault();
      if (carrito.length > 0) setShowCheckoutModal(true);
    } else if (e.key === 'F7' || e.code === 'F7') {
      e.preventDefault();
      setShowVentasEnEsperaModal(true);
    } else if (e.key === 'F9' || e.code === 'F9') {
      e.preventDefault();
      limpiarVenta();
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }); // Quitamos el array de dependencias para que siempre tenga el closure más reciente de las funciones y estados

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (showSearchModal) setShowSearchModal(false);
        if (showClientModal) setShowClientModal(false);
        if (showCheckoutModal) setShowCheckoutModal(false);
        if (showVentasEnEsperaModal) setShowVentasEnEsperaModal(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [showSearchModal, showClientModal, showCheckoutModal, showVentasEnEsperaModal]);

  
  const handleAuthCaja = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const res = await authFetch('/api/pos/caja/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_caja: selectedCaja, clave_cajero: passwordInput })
      });
      const data = await res.json();
      if (data.success) {
        if (data.cambiar_clave) {
          setRequirePasswordChange(true);
        } else {
          setLocked(false);
          localStorage.setItem('pos_last_caja', selectedCaja);
          resetTimer();
        }
      } else {
        setErrorMsg(data.error || 'Clave incorrecta');
      }
    } catch (e) {
      setErrorMsg('Error de conexión');
    }
  };

  
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (newPassword !== confirmPassword) {
      setErrorMsg('Las claves nuevas no coinciden');
      return;
    }
    if (newPassword.length < 4) {
      setErrorMsg('La nueva clave debe tener al menos 4 caracteres');
      return;
    }
    try {
      const res = await authFetch('/api/pos/caja/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_caja: selectedCaja, clave_actual: passwordInput, nueva_clave: newPassword })
      });
      const data = await res.json();
      if (data.success) {
        setRequirePasswordChange(false);
        setLocked(false);
        localStorage.setItem('pos_last_caja', selectedCaja);
        resetTimer();
        setPasswordInput('');
        setNewPassword('');
        setConfirmPassword('');
        alert('Clave cambiada exitosamente');
      } else {
        setErrorMsg(data.error || 'Error al cambiar clave');
      }
    } catch(e) {
      setErrorMsg('Error de conexión');
    }
  };

  
  

  const handleApertura = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const res = await authFetch('/api/pos/arqueo/apertura', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          tenantId: tenantId || 1, 
          id_usuario: user.id_usuario, 
          saldo_inicial: parseFloat(saldoInicialInput) || 0, 
          id_caja: selectedCaja, 
          turno,
          id_finca: selectedFinca,
          clave_cajero: passwordInput 
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('Caja abierta exitosamente.');
        
        // Inicialización Automática de Periféricos
        const cajaActual = cajas.find(c => String(c.id_caja) === String(selectedCaja));
        if (cajaActual) {
          localStorage.setItem('pos_resolucion', cajaActual.id_resolucion || '');
          localStorage.setItem('pos_impresora', cajaActual.impresora || '');
          localStorage.setItem('pos_dispositivo_pago', cajaActual.dispositivo_pago || '');
          
          if (cajaActual.id_bascula) {
             const basc = basculas.find(b => String(b.id_bascula) === String(cajaActual.id_bascula));
             if (basc && !isScaleConnected) {
               connectScale(basc);
             }
          }
        }
        
        setLocked(false);
        setPasswordInput('');
        checkArqueoStatus(); // refresca el estado actual
      } else {
        setErrorMsg(data.error || 'Error al abrir caja.');
      }
    } catch (err) {
      setErrorMsg('Error de conexión.');
    }
  };

  const handleRetiro = async (e) => {
    e.preventDefault();
    try {
      const res = await authFetch('/api/pos/retiro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_arqueo: arqueo.id_arqueo,
          monto: retiroData.monto,
          observaciones: retiroData.observaciones,
          clave_supervisor: retiroData.clave
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('Retiro registrado correctamente.');
        const ticket = `
================================
        RETIRO PARCIAL
================================
Caja: ${cajas.find(c => c.id_caja == arqueo.id_caja)?.nombre || 'Caja'}
Fecha: ${new Date().toLocaleString()}
Autoriza: ${retiroData.clave === '1234' || retiroData.clave === 'ADMIN123' ? 'Admin' : 'Supervisor'}
--------------------------------
Motivo: ${retiroData.observaciones || 'Sangría'}
MONTO RETIRADO: $${Number(retiroData.monto).toLocaleString()}
================================
Firma Entrega: ______________
Firma Recibe:  ______________
`;
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`<pre>${ticket}</pre><script>window.print();window.close();</script>`);
        
        setShowRetiro(false);
        setRetiroData({ monto: '', observaciones: '', clave: '' });
      } else {
        alert(data.error || 'Error al registrar el retiro.');
      }
    } catch (err) {
      alert('Error de conexión.');
    }
  };

  const imprimirResumen = async () => {
    try {
      const res = await authFetch(`/api/pos/arqueo/${arqueo.id_arqueo}/resumen`);
      const data = await res.json();
      if (data.success) {
        const { resumen } = data;
        const ticket = `
================================
        RESUMEN DE TURNO
================================
Caja: ${cajas.find(c => c.id_caja == arqueo.id_caja)?.nombre || 'Caja'}
Turno: ${resumen.turno || 'General'}
Cajero: ${user.username}
--------------------------------
Total Facturas: ${resumen.total_facturas}
--------------------------------
Saldo Inicial: $${Number(resumen.saldo_inicial).toLocaleString()}
+ Efectivo:    $${Number(resumen.ventas_efectivo).toLocaleString()}
+ Crédito:     $${Number(resumen.ventas_credito).toLocaleString()}
+ Bancos:      $${Number(resumen.ventas_bancos).toLocaleString()}
+ T. Débito:   $${Number(resumen.ventas_td).toLocaleString()}
+ T. Crédito:  $${Number(resumen.ventas_tc).toLocaleString()}
+ Nequi:       $${Number(resumen.ventas_nequi).toLocaleString()}
--------------------------------
TOTAL VENTAS:  $${Number(resumen.total_ventas).toLocaleString()}
--------------------------------
- Retiros:     $${Number(resumen.total_retiros).toLocaleString()}
================================
EFECTIVO ESPERADO EN CAJA:
$${(Number(resumen.saldo_inicial) + Number(resumen.ventas_efectivo) - Number(resumen.total_retiros)).toLocaleString()}
================================
`;
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`<pre>${ticket}</pre><script>window.print();window.close();</script>`);
      } else {
        alert(data.error || 'Error al obtener resumen.');
      }
    } catch (e) {
      alert('Error de conexión.');
    }
  };

  const handleCreateClient = async (e) => {
    e.preventDefault();
    try {
      const isNatural = newClient.tipo_persona === 'Natural';
      const nombreCompleto = isNatural 
        ? `${newClient.primer_nombre} ${newClient.segundo_nombre} ${newClient.primer_apellido} ${newClient.segundo_apellido}`.replace(/\s+/g, ' ').trim()
        : newClient.nombre_comercial;

      const payload = {
        id_tenant: tenantId || 1,
        es_cliente: 1,
        activo: 1,
        tipo_persona: newClient.tipo_persona,
        tipo_documento: newClient.tipo_documento,
        documento: newClient.documento,
        dv: newClient.dv,
        primer_nombre: newClient.primer_nombre || null,
        segundo_nombre: newClient.segundo_nombre || null,
        primer_apellido: newClient.primer_apellido || null,
        segundo_apellido: newClient.segundo_apellido || null,
        nombre_completo: nombreCompleto,
        nombre_comercial: newClient.nombre_comercial || nombreCompleto,
        email: newClient.email,
        telefono: newClient.telefono,
        direccion: newClient.direccion,
        codigo_municipio: newClient.codigo_municipio
      };
      
      const res = await authFetch('/api/table/terceros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (res.ok || data.success) {
        alert('Cliente creado exitosamente');
        
        // Refresh the client list from the server to get the exact data
        try {
          const resC = await authFetch(`/api/table/terceros/data?tenantId=${tenantId || 1}&pageSize=1000`);
          const dataC = await resC.json();
          if (dataC.data) {
            const clients = dataC.data.filter(c => c.es_cliente === 1);
            setClientes(clients);
            const created = clients.find(c => c.documento === String(newClient.documento));
            if (created) {
              setSelectedCliente(created);
            } else {
              // Fallback if not found in first 1000
              const newClientSaved = { ...payload, id_tercero: data.insertId || data.id || Date.now(), documento: String(payload.documento) };
              setClientes(prev => [...prev, newClientSaved]);
              setSelectedCliente(newClientSaved);
            }
          }
        } catch(e) { console.error("Error refreshing clients", e); }

        setShowClientModal(false);
        setNewClient({ tipo_persona: 'Natural', tipo_documento: 'CC', documento: '', dv: '', primer_nombre: '', segundo_nombre: '', primer_apellido: '', segundo_apellido: '', nombre_comercial: '', email: '', telefono: '', direccion: '', codigo_municipio: '' });
      } else {
        alert('Error al crear cliente: ' + (data.error || 'Verifique los datos'));
      }
    } catch (err) {
      alert('Error de conexión al crear cliente');
    }
  };

  const handleBarcodeSubmit = (e) => {
    e.preventDefault();
    if (!barcode) return;
    const prod = productos.find(p => p.codigo === barcode || p.codigo_barras === barcode);
    if (prod) {
      agregarAlCarrito(prod, 1);
    } else {
      alert('Producto no encontrado: ' + barcode);
    }
    setBarcode('');
  };

  const agregarAlCarrito = (producto, cantidad = 1) => {
    if (producto.maneja_bascula === 1) {
      setPendingWeighItem(producto);
      setShowWeighingModal(true);
      setShowSearchModal(false);
      return;
    }
    
    agregarProductoFinal(producto, cantidad);
  };

  const agregarProductoFinal = (producto, cantidad) => {
    // Determine the base price based on customer level
    let basePrice = producto.precio_venta_1 || producto.costo_unitario;
    if (selectedCliente) {
      if (selectedCliente.nivel_precio === 'Mayor' && producto.precio_venta_3) basePrice = producto.precio_venta_3;
      else if (selectedCliente.nivel_precio === 'Detal' && producto.precio_venta_2) basePrice = producto.precio_venta_2;
    }

    const defaultDescPercent = parseFloat(producto.descuento_porcentaje) || 0;
    const defaultDescAmount = defaultDescPercent > 0 ? (basePrice * (defaultDescPercent / 100)) : 0;

    setCarrito(prev => {
      const exist = prev.find(i => i.id_insumo === producto.id_insumo);
      let newCarrito;
      if (exist) {
        newCarrito = prev.map(i => i.id_insumo === producto.id_insumo ? { ...i, cantidad: i.cantidad + cantidad } : i);
      } else {
        newCarrito = [...prev, { 
          ...producto, 
          cantidad, 
          precio_unitario: basePrice,
          descuento: defaultDescAmount,
          iva_porcentaje: producto.aplica_iva ? (producto.porcentaje_iva || 0) : 0 
        }];
      }
      setUltimoItem(newCarrito.find(i => i.id_insumo === producto.id_insumo));
      return newCarrito;
    });
    setBarcode('');
    setShowSearchModal(false);
    setTimeout(() => barcodeRef.current?.focus(), 100);
  };

  useEffect(() => {
    if (carrito.length > 0 && selectedCliente) {
      setCarrito(prev => prev.map(item => {
        let basePrice = item.precio_venta_1 || item.costo_unitario;
        if (selectedCliente.nivel_precio === 'Mayor' && item.precio_venta_3) basePrice = item.precio_venta_3;
        else if (selectedCliente.nivel_precio === 'Detal' && item.precio_venta_2) basePrice = item.precio_venta_2;
        
        const defaultDescPercent = parseFloat(item.descuento_porcentaje) || 0;
        const defaultDescAmount = defaultDescPercent > 0 ? (basePrice * (defaultDescPercent / 100)) : 0;
        
        return { ...item, precio_unitario: basePrice, descuento: defaultDescAmount };
      }));
    }
  }, [selectedCliente]); // solo actualizamos precios si cambia el cliente (su nivel de precios)

  const updateQuantity = (id, delta) => {
    setCarrito(prev => prev.map(item => {
      if (item.id_insumo === id) {
        const newQty = Math.max(1, item.cantidad + delta);
        return { ...item, cantidad: newQty };
      }
      return item;
    }));
  };

  const updatePrice = (id, newPrice) => {
    setCarrito(prev => prev.map(item => {
      if (item.id_insumo === id) {
        return { ...item, precio_unitario: parseFloat(newPrice) || 0 };
      }
      return item;
    }));
  };

  const updateDiscount = (id, newDiscount) => {
    setCarrito(prev => prev.map(item => {
      if (item.id_insumo === id) {
        return { ...item, descuento: parseFloat(newDiscount) || 0 };
      }
      return item;
    }));
  };

  const removeItem = (id) => {
    setCarrito(prev => prev.filter(item => item.id_insumo !== id));
  };

  const limpiarVenta = () => {
    if (carrito.length === 0) return;
    if (window.confirm('¿Desea limpiar toda la venta (F9)?')) {
      setCarrito([]);
      setUltimoItem(null);
      setBarcode('');
      setObservaciones('');
    }
  };

  // Ventas en Espera Methods
  useEffect(() => {
    localStorage.setItem('pos_ventas_espera', JSON.stringify(ventasEnEspera));
  }, [ventasEnEspera]);

  const guardarVentaEnEspera = () => {
    if (carrito.length === 0) return;
    const nombre = prompt('Nombre/Referencia para esta venta en espera:');
    if (!nombre) return;
    
    const nuevaVenta = {
      id: Date.now(),
      nombre,
      carrito,
      cliente: selectedCliente,
      fecha: new Date().toISOString()
    };
    
    setVentasEnEspera(prev => [...prev, nuevaVenta]);
    setCarrito([]);
    setUltimoItem(null);
    setBarcode('');
    setObservaciones('');
  };

  const restaurarVentaEnEspera = (venta) => {
    setCarrito(venta.carrito);
    setUltimoItem(venta.carrito[venta.carrito.length - 1] || null);
    setSelectedCliente(venta.cliente);
    setVentasEnEspera(prev => prev.filter(v => v.id !== venta.id));
    setShowVentasEnEsperaModal(false);
  };

  const calculateTotals = () => {
    let sub = 0;
    let desc = 0;
    let iva = 0;
    carrito.forEach(item => {
      const itemNet = (item.precio_unitario || 0) * item.cantidad;
      const itemDesc = (item.descuento || 0);
      const afterDesc = itemNet - itemDesc;
      const itemIva = afterDesc * (item.iva_porcentaje / 100);
      sub += itemNet;
      desc += itemDesc;
      iva += itemIva;
    });
    return { sub, desc, iva, total: sub - desc + iva };
  };
  const totals = calculateTotals();

  const handleCobrar = async () => {
    if (carrito.length === 0) return alert('El carrito está vacío.');
    if (!selectedCliente) return alert('Seleccione un cliente.');
    
    let finalPagos = [...pagosVenta];
    const totalPagado = finalPagos.reduce((acc, p) => acc + Number(p.monto), 0);
    
    if (finalPagos.length === 0) {
       // Auto-assign full amount to selected tipoPago if none added explicitly
       finalPagos = [{ tipo_pago: tipoPago, monto: totals.total, referencia: comprobanteTrans || '' }];
    } else if (totalPagado < totals.total) {
      if (!window.confirm(`El total pagado (${totalPagado.toLocaleString()}) es menor al total de la venta (${totals.total.toLocaleString()}). ¿Desea registrar el saldo restante a crédito en Cartera?`)) {
        return;
      }
      finalPagos.push({ tipo_pago: 'Credito', monto: totals.total - totalPagado, referencia: 'Saldo automático' });
    }

    try {
      const payload = {
        id_tenant: tenantId || 1,
        id_tercero: selectedCliente.id_tercero,
        tipo_pago: finalPagos.length === 1 ? finalPagos[0].tipo_pago : 'Mixto',
        pagos: finalPagos,
        moneda: 'COP',
        tasa_trm: 1,
        subtotal: totals.sub,
        iva_total: totals.iva,
        total: totals.total,
        usuario_creacion: user.id_usuario,
        observaciones,
        id_bodega: selectedBodega,
        id_caja: arqueo?.id_caja,
        id_arqueo: arqueo?.id_arqueo,
        id_finca: arqueo?.id_finca,
        items: carrito.map(item => ({
          id_insumo: item.id_insumo,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
          descuento: item.descuento,
          iva_porcentaje: item.iva_porcentaje,
          iva_valor: ((item.precio_unitario * item.cantidad) - (item.descuento || 0)) * (item.iva_porcentaje / 100),
          actualiza_inventario: item.actualiza_inventario,
          tipo_item: item.tipo_item
        })),
        enviar_dian: enviarDian
      };

      const res = await authFetch('/api/pos/venta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (data.success) {
        setCarrito([]);
        setUltimoItem(null);
        setSelectedCliente(clientes.find(c => c.documento === '222222222222') || null);
        setTipoPago('Contado');
        setShowCheckoutModal(false);
        setMontoRecibido('');
        setTarjetaBanco('');
        setTarjetaNumero('');
        setComprobanteTrans('');
        setPagosVenta([]);
        let msjExito = `Venta registrada exitosamente. Factura #${data.numero_documento || data.consecutivo}`;
        if (data.dian) {
          if (data.dian.status === 'Aprobado') {
            msjExito += `\n\n=== FACTURACIÓN ELECTRÓNICA DIAN ===\nEstado: APROBADO\nCUFE: ${data.dian.cufe}\n(El PDF fue generado y enviado al proveedor tecnológico)`;
          } else {
            msjExito += `\n\n=== ATENCIÓN DIAN ===\nEstado: ${data.dian.status}\nError: ${data.dian.error}`;
          }
        }
        alert(msjExito);
      } else {
        alert('Error: ' + data.error);
      }
    } catch (e) {
      alert('Error de conexión.');
    }
  };



  if (loading) return <div style={{ color: '#fff', padding: '20px' }}>Cargando POS...</div>;

  if (!boundCajaId) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', color: '#fff' }}>
        <div style={{ background: '#1e293b', width: '450px', padding: '30px', borderRadius: '12px', border: '1px solid #f59e0b', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', textAlign: 'center' }}>
          <Monitor size={48} style={{ color: '#f59e0b', margin: '0 auto 15px' }} />
          <h2 style={{ margin: 0, fontSize: '22px', color: '#f59e0b' }}>Equipo No Vinculado</h2>
          <p style={{ color: '#94a3b8', fontSize: '14px', margin: '15px 0 25px 0', lineHeight: '1.5' }}>
            Este computador (navegador) no está vinculado a ninguna caja física. <br/><br/>
            Para mayor seguridad, por favor solicita al Administrador que vaya a la Configuración de Cajas y haga clic en "Vincular Equipo" para autorizar esta estación de trabajo.
          </p>
          <button onClick={() => window.location.href = '/comercializacion/pos/cajas'} style={{ padding: '12px 24px', background: 'transparent', border: '1px solid #38bdf8', color: '#38bdf8', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
            Ir a Configurar Cajas
          </button>
        </div>
      </div>
    );
  }
  
  if (locked) {
    if (requirePasswordChange) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', color: '#fff' }}>
          <div style={{ background: '#1e293b', width: '450px', padding: '30px', borderRadius: '12px', border: '1px solid #38bdf8', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '22px', color: '#38bdf8' }}>Cambio de Clave Obligatorio</h2>
              <p style={{ color: '#94a3b8', fontSize: '13px', margin: '5px 0 0 0' }}>El administrador ha solicitado que cambies tu clave al ingresar.</p>
            </div>
            {errorMsg && <div style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5', padding: '10px', borderRadius: '6px', fontSize: '13px', marginBottom: '20px' }}>{errorMsg}</div>}
            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', color: '#cbd5e1' }}>Nueva Clave *</label>
                <input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#fff', fontSize: '18px', fontWeight: 'bold' }} autoFocus />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', color: '#cbd5e1' }}>Confirmar Nueva Clave *</label>
                <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#fff', fontSize: '18px', fontWeight: 'bold' }} />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => { setRequirePasswordChange(false); setPasswordInput(''); }} style={{ flex: 1, padding: '14px', background: 'transparent', border: '1px solid #64748b', color: '#cbd5e1', borderRadius: '6px', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ flex: 2, padding: '14px', background: '#38bdf8', color: '#0f172a', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>Guardar y Entrar</button>
              </div>
            </form>
          </div>
        </div>
      );
    }

    if (!arqueo) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', color: '#fff' }}>
          <div style={{ background: '#1e293b', width: '500px', padding: '30px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <Monitor size={48} style={{ color: '#38bdf8', marginBottom: '10px' }} />
              <h2 style={{ margin: 0, fontSize: '22px' }}>Apertura de Caja POS</h2>
              <p style={{ color: '#94a3b8', fontSize: '13px', margin: '5px 0 0 0' }}>Hola, {user.username}. Configura tu turno.</p>
            </div>
            {errorMsg && <div style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5', padding: '10px', borderRadius: '6px', fontSize: '13px', marginBottom: '20px' }}>{errorMsg}</div>}
            <form onSubmit={handleApertura} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', gap: '15px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', color: '#cbd5e1' }}>Finca / Sucursal *</label>
                  <select required value={selectedFinca} onChange={(e) => setSelectedFinca(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#fff', fontSize: '15px' }}>
                    <option value="">Seleccione Finca...</option>
                    {fincas.map(f => <option key={f.id_finca} value={f.id_finca}>{f.nombre}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', color: '#cbd5e1' }}>Caja Asignada *</label>
                  <input type="text" readOnly value={boundCajaNombre || ''} style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #334155', background: 'rgba(51, 65, 85, 0.5)', color: '#94a3b8', fontSize: '15px', cursor: 'not-allowed' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '15px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', color: '#cbd5e1' }}>Turno *</label>
                  <select required value={turno} onChange={(e) => setTurno(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#fff', fontSize: '15px' }}>
                    <option value="Mañana">Mañana (06:00 - 14:00)</option>
                    <option value="Tarde">Tarde (14:00 - 22:00)</option>
                    <option value="Noche">Noche (22:00 - 06:00)</option>
                    <option value="General">General (8 horas)</option>
                    <option value="Todos">Todos (06:00 - 23:59)</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', color: '#cbd5e1' }}>Base Inicial (COP) *</label>
                  <input type="number" required min="0" value={saldoInicialInput} onChange={(e) => setSaldoInicialInput(e.target.value)} placeholder="Ej: 150000" style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#fff', fontSize: '18px', fontWeight: 'bold' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', color: '#cbd5e1' }}>Clave de Cajero *</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPassword ? "text" : "password"} required value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} placeholder="Ingresa tu clave para abrir" style={{ width: '100%', padding: '12px', paddingRight: '45px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#fff', fontSize: '18px', fontWeight: 'bold' }} autoFocus />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => window.location.href = '/comercializacion/pos/cajas'} style={{ flex: 1, padding: '14px', background: 'transparent', border: '1px solid #64748b', color: '#cbd5e1', borderRadius: '6px', cursor: 'pointer' }}>
                  Salir
                </button>
                <button type="submit" style={{ flex: 2, padding: '14px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>
                  Iniciar Turno
                </button>
              </div>
            </form>
          </div>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', color: '#fff' }}>
        <div style={{ background: '#1e293b', width: '450px', padding: '30px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <User size={48} style={{ color: '#38bdf8', marginBottom: '10px' }} />
            <h2 style={{ margin: 0, fontSize: '22px' }}>Caja Bloqueada</h2>
            <p style={{ color: '#94a3b8', fontSize: '13px', margin: '5px 0 0 0' }}>Hola, {user.username}. Ingresa tu clave para continuar.</p>
          </div>
          {errorMsg && <div style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5', padding: '10px', borderRadius: '6px', fontSize: '13px', marginBottom: '20px' }}>{errorMsg}</div>}
          <form onSubmit={handleAuthCaja} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ background: '#334155', padding: '15px', borderRadius: '8px', marginBottom: '15px', textAlign: 'center', border: '1px solid #475569' }}>
              <span style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '5px' }}>Turno Activo en Caja:</span>
              <strong style={{ fontSize: '18px', color: '#fff' }}>{cajas.find(c => c.id_caja == selectedCaja)?.nombre || 'Caja Principal'}</strong>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', color: '#cbd5e1' }}>Clave de Acceso *</label>
              <div style={{ position: 'relative' }}>
                <input type={showPassword ? "text" : "password"} required value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} placeholder="Ingresa tu clave" style={{ width: '100%', padding: '12px', paddingRight: '45px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#fff', fontSize: '18px', fontWeight: 'bold' }} autoFocus />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button type="button" onClick={() => window.location.href = '/comercializacion/pos/cajas'} style={{ flex: 1, padding: '14px', background: 'transparent', border: '1px solid #64748b', color: '#cbd5e1', borderRadius: '6px', cursor: 'pointer' }}>
                Salir
              </button>
              <button type="submit" style={{ flex: 2, padding: '14px', background: '#38bdf8', color: '#0f172a', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>
                Desbloquear Caja
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  


  return (
    <div 
      style={{ height: 'calc(100vh - 60px)', display: 'flex', flexDirection: 'column', background: '#0f172a', color: '#fff', margin: '-20px', padding: '10px' }}
      onKeyDown={handleGlobalKeyDown}
      tabIndex={0}
    >
      
      <div style={{ background: '#1e293b', padding: '10px 20px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8' }}>
            <Monitor size={20} />
            <span style={{ fontWeight: 'bold', fontSize: '18px' }}>POS Terminal</span>
          </div>
          <div style={{ fontSize: '13px', color: '#94a3b8', display: 'flex', gap: '15px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><User size={14} /> {user.username} ({turno})</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Clock size={14} /> {new Date().toLocaleTimeString()}</span>
            <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '5px' }}><CheckCircle size={14}/> Caja Activa</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {cajas.find(c => String(c.id_caja) === String(selectedCaja))?.id_bascula ? (
              <span style={{ padding: '6px 12px', borderRadius: '4px', background: '#334155', color: '#fff', fontSize: '13px' }}>
                Báscula: {basculas.find(b => String(b.id_bascula) === String(cajas.find(c => String(c.id_caja) === String(selectedCaja)).id_bascula))?.nombre || 'Desconocida'}
              </span>
            ) : (
              <span style={{ padding: '6px 12px', borderRadius: '4px', background: 'rgba(239,68,68,0.1)', color: '#fca5a5', fontSize: '13px' }}>
                Sin Báscula Asignada
              </span>
            )}
            {cajas.find(c => String(c.id_caja) === String(selectedCaja))?.id_bascula && (
              <button 
                onClick={() => {
                  if (isScaleConnected) disconnectScale();
                  else {
                    const caja = cajas.find(c => String(c.id_caja) === String(selectedCaja));
                    if (caja && caja.id_bascula) {
                      const bascula = basculas.find(b => String(b.id_bascula) === String(caja.id_bascula));
                      if (bascula) connectScale(bascula);
                    }
                  }
                }}
                style={{ padding: '6px 12px', borderRadius: '4px', background: isScaleConnected ? '#ef4444' : '#10b981', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
              >
                {isScaleConnected ? 'Desconectar' : 'Conectar Báscula'}
              </button>
            )}
            {isScaleConnected && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '5px 10px', borderRadius: '4px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }}></div>
                <strong>{scaleWeight} Kg</strong>
              </div>
            )}
            {scaleError && <span style={{ color: '#ef4444', fontSize: '12px', background: 'rgba(239,68,68,0.1)', padding: '5px', borderRadius: '4px' }}>{scaleError}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', fontSize: '13px', color: '#cbd5e1' }}>
          <button style={{ padding: '8px 14px', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 5px rgba(0,0,0,0.2)', transition: 'all 0.2s' }} onClick={() => setShowRetiro(true)}>
            <Minus size={16} /> Retirar Efectivo
          </button>
          <button style={{ padding: '8px 14px', background: 'linear-gradient(135deg, #38bdf8, #0284c7)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 5px rgba(0,0,0,0.2)', transition: 'all 0.2s' }} onClick={imprimirResumen}>
            <Hash size={16} /> Resumen de Turno
          </button>
          <button style={{ padding: '8px 14px', background: 'linear-gradient(135deg, #ef4444, #b91c1c)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 5px rgba(0,0,0,0.2)', transition: 'all 0.2s' }} onClick={() => window.location.href='/comercializacion/pos/arqueo'}>
            <X size={16} /> Cerrar Caja
          </button>
          
          <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)', margin: '0 5px' }}></div>

          <button style={{ padding: '8px 14px', background: 'linear-gradient(135deg, #475569, #334155)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 5px rgba(0,0,0,0.2)', transition: 'all 0.2s' }} onClick={() => { setLocked(true); setPasswordInput(''); }}>
            <LogOut size={16} /> Salir
          </button>
          
          <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)', margin: '0 5px' }}></div>
          
          <button style={{ padding: '8px 14px', background: '#334155', color: '#f8fafc', border: 'none', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
            <Search size={16} /> [F2] Buscar
          </button>
          <button style={{ padding: '8px 14px', background: '#334155', color: '#f8fafc', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', boxShadow: '0 2px 5px rgba(0,0,0,0.2)', transition: 'all 0.2s' }} onClick={() => setShowVentasEnEsperaModal(true)}>
            <Clock size={16} /> [F7] Espera
          </button>
          <button style={{ padding: '8px 14px', background: '#334155', color: '#f8fafc', border: 'none', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
            <CreditCard size={16} /> [F4] Pagar
          </button>
          <button style={{ padding: '8px 14px', background: '#334155', color: '#f8fafc', border: 'none', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
            <Trash2 size={16} /> [F9] Limpiar
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, gap: '15px', minHeight: 0 }}>
        
        <div style={{ flex: '1 1 65%', display: 'flex', flexDirection: 'column', gap: '10px', minHeight: 0 }}>
        {ultimoItem && (
          <div style={{ background: '#10b981', color: '#fff', padding: '15px 20px', borderRadius: '8px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}>
            <div>
              <span style={{ fontSize: '14px', opacity: 0.9 }}>Último Artículo:</span>
              <h2 style={{ margin: '5px 0 0 0', fontSize: '24px' }}>{ultimoItem.nombre}</h2>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '14px', opacity: 0.9 }}>Cant: {ultimoItem.cantidad}</span>
              <h2 style={{ margin: '5px 0 0 0', fontSize: '24px' }}>${((ultimoItem.precio_unitario * ultimoItem.cantidad) - (ultimoItem.descuento || 0)).toLocaleString()}</h2>
            </div>
          </div>
        )}

        <div style={{ background: '#1e293b', borderRadius: '8px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          
          <div style={{ padding: '20px', borderBottom: '1px solid #334155' }}>
            <form onSubmit={handleBarcodeSubmit}>
              <div style={{ display: 'flex', gap: '15px' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <Hash size={24} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}/>
                  <input
                    ref={barcodeRef}
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder="Escanea el código de barras del producto..."
                    style={{ width: '100%', padding: '20px 20px 20px 50px', fontSize: '20px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff', outline: 'none' }}
                    autoFocus
                  />
                </div>
                <button type="button" onClick={() => setShowSearchModal(true)} style={{ padding: '0 30px', background: '#0ea5e9', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '18px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <Search size={24} /> Buscar (F2)
                </button>
              </div>
            </form>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ background: '#0f172a', position: 'sticky', top: 0, zIndex: 10 }}>
                <tr>
                  <th style={{ padding: '15px', color: '#94a3b8', fontSize: '14px', width: '50px' }}>#</th>
                  <th style={{ padding: '15px', color: '#94a3b8', fontSize: '14px' }}>Descripción del Artículo</th>
                  <th style={{ padding: '15px', color: '#94a3b8', fontSize: '14px', width: '120px' }}>Cant.</th>
                  <th style={{ padding: '15px', color: '#94a3b8', fontSize: '14px', width: '120px' }}>Precio Unit.</th>
                  <th style={{ padding: '15px', color: '#94a3b8', fontSize: '14px', width: '80px' }}>IVA %</th>
                  <th style={{ padding: '15px', color: '#94a3b8', fontSize: '14px', width: '100px' }}>Dcto ($)</th>
                  <th style={{ padding: '15px', color: '#94a3b8', fontSize: '14px', width: '120px', textAlign: 'right' }}>Total</th>
                  <th style={{ padding: '15px', width: '50px' }}></th>
                </tr>
              </thead>
              <tbody>
                {carrito.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '18px' }}>
                        <ShoppingCart size={48} style={{ opacity: 0.5, margin: '0 auto 15px auto', display: 'block' }} />
                        Escanea un producto o presiona F2 para buscar
                      </td>
                    </tr>
                  ) : (
                    carrito.map((item, idx) => (
                      <tr key={item.id_insumo} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '15px' }}>
                        <td style={{ padding: '12px', color: '#64748b' }}>{idx + 1}</td>
                        <td style={{ padding: '12px', fontWeight: '500' }}>
                          <div style={{ fontSize: '16px' }}>{item.nombre}</div>
                          <div style={{ fontSize: '12px', color: '#94a3b8' }}>Código: {item.codigo} {item.tipo_item === 'Servicio' && ' (Servicio)'}</div>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', background: '#0f172a', borderRadius: '6px', border: '1px solid #334155', width: 'fit-content' }}>
                            <button type="button" onClick={() => updateQuantity(item.id_insumo, -1)} style={{ background: 'none', border: 'none', color: '#fff', padding: '8px', cursor: 'pointer' }}><Minus size={14}/></button>
                            <span style={{ width: '40px', textAlign: 'center', fontWeight: 'bold' }}>{item.cantidad}</span>
                            <button type="button" onClick={() => updateQuantity(item.id_insumo, 1)} style={{ background: 'none', border: 'none', color: '#fff', padding: '8px', cursor: 'pointer' }}><Plus size={14}/></button>
                          </div>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <input 
                            type="number"
                            value={item.precio_unitario}
                            onChange={(e) => updatePrice(item.id_insumo, e.target.value)}
                            style={{ width: '80px', background: 'transparent', border: 'none', color: '#fff', fontSize: '15px', borderBottom: '1px solid #334155' }}
                          />
                        </td>
                        <td style={{ padding: '12px' }}>
                          <input 
                            type="number"
                            value={item.descuento || ''}
                            onChange={(e) => updateDiscount(item.id_insumo, e.target.value)}
                            placeholder="0"
                            style={{ width: '70px', background: 'transparent', border: 'none', color: '#f59e0b', fontSize: '15px', borderBottom: '1px solid #334155' }}
                          />
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', fontSize: '16px' }}>
                          ${(((item.precio_unitario * item.cantidad) - (item.descuento || 0)) * (1 + item.iva_porcentaje/100)).toLocaleString()}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <button type="button" onClick={() => removeItem(item.id_insumo)} style={{ background: 'rgba(239,68,68,0.2)', border: 'none', color: '#f87171', padding: '8px', borderRadius: '6px', cursor: 'pointer' }}>
                            <Trash2 size={16}/>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Side: Totals & Checkout */}
        <div style={{ flex: '0 0 35%', display: 'flex', flexDirection: 'column', gap: '10px', minHeight: 0 }}>
          
          <div style={{ background: '#1e293b', padding: '20px', borderRadius: '8px', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#38bdf8', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}><CreditCard /> Resumen de Venta</h3>
            
            {/* Client Select */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '13px', color: '#94a3b8' }}>Cliente</label>
                <button type="button" style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '12px', cursor: 'pointer' }} onClick={() => setShowClientModal(true)}>+ Crear Cliente</button>
              </div>
              <Select 
                options={clientes.map(c => ({ value: c.id_tercero, label: `${c.documento} - ${c.nombre_completo}`, raw: c }))}
                value={selectedCliente ? { value: selectedCliente.id_tercero, label: `${selectedCliente.documento} - ${selectedCliente.nombre_completo}` } : null}
                onChange={(opt) => setSelectedCliente(opt ? opt.raw : null)}
                placeholder="Buscar por cédula o nombre..."
                isSearchable={true}
                styles={{
                  control: (base) => ({ ...base, background: '#0f172a', borderColor: '#334155', color: '#fff' }),
                  singleValue: (base) => ({ ...base, color: '#fff' }),
                  input: (base) => ({ ...base, color: '#fff' }),
                  menu: (base) => ({ ...base, background: '#1e293b' }),
                  option: (base, { isFocused }) => ({ ...base, background: isFocused ? '#334155' : '#1e293b', color: '#fff' })
                }}
              />
            </div>

            {/* Pagos Múltiples (Split Tender) */}
            <div style={{ marginBottom: '20px', background: '#0f172a', padding: '15px', borderRadius: '8px', border: '1px solid #334155' }}>
              <label style={{ display: 'block', fontSize: '14px', color: '#38bdf8', marginBottom: '10px', fontWeight: 'bold' }}>Añadir Pago</label>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <select value={tipoPago} onChange={(e) => setTipoPago(e.target.value)} style={{ flex: 1, padding: '10px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '14px' }}>
                  <option value="Contado">Efectivo</option>
                  <option value="Tarjeta Debito">Tarjeta Débito</option>
                  <option value="Tarjeta Credito">Tarjeta Crédito</option>
                  <option value="Credito">Crédito a Cartera</option>
                  <option value="Nequi">Nequi / Daviplata</option>
                  <option value="Transferencia">Transferencia</option>
                </select>
                <input 
                  type="number" 
                  value={montoRecibido} 
                  onChange={e => setMontoRecibido(e.target.value)} 
                  placeholder="Monto"
                  style={{ width: '120px', padding: '10px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '14px' }}
                />
              </div>

              {/* Campos condicionales según tipo de pago */}
              {(tipoPago === 'Tarjeta Debito' || tipoPago === 'Tarjeta Credito') && (
                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                  <select value={tarjetaBanco} onChange={e => setTarjetaBanco(e.target.value)} style={{ flex: 1, padding: '10px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '12px' }}>
                    <option value="">Franquicia/Banco...</option>
                    <option value="Visa">Visa</option>
                    <option value="MasterCard">MasterCard</option>
                    <option value="Amex">American Express</option>
                    <option value="Diners">Diners Club</option>
                    <option value="Otro">Otro</option>
                  </select>
                  <input type="text" placeholder="Últimos 4 dígitos" maxLength="4" value={tarjetaNumero} onChange={e => setTarjetaNumero(e.target.value.replace(/\D/g, ''))} style={{ width: '100px', padding: '10px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '12px' }} />
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px' }}>
                {(tipoPago !== 'Contado' && tipoPago !== 'Credito') ? (
                  <input 
                    type="text" 
                    value={comprobanteTrans} 
                    onChange={e => setComprobanteTrans(e.target.value)} 
                    placeholder={tipoPago.includes('Tarjeta') ? "Nº Aprobación (Voucher) *" : "Referencia (Opcional)"}
                    style={{ flex: 1, padding: '10px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '14px' }}
                  />
                ) : <div style={{ flex: 1 }}></div>}
                
                <button 
                  onClick={() => {
                    const monto = Number(montoRecibido);
                    if (!monto || monto <= 0) return alert('Monto inválido');
                    
                    let refFinal = comprobanteTrans;
                    if (tipoPago === 'Tarjeta Debito' || tipoPago === 'Tarjeta Credito') {
                      if (!tarjetaBanco || !tarjetaNumero || !comprobanteTrans) return alert('Debe completar Banco, 4 dígitos y Nº Aprobación para pagos con tarjeta.');
                      refFinal = `${tarjetaBanco} - *${tarjetaNumero} - Aprob: ${comprobanteTrans}`;
                    }

                    if (tipoPago === 'Credito' && (!selectedCliente || selectedCliente.documento === '222222222222')) {
                      return alert('Para Crédito a Cartera debe seleccionar un cliente registrado (no Consumidor Final).');
                    }

                    // Calcular Devuelta para Efectivo
                    let montoAAgregar = monto;
                    let devueltaMsj = '';
                    if (tipoPago === 'Contado') {
                      const totalPagadoHastaAhora = pagosVenta.reduce((acc, p) => acc + p.monto, 0);
                      const saldoRestante = totals.total - totalPagadoHastaAhora;
                      
                      if (monto > saldoRestante) {
                        const devuelta = monto - saldoRestante;
                        montoAAgregar = saldoRestante; // Solo registramos lo necesario para cubrir la factura
                        devueltaMsj = `\n\n💰 CAMBIO / DEVUELTA: $${devuelta.toLocaleString()}`;
                        alert(`Pago registrado.` + devueltaMsj);
                      }
                    }

                    if (montoAAgregar > 0) {
                      setPagosVenta([...pagosVenta, { tipo_pago: tipoPago, monto: montoAAgregar, referencia: refFinal }]);
                    }
                    
                    setMontoRecibido('');
                    setComprobanteTrans('');
                    setTarjetaBanco('');
                    setTarjetaNumero('');
                  }}
                  style={{ padding: '10px 15px', background: '#38bdf8', border: 'none', color: '#0f172a', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Agregar
                </button>
              </div>
            </div>

            {/* Pagos Agregados */}
            {pagosVenta.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#94a3b8' }}>Pagos Registrados</h4>
                {pagosVenta.map((p, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0f172a', padding: '10px', borderRadius: '6px', marginBottom: '5px', border: '1px solid #334155' }}>
                    <div>
                      <div style={{ fontSize: '14px', color: '#fff' }}>{p.tipo_pago}</div>
                      {p.referencia && <div style={{ fontSize: '11px', color: '#64748b' }}>Ref: {p.referencia}</div>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#4ade80' }}>${Number(p.monto).toLocaleString()}</span>
                      <button onClick={() => setPagosVenta(pagosVenta.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={16}/></button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Totals */}
            <div style={{ background: '#0f172a', borderRadius: '8px', padding: '20px', marginTop: 'auto', border: '1px solid #334155' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', color: '#94a3b8', marginBottom: '10px' }}>
                <span>Subtotal:</span>
                <span>${totals.sub.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', color: '#f59e0b', marginBottom: '10px' }}>
                <span>Descuento:</span>
                <span>-${totals.desc.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', color: '#94a3b8', marginBottom: '20px' }}>
                <span>Impuestos (IVA):</span>
                <span>${totals.iva.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '32px', fontWeight: 'bold', color: '#4ade80', borderTop: '2px dashed #334155', paddingTop: '15px' }}>
                <span>TOTAL:</span>
                <span>${totals.total.toLocaleString()}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={limpiarVenta} style={{ flex: 1, padding: '20px 0', background: 'transparent', border: '2px solid rgba(239,68,68,0.5)', color: '#f87171', borderRadius: '8px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' }}>
                Cancelar (F9)
              </button>
              <button onClick={guardarVentaEnEspera} disabled={carrito.length === 0} style={{ flex: 1, padding: '20px 0', background: 'transparent', border: '2px solid rgba(245,158,11,0.5)', color: '#fcd34d', borderRadius: '8px', fontSize: '18px', fontWeight: 'bold', cursor: carrito.length > 0 ? 'pointer' : 'not-allowed' }}>
                En Espera
              </button>
              <button onClick={() => { if(carrito.length > 0) setShowCheckoutModal(true); }} style={{ flex: 2, padding: '20px 0', background: carrito.length > 0 ? '#10b981' : '#334155', border: 'none', color: '#fff', borderRadius: '8px', fontSize: '22px', fontWeight: 'bold', cursor: carrito.length > 0 ? 'pointer' : 'not-allowed', boxShadow: carrito.length > 0 ? '0 4px 14px rgba(16,185,129,0.4)' : 'none' }}>
                COBRAR (F4)
              </button>
            </div>
            
            <div style={{ marginTop: '15px', textAlign: 'center' }}>
               <label style={{ color: '#cbd5e1', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                 <input type="checkbox" checked={enviarDian} onChange={(e) => setEnviarDian(e.target.checked)} style={{ transform: 'scale(1.2)' }} />
                 Generar Factura Electrónica (DianBox)
               </label>
            </div>

          </div>
        </div>
      </div>

      {/* F2 Search Modal */}
      {showSearchModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: '#1e293b', width: '800px', height: '80vh', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #334155' }}>
            <div style={{ padding: '20px', background: '#0f172a', borderBottom: '1px solid #334155', display: 'flex', gap: '15px', alignItems: 'center' }}>
              <Search size={24} style={{ color: '#38bdf8' }} />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar producto por nombre o código... (Presiona ESC para salir)"
                style={{ flex: 1, background: 'transparent', border: 'none', color: '#fff', fontSize: '20px', outline: 'none' }}
              />
              <button onClick={() => setShowSearchModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={28}/></button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <tbody>
                  {productos
                    .filter(p => String(p.nombre || '').toLowerCase().includes(searchQuery.toLowerCase()) || String(p.codigo || '').toLowerCase().includes(searchQuery.toLowerCase()))
                    .map(p => (
                      <tr key={p.id_insumo} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }} onClick={() => agregarAlCarrito(p, 1)}>
                        <td style={{ padding: '15px 10px', width: '100px', color: '#94a3b8' }}>{p.codigo}</td>
                        <td style={{ padding: '15px 10px', fontSize: '18px', fontWeight: '500' }}>
                          {p.nombre}
                          {p.tipo_item === 'Servicio' && <span style={{ marginLeft: '10px', fontSize: '12px', padding: '2px 6px', background: '#c084fc', color: '#fff', borderRadius: '10px' }}>Servicio</span>}
                          {p.actualiza_inventario === 0 && p.tipo_item !== 'Servicio' && <span style={{ marginLeft: '10px', fontSize: '12px', padding: '2px 6px', background: '#f59e0b', color: '#fff', borderRadius: '10px' }}>Sin Inv.</span>}
                        </td>
                        <td style={{ padding: '15px 10px', color: '#4ade80', fontWeight: 'bold', fontSize: '18px', textAlign: 'right' }}>
                          {(() => {
                             let bPrice = p.precio_venta_1 || p.costo_unitario;
                             if (selectedCliente) {
                               if (selectedCliente.nivel_precio === 'Mayor' && p.precio_venta_3) bPrice = p.precio_venta_3;
                               else if (selectedCliente.nivel_precio === 'Detal' && p.precio_venta_2) bPrice = p.precio_venta_2;
                             }
                             const ivaP = p.aplica_iva ? (p.porcentaje_iva || 0) : 0;
                             const fPrice = bPrice * (1 + (ivaP / 100));
                             return `$${parseFloat(fPrice).toLocaleString()}`;
                          })()}
                        </td>
                      </tr>
                    ))}
                  {productos.filter(p => String(p.nombre || '').toLowerCase().includes(searchQuery.toLowerCase()) || String(p.codigo || '').toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                    <tr>
                      <td colSpan="3" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>No se encontraron artículos en venta que coincidan con la búsqueda.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {/* Client Creation Modal */}
      {showClientModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: '#1e293b', width: '500px', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #334155', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
            <div style={{ padding: '20px', background: '#0f172a', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '10px' }}><User size={20}/> Nuevo Cliente</h3>
              <button onClick={() => setShowClientModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={24}/></button>
            </div>
            <form onSubmit={handleCreateClient} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: '#cbd5e1' }}>Tipo Persona *</label>
                  <select required value={newClient.tipo_persona} onChange={e => setNewClient({...newClient, tipo_persona: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#fff' }}>
                    <option value="Natural">Natural</option>
                    <option value="Juridica">Jurídica</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: '#cbd5e1' }}>Tipo Identificación *</label>
                  <select required value={newClient.tipo_documento} onChange={e => setNewClient({...newClient, tipo_documento: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#fff' }}>
                    <option value="CC">Cédula (CC)</option>
                    <option value="NIT">NIT</option>
                    <option value="CE">Cédula Extranjería (CE)</option>
                    <option value="Pasaporte">Pasaporte</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 2 }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: '#cbd5e1' }}>Número de Identificación *</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input type="text" required value={newClient.documento} onChange={e => {
                        const doc = e.target.value;
                        setNewClient({...newClient, documento: doc, dv: calculateDV(doc)});
                      }} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#fff' }} />
                    <button 
                      type="button"
                      onClick={() => {
                        if (!newClient.documento) return alert('Ingrese un número de identificación primero');
                        // Simulación de consumo API RUES / DIAN
                        alert(`Consultando API (Simulado) para: ${newClient.documento}`);
                        if (newClient.tipo_persona === 'Juridica') {
                          setNewClient(prev => ({ ...prev, nombre_comercial: 'EMPRESA CONSULTADA SAS', direccion: 'CALLE Falsa 123', telefono: '3000000000', email: 'contacto@empresaconsultada.com', codigo_municipio: '11001' }));
                        } else {
                          setNewClient(prev => ({ ...prev, primer_nombre: 'JUAN', primer_apellido: 'PEREZ', direccion: 'CRA 45 #12-34', telefono: '3100000000', email: 'juan.perez@email.com', codigo_municipio: '11001' }));
                        }
                      }}
                      style={{ padding: '0 15px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                    >
                      Consultar API
                    </button>
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: '#cbd5e1' }}>DV</label>
                  <input type="text" readOnly value={newClient.dv} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #334155', background: '#1e293b', color: '#94a3b8' }} />
                </div>
              </div>

              {newClient.tipo_persona === 'Natural' ? (
                <>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: '#cbd5e1' }}>Primer Nombre *</label>
                      <input type="text" required value={newClient.primer_nombre} onChange={e => setNewClient({...newClient, primer_nombre: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#fff' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: '#cbd5e1' }}>Segundo Nombre</label>
                      <input type="text" value={newClient.segundo_nombre} onChange={e => setNewClient({...newClient, segundo_nombre: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#fff' }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: '#cbd5e1' }}>Primer Apellido *</label>
                      <input type="text" required value={newClient.primer_apellido} onChange={e => setNewClient({...newClient, primer_apellido: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#fff' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: '#cbd5e1' }}>Segundo Apellido</label>
                      <input type="text" value={newClient.segundo_apellido} onChange={e => setNewClient({...newClient, segundo_apellido: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#fff' }} />
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: '#cbd5e1' }}>Razón Social *</label>
                  <input type="text" required value={newClient.nombre_comercial} onChange={e => setNewClient({...newClient, nombre_comercial: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#fff' }} />
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: '#cbd5e1' }}>Teléfono</label>
                  <input type="text" value={newClient.telefono} onChange={e => setNewClient({...newClient, telefono: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#fff' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: '#cbd5e1' }}>Código Ciudad/DANE</label>
                  <input type="text" value={newClient.codigo_municipio} onChange={e => setNewClient({...newClient, codigo_municipio: e.target.value})} placeholder="Ej: 14012" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#fff' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: '#cbd5e1' }}>Email (Multilínea)</label>
                <textarea rows="2" value={newClient.email} onChange={e => setNewClient({...newClient, email: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#fff', resize: 'vertical' }} />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: '#cbd5e1' }}>Dirección</label>
                <input type="text" value={newClient.direccion} onChange={e => setNewClient({...newClient, direccion: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#fff' }} />
              </div>

              <button type="submit" style={{ marginTop: '10px', padding: '12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' }}>
                Guardar Cliente
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Weighing Modal */}
      {showWeighingModal && pendingWeighItem && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: '#1e293b', width: '500px', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #334155', boxShadow: '0 10px 40px rgba(0,0,0,0.8)' }}>
            <div style={{ padding: '20px', background: '#0f172a', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '20px' }}>Pesaje Requerido</h3>
              <button onClick={() => { setShowWeighingModal(false); setPendingWeighItem(null); setSupervisorOverride(false); setSupervisorPassword(''); }} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={28}/></button>
            </div>
            <div style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'center' }}>
              
              <h2 style={{ margin: 0, color: '#fff' }}>{pendingWeighItem.nombre}</h2>

              {!isScaleConnected ? (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.5)', padding: '20px', borderRadius: '8px' }}>
                  <h3 style={{ color: '#ef4444', margin: '0 0 10px 0' }}>¡PRENDA LA BÁSCULA POR FAVOR!</h3>
                  <p style={{ color: '#fca5a5', fontSize: '14px', margin: 0 }}>No hay conexión con la báscula. Conéctela desde la barra superior.</p>
                </div>
              ) : (
                <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.5)', padding: '30px', borderRadius: '8px' }}>
                  <span style={{ display: 'block', fontSize: '14px', color: '#10b981', marginBottom: '10px' }}>Peso Leído (Kg)</span>
                  <span style={{ fontSize: '48px', fontWeight: 'bold', color: '#34d399' }}>{scaleWeight.toFixed(3)}</span>
                </div>
              )}

              {supervisorOverride ? (
                <div style={{ background: '#0f172a', padding: '15px', borderRadius: '8px', border: '1px solid #38bdf8', marginTop: '10px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#38bdf8' }}>Peso Manual Autorizado (Kg)</label>
                  <input type="number" step="0.001" value={manualWeight} onChange={e => setManualWeight(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '6px', border: 'none', background: '#1e293b', color: '#fff', fontSize: '20px', textAlign: 'center' }} autoFocus />
                  <button 
                    onClick={() => {
                      if (parseFloat(manualWeight) > 0) {
                        agregarProductoFinal(pendingWeighItem, parseFloat(manualWeight));
                        setShowWeighingModal(false);
                        setPendingWeighItem(null);
                        setSupervisorOverride(false);
                        setSupervisorPassword('');
                        setManualWeight('');
                      } else {
                        alert("Ingrese un peso válido");
                      }
                    }}
                    style={{ marginTop: '15px', width: '100%', padding: '12px', background: '#38bdf8', color: '#0f172a', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    Confirmar Peso Manual
                  </button>
                </div>
              ) : (
                <div style={{ marginTop: '10px' }}>
                  <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 10px 0' }}>¿Báscula dañada? Requiere clave de supervisor.</p>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input 
                      type="password" 
                      placeholder="Clave Supervisor" 
                      value={supervisorPassword}
                      onChange={e => setSupervisorPassword(e.target.value)}
                      style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#fff' }}
                    />
                    <button 
                      onClick={() => {
                        if (supervisorPassword === 'ADMIN123') {
                          setSupervisorOverride(true);
                        } else {
                          alert("Clave incorrecta");
                        }
                      }}
                      style={{ padding: '10px 15px', background: '#475569', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                    >
                      Autorizar
                    </button>
                  </div>
                </div>
              )}

              {isScaleConnected && !supervisorOverride && (
                <button 
                  onClick={() => {
                    if (scaleWeight > 0) {
                      agregarProductoFinal(pendingWeighItem, scaleWeight);
                      setShowWeighingModal(false);
                      setPendingWeighItem(null);
                    } else {
                      alert("El peso debe ser mayor a 0");
                    }
                  }}
                  style={{ marginTop: '10px', padding: '15px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '18px', cursor: 'pointer' }}
                >
                  Confirmar Peso ({scaleWeight.toFixed(3)} Kg)
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Retiro de Efectivo */}
      {showRetiro && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: '#1e293b', width: '400px', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
            <div style={{ background: '#f59e0b', padding: '15px 20px', color: '#fff', fontWeight: 'bold', fontSize: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Retirar Efectivo (Sangría)</span>
              <button onClick={() => setShowRetiro(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '20px' }}>&times;</button>
            </div>
            <form onSubmit={handleRetiro} style={{ padding: '20px' }}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', color: '#cbd5e1' }}>Monto a Retirar (COP) *</label>
                <input type="number" required min="1" value={retiroData.monto} onChange={e => setRetiroData({ ...retiroData, monto: e.target.value })} style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff' }} />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', color: '#cbd5e1' }}>Motivo / Observaciones *</label>
                <input type="text" required value={retiroData.observaciones} onChange={e => setRetiroData({ ...retiroData, observaciones: e.target.value })} style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff' }} placeholder="Ej: Pago de hielo, retiro supervisor..." />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', color: '#cbd5e1' }}>Clave Autorización (Supervisor) *</label>
                <input type="password" required value={retiroData.clave} onChange={e => setRetiroData({ ...retiroData, clave: e.target.value })} style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff' }} placeholder="Clave de admin/supervisor" />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => setShowRetiro(false)} style={{ flex: 1, padding: '12px', background: '#334155', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ flex: 1, padding: '12px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Confirmar Retiro</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ventas en Espera Modal */}
      {showVentasEnEsperaModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: '#1e293b', width: '600px', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #334155', boxShadow: '0 10px 40px rgba(0,0,0,0.8)' }}>
            <div style={{ padding: '20px', background: '#0f172a', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: '#fcd34d', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '20px' }}>Ventas en Espera</h3>
              <button onClick={() => setShowVentasEnEsperaModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={28}/></button>
            </div>
            <div style={{ padding: '20px', maxHeight: '60vh', overflowY: 'auto' }}>
              {ventasEnEspera.length === 0 ? (
                <p style={{ color: '#64748b', textAlign: 'center', padding: '30px' }}>No hay ventas en espera actualmente.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {ventasEnEspera.map(venta => (
                    <div key={venta.id} style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h4 style={{ margin: '0 0 5px 0', color: '#fff', fontSize: '16px' }}>{venta.nombre}</h4>
                        <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                          {new Date(venta.fecha).toLocaleTimeString()} - {venta.cliente?.nombre_completo || 'Cliente General'}
                        </div>
                        <div style={{ fontSize: '13px', color: '#38bdf8', marginTop: '5px' }}>
                          {venta.carrito.length} artículos - Total: $ {venta.carrito.reduce((acc, item) => acc + (item.precio_unitario * item.cantidad) - (item.descuento || 0) + (((item.precio_unitario * item.cantidad) - (item.descuento || 0)) * (item.iva_porcentaje / 100)), 0).toLocaleString()}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={() => setVentasEnEspera(prev => prev.filter(v => v.id !== venta.id))} style={{ padding: '10px', background: 'rgba(239,68,68,0.2)', border: 'none', color: '#f87171', borderRadius: '6px', cursor: 'pointer' }}>
                          Eliminar
                        </button>
                        <button onClick={() => restaurarVentaEnEspera(venta)} style={{ padding: '10px 15px', background: '#fcd34d', border: 'none', color: '#0f172a', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                          Restaurar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Client Creation Modal */}
      {showClientModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: '#1e293b', width: '650px', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #334155', boxShadow: '0 10px 40px rgba(0,0,0,0.8)' }}>
            <div style={{ padding: '20px', background: '#0f172a', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '20px' }}>Crear Nuevo Cliente (DIAN)</h3>
              <button onClick={() => setShowClientModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={28}/></button>
            </div>
            <form onSubmit={handleCreateClient} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px', maxHeight: '70vh', overflowY: 'auto' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', color: '#cbd5e1' }}>Tipo Persona</label>
                  <select required value={newClient.tipo_persona} onChange={e => setNewClient({...newClient, tipo_persona: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#fff' }}>
                    <option value="Natural">Natural</option>
                    <option value="Juridica">Jurídica</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', color: '#cbd5e1' }}>Tipo Documento</label>
                  <select required value={newClient.tipo_documento} onChange={e => setNewClient({...newClient, tipo_documento: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#fff' }}>
                    <option value="CC">Cédula (CC)</option>
                    <option value="NIT">NIT</option>
                    <option value="CE">Cédula Extranjería (CE)</option>
                    <option value="Pasaporte">Pasaporte</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', color: '#cbd5e1' }}>Número de Documento *</label>
                  <input type="text" required value={newClient.documento} onChange={e => {
                    const doc = e.target.value;
                    setNewClient({...newClient, documento: doc, dv: newClient.tipo_persona === 'Juridica' ? calculateDV(doc) : ''});
                  }} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#fff' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', color: '#cbd5e1' }}>DV</label>
                  <input type="text" value={newClient.dv} readOnly style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #334155', background: '#1e293b', color: '#94a3b8' }} />
                </div>
              </div>

              {newClient.tipo_persona === 'Natural' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', color: '#cbd5e1' }}>Primer Nombre *</label>
                    <input type="text" required value={newClient.primer_nombre} onChange={e => setNewClient({...newClient, primer_nombre: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#fff' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', color: '#cbd5e1' }}>Segundo Nombre</label>
                    <input type="text" value={newClient.segundo_nombre} onChange={e => setNewClient({...newClient, segundo_nombre: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#fff' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', color: '#cbd5e1' }}>Primer Apellido *</label>
                    <input type="text" required value={newClient.primer_apellido} onChange={e => setNewClient({...newClient, primer_apellido: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#fff' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', color: '#cbd5e1' }}>Segundo Apellido</label>
                    <input type="text" value={newClient.segundo_apellido} onChange={e => setNewClient({...newClient, segundo_apellido: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#fff' }} />
                  </div>
                </div>
              ) : (
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', color: '#cbd5e1' }}>Razón Social *</label>
                  <input type="text" required value={newClient.nombre_comercial} onChange={e => setNewClient({...newClient, nombre_comercial: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#fff' }} />
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', color: '#cbd5e1' }}>Email *</label>
                  <input type="email" required value={newClient.email} onChange={e => setNewClient({...newClient, email: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#fff' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', color: '#cbd5e1' }}>Teléfono *</label>
                  <input type="text" required value={newClient.telefono} onChange={e => setNewClient({...newClient, telefono: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#fff' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', color: '#cbd5e1' }}>Dirección Completa *</label>
                <input type="text" required value={newClient.direccion} onChange={e => setNewClient({...newClient, direccion: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#fff' }} />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowClientModal(false)} style={{ flex: 1, padding: '12px', background: '#334155', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ flex: 1, padding: '12px', background: '#38bdf8', color: '#0f172a', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Guardar Cliente</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckoutModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: '#1e293b', width: '500px', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #334155', boxShadow: '0 10px 40px rgba(0,0,0,0.8)' }}>
            <div style={{ padding: '20px', background: '#0f172a', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: '#4ade80', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '24px' }}>Confirmar Pago</h3>
              <button onClick={() => setShowCheckoutModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={28}/></button>
            </div>
            <div style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0f172a', padding: '15px', borderRadius: '8px', border: '1px solid #334155' }}>
                <span style={{ fontSize: '18px', color: '#94a3b8' }}>Total a Pagar:</span>
                <span style={{ fontSize: '28px', fontWeight: 'bold', color: '#4ade80' }}>${totals.total.toLocaleString()}</span>
              </div>

              {tipoPago === 'Contado' || tipoPago === 'Mixto (Efectivo y Nequi)' ? (
                <>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#cbd5e1' }}>Efectivo Recibido</label>
                    <input 
                      type="number" 
                      value={montoRecibido} 
                      onChange={e => setMontoRecibido(e.target.value)} 
                      style={{ width: '100%', padding: '15px', borderRadius: '8px', border: '2px solid #38bdf8', background: '#0f172a', color: '#fff', fontSize: '24px', fontWeight: 'bold' }} 
                      autoFocus
                    />
                  </div>
                  {parseFloat(montoRecibido) >= totals.total && (
                    <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.5)', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
                      <span style={{ display: 'block', fontSize: '14px', color: '#f59e0b', marginBottom: '5px' }}>Devuelta (Cambio)</span>
                      <span style={{ fontSize: '32px', fontWeight: 'bold', color: '#fcd34d' }}>${(parseFloat(montoRecibido) - totals.total).toLocaleString()}</span>
                    </div>
                  )}
                </>
              ) : null}

              {tipoPago === 'Tarjeta Debito' || tipoPago === 'Tarjeta Credito' ? (
                <>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#cbd5e1' }}>Banco</label>
                    <select value={tarjetaBanco} onChange={e => setTarjetaBanco(e.target.value)} style={{ width: '100%', padding: '15px', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: '#fff', fontSize: '16px' }}>
                      <option value="">Seleccione Banco...</option>
                      <option value="Bancolombia">Bancolombia</option>
                      <option value="Davivienda">Davivienda</option>
                      <option value="Banco de Bogota">Banco de Bogotá</option>
                      <option value="BBVA">BBVA</option>
                      <option value="Banco de Occidente">Banco de Occidente</option>
                      <option value="Colpatria">Scotiabank Colpatria</option>
                      <option value="Otro">Otro...</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#cbd5e1' }}>Últimos 4 dígitos de la Tarjeta</label>
                    <input type="text" maxLength={4} value={tarjetaNumero} onChange={e => setTarjetaNumero(e.target.value)} placeholder="Ej: 4567" style={{ width: '100%', padding: '15px', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: '#fff', fontSize: '18px', letterSpacing: '2px', textAlign: 'center' }} />
                  </div>
                </>
              ) : null}

              {tipoPago === 'Nequi / Daviplata' || tipoPago === 'Transferencia Bancaria' || tipoPago === 'Mixto (Efectivo y Nequi)' ? (
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#cbd5e1' }}>Nº Comprobante / Celular</label>
                  <input type="text" value={comprobanteTrans} onChange={e => setComprobanteTrans(e.target.value)} placeholder="Ej: 3001234567" style={{ width: '100%', padding: '15px', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: '#fff', fontSize: '16px' }} />
                </div>
              ) : null}

              {tipoPago === 'Credito' ? (
                <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.5)', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
                  <span style={{ display: 'block', fontSize: '14px', color: '#60a5fa', marginBottom: '5px' }}>Crédito a Cartera</span>
                  <span style={{ fontSize: '16px', color: '#cbd5e1' }}>Esta venta se cargará automáticamente al saldo del cliente <strong>{selectedCliente?.nombre_completo || 'Consumidor Final'}</strong>.</span>
                </div>
              ) : null}

              <button 
                onClick={handleCobrar} 
                disabled={tipoPago === 'Contado' && parseFloat(montoRecibido || 0) < totals.total}
                style={{ 
                  marginTop: '10px', padding: '20px', 
                  background: (tipoPago === 'Contado' && parseFloat(montoRecibido || 0) < totals.total) ? '#334155' : '#10b981', 
                  color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '20px', 
                  cursor: (tipoPago === 'Contado' && parseFloat(montoRecibido || 0) < totals.total) ? 'not-allowed' : 'pointer',
                  boxShadow: (tipoPago === 'Contado' && parseFloat(montoRecibido || 0) < totals.total) ? 'none' : '0 4px 15px rgba(16,185,129,0.4)'
                }}
              >
                Confirmar y Facturar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default POSConsole;
