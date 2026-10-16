const QUEUE_KEY = 'agropaccioli_offline_queue';

export const saveToOfflineQueue = (endpoint, method, payload, headers) => {
  try {
    const queue = JSON.parse(localStorage.getItem(QUEUE_KEY)) || [];
    queue.push({
      id: Date.now().toString(),
      endpoint,
      method,
      payload,
      headers,
      timestamp: new Date().toISOString()
    });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    console.log(`[OfflineSync] Petición encolada de emergencia. Total en cola: ${queue.length}`);
  } catch (err) {
    console.error('[OfflineSync] Error guardando en cola offline:', err);
  }
};

export const getOfflineQueue = () => {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY)) || [];
  } catch (err) {
    return [];
  }
};

export const removeFromOfflineQueue = (id) => {
  try {
    let queue = JSON.parse(localStorage.getItem(QUEUE_KEY)) || [];
    queue = queue.filter(item => item.id !== id);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.error('[OfflineSync] Error removiendo de cola:', err);
  }
};

/**
 * Intenta enviar todas las peticiones atrapadas en memoria.
 * Requiere un wrapper `fetcher` que retorne una Promesa y lance error en Network Error.
 */
export const syncOfflineQueue = async (fetcher) => {
  if (!navigator.onLine) return { success: false, message: 'Dispositivo sin red.' };
  
  const queue = getOfflineQueue();
  if (queue.length === 0) return { success: true, message: 'Cola vacía.' };

  let successCount = 0;
  let errorCount = 0;

  console.log(`[OfflineSync] Sincronizando ${queue.length} peticiones...`);

  for (const item of queue) {
    try {
      await fetcher(item.endpoint, {
        method: item.method,
        headers: item.headers,
        body: JSON.stringify(item.payload)
      });
      // Si no lanzó excepción, asumimos éxito (2xx)
      removeFromOfflineQueue(item.id);
      successCount++;
    } catch (err) {
      console.error(`[OfflineSync] Falló item ${item.id}:`, err);
      // Si el error indica falta de conexión, pausar el ciclo
      if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
        errorCount++;
        break; 
      } else {
        // Error de backend (400, 500). Lo descartamos para no bloquear la cola perpetuamente
        removeFromOfflineQueue(item.id);
        errorCount++;
      }
    }
  }

  return { success: true, synced: successCount, failed: errorCount };
};
