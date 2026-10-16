// src/app/produccion/historico/page.tsx
// -------------------------------
// Componente React del Histórico de Producciones
// - TanStack Table v8 (data fetching + pagination)
// - Botón "Procesar Consulta" por fila
// - Drawer modal con trazabilidad de lotes (QR + códigos)
// - Multi‑tenant: todas las consultas incluyen `tenantId`

import { useState } from 'react';
import { useBlockLayout } from '@tanstack/react-table';
import { Dialog, DialogOverlay, DialogContent, DialogHeader, DialogTitle, DialogCloseButton } from '@radix-ui/react-dialog';
import { useId } from 'react';
import { Button, HStack, useToast } from '@radix-ui/react-popover-list';
import { Loader2 } from 'lucide-react';

// --- Fetch production orders (multi‑tenant) ----------------------------
async function fetchProductions(tenantId: number) {
  const res = await fetch(`/api/produccion/orders?tenantId=${tenantId}`);
  if (!res.ok) throw new Error('Failed to load productions');
  return res.json(); // -> {content: [{id, codigoOrden, fechaOrden, estado, margenBrutoTotal, ...}], page: {...}}
}

// --- Column definitions -------------------------------------------------
function createColumns() {
  return [
    {
      accessorKey: 'codigoOrden',
      header: 'Código Orden',
    },
    {
      accessorKey: 'fechaOrden',
      header: 'Fecha',
      cell: ({ getValue }) => new Date(getValue('fechaOrden')).toLocaleDateString(),
    },
    {
      accessorKey: 'estado',
      header: 'Estado',
    },
    {
      accessorKey: 'margenBrutoTotal',
      header: 'Margen Bruto',
      cell: ({ getValue }) => `${(Number(getValue('margenBrutoTotal'))).toFixed(2)} COP`,
    },
    {
      accessorKey: 'accion',
      header: 'Acción',
      cell: (info) => {
        const orderId = info.getValue('id');
        const tenantId = info.getValue('id_tenant');
        return (
          <Button
            onClick={() => openDrawer(orderId, tenantId)}
            variant="subtle"
          >
            Procesar Consulta
          </Button>
        );
      },
    },
  ];
}

// --- Drawer content (trazabilidad de lotes) ---------------------------
function LotTraceabilityDrawer({ orderId, tenantId }: { orderId: number; tenantId: number }) {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [open, setOpen] = useState(true);
  const dialogId = useId(); // stable id for Radix UI
  const toast = useToast();

  // Load lot details for this order (multitenant endpoint)
  async function loadLots() {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/produccion/order/${orderId}/lots?tenantId=${tenantId}`);
      if (!res.ok) throw new Error('Failed to load lots');
      const json = await res.json(); // [{loteCode, qrHash, fechaVencimiento, estado}, ...]
      setData(json);
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }

  // Open/close drawer
  const onOpen = () => setOpen(true);
  const onClose = () => setOpen(false);
  const hide = () => setOpen(false);

  return (
    <div style={{ maxWidth: 600, margin: 'auto' }}>
      <Dialog open={open} onClose={onClose} center Align="center">
        <DialogOverlay />
        <DialogContent dividers>
          <DialogHeader>
            <DialogTitle>Trazabilidad del Lote</DialogTitle>
            <DialogCloseButton />
          </DialogHeader>
          <HStack spacing={4}>
            <Loader2 className="text-lg animate-spin" />
            <span>Cargando...</span>
          </HStack>
          {isLoading ? (
            <>
              <p>Por favor espere...</p>
            </>
          ) : (
            <table className="w-full">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left">Código Lote</th>
                  <th className="px-4 py-2 text-left">QR Hash</th>
                  <th className="px-4 py-2 text-left">Fecha Vencimiento</th>
                  <th className="px-4 py-2 text-left">Estado</th>
                </tr>
              </thead>
              <tbody>
                {data.map((lot) => (
                  <tr key={lot.idLote}>
                    <td className="px-4 py-2">{lot.loteCode}</td>
                    <td className="px-4 py-2">{lot.qrHash}</td>
                    <td className="px-4 py-2">
                      {lot.fechaVencimiento ? new Date(lot.fechaVencimiento).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-2 capitalize">{lot.estado}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- Main component ----------------------------------------------------
export default function ProductionHistory() {
  const tenantId = Number(process.env.NEXT_PUBLIC_TENANT_ID) || 1; // <-- multi‑tenant id source
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<any>(10);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedOrder, setSelectedOrder] = useState<number | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<number>(tenantId);

  // Fetch and paginate
  async function loadPage(pageNum: number) {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/produccion/orders?page=${pageNum}&limit=${rowsPerPage}&tenantId=${tenantId}`
      );
      const json = await response.json();
      setData(json.content);
      setPage(pageNum);
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  // Open drawer with order id & tenant
  function openDrawer(orderId: number, tenantIdParam: number) {
    setSelectedOrder(orderId);
    setSelectedTenant(tenantIdParam);
  }

  // Effect: load first page on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    loadPage(1);
  }, []);

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Histórico de Producciones</h2>
        <div className="gap-2">
          <Button variant="outline" onClick={() => loadPage(1)}>◀️ Primera</Button>
          <Button
            variant="outline"
            onClick={() => loadPage(page > 1 ? page - 1 : page)}
          >
            ◀️ Anterior
          </Button>
          <Button variant="outline" onClick={() => loadPage(page + 1)}>Siguiente ▶️</Button>
          <span className="text-sm text-gray-600">
            Página {page} · Filas por página: {rowsPerPage}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <Loader2 className="text-gray-400 animate-spin h-8 w-8 mr-2" />
          Cargando...
        </div>
      ) : data.length > 0 ? (
        <div className="space-y-2">
          <table className="w-full overflow-x-auto">
            <thead>
              <tr className="bg-gray-100 th-alternate">
                {createColumns().map((col) => (
                  <th key={col.accessorKey} className="px-4 py-2 text-left">
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row: any) => (
                <tr
                  key={row.id}
                  className="bg-white hover:bg-gray-50"
                  onClick={() => openDrawer(row.id, row.id_tenant)}
                >
                  {createColumns().map((col) => {
                    const value = row[col.accessorKey];
                    return (
                      <td key={col.accessorKey} className="px-4 py-2">
                        {col.cell ? col.cell({ getValue: () => value }) : value}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          {/* ---------- Drawer Modal (Hidden until order selected) ---------- */}
          <Dialog as="div" className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
            <DialogOverlay className="fixed inset-0 bg-black bg-opacity-50" />
            <DialogContent className="relative w-full rounded-lg bg-white shadow-lg max-h-[90vh]">
              <DialogHeader />
              {selectedOrder && selectedTenant ? (
                <LotTraceabilityDrawer orderId={selectedOrder} tenantId={selectedTenant} />
              ) : (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-12 w-12 text-primary-600" />
                </div>
              )}
              <DialogCloseButton />
            </DialogContent>
          </Dialog>
        </div>
      ) : (
        <div className="text-center py-8">
          <Loader2 className="text-gray-400 animate-spin h-8 w-8 mr-2" />
          <p>No hay datos para mostrar.</p>
        </div>
      )}
    </div>
  );
}