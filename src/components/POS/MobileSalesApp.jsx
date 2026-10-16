import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchTableData, authFetch } from '../../utils/api';
import { ShoppingCart, ShoppingBag, Plus, Minus, Trash, Send, PhoneCall, WifiOff } from 'lucide-react';
import { saveToOfflineQueue, syncOfflineQueue, getOfflineQueue } from '../../utils/offlineSync';

function MobileSalesApp() {
  const { tenantId, user } = useAuth();
  const [clientes, setClientes] = useState([]);
  const [selectedCliente, setSelectedCliente] = useState('');
  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito] = useState({}); // mapped: { id_insumo: { item, qty } }
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      // Clientes
      const resClientes = await fetchTableData('terceros', { tenantId, pageSize: 200 });
      if (resClientes.data) {
        const clientList = resClientes.data.filter(c => c.es_cliente === 1);
        setClientes(clientList);
        if (clientList.length > 0) {
          setSelectedCliente(clientList[0].id_tercero);
        }
      }

      // Products
      const resProd = await authFetch(`/api/pos/productos?tenantId=${tenantId || 1}&bodegaId=1`);
      const dataProd = await resProd.json();
      if (dataProd.success) {
        setProductos(dataProd.insumos);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleOnline = async () => {
      console.log('Regresó la conexión, intentando sincronizar cola...');
      const res = await syncOfflineQueue(authFetch);
      if (res.synced > 0) {
        alert(`Sincronización Exitosa: ${res.synced} registros pendientes enviados.`);
        loadData();
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  const getClientNivelPrecio = () => {
    const cli = clientes.find(c => c.id_tercero == selectedCliente);
    return cli ? cli.nivel_precio : 'Publico';
  };

  const getProductPriceForClient = (prod) => {
    let basePrice = parseFloat(prod.costo_unitario) || 0;
    const level = getClientNivelPrecio();
    if (level === 'Detal') {
      return basePrice * 1.1; // Detal gets 10% markup
    } else if (level === 'Mayor') {
      return basePrice * 0.95; // Mayor gets 5% discount
    }
    return basePrice;
  };

  const handleUpdateQty = (prod, delta) => {
    const updated = { ...carrito };
    const current = updated[prod.id_insumo];
    if (current) {
      const newQty = current.qty + delta;
      if (newQty <= 0) {
        delete updated[prod.id_insumo];
      } else {
        updated[prod.id_insumo] = { ...current, qty: newQty };
      }
    } else if (delta > 0) {
      updated[prod.id_insumo] = { item: prod, qty: 1 };
    }
    setCarrito(updated);
  };

  const cartList = Object.values(carrito);
  
  const calculateTotals = () => {
    let sub = 0;
    let tax = 0;
    let tot = 0;
    cartList.forEach(c => {
      const price = getProductPriceForClient(c.item);
      const subtotalItem = price * c.qty;
      const isExport = clientes.find(cli => cli.id_tercero == selectedCliente)?.es_comprador_extranjero === 1;
      const calculatedIvaPercent = isExport ? 0 : 19.00;
      const ivaItem = subtotalItem * (calculatedIvaPercent / 100);
      sub += subtotalItem;
      tax += ivaItem;
      tot += (subtotalItem + ivaItem);
    });
    return { sub, tax, tot };
  };

  const totals = calculateTotals();

  const handleCompletarVenta = async () => {
    if (!selectedCliente) {
      alert('Debes seleccionar un cliente.');
      return;
    }
    if (cartList.length === 0) {
      alert('El carrito de compras está vacío.');
      return;
    }

    try {
      const mappedItems = cartList.map(c => {
        const price = getProductPriceForClient(c.item);
        const isExport = clientes.find(cli => cli.id_tercero == selectedCliente)?.es_comprador_extranjero === 1;
        const calculatedIvaPercent = isExport ? 0 : 19.00;
        const ivaVal = (price * c.qty) * (calculatedIvaPercent / 100);
        return {
          id_insumo: c.item.id_insumo,
          cantidad: c.qty,
          precio_unitario: price,
          iva_porcentaje: calculatedIvaPercent,
          iva_valor: ivaVal,
          tara: 0,
          peso_neto: c.qty,
          total: (price * c.qty) + ivaVal
        };
      });

      const cli = clientes.find(c => c.id_tercero == selectedCliente);
      const payload = {
        id_tenant: tenantId || 1,
        id_finca: 1,
        id_tercero: parseInt(selectedCliente, 10),
        tipo_pago: 'Contado',
        moneda: cli?.es_comprador_extranjero === 1 ? 'USD' : 'COP',
        tasa_trm: 1.0000,
        subtotal: totals.sub,
        iva_total: totals.tax,
        total: totals.tot,
        items: mappedItems,
        usuario_creacion: user.id_usuario,
        observaciones: 'Venta registrada desde App Móvil de Campo',
        id_bodega: 1
      };

      if (!navigator.onLine) {
        saveToOfflineQueue('/api/pos/venta', 'POST', payload, { 'Content-Type': 'application/json' });
        alert(`Sin Internet: Venta guardada LOCALMENTE. Se sincronizará automáticamente al volver la red.`);
        setCarrito({});
        return;
      }

      const res = await authFetch('/api/pos/venta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        alert(`Venta guardada exitosamente!\nNº Documento: ${data.consecutivo}`);
        setCarrito({});
        loadData();
      } else {
        alert(data.error || 'Error al procesar la venta');
      }
    } catch (e) {
      if (e.message === 'Failed to fetch' || e.name === 'TypeError') {
        // Network error intercept fallback
        saveToOfflineQueue('/api/pos/venta', 'POST', payload, { 'Content-Type': 'application/json' });
        alert(`Error de Red: Venta guardada LOCALMENTE. Se sincronizará automáticamente.`);
        setCarrito({});
      } else {
        alert('Error en el servidor al enviar la venta');
      }
    }
  };

  const offlineItems = getOfflineQueue().length;

  if (loading) {
    return <div style={{ color: '#fff', padding: '20px' }}>Cargando catálogo móvil...</div>;
  }

  return (
    <div style={{ padding: '15px', color: '#fff', maxWidth: '600px', margin: '0 auto' }}>
      
      {/* Mobile Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ShoppingBag className="text-emerald-400" />
          <h2 style={{ fontSize: '18px', fontWeight: 'bold' }}>Ventas de Campo (Móvil)</h2>
        </div>
        {offlineItems > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#fbbf24', fontSize: '12px' }}>
            <WifiOff size={14} />
            <span>{offlineItems} en cola</span>
          </div>
        )}
      </div>

      {/* Customer Selector */}
      <div style={{ background: '#1e293b', padding: '15px', borderRadius: '10px', marginBottom: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
        <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>Seleccionar Comprador / Cliente</label>
        <select
          value={selectedCliente}
          onChange={(e) => setSelectedCliente(e.target.value)}
          style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff' }}
        >
          {clientes.map(c => (
            <option key={c.id_tercero} value={c.id_tercero}>{c.nombre_completo} ({c.nivel_precio || 'Público'})</option>
          ))}
        </select>
      </div>

      {/* Product List Grid */}
      <h3 style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '10px' }}>Catálogo de Insumos / Cosecha</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
        {productos.map(p => {
          const cartItem = carrito[p.id_insumo];
          const qty = cartItem ? cartItem.qty : 0;
          const price = getProductPriceForClient(p);

          return (
            <div key={p.id_insumo} style={{ background: '#1e293b', padding: '12px 15px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: '14px', display: 'block' }}>{p.nombre}</strong>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>Código: {p.codigo}</span>
                <span style={{ fontSize: '12px', color: '#10b981', display: 'block', marginTop: '4px', fontWeight: 'bold' }}>
                  ${price.toLocaleString()} COP / {p.unidad_medida}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {qty > 0 ? (
                  <>
                    <button 
                      onClick={() => handleUpdateQty(p, -1)}
                      style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Minus size={16} />
                    </button>
                    <span style={{ fontWeight: 'bold', fontSize: '15px', minWidth: '20px', textAlign: 'center' }}>{qty}</span>
                    <button 
                      onClick={() => handleUpdateQty(p, 1)}
                      style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#10b981', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Plus size={16} />
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => handleUpdateQty(p, 1)}
                    style={{ padding: '6px 12px', background: '#38bdf8', color: '#0f172a', fontWeight: 'bold', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
                  >
                    Vender
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Cart Summary & Action Drawer */}
      {cartList.length > 0 && (
        <div style={{ background: '#0f172a', padding: '20px', borderRadius: '12px', border: '1px solid rgba(56,189,248,0.3)', position: 'sticky', bottom: '15px', boxShadow: '0 -4px 20px rgba(0,0,0,0.5)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <div>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>Total a cobrar:</span>
              <strong style={{ fontSize: '20px', display: 'block', color: '#38bdf8' }}>
                ${totals.tot.toLocaleString()} COP
              </strong>
            </div>
            <span style={{ fontSize: '12px', background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', padding: '4px 8px', borderRadius: '8px' }}>
              {cartList.length} ítems
            </span>
          </div>

          <button
            onClick={handleCompletarVenta}
            style={{ width: '100%', padding: '12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px' }}
          >
            <Send size={16} /> Completar y Enviar Factura
          </button>
        </div>
      )}

    </div>
  );
}

export default MobileSalesApp;
