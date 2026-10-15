import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  writeBatch,
  Unsubscribe
} from 'firebase/firestore';
import { db, auth, isFirebaseConfigured } from './firebase';
import { cleanQRCode } from '../utils/codeGenerator';
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

/**
 * Elimina recursivamente todas las propiedades con valor `undefined` de un objeto o arreglo,
 * ya que Firestore rechaza fatalmente cualquier campo con valor `undefined`.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeForFirestore(item)) as unknown as T;
  }

  if (typeof data === 'object' && !(data instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        cleaned[key] = sanitizeForFirestore(value);
      }
    }
    return cleaned as T;
  }

  return data;
}

// ================= PERFIL DE PROFESOR =================
export const saveTeacherProfileFirestore = async (profile: TeacherProfile): Promise<void> => {
  if (!isFirestoreReady()) return;
  try {
    const docRef = doc(db, 'teachers', profile.uid);
    const sanitized = sanitizeForFirestore(profile);
    await setDoc(docRef, sanitized, { merge: true });
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
    const sanitized = sanitizeForFirestore(data);
    await setDoc(docRef, sanitized, { merge: true });
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
        const sanitized = sanitizeForFirestore(item.data);
        b.set(ref, sanitized, { merge: true });
      }
      await b.commit();
    }
    console.log(`✓ Lote de ${items.length} documentos guardado en Firestore (${collectionName})`);
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

// ================= CONSULTAS PÚBLICAS PARA EL PORTAL ESTUDIANTE =================
export const fetchStudentByCode = async (rawCode: string): Promise<Student | null> => {
  if (!isFirestoreReady()) return null;
  try {
    const cleanCode = cleanQRCode(rawCode).trim().toUpperCase();
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

    // 3. Si no encontró, intentar por ID directo
    if (snap.empty) {
      const docRef = doc(db, 'students', rawCode.trim());
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Student;
      }
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
  observations: StudentObservation[];
}

export const fetchStudentPortalData = async (student: Student): Promise<StudentPortalData> => {
  let course: Course | null = null;
  let teacher: TeacherProfile | null = null;
  let activities: Activity[] = [];
  let submissions: Submission[] = [];
  let attendanceSessions: AttendanceSession[] = [];
  let behaviorRecords: BehaviorRecord[] = [];
  let observations: StudentObservation[] = [];

  if (!isFirestoreReady()) {
    return { student, course, teacher, activities, submissions, attendanceSessions, behaviorRecords, observations };
  }

  try {
    let teacherUid = (student as any).teacherId;

    // 1. Obtener curso si existe
    if (student.courseId) {
      try {
        const courseDoc = await getDoc(doc(db, 'courses', student.courseId));
        if (courseDoc.exists()) {
          course = { id: courseDoc.id, ...courseDoc.data() } as Course;
          if (course.teacherId) {
            teacherUid = course.teacherId;
          }
        }
      } catch (cErr) {
        console.warn('Error cargando curso del estudiante:', cErr);
      }
    }

    // 2. Obtener perfil del profesor
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

    if (course && teacher?.institution) {
      if (!course.institution || course.institution === 'Colegio Integrado San Juan Bautista' || course.institution === 'Institución Educativa') {
        course.institution = teacher.institution;
      }
    }

    // 3. Actividades del curso
    if (student.courseId) {
      try {
        const actQuery = query(
          collection(db, 'activities'),
          where('courseId', '==', student.courseId)
        );
        const actSnap = await getDocs(actQuery);
        activities = actSnap.docs.map(d => ({ id: d.id, ...d.data() } as Activity));
      } catch (aErr) {
        console.warn('Error cargando actividades:', aErr);
      }

      // 4. Sesiones de asistencia del curso
      try {
        const attQuery = query(
          collection(db, 'attendanceSessions'),
          where('courseId', '==', student.courseId)
        );
        const attSnap = await getDocs(attQuery);
        attendanceSessions = attSnap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceSession));
      } catch (attErr) {
        console.warn('Error cargando asistencia:', attErr);
      }
    }

    // 5. Entregas del estudiante
    try {
      const subQuery = query(
        collection(db, 'submissions'),
        where('studentId', '==', student.id)
      );
      const subSnap = await getDocs(subQuery);
      submissions = subSnap.docs.map(d => ({ id: d.id, ...d.data() } as Submission));
    } catch (sErr) {
      console.warn('Error cargando calificaciones del estudiante:', sErr);
    }

    // 6. Registros de comportamiento
    try {
      const behQuery = query(
        collection(db, 'behaviorRecords'),
        where('studentId', '==', student.id)
      );
      const behSnap = await getDocs(behQuery);
      behaviorRecords = behSnap.docs.map(d => ({ id: d.id, ...d.data() } as BehaviorRecord));
    } catch (bErr) {
      console.warn('Error cargando comportamiento:', bErr);
    }

    // 7. Observaciones pedagógicas
    try {
      const obsQuery = query(
        collection(db, 'observations'),
        where('studentId', '==', student.id)
      );
      const obsSnap = await getDocs(obsQuery);
      observations = obsSnap.docs.map(d => ({ id: d.id, ...d.data() } as StudentObservation));
    } catch (oErr) {
      console.warn('Error cargando observaciones:', oErr);
    }

  } catch (error) {
    console.error('Error general cargando datos del portal del estudiante:', error);
  }

  return {
    student,
    course,
    teacher,
    activities,
    submissions,
    attendanceSessions,
    behaviorRecords,
    observations
  };
};
