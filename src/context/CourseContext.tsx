import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Course,
  Student,
  Activity,
  Submission,
  AttendanceSession,
  BehaviorRecord,
  StudentObservation,
  AttendanceStatus
} from '../types';
import { offlineStorage } from '../services/offlineStorage';
import { generateStudentCode } from '../utils/codeGenerator';
import { useAuth } from './AuthContext';
import {
  setFirestoreDoc,
  deleteFirestoreDoc,
  batchSaveFirestore,
  batchDeleteFirestore,
  deleteStudentsByCourse,
  cleanForFirestore,
  subscribeToCollection,
  isFirestoreReady
} from '../services/firestoreService';

interface CourseContextType {
  courses: Course[];
  activeCourse: Course | null;
  students: Student[];
  activities: Activity[];
  submissions: Submission[];
  attendanceSessions: AttendanceSession[];
  behaviorRecords: BehaviorRecord[];
  observations: StudentObservation[];
  isLoadingData: boolean;

  // Acciones Curso
  selectCourse: (courseId: string) => void;
  addCourse: (courseData: Omit<Course, 'id' | 'teacherId' | 'createdAt'>) => Course;
  updateCourse: (courseId: string, updates: Partial<Course>) => void;
  updateAllCoursesInstitution: (institutionName: string) => Promise<void>;
  deleteCourse: (courseId: string) => Promise<void>;

  // Acciones Estudiantes
  addStudent: (studentData: Omit<Student, 'id' | 'uniqueCode' | 'createdAt' | 'active'>) => Student;
  importStudents: (newStudentsList: { fullName: string; documentNumber?: string }[], replaceExisting?: boolean) => Promise<number>;
  clearCourseStudents: (courseId: string) => Promise<number>;
  updateStudent: (studentId: string, updates: Partial<Student>) => void;
  deleteStudent: (studentId: string) => Promise<void>;
  getStudentByCode: (code: string) => Student | undefined;
  getStudentById: (id: string) => Student | undefined;

  // Acciones Actividades y Notas
  addActivity: (activityData: Omit<Activity, 'id' | 'createdAt'>) => Activity;
  updateActivity: (activityId: string, updates: Partial<Activity>) => void;
  deleteActivity: (activityId: string) => void;
  recordSubmission: (
    activityId: string,
    studentId: string,
    status: Submission['status'],
    grade?: number | null,
    feedback?: string
  ) => void;

  // Acciones Asistencia
  recordAttendance: (date: string, studentId: string, status: AttendanceStatus, source?: 'qr' | 'manual') => void;
  getTodaySession: () => AttendanceSession | undefined;

  // Acciones Comportamiento y Observación
  addBehaviorRecord: (record: Omit<BehaviorRecord, 'id' | 'createdAt'>) => void;
  addObservation: (studentId: string, text: string) => void;
}

const CourseContext = createContext<CourseContextType | undefined>(undefined);

// Función para fusionar datos remotos con cambios locales pendientes en la cola offline
const mergeWithLocalPending = <T extends { id: string }>(
  remoteItems: T[],
  localItems: T[],
  collectionName: string
): T[] => {
  const syncQueue = offlineStorage.getSyncQueue().filter(q => q.collection === collectionName);
  const pendingIds = new Set(syncQueue.map(q => q.data?.id || (typeof q.data === 'string' ? q.data : '')));

  const map = new Map<string, T>();
  // 1. Añadir remotos
  remoteItems.forEach(item => map.set(item.id, item));

  // 2. Si hay locales que tienen cambios pendientes en la cola offline, prevalece la versión local
  localItems.forEach(localItem => {
    if (pendingIds.has(localItem.id)) {
      map.set(localItem.id, localItem);
      return;
    }
    // Si no está en remoto pero existe localmente, conservarlo
    if (!map.has(localItem.id)) {
      map.set(localItem.id, localItem);
    }
  });

  return Array.from(map.values());
};

export const CourseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);

  // Estados locales reales inicializados directamente desde la caché local para disponibilidad offline instantánea
  const [courses, setCourses] = useState<Course[]>(() => {
    const uid = currentUser?.uid;
    return uid ? offlineStorage.getLocal<Course[]>(`courses_${uid}`, []) : [];
  });
  const [activeCourseId, setActiveCourseId] = useState<string>(() => {
    const uid = currentUser?.uid;
    return uid ? offlineStorage.getLocal<string>(`activeCourseId_${uid}`, '') : '';
  });
  const [students, setStudents] = useState<Student[]>(() => {
    const uid = currentUser?.uid;
    return uid ? offlineStorage.getLocal<Student[]>(`students_${uid}`, []) : [];
  });
  const [activities, setActivities] = useState<Activity[]>(() => {
    const uid = currentUser?.uid;
    return uid ? offlineStorage.getLocal<Activity[]>(`activities_${uid}`, []) : [];
  });
  const [submissions, setSubmissions] = useState<Submission[]>(() => {
    const uid = currentUser?.uid;
    return uid ? offlineStorage.getLocal<Submission[]>(`submissions_${uid}`, []) : [];
  });
  const [attendanceSessions, setAttendanceSessions] = useState<AttendanceSession[]>(() => {
    const uid = currentUser?.uid;
    return uid ? offlineStorage.getLocal<AttendanceSession[]>(`attendanceSessions_${uid}`, []) : [];
  });
  const [behaviorRecords, setBehaviorRecords] = useState<BehaviorRecord[]>(() => {
    const uid = currentUser?.uid;
    return uid ? offlineStorage.getLocal<BehaviorRecord[]>(`behaviorRecords_${uid}`, []) : [];
  });
  const [observations, setObservations] = useState<StudentObservation[]>(() => {
    const uid = currentUser?.uid;
    return uid ? offlineStorage.getLocal<StudentObservation[]>(`observations_${uid}`, []) : [];
  });

  // Sincronización en tiempo real con Firestore cuando el docente está autenticado
  useEffect(() => {
    if (currentUser?.uid && isFirestoreReady()) {
      setIsLoadingData(true);
      const uid = currentUser.uid;

      // Cargar caché local específica del docente si existe
      const cachedCourses = offlineStorage.getLocal<Course[]>(`courses_${uid}`, []);
      const cachedStudents = offlineStorage.getLocal<Student[]>(`students_${uid}`, []);
      const cachedActs = offlineStorage.getLocal<Activity[]>(`activities_${uid}`, []);
      const cachedSubs = offlineStorage.getLocal<Submission[]>(`submissions_${uid}`, []);
      const cachedAtt = offlineStorage.getLocal<AttendanceSession[]>(`attendanceSessions_${uid}`, []);
      const cachedBeh = offlineStorage.getLocal<BehaviorRecord[]>(`behaviorRecords_${uid}`, []);
      const cachedObs = offlineStorage.getLocal<StudentObservation[]>(`observations_${uid}`, []);

      if (cachedCourses.length > 0) {
        setCourses(prev => (prev.length > 0 ? prev : cachedCourses));
        setActiveCourseId(prev => prev || cachedCourses[0].id);
      }
      if (cachedStudents.length > 0) setStudents(prev => (prev.length > 0 ? prev : cachedStudents));
      if (cachedActs.length > 0) setActivities(prev => (prev.length > 0 ? prev : cachedActs));
      if (cachedSubs.length > 0) setSubmissions(prev => (prev.length > 0 ? prev : cachedSubs));
      if (cachedAtt.length > 0) setAttendanceSessions(prev => (prev.length > 0 ? prev : cachedAtt));
      if (cachedBeh.length > 0) setBehaviorRecords(prev => (prev.length > 0 ? prev : cachedBeh));
      if (cachedObs.length > 0) setObservations(prev => (prev.length > 0 ? prev : cachedObs));

      // Suscripciones Firestore con fusión inteligente de cambios locales pendientes
      const unsubCourses = subscribeToCollection<Course>('courses', uid, (remoteCourses) => {
        setCourses(prev => {
          const merged = mergeWithLocalPending(remoteCourses, prev, 'courses');
          if (merged.length > 0) {
            setActiveCourseId(curr => (merged.some(c => c.id === curr) ? curr : merged[0].id));
          } else {
            setActiveCourseId('');
          }
          return merged;
        });
      });

      const unsubStudents = subscribeToCollection<Student>('students', uid, (remoteStudents) => {
        setStudents(prev => mergeWithLocalPending(remoteStudents, prev, 'students'));
      });

      const unsubActivities = subscribeToCollection<Activity>('activities', uid, (remoteActs) => {
        setActivities(prev => mergeWithLocalPending(remoteActs, prev, 'activities'));
      });

      const unsubSubmissions = subscribeToCollection<Submission>('submissions', uid, (remoteSubs) => {
        setSubmissions(prev => mergeWithLocalPending(remoteSubs, prev, 'submissions'));
      });

      const unsubAttendance = subscribeToCollection<AttendanceSession>('attendanceSessions', uid, (remoteAtt) => {
        setAttendanceSessions(prev => mergeWithLocalPending(remoteAtt, prev, 'attendanceSessions'));
      });

      const unsubBehaviors = subscribeToCollection<BehaviorRecord>('behaviorRecords', uid, (remoteBeh) => {
        setBehaviorRecords(prev => mergeWithLocalPending(remoteBeh, prev, 'behaviorRecords'));
      });

      const unsubObservations = subscribeToCollection<StudentObservation>('observations', uid, (remoteObs) => {
        setObservations(prev => mergeWithLocalPending(remoteObs, prev, 'observations'));
        setIsLoadingData(false);
      });

      return () => {
        unsubCourses();
        unsubStudents();
        unsubActivities();
        unsubSubmissions();
        unsubAttendance();
        unsubBehaviors();
        unsubObservations();
      };
    } else if (!currentUser?.uid) {
      // Sin sesión activa -> Limpiar todo
      setCourses([]);
      setActiveCourseId('');
      setStudents([]);
      setActivities([]);
      setSubmissions([]);
      setAttendanceSessions([]);
      setBehaviorRecords([]);
      setObservations([]);
      setIsLoadingData(false);
    }
  }, [currentUser?.uid]);

  // Persistir cambios en caché local para soporte offline total ante cierre de la app
  useEffect(() => {
    if (currentUser?.uid) {
      offlineStorage.saveLocal(`courses_${currentUser.uid}`, courses);
    }
  }, [courses, currentUser?.uid]);

  useEffect(() => {
    if (currentUser?.uid) {
      offlineStorage.saveLocal(`activeCourseId_${currentUser.uid}`, activeCourseId);
    }
  }, [activeCourseId, currentUser?.uid]);

  useEffect(() => {
    if (currentUser?.uid) {
      offlineStorage.saveLocal(`students_${currentUser.uid}`, students);
    }
  }, [students, currentUser?.uid]);

  useEffect(() => {
    if (currentUser?.uid) {
      offlineStorage.saveLocal(`activities_${currentUser.uid}`, activities);
    }
  }, [activities, currentUser?.uid]);

  useEffect(() => {
    if (currentUser?.uid) {
      offlineStorage.saveLocal(`submissions_${currentUser.uid}`, submissions);
    }
  }, [submissions, currentUser?.uid]);

  useEffect(() => {
    if (currentUser?.uid) {
      offlineStorage.saveLocal(`attendanceSessions_${currentUser.uid}`, attendanceSessions);
    }
  }, [attendanceSessions, currentUser?.uid]);

  useEffect(() => {
    if (currentUser?.uid) {
      offlineStorage.saveLocal(`behaviorRecords_${currentUser.uid}`, behaviorRecords);
    }
  }, [behaviorRecords, currentUser?.uid]);

  useEffect(() => {
    if (currentUser?.uid) {
      offlineStorage.saveLocal(`observations_${currentUser.uid}`, observations);
    }
  }, [observations, currentUser?.uid]);

  const activeCourse = courses.find(c => c.id === activeCourseId) || courses[0] || null;

  // Filtrar estudiantes por curso activo
  const activeStudents = students
    .filter(s => s.courseId === activeCourse?.id && s.active)
    .sort((a, b) => a.listNumber - b.listNumber);

  // Filtrar actividades por curso activo
  const activeActivities = activities.filter(a => a.courseId === activeCourse?.id);

  // Filtrar entregas por curso activo
  const activeSubmissions = submissions.filter(s => s.courseId === activeCourse?.id);

  // Filtrar asistencias por curso activo
  const activeAttendanceSessions = attendanceSessions.filter(s => s.courseId === activeCourse?.id);

  // Filtrar comportamientos por curso activo
  const activeBehaviors = behaviorRecords.filter(b => b.courseId === activeCourse?.id);

  const selectCourse = (courseId: string) => {
    setActiveCourseId(courseId);
  };

  const addCourse = (courseData: Omit<Course, 'id' | 'teacherId' | 'createdAt'>): Course => {
    if (!currentUser?.uid) throw new Error('Debes iniciar sesión para crear un curso');
    const teacherId = currentUser.uid;
    const newCourse: Course = {
      ...courseData,
      id: `course_${Date.now()}`,
      teacherId,
      studentCount: 0,
      createdAt: new Date().toISOString()
    };
    setCourses(prev => [...prev, newCourse]);
    setActiveCourseId(newCourse.id);

    setFirestoreDoc('courses', newCourse.id, newCourse).catch(err => {
      console.warn('Error al guardar curso en Firestore, encolado offline:', err);
      offlineStorage.addToSyncQueue({ action: 'create', collection: 'courses', data: newCourse });
    });
    return newCourse;
  };

  const updateCourse = (courseId: string, updates: Partial<Course>) => {
    if (!currentUser?.uid) return;
    const updatedPayload = { ...updates, updatedAt: new Date().toISOString() };
    setCourses(prev => prev.map(c => (c.id === courseId ? { ...c, ...updatedPayload } : c)));

    setFirestoreDoc('courses', courseId, updatedPayload).catch(err => {
      console.warn('Error al actualizar curso en Firestore, encolado offline:', err);
      offlineStorage.addToSyncQueue({ action: 'update', collection: 'courses', data: { id: courseId, ...updatedPayload } });
    });
  };

  const updateAllCoursesInstitution = async (institutionName: string) => {
    if (!currentUser?.uid || courses.length === 0) return;
    const cleanInst = institutionName.trim();
    if (!cleanInst) return;

    setCourses(prev => prev.map(c => ({ ...c, institution: cleanInst })));
    for (const c of courses) {
      try {
        await setFirestoreDoc('courses', c.id, { institution: cleanInst, updatedAt: new Date().toISOString() });
      } catch (err) {
        console.warn(`Error actualizando institución para curso ${c.id}:`, err);
        offlineStorage.addToSyncQueue({
          action: 'update',
          collection: 'courses',
          data: { id: c.id, institution: cleanInst }
        });
      }
    }
  };

  const deleteCourse = async (courseId: string) => {
    if (!currentUser?.uid) return;
    setCourses(prev => prev.filter(c => c.id !== courseId));
    setStudents(prev => prev.filter(s => s.courseId !== courseId));
    if (activeCourseId === courseId) {
      const remaining = courses.filter(c => c.id !== courseId);
      if (remaining.length > 0) setActiveCourseId(remaining[0].id);
      else setActiveCourseId('');
    }

    try {
      await deleteFirestoreDoc('courses', courseId);
      await deleteStudentsByCourse(courseId, currentUser.uid);
    } catch (err) {
      console.warn('Error al eliminar curso en Firestore, encolado offline:', err);
      offlineStorage.addToSyncQueue({ action: 'delete', collection: 'courses', data: { id: courseId } });
    }
  };

  const clearCourseStudents = async (courseId: string): Promise<number> => {
    if (!currentUser?.uid) return 0;
    try {
      const deletedCount = await deleteStudentsByCourse(courseId, currentUser.uid);
      setStudents(prev => prev.filter(s => s.courseId !== courseId));
      updateCourse(courseId, { studentCount: 0 });
      return deletedCount;
    } catch (err) {
      console.error('Error vaciando estudiantes del curso en Firestore:', err);
      throw err;
    }
  };

  const addStudent = (studentData: Omit<Student, 'id' | 'uniqueCode' | 'createdAt' | 'active'>): Student => {
    if (!currentUser?.uid) throw new Error('Debes iniciar sesión para registrar estudiantes');
    const teacherId = currentUser.uid;
    const existingCodes = new Set(students.map(s => s.uniqueCode));
    const uniqueCode = generateStudentCode(existingCodes);
    const newStudent: Student = {
      ...studentData,
      id: `std_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      uniqueCode,
      active: true,
      createdAt: new Date().toISOString()
    };
    if (!studentData.documentNumber?.trim()) {
      delete (newStudent as any).documentNumber;
    }
    setStudents(prev => [...prev, newStudent]);

    const payload = cleanForFirestore({ ...newStudent, teacherId });
    setFirestoreDoc('students', newStudent.id, payload).catch(err => {
      console.warn('Error guardando estudiante en Firestore:', err);
      offlineStorage.addToSyncQueue({ action: 'create', collection: 'students', data: payload });
    });
    return newStudent;
  };

  const importStudents = async (
    newStudentsList: { fullName: string; documentNumber?: string }[],
    replaceExisting: boolean = false
  ): Promise<number> => {
    if (!activeCourse || !currentUser?.uid) return 0;
    const teacherId = currentUser.uid;

    if (replaceExisting) {
      await deleteStudentsByCourse(activeCourse.id, teacherId);
      setStudents(prev => prev.filter(s => s.courseId !== activeCourse.id));
    }

    const currentStudentsInCourse = replaceExisting
      ? []
      : students.filter(s => s.courseId === activeCourse.id && s.active);

    const existingCodes = new Set(students.map(s => s.uniqueCode));
    const currentMaxListNum = currentStudentsInCourse.reduce((max, s) => Math.max(max, s.listNumber), 0);

    const createdList: Student[] = newStudentsList.map((item, index) => {
      const uniqueCode = generateStudentCode(existingCodes);
      existingCodes.add(uniqueCode);
      const studentObj: Student = {
        id: `std_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 4)}`,
        courseId: activeCourse.id,
        listNumber: currentMaxListNum + index + 1,
        fullName: item.fullName.trim(),
        uniqueCode,
        active: true,
        createdAt: new Date().toISOString()
      };
      if (item.documentNumber && item.documentNumber.trim()) {
        studentObj.documentNumber = item.documentNumber.trim();
      }
      return studentObj;
    });

    if (replaceExisting) {
      setStudents(prev => [...prev.filter(s => s.courseId !== activeCourse.id), ...createdList]);
    } else {
      setStudents(prev => [...prev, ...createdList]);
    }

    const newTotal = replaceExisting ? createdList.length : (activeCourse.studentCount || 0) + createdList.length;
    updateCourse(activeCourse.id, { studentCount: newTotal });

    // Guardar por lotes en Firestore
    await batchSaveFirestore(
      'students',
      createdList.map(s => ({
        id: s.id,
        data: cleanForFirestore({ ...s, teacherId })
      }))
    );

    return createdList.length;
  };

  const updateStudent = (studentId: string, updates: Partial<Student>) => {
    if (!currentUser?.uid) return;
    setStudents(prev => prev.map(s => (s.id === studentId ? { ...s, ...updates } : s)));
    const payload = cleanForFirestore(updates);
    setFirestoreDoc('students', studentId, payload).catch(err => {
      console.warn('Error actualizando estudiante en Firestore:', err);
      offlineStorage.addToSyncQueue({ action: 'update', collection: 'students', data: { id: studentId, ...updates } });
    });
  };

  const deleteStudent = async (studentId: string) => {
    if (!currentUser?.uid) return;
    setStudents(prev => prev.filter(s => s.id !== studentId));
    if (activeCourse) {
      updateCourse(activeCourse.id, {
        studentCount: Math.max(0, (activeCourse.studentCount || 1) - 1)
      });
    }
    try {
      await deleteFirestoreDoc('students', studentId);
    } catch (err) {
      console.warn('Error eliminando estudiante en Firestore:', err);
      offlineStorage.addToSyncQueue({ action: 'delete', collection: 'students', data: { id: studentId } });
    }
  };

  const getStudentByCode = (code: string): Student | undefined => {
    const target = code.trim().toUpperCase();
    return activeStudents.find(s => s.uniqueCode.toUpperCase() === target);
  };

  const getStudentById = (id: string): Student | undefined => {
    return students.find(s => s.id === id);
  };

  const addActivity = (activityData: Omit<Activity, 'id' | 'createdAt'>): Activity => {
    if (!currentUser?.uid) throw new Error('Debes iniciar sesión para crear actividades');
    const teacherId = currentUser.uid;
    const newAct: Activity = {
      ...activityData,
      id: `act_${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    setActivities(prev => [...prev, newAct]);

    const payload = { ...newAct, teacherId };
    setFirestoreDoc('activities', newAct.id, payload).catch(err => {
      console.warn('Error guardando actividad en Firestore:', err);
      offlineStorage.addToSyncQueue({ action: 'create', collection: 'activities', data: payload });
    });
    return newAct;
  };

  const updateActivity = (activityId: string, updates: Partial<Activity>) => {
    if (!currentUser?.uid) return;
    setActivities(prev => prev.map(a => (a.id === activityId ? { ...a, ...updates } : a)));
    setFirestoreDoc('activities', activityId, updates).catch(err => {
      console.warn('Error actualizando actividad en Firestore:', err);
      offlineStorage.addToSyncQueue({ action: 'update', collection: 'activities', data: { id: activityId, ...updates } });
    });
  };

  const deleteActivity = (activityId: string) => {
    if (!currentUser?.uid) return;
    setActivities(prev => prev.filter(a => a.id !== activityId));
    deleteFirestoreDoc('activities', activityId).catch(err => {
      console.warn('Error eliminando actividad en Firestore:', err);
      offlineStorage.addToSyncQueue({ action: 'delete', collection: 'activities', data: { id: activityId } });
    });
  };

  const recordSubmission = (
    activityId: string,
    studentId: string,
    status: Submission['status'],
    grade?: number | null,
    feedback?: string
  ) => {
    if (!activeCourse || !currentUser?.uid) return;
    const teacherId = currentUser.uid;

    setSubmissions(prev => {
      const existingIdx = prev.findIndex(s => s.activityId === activityId && s.studentId === studentId);
      const updatedItem: Submission = {
        id: existingIdx >= 0 ? prev[existingIdx].id : `sub_${studentId}_${activityId}`,
        activityId,
        studentId,
        courseId: activeCourse.id,
        status,
        grade: grade !== undefined ? grade : existingIdx >= 0 ? prev[existingIdx].grade : null,
        feedback: feedback !== undefined ? feedback : existingIdx >= 0 ? prev[existingIdx].feedback : '',
        submittedAt: new Date().toISOString()
      };

      setFirestoreDoc('submissions', updatedItem.id, { ...updatedItem, teacherId }).catch(err => {
        console.warn('Error guardando entrega en Firestore:', err);
        offlineStorage.addToSyncQueue({ action: 'update', collection: 'submissions', data: { ...updatedItem, teacherId } });
      });

      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx] = updatedItem;
        return copy;
      }
      return [...prev, updatedItem];
    });
  };

  const recordAttendance = (
    date: string,
    studentId: string,
    status: AttendanceStatus,
    source: 'qr' | 'manual' = 'manual'
  ) => {
    if (!activeCourse || !currentUser?.uid) return;
    const teacherId = currentUser.uid;

    setAttendanceSessions(prev => {
      const sessionIdx = prev.findIndex(s => s.courseId === activeCourse.id && s.date === date);
      let session: AttendanceSession;

      if (sessionIdx >= 0) {
        session = { ...prev[sessionIdx] };
      } else {
        session = {
          id: `att_${activeCourse.id}_${date}`,
          courseId: activeCourse.id,
          date,
          period: activeCourse.currentPeriod,
          records: {},
          summary: { present: 0, absent: 0, late: 0, excused: 0, total: activeStudents.length },
          createdAt: new Date().toISOString()
        };
      }

      session.records = {
        ...session.records,
        [studentId]: {
          studentId,
          status,
          timestamp: new Date().toISOString(),
          source
        }
      };

      // Recalcular resumen
      let present = 0,
        absent = 0,
        late = 0,
        excused = 0;
      Object.values(session.records).forEach(r => {
        if (r.status === 'present') present++;
        else if (r.status === 'absent') absent++;
        else if (r.status === 'late') late++;
        else if (r.status === 'excused') excused++;
      });

      session.summary = {
        present,
        absent,
        late,
        excused,
        total: activeStudents.length
      };

      session.updatedAt = new Date().toISOString();

      setFirestoreDoc('attendanceSessions', session.id, { ...session, teacherId }).catch(err => {
        console.warn('Error guardando asistencia en Firestore:', err);
        offlineStorage.addToSyncQueue({ action: 'update', collection: 'attendanceSessions', data: { ...session, teacherId } });
      });

      if (sessionIdx >= 0) {
        const copy = [...prev];
        copy[sessionIdx] = session;
        return copy;
      }
      return [...prev, session];
    });
  };

  const getTodaySession = (): AttendanceSession | undefined => {
    if (!activeCourse) return undefined;
    const today = new Date().toISOString().split('T')[0];
    return activeAttendanceSessions.find(s => s.date === today);
  };

  const addBehaviorRecord = (record: Omit<BehaviorRecord, 'id' | 'createdAt'>) => {
    if (!currentUser?.uid) return;
    const teacherId = currentUser.uid;
    const newRecord: BehaviorRecord = {
      ...record,
      id: `beh_${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    setBehaviorRecords(prev => [newRecord, ...prev]);

    setFirestoreDoc('behaviorRecords', newRecord.id, { ...newRecord, teacherId }).catch(err => {
      console.warn('Error guardando comportamiento en Firestore:', err);
      offlineStorage.addToSyncQueue({ action: 'create', collection: 'behaviorRecords', data: { ...newRecord, teacherId } });
    });
  };

  const addObservation = (studentId: string, text: string) => {
    if (!activeCourse || !currentUser?.uid) return;
    const teacherId = currentUser.uid;
    const newObs: StudentObservation = {
      id: `obs_${Date.now()}`,
      courseId: activeCourse.id,
      studentId,
      date: new Date().toISOString().split('T')[0],
      text,
      createdAt: new Date().toISOString()
    };
    setObservations(prev => [newObs, ...prev]);

    setFirestoreDoc('observations', newObs.id, { ...newObs, teacherId }).catch(err => {
      console.warn('Error guardando observación en Firestore:', err);
      offlineStorage.addToSyncQueue({ action: 'create', collection: 'observations', data: { ...newObs, teacherId } });
    });
  };

  return (
    <CourseContext.Provider
      value={{
        courses,
        activeCourse,
        students: activeStudents,
        activities: activeActivities,
        submissions: activeSubmissions,
        attendanceSessions: activeAttendanceSessions,
        behaviorRecords: activeBehaviors,
        observations,
        isLoadingData,
        selectCourse,
        addCourse,
        updateCourse,
        updateAllCoursesInstitution,
        deleteCourse,
        addStudent,
        importStudents,
        clearCourseStudents,
        updateStudent,
        deleteStudent,
        getStudentByCode,
        getStudentById,
        addActivity,
        updateActivity,
        deleteActivity,
        recordSubmission,
        recordAttendance,
        getTodaySession,
        addBehaviorRecord,
        addObservation
      }}
    >
      {children}
    </CourseContext.Provider>
  );
};

export const useCourse = () => {
  const context = useContext(CourseContext);
  if (!context) throw new Error('useCourse debe ser usado dentro de CourseProvider');
  return context;
};
