import { SyncQueueItem } from '../types';

const SYNC_QUEUE_KEY = 'aulacontrol_sync_queue';
const LOCAL_DATA_PREFIX = 'aulacontrol_data_';

export const offlineStorage = {
  // Obtener la cola de sincronización pendiente
  getSyncQueue(): SyncQueueItem[] {
    try {
      const data = localStorage.getItem(SYNC_QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  // Añadir operación a la cola
  addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retries'>): SyncQueueItem {
    const queue = this.getSyncQueue();
    const newItem: SyncQueueItem = {
      ...item,
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp: Date.now(),
      retries: 0
    };
    queue.push(newItem);
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    window.dispatchEvent(new CustomEvent('sync_queue_updated', { detail: { count: queue.length } }));
    return newItem;
  },

  // Eliminar un elemento procesado de la cola
  removeFromSyncQueue(id: string): void {
    const queue = this.getSyncQueue().filter(i => i.id !== id);
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    window.dispatchEvent(new CustomEvent('sync_queue_updated', { detail: { count: queue.length } }));
  },

  // Guardar datos locales en caché
  saveLocal<T>(key: string, data: T): void {
    try {
      localStorage.setItem(`${LOCAL_DATA_PREFIX}${key}`, JSON.stringify(data));
    } catch (e) {
      console.warn('Error guardando en almacenamiento local:', e);
    }
  },

  // Obtener datos locales en caché
  getLocal<T>(key: string, fallback: T): T {
    try {
      const item = localStorage.getItem(`${LOCAL_DATA_PREFIX}${key}`);
      return item ? JSON.parse(item) : fallback;
    } catch {
      return fallback;
    }
  }
};
