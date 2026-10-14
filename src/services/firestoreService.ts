import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  query,
  where,
  onSnapshot,
  writeBatch,
  Unsubscribe
} from 'firebase/firestore';
import { db, auth, isFirebaseConfigured } from './firebase';
import {
  Course,
  Student,
  Activity,
  Submission,
  AttendanceSession,
  BehaviorRecord,
  StudentObservation,
  TeacherProfile,
  SyncQueueItem
} from '../types';

export const isFirestoreReady = (): boolean => {
  return Boolean(isFirebaseConfigured && db);
};

// ================= PERFIL DE PROFESOR =================
export const saveTeacherProfileFirestore = async (profile: TeacherProfile): Promise<void> => {
  if (!isFirestoreReady()) return;
  try {
    const docRef = doc(db, 'teachers', profile.uid);
    await setDoc(docRef, profile, { merge: true });
  } catch (error) {
    console.error('Error guardando perfil en Firestore:', error);
  }
};

export const getTeacherProfileFirestore = async (uid: string): Promise<TeacherProfile | null> => {
  if (!isFirestoreReady()) return null;
  try {
    const docRef = doc(db, 'teachers', uid);
    const snap = await getDoc(docRef);
    return snap.exists() ? (snap.data() as TeacherProfile) : null;
  } catch (error) {
    console.error('Error leyendo perfil de Firestore:', error);
    return null;
  }
};

// ================= SUSCRIPCIONES EN TIEMPO REAL =================
export const subscribeToCollection = <T extends { id: string }>(
  collectionName: string,
  teacherId: string,
  onData: (items: T[]) => void,
  onError?: (err: Error) => void
): Unsubscribe => {
  if (!isFirestoreReady()) {
    return () => {};
  }

  const q = query(collection(db, collectionName), where('teacherId', '==', teacherId));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: T[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as T);
      });
      onData(items);
    },
    (error) => {
      console.warn(`Error en suscripción a ${collectionName}:`, error);
      if (onError) onError(error);
    }
  );
};

// ================= OPERACIONES CRUD =================
export const setFirestoreDoc = async (
  collectionName: string,
  id: string,
  data: any
): Promise<void> => {
  if (!isFirestoreReady()) return;
  try {
    const docRef = doc(db, collectionName, id);
    await setDoc(docRef, data, { merge: true });
  } catch (error) {
    console.error(`Error guardando en ${collectionName}/${id}:`, error);
    throw error;
  }
};

export const deleteFirestoreDoc = async (
  collectionName: string,
  id: string
): Promise<void> => {
  if (!isFirestoreReady()) return;
  try {
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error(`Error eliminando ${collectionName}/${id}:`, error);
    throw error;
  }
};

export const batchSaveFirestore = async (
  collectionName: string,
  items: Array<{ id: string; data: any }>
): Promise<void> => {
  if (!isFirestoreReady() || items.length === 0) return;
  try {
    const batch = writeBatch(db);
    // Firestore permite hasta 500 operaciones por batch
    const chunks = [];
    for (let i = 0; i < items.length; i += 400) {
      chunks.push(items.slice(i, i + 400));
    }

    for (const chunk of chunks) {
      const b = writeBatch(db);
      for (const item of chunk) {
        const ref = doc(db, collectionName, item.id);
        b.set(ref, item.data, { merge: true });
      }
      await b.commit();
    }
  } catch (error) {
    console.error(`Error en batchSaveFirestore para ${collectionName}:`, error);
    throw error;
  }
};

// ================= SINCRONIZACIÓN DE COLA OFFLINE =================
export const syncQueueItemToFirestore = async (item: SyncQueueItem): Promise<boolean> => {
  if (!isFirestoreReady()) return false;
  try {
    if (item.action === 'create' || item.action === 'update') {
      const id = item.data?.id;
      if (!id) return false;
      await setFirestoreDoc(item.collection, id, item.data);
    } else if (item.action === 'delete') {
      const id = item.data?.id || item.data;
      if (!id) return false;
      await deleteFirestoreDoc(item.collection, id);
    }
    return true;
  } catch (e) {
    console.warn(`Fallo al sincronizar elemento de cola ${item.id}:`, e);
    return false;
  }
};
