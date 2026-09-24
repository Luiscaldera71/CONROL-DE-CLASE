import React, { createContext, useContext, useState, useEffect } from 'react';
import { offlineStorage } from '../services/offlineStorage';
import { syncQueueItemToFirestore } from '../services/firestoreService';

interface OfflineContextType {
  isOnline: boolean;
  pendingCount: number;
  syncNow: () => Promise<void>;
  isSyncing: boolean;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export const OfflineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [pendingCount, setPendingCount] = useState<number>(() => offlineStorage.getSyncQueue().length);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-trigger sync when connection returns
      syncNow();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    const handleQueueUpdate = (e: any) => {
      setPendingCount(e.detail?.count ?? offlineStorage.getSyncQueue().length);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('sync_queue_updated', handleQueueUpdate);

    // Si arranca la app con conexión e items pendientes, sincronizar de inmediato
    if (navigator.onLine && offlineStorage.getSyncQueue().length > 0) {
      syncNow();
    }

    // Intervalo de respaldo cada 15 segundos
    const timer = setInterval(() => {
      if (navigator.onLine && offlineStorage.getSyncQueue().length > 0 && !isSyncing) {
        syncNow();
      }
    }, 15000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('sync_queue_updated', handleQueueUpdate);
      clearInterval(timer);
    };
  }, []);

  const syncNow = async () => {
    if (!navigator.onLine || isSyncing) return;
    const queue = offlineStorage.getSyncQueue();
    if (queue.length === 0) return;

    setIsSyncing(true);
    try {
      // Procesar secuencialmente con Firestore
      for (const item of queue) {
        const synced = await syncQueueItemToFirestore(item);
        if (synced) {
          offlineStorage.removeFromSyncQueue(item.id);
        }
      }
      setPendingCount(offlineStorage.getSyncQueue().length);
    } catch (e) {
      console.error('Error sincronizando cola offline:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <OfflineContext.Provider value={{ isOnline, pendingCount, syncNow, isSyncing }}>
      {children}
    </OfflineContext.Provider>
  );
};

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (!context) throw new Error('useOffline debe ser usado dentro de OfflineProvider');
  return context;
};
