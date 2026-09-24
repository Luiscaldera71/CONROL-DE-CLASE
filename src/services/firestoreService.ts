import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  getDocFromCache,
  getDocs,
  query,
  where,
  onSnapshot,
  writeBatch,
  Unsubscribe
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import {
  TeacherProfile,
  SyncQueueItem,
  Student,
  Course,
  Activity,
  Submission,
  AttendanceSession,
  BehaviorRecord
} from '../types';

export const isFirestoreReady = (): boolean => {
  return Boolean(isFirebaseConfigured && db);
};

// ================= SANITIZACIÓN PARA EVITAR ERRORES DE UNDEFINED EN FIRESTORE =================
export const cleanForFirestore = <T extends Record<string, any>>(obj: T): T => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(item => cleanForFirestore(item)) as any;
  }
  const cleaned: any = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val !== undefined) {
      if (val !== null && typeof val === 'object' && !(val instanceof Date)) {
        cleaned[key] = cleanForFirestore(val);
      } else {
        cleaned[key] = val;
      }
    }
  }
  return cleaned;
};

// ================= PERFIL DE PROFESOR =================
export const saveTeacherProfileFirestore = async (profile: TeacherProfile): Promise<void> => {
  if (!isFirestoreReady()) return;
  try {
    const docRef = doc(db, 'teachers', profile.uid);
    const cleaned = cleanForFirestore(profile);
    await setDoc(docRef, cleaned, { merge: true });
  } catch (error) {
    console.error('Error guardando perfil en Firestore:', error);
  }
};

export const getTeacherProfileFirestore = async (uid: string): Promise<TeacherProfile | null> => {
  if (!isFirestoreReady()) return null;
  try {
    const docRef = doc(db, 'teachers', uid);
    // 1. Intentar leer de caché local IndexedDB primero para respuesta inmediata (offline)
    try {
      const cacheSnap = await getDocFromCache(docRef);
      if (cacheSnap.exists()) {
        return cacheSnap.data() as TeacherProfile;
      }
    } catch {
      // no disponible en cache local
    }

    // 2. Si hay conexión a internet, intentar leer con timeout máximo de 1.5s para no bloquear
    if (navigator.onLine) {
      const fetchPromise = getDoc(docRef).then(snap => (snap.exists() ? (snap.data() as TeacherProfile) : null));
      const timeoutPromise = new Promise<null>(resolve => setTimeout(() => resolve(null), 1500));
      return await Promise.race([fetchPromise, timeoutPromise]);
    }
    return null;
  } catch (error) {
    console.warn('Error leyendo perfil de Firestore (modo offline):', error);
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
    const cleaned = cleanForFirestore(data);
    await setDoc(docRef, cleaned, { merge: true });
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
    // Firestore permite hasta 500 operaciones por batch
    const chunks = [];
    for (let i = 0; i < items.length; i += 400) {
      chunks.push(items.slice(i, i + 400));
    }

    for (const chunk of chunks) {
      const b = writeBatch(db);
      for (const item of chunk) {
        const ref = doc(db, collectionName, item.id);
        const cleaned = cleanForFirestore(item.data);
        b.set(ref, cleaned, { merge: true });
      }
      await b.commit();
    }
  } catch (error) {
    console.error(`Error en batchSaveFirestore para ${collectionName}:`, error);
    throw error;
  }
};

export const batchDeleteFirestore = async (
  collectionName: string,
  ids: string[]
): Promise<void> => {
  if (!isFirestoreReady() || ids.length === 0) return;
  try {
    const chunks = [];
    for (let i = 0; i < ids.length; i += 400) {
      chunks.push(ids.slice(i, i + 400));
    }

    for (const chunk of chunks) {
      const b = writeBatch(db);
      for (const id of chunk) {
        const ref = doc(db, collectionName, id);
        b.delete(ref);
      }
      await b.commit();
    }
  } catch (error) {
    console.error(`Error en batchDeleteFirestore para ${collectionName}:`, error);
    throw error;
  }
};

export const deleteStudentsByCourse = async (
  courseId: string,
  teacherId: string
): Promise<number> => {
  if (!isFirestoreReady()) return 0;
  try {
    const q = query(
      collection(db, 'students'),
      where('teacherId', '==', teacherId),
      where('courseId', '==', courseId)
    );
    const snap = await getDocs(q);
    const ids = snap.docs.map(d => d.id);
    if (ids.length > 0) {
      await batchDeleteFirestore('students', ids);
    }
    return ids.length;
  } catch (error) {
    console.error(`Error eliminando estudiantes del curso ${courseId}:`, error);
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

// ================= CONSULTAS PÚBLICAS PARA EL PORTAL ESTUDIANTE =================
export const fetchStudentByCode = async (rawCode: string): Promise<Student | null> => {
  if (!isFirestoreReady()) return null;
  try {
    const cleanCode = rawCode.trim().toUpperCase().replace(/^AC:/, '');
    if (!cleanCode) return null;

    // 1. Buscar primero por uniqueCode
    const qCode = query(
      collection(db, 'students'),
      where('uniqueCode', '==', cleanCode)
    );
    let snap = await getDocs(qCode);

    // 2. Si no encontró por código único, intentar por documentNumber
    if (snap.empty) {
      const qDoc = query(
        collection(db, 'students'),
        where('documentNumber', '==', rawCode.trim())
      );
      snap = await getDocs(qDoc);
    }

    if (!snap.empty) {
      const docData = snap.docs[0].data();
      return { id: snap.docs[0].id, ...docData } as Student;
    }
    return null;
  } catch (err) {
    console.error('Error buscando estudiante por código único:', err);
    return null;
  }
};

export interface StudentPortalData {
  student: Student;
  course: Course | null;
  teacher: TeacherProfile | null;
  activities: Activity[];
  submissions: Submission[];
  attendanceSessions: AttendanceSession[];
  behaviorRecords: BehaviorRecord[];
}

export const fetchStudentPortalData = async (student: Student): Promise<StudentPortalData> => {
  let course: Course | null = null;
  let teacher: TeacherProfile | null = null;
  let activities: Activity[] = [];
  let submissions: Submission[] = [];
  let attendanceSessions: AttendanceSession[] = [];
  let behaviorRecords: BehaviorRecord[] = [];

  if (!isFirestoreReady()) {
    return { student, course, teacher, activities, submissions, attendanceSessions, behaviorRecords };
  }

  try {
    // 1. Obtener curso si existe
    let teacherUid = (student as any).teacherId;

    if (student.courseId) {
      const courseDoc = await getDoc(doc(db, 'courses', student.courseId));
      if (courseDoc.exists()) {
        course = { id: courseDoc.id, ...courseDoc.data() } as Course;
        if (course.teacherId) {
          teacherUid = course.teacherId;
        }
      }
    }

    // Obtener perfil del profesor
    if (teacherUid) {
      try {
        const teacherDoc = await getDoc(doc(db, 'teachers', teacherUid));
        if (teacherDoc.exists()) {
          teacher = { uid: teacherDoc.id, ...teacherDoc.data() } as TeacherProfile;
        }
      } catch (tErr) {
        console.warn('No se pudo cargar el perfil del docente en el portal:', tErr);
      }
    }

    // Si el curso tiene institución por defecto o vacía pero el profesor tiene institución definida, sincronizar
    if (course && teacher?.institution) {
      if (!course.institution || course.institution === 'Colegio Integrado San Juan Bautista' || course.institution === 'Institución Educativa') {
        course.institution = teacher.institution;
      }
    }

    if (student.courseId) {
      // 2. Actividades del curso
      const actQuery = query(
        collection(db, 'activities'),
        where('courseId', '==', student.courseId)
      );
      const actSnap = await getDocs(actQuery);
      activities = actSnap.docs.map(d => ({ id: d.id, ...d.data() } as Activity));

      // 3. Sesiones de asistencia del curso
      const attQuery = query(
        collection(db, 'attendanceSessions'),
        where('courseId', '==', student.courseId)
      );
      const attSnap = await getDocs(attQuery);
      attendanceSessions = attSnap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceSession));
    }

    // 4. Entregas del estudiante
    const subQuery = query(
      collection(db, 'submissions'),
      where('studentId', '==', student.id)
    );
    const subSnap = await getDocs(subQuery);
    submissions = subSnap.docs.map(d => ({ id: d.id, ...d.data() } as Submission));

    // 5. Registros de comportamiento
    const behQuery = query(
      collection(db, 'behaviorRecords'),
      where('studentId', '==', student.id)
    );
    const behSnap = await getDocs(behQuery);
    behaviorRecords = behSnap.docs.map(d => ({ id: d.id, ...d.data() } as BehaviorRecord));

  } catch (error) {
    console.error('Error cargando datos del portal del estudiante:', error);
  }

  return {
    student,
    course,
    teacher,
    activities,
    submissions,
    attendanceSessions,
    behaviorRecords
  };
};
