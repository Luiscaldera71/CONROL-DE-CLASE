import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Course, Student, Activity, Submission, AttendanceSession, BehaviorRecord, StudentObservation, AttendanceStatus } from '../types';
import { DEMO_COURSES, DEMO_STUDENTS, DEMO_ACTIVITIES, DEMO_SUBMISSIONS, DEMO_ATTENDANCE_SESSIONS, DEMO_BEHAVIORS } from '../services/mockData';
import { offlineStorage } from '../services/offlineStorage';
import { generateStudentCode, cleanQRCode } from '../utils/codeGenerator';
import { getLocalDateString, getColombiaDateString, getDayNameFromDateString } from '../utils/dateUtils';
import { getAttendanceAccess, filterClassDaySessions } from '../utils/attendanceUtils';
import { useAuth } from './AuthContext';
import {
  setFirestoreDoc,
  deleteFirestoreDoc,
  batchSaveFirestore,
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
  deleteCourse: (courseId: string) => void;

  // Acciones Estudiantes
  addStudent: (studentData: Omit<Student, 'id' | 'uniqueCode' | 'createdAt' | 'active'>) => Student;
  importStudents: (newStudentsList: { fullName: string; documentNumber?: string }[]) => number;
  updateStudent: (studentId: string, updates: Partial<Student>) => void;
  deleteStudent: (studentId: string) => void;
  getStudentByCode: (code: string) => Student | undefined;
  getStudentById: (id: string) => Student | undefined;

  // Acciones Actividades y Notas
  addActivity: (activityData: Omit<Activity, 'id' | 'createdAt'>) => Activity;
  updateActivity: (activityId: string, updates: Partial<Activity>) => void;
  deleteActivity: (activityId: string) => void;
  recordSubmission: (activityId: string, studentId: string, status: Submission['status'], grade?: number | null, feedback?: string) => void;

  // Acciones Asistencia
  recordAttendance: (date: string, studentId: string, status: AttendanceStatus, source?: 'qr' | 'manual') => boolean;
  recordAttendanceBulk: (date: string, entries: { studentId: string; status: AttendanceStatus }[], source?: 'qr' | 'manual', courseId?: string) => boolean;
  getTodaySession: () => AttendanceSession | undefined;

  // Acciones Comportamiento y Observación
  addBehaviorRecord: (record: Omit<BehaviorRecord, 'id' | 'createdAt'>) => void;
  addObservation: (studentId: string, text: string) => void;

  // Reset y eliminación de datos
  clearAllData: () => void;
  resetToDemoData: () => void;
  seedDemoToFirestore: () => Promise<void>;
}

const CourseContext = createContext<CourseContextType | undefined>(undefined);

export const CourseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isDemoMode, teacherProfile } = useAuth();
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);

  // Estados locales iniciales (por defecto vacíos para no cargar demo forzada)
  const [courses, setCourses] = useState<Course[]>(() =>
    offlineStorage.getLocal('courses', [])
  );

  const [activeCourseId, setActiveCourseId] = useState<string>(() =>
    offlineStorage.getLocal('activeCourseId', '')
  );

  const [students, setStudents] = useState<Student[]>(() =>
    offlineStorage.getLocal('students', [])
  );

  const [activities, setActivities] = useState<Activity[]>(() =>
    offlineStorage.getLocal('activities', [])
  );

  const [submissions, setSubmissions] = useState<Submission[]>(() =>
    offlineStorage.getLocal('submissions', [])
  );

  const [attendanceSessions, setAttendanceSessions] = useState<AttendanceSession[]>(() =>
    offlineStorage.getLocal('attendanceSessions', [])
  );

  const [behaviorRecords, setBehaviorRecords] = useState<BehaviorRecord[]>(() =>
    offlineStorage.getLocal('behaviorRecords', [])
  );

  const [observations, setObservations] = useState<StudentObservation[]>(() =>
    offlineStorage.getLocal('observations', [])
  );

  // Sincronización en tiempo real con Firestore cuando el usuario esté autenticado
  useEffect(() => {
    if (!isDemoMode && currentUser?.uid && isFirestoreReady()) {
      setIsLoadingData(true);
      const uid = currentUser.uid;

      const unsubCourses = subscribeToCollection<Course>('courses', uid, (remoteCourses) => {
        setCourses(remoteCourses);
        offlineStorage.saveLocal('courses', remoteCourses);
        if (remoteCourses.length > 0 && !remoteCourses.some(c => c.id === activeCourseId)) {
          setActiveCourseId(remoteCourses[0].id);
        }
      });

      const unsubStudents = subscribeToCollection<Student>('students', uid, (remoteStudents) => {
        setStudents(remoteStudents);
        offlineStorage.saveLocal('students', remoteStudents);
      });

      const unsubActivities = subscribeToCollection<Activity>('activities', uid, (remoteActs) => {
        setActivities(remoteActs);
        offlineStorage.saveLocal('activities', remoteActs);
      });

      const unsubSubmissions = subscribeToCollection<Submission>('submissions', uid, (remoteSubs) => {
        setSubmissions(remoteSubs);
        offlineStorage.saveLocal('submissions', remoteSubs);
      });

      const unsubAttendance = subscribeToCollection<AttendanceSession>('attendanceSessions', uid, (remoteAtt) => {
        setAttendanceSessions(remoteAtt);
        offlineStorage.saveLocal('attendanceSessions', remoteAtt);
      });

      const unsubBehaviors = subscribeToCollection<BehaviorRecord>('behaviorRecords', uid, (remoteBeh) => {
        setBehaviorRecords(remoteBeh);
        offlineStorage.saveLocal('behaviorRecords', remoteBeh);
      });

      const unsubObservations = subscribeToCollection<StudentObservation>('observations', uid, (remoteObs) => {
        setObservations(remoteObs);
        offlineStorage.saveLocal('observations', remoteObs);
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
    } else {
      // Cargar caché local (vacío por defecto si es usuario nuevo)
      setCourses(offlineStorage.getLocal('courses', []));
      setStudents(offlineStorage.getLocal('students', []));
      setActivities(offlineStorage.getLocal('activities', []));
      setSubmissions(offlineStorage.getLocal('submissions', []));
      setAttendanceSessions(offlineStorage.getLocal('attendanceSessions', []));
      setBehaviorRecords(offlineStorage.getLocal('behaviorRecords', []));
      setIsLoadingData(false);
    }
  }, [currentUser?.uid, isDemoMode]);

  // Persistir cambios en caché local para soporte offline
  useEffect(() => { offlineStorage.saveLocal('courses', courses); }, [courses]);
  useEffect(() => { offlineStorage.saveLocal('activeCourseId', activeCourseId); }, [activeCourseId]);
  useEffect(() => { offlineStorage.saveLocal('students', students); }, [students]);
  useEffect(() => { offlineStorage.saveLocal('activities', activities); }, [activities]);
  useEffect(() => { offlineStorage.saveLocal('submissions', submissions); }, [submissions]);
  useEffect(() => { offlineStorage.saveLocal('attendanceSessions', attendanceSessions); }, [attendanceSessions]);
  useEffect(() => { offlineStorage.saveLocal('behaviorRecords', behaviorRecords); }, [behaviorRecords]);
  useEffect(() => { offlineStorage.saveLocal('observations', observations); }, [observations]);

  // Regla del sistema: Si se pasa la fecha límite (dueDate) y la actividad está pendiente o sin entrega,
  // automáticamente se pasa a 'not_delivered' con nota 1.0 y se guarda en tiempo real.
  useEffect(() => {
    if (activities.length === 0 || students.length === 0) return;
    const today = getColombiaDateString();
    const overdueActivities = activities.filter(a => a.dueDate && a.dueDate < today);
    if (overdueActivities.length === 0) return;

    const teacherId = (!isDemoMode && currentUser?.uid) ? currentUser.uid : 'teacher-demo';

    setSubmissions(prev => {
      let changed = false;
      const updated = [...prev];

      overdueActivities.forEach(act => {
        const courseStudents = students.filter(s => s.courseId === act.courseId && s.active);
        courseStudents.forEach(st => {
          const idx = updated.findIndex(s => s.activityId === act.id && s.studentId === st.id);
          if (idx === -1) {
            changed = true;
            const newSub: Submission = {
              id: `sub-${st.id}-${act.id}`,
              activityId: act.id,
              studentId: st.id,
              courseId: act.courseId,
              status: 'not_delivered',
              grade: 1.0,
              feedback: 'No entregó dentro del plazo establecido.',
              submittedAt: new Date().toISOString()
            };
            updated.push(newSub);
            if (!isDemoMode && currentUser?.uid) {
              setFirestoreDoc('submissions', newSub.id, { ...newSub, teacherId }).catch(console.warn);
            }
          } else if (updated[idx].status === 'pending') {
            changed = true;
            const modSub: Submission = {
              ...updated[idx],
              status: 'not_delivered',
              grade: updated[idx].grade !== null && updated[idx].grade !== undefined ? updated[idx].grade : 1.0,
              feedback: updated[idx].feedback || 'No entregó dentro del plazo establecido.'
            };
            updated[idx] = modSub;
            if (!isDemoMode && currentUser?.uid) {
              setFirestoreDoc('submissions', modSub.id, { ...modSub, teacherId }).catch(console.warn);
            }
          }
        });
      });

      return changed ? updated : prev;
    });
  }, [activities, students]);

  const activeCourse = courses.find(c => c.id === activeCourseId) || courses[0] || null;

  // Filtrar estudiantes por curso activo
  const activeStudents = students
    .filter(s => s.courseId === activeCourse?.id && s.active !== false)
    .sort((a, b) => a.listNumber - b.listNumber);

  // Filtrar actividades por curso activo
  const activeActivities = activities.filter(a => a.courseId === activeCourse?.id);

  // Filtrar entregas por curso activo
  const activeSubmissions = submissions.filter(s => s.courseId === activeCourse?.id);

  // Filtrar asistencias por curso activo
  // Las sesiones en días fuera del horario del curso no se cuentan
  const activeAttendanceSessions = filterClassDaySessions(
    attendanceSessions.filter(s => s.courseId === activeCourse?.id),
    activeCourse?.scheduleDays
  );

  // Filtrar comportamientos por curso activo
  const activeBehaviors = behaviorRecords.filter(b => b.courseId === activeCourse?.id);

  const selectCourse = (courseId: string) => {
    setActiveCourseId(courseId);
  };

  const addCourse = (courseData: Omit<Course, 'id' | 'teacherId' | 'createdAt'>): Course => {
    const teacherId = (!isDemoMode && currentUser?.uid) ? currentUser.uid : 'teacher-demo';
    const newCourse: Course = {
      ...courseData,
      institution: courseData.institution || teacherProfile?.institution || 'Institución Educativa',
      id: `course-${Date.now()}`,
      teacherId,
      studentCount: 0,
      createdAt: new Date().toISOString()
    };
    setCourses(prev => [...prev, newCourse]);
    setActiveCourseId(newCourse.id);

    if (!isDemoMode && currentUser?.uid) {
      setFirestoreDoc('courses', newCourse.id, newCourse).catch(err => {
        console.warn('Error al guardar curso en Firestore, encolado offline:', err);
        offlineStorage.addToSyncQueue({ action: 'create', collection: 'courses', data: newCourse });
      });
    }
    return newCourse;
  };

  const updateCourse = (courseId: string, updates: Partial<Course>) => {
    const updatedPayload = { ...updates, updatedAt: new Date().toISOString() };
    setCourses(prev => prev.map(c => c.id === courseId ? { ...c, ...updatedPayload } : c));

    if (!isDemoMode && currentUser?.uid) {
      setFirestoreDoc('courses', courseId, updatedPayload).catch(err => {
        console.warn('Error al actualizar curso en Firestore, encolado offline:', err);
        offlineStorage.addToSyncQueue({ action: 'update', collection: 'courses', data: { id: courseId, ...updatedPayload } });
      });
    }
  };

  const deleteCourse = (courseId: string) => {
    setCourses(prev => prev.filter(c => c.id !== courseId));
    if (activeCourseId === courseId) {
      const remaining = courses.filter(c => c.id !== courseId);
      if (remaining.length > 0) setActiveCourseId(remaining[0].id);
    }

    if (!isDemoMode && currentUser?.uid) {
      deleteFirestoreDoc('courses', courseId).catch(err => {
        console.warn('Error al eliminar curso en Firestore, encolado offline:', err);
        offlineStorage.addToSyncQueue({ action: 'delete', collection: 'courses', data: { id: courseId } });
      });
    }
  };

  const addStudent = (studentData: Omit<Student, 'id' | 'uniqueCode' | 'createdAt' | 'active'>): Student => {
    const teacherId = (!isDemoMode && currentUser?.uid) ? currentUser.uid : 'teacher-demo';
    const existingCodes = new Set(students.map(s => s.uniqueCode));
    const uniqueCode = generateStudentCode(existingCodes);
    const docClean = studentData.documentNumber ? String(studentData.documentNumber).trim() : '';

    const newStudent: Student = {
      ...studentData,
      id: `std-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      uniqueCode,
      active: true,
      createdAt: new Date().toISOString()
    };

    if (docClean) {
      newStudent.documentNumber = docClean;
    } else {
      delete newStudent.documentNumber;
    }

    const updated = [...students, newStudent];
    setStudents(updated);
    offlineStorage.saveLocal('students', updated);

    // Recalcular el conteo exacto de estudiantes para el curso
    const courseStudentCount = updated.filter(s => s.courseId === newStudent.courseId && s.active !== false).length;
    updateCourse(newStudent.courseId, { studentCount: courseStudentCount });

    if (!isDemoMode && currentUser?.uid) {
      const payload = { ...newStudent, teacherId };
      setFirestoreDoc('students', newStudent.id, payload).catch(err => {
        console.warn('Error guardando estudiante en Firestore:', err);
        offlineStorage.addToSyncQueue({ action: 'create', collection: 'students', data: payload });
      });
    }
    return newStudent;
  };

  const importStudents = (newStudentsList: { fullName: string; documentNumber?: string }[]): number => {
    if (!activeCourse) return 0;
    const teacherId = (!isDemoMode && currentUser?.uid) ? currentUser.uid : 'teacher-demo';
    const existingCodes = new Set(students.map(s => s.uniqueCode));
    const currentMaxListNum = activeStudents.reduce((max, s) => Math.max(max, s.listNumber), 0);
    
    const createdList: Student[] = newStudentsList.map((item, index) => {
      const uniqueCode = generateStudentCode(existingCodes);
      existingCodes.add(uniqueCode);
      const docClean = item.documentNumber ? String(item.documentNumber).trim() : '';

      const st: Student = {
        id: `std-${Date.now()}-${Math.random().toString(36).substring(2, 6)}-${index}`,
        courseId: activeCourse.id,
        listNumber: currentMaxListNum + index + 1,
        fullName: item.fullName.trim(),
        uniqueCode,
        active: true,
        createdAt: new Date().toISOString()
      };

      if (docClean) {
        st.documentNumber = docClean;
      }

      return st;
    });

    const updatedStudents = [...students, ...createdList];
    setStudents(updatedStudents);
    offlineStorage.saveLocal('students', updatedStudents);

    // Recalcular el conteo exacto de estudiantes activos del curso
    const courseStudentCount = updatedStudents.filter(s => s.courseId === activeCourse.id && s.active !== false).length;
    updateCourse(activeCourse.id, { studentCount: courseStudentCount });

    if (!isDemoMode && currentUser?.uid) {
      const batchPayload = createdList.map(s => ({
        id: s.id,
        data: { ...s, teacherId }
      }));
      batchSaveFirestore('students', batchPayload)
        .then(() => {
          console.log(`✓ ${createdList.length} estudiantes guardados en Firestore para ${activeCourse.name}`);
        })
        .catch(err => {
          console.warn('Error guardando lote de estudiantes en Firestore, encolando offline:', err);
          createdList.forEach(s => {
            offlineStorage.addToSyncQueue({ action: 'create', collection: 'students', data: { ...s, teacherId } });
          });
        });
    }

    return createdList.length;
  };

  const updateStudent = (studentId: string, updates: Partial<Student>) => {
    const updated = students.map(s => s.id === studentId ? { ...s, ...updates } : s);
    setStudents(updated);
    offlineStorage.saveLocal('students', updated);

    if (!isDemoMode && currentUser?.uid) {
      setFirestoreDoc('students', studentId, updates).catch(err => {
        console.warn('Error actualizando estudiante en Firestore:', err);
        offlineStorage.addToSyncQueue({ action: 'update', collection: 'students', data: { id: studentId, ...updates } });
      });
    }
  };

  const deleteStudent = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    const courseId = student?.courseId;

    const updated = students.map(s => s.id === studentId ? { ...s, active: false } : s);
    setStudents(updated);
    offlineStorage.saveLocal('students', updated);

    if (courseId) {
      const courseStudentCount = updated.filter(s => s.courseId === courseId && s.active !== false).length;
      updateCourse(courseId, { studentCount: courseStudentCount });
    }

    if (!isDemoMode && currentUser?.uid) {
      setFirestoreDoc('students', studentId, { active: false }).catch(err => {
        console.warn('Error desactivando estudiante en Firestore:', err);
        offlineStorage.addToSyncQueue({ action: 'update', collection: 'students', data: { id: studentId, active: false } });
      });
    }
  };

  const getStudentByCode = (code: string): Student | undefined => {
    const target = cleanQRCode(code);
    if (!target) return undefined;

    const matches = (s: Student) => {
      const uCode = (s.uniqueCode || '').trim().toUpperCase();
      const doc = (s.documentNumber || '').trim().toUpperCase();
      const sId = (s.id || '').trim().toUpperCase();
      return uCode === target || doc === target || sId === target;
    };

    const inActive = activeStudents.find(matches);
    if (inActive) return inActive;
    return students.find(matches);
  };

  const getStudentById = (id: string): Student | undefined => {
    return students.find(s => s.id === id);
  };

  const addActivity = (activityData: Omit<Activity, 'id' | 'createdAt'>): Activity => {
    const teacherId = (!isDemoMode && currentUser?.uid) ? currentUser.uid : 'teacher-demo';
    const newAct: Activity = {
      ...activityData,
      id: `act-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    setActivities(prev => [...prev, newAct]);

    if (!isDemoMode && currentUser?.uid) {
      const payload = { ...newAct, teacherId };
      setFirestoreDoc('activities', newAct.id, payload).catch(err => {
        console.warn('Error guardando actividad en Firestore:', err);
        offlineStorage.addToSyncQueue({ action: 'create', collection: 'activities', data: payload });
      });
    }
    return newAct;
  };

  const updateActivity = (activityId: string, updates: Partial<Activity>) => {
    setActivities(prev => prev.map(a => a.id === activityId ? { ...a, ...updates } : a));
    if (!isDemoMode && currentUser?.uid) {
      setFirestoreDoc('activities', activityId, updates).catch(err => {
        console.warn('Error actualizando actividad en Firestore:', err);
        offlineStorage.addToSyncQueue({ action: 'update', collection: 'activities', data: { id: activityId, ...updates } });
      });
    }
  };

  const deleteActivity = (activityId: string) => {
    setActivities(prev => prev.filter(a => a.id !== activityId));
    // CRÍTICO: Eliminar de inmediato todas las entregas asociadas a la actividad eliminada
    setSubmissions(prev => prev.filter(s => s.activityId !== activityId));

    if (!isDemoMode && currentUser?.uid) {
      deleteFirestoreDoc('activities', activityId).catch(err => {
        console.warn('Error eliminando actividad en Firestore:', err);
        offlineStorage.addToSyncQueue({ action: 'delete', collection: 'activities', data: { id: activityId } });
      });

      // Limpiar también las entregas huérfanas en Firestore
      submissions
        .filter(s => s.activityId === activityId)
        .forEach(sub => {
          deleteFirestoreDoc('submissions', sub.id).catch(console.warn);
        });
    }
  };

  const recordSubmission = (
    activityId: string,
    studentId: string,
    status: Submission['status'],
    grade?: number | null,
    feedback?: string
  ) => {
    if (!activeCourse) return;
    const teacherId = (!isDemoMode && currentUser?.uid) ? currentUser.uid : 'teacher-demo';

    // Regla del sistema: si se marca no entregado, por defecto la nota es 1.0 (a menos que se especifique otra)
    let effectiveGrade = grade;
    if (status === 'not_delivered' && (effectiveGrade === undefined || effectiveGrade === null)) {
      effectiveGrade = 1.0;
    }

    setSubmissions(prev => {
      const existingIdx = prev.findIndex(s => s.activityId === activityId && s.studentId === studentId);
      const updatedItem: Submission = {
        id: existingIdx >= 0 ? prev[existingIdx].id : `sub-${studentId}-${activityId}`,
        activityId,
        studentId,
        courseId: activeCourse.id,
        status,
        grade: effectiveGrade !== undefined ? effectiveGrade : (existingIdx >= 0 ? prev[existingIdx].grade : null),
        feedback: feedback !== undefined ? feedback : (existingIdx >= 0 ? prev[existingIdx].feedback : ''),
        submittedAt: new Date().toISOString()
      };

      if (!isDemoMode && currentUser?.uid) {
        setFirestoreDoc('submissions', updatedItem.id, { ...updatedItem, teacherId }).catch(err => {
          console.warn('Error guardando entrega en Firestore:', err);
          offlineStorage.addToSyncQueue({ action: 'update', collection: 'submissions', data: { ...updatedItem, teacherId } });
        });
      }

      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx] = updatedItem;
        return copy;
      }
      return [...prev, updatedItem];
    });
  };

  // Copia siempre actualizada de las sesiones: permite aplicar varios registros seguidos
  // (escaneos rápidos, "marcar todos") sin perder ninguno ni repetir escrituras en Firestore.
  const attendanceRef = useRef<AttendanceSession[]>(attendanceSessions);
  attendanceRef.current = attendanceSessions;

  const recordAttendanceBulk = (
    date: string,
    entries: { studentId: string; status: AttendanceStatus }[],
    source: 'qr' | 'manual' = 'manual',
    courseId?: string
  ) => {
    // courseId permite registrar en el curso del estudiante escaneado aunque el cambio de curso activo aún no se haya aplicado
    const targetCourse = (courseId && courses.find(c => c.id === courseId)) || activeCourse;
    if (!targetCourse || entries.length === 0) return false;

    // Solo se toma asistencia en días de clase (y nunca a futuro); una lista ya existente sí se puede corregir
    const hasSession = attendanceRef.current.some(s => s.courseId === targetCourse.id && s.date === date);
    const access = getAttendanceAccess(targetCourse.scheduleDays, date, getDayNameFromDateString(date), getColombiaDateString(), hasSession);
    if (!access.allowed) return false;

    const teacherId = (!isDemoMode && currentUser?.uid) ? currentUser.uid : 'teacher-demo';
    const now = new Date().toISOString();

    const courseStudents = students.filter(s => s.courseId === targetCourse.id && s.active !== false);
    const prev = attendanceRef.current;
    const sessionIdx = prev.findIndex(s => s.courseId === targetCourse.id && s.date === date);
    const base: AttendanceSession = sessionIdx >= 0
      ? prev[sessionIdx]
      : {
          id: `att-${targetCourse.id}-${date}`,
          courseId: targetCourse.id,
          date,
          period: targetCourse.currentPeriod,
          records: {},
          summary: { present: 0, absent: 0, late: 0, excused: 0, total: courseStudents.length },
          createdAt: now
        };

    const records = { ...base.records };
    entries.forEach(({ studentId, status }) => {
      records[studentId] = { studentId, status, timestamp: now, source };
    });

    // Resumen: solo estudiantes activos del curso (ignora retirados)
    const activeIds = new Set(courseStudents.map(s => s.id));
    let present = 0, absent = 0, late = 0, excused = 0;
    Object.values(records).forEach(r => {
      if (!activeIds.has(r.studentId)) return;
      if (r.status === 'present') present++;
      else if (r.status === 'absent') absent++;
      else if (r.status === 'late') late++;
      else if (r.status === 'excused') excused++;
    });

    const session: AttendanceSession = {
      ...base,
      records,
      summary: { present, absent, late, excused, total: courseStudents.length },
      updatedAt: now
    };

    const next = sessionIdx >= 0
      ? prev.map((s, i) => (i === sessionIdx ? session : s))
      : [...prev, session];
    attendanceRef.current = next;
    setAttendanceSessions(next);

    if (!isDemoMode && currentUser?.uid) {
      setFirestoreDoc('attendanceSessions', session.id, { ...session, teacherId }).catch(err => {
        console.warn('Error guardando asistencia en Firestore:', err);
        offlineStorage.addToSyncQueue({ action: 'update', collection: 'attendanceSessions', data: { ...session, teacherId } });
      });
    }
    return true;
  };

  const recordAttendance = (
    date: string,
    studentId: string,
    status: AttendanceStatus,
    source: 'qr' | 'manual' = 'manual'
  ) => {
    return recordAttendanceBulk(date, [{ studentId, status }], source, students.find(s => s.id === studentId)?.courseId);
  };

  const getTodaySession = (): AttendanceSession | undefined => {
    if (!activeCourse) return undefined;
    const today = getLocalDateString();
    return activeAttendanceSessions.find(s => s.date === today);
  };

  const addBehaviorRecord = (record: Omit<BehaviorRecord, 'id' | 'createdAt'>) => {
    const teacherId = (!isDemoMode && currentUser?.uid) ? currentUser.uid : 'teacher-demo';
    const newRecord: BehaviorRecord = {
      ...record,
      id: `beh-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    setBehaviorRecords(prev => [newRecord, ...prev]);

    if (!isDemoMode && currentUser?.uid) {
      setFirestoreDoc('behaviorRecords', newRecord.id, { ...newRecord, teacherId }).catch(err => {
        console.warn('Error guardando comportamiento en Firestore:', err);
        offlineStorage.addToSyncQueue({ action: 'create', collection: 'behaviorRecords', data: { ...newRecord, teacherId } });
      });
    }
  };

  const addObservation = (studentId: string, text: string) => {
    if (!activeCourse) return;
    const teacherId = (!isDemoMode && currentUser?.uid) ? currentUser.uid : 'teacher-demo';
    const newObs: StudentObservation = {
      id: `obs-${Date.now()}`,
      courseId: activeCourse.id,
      studentId,
      date: getLocalDateString(),
      text,
      createdAt: new Date().toISOString()
    };
    setObservations(prev => [newObs, ...prev]);

    if (!isDemoMode && currentUser?.uid) {
      setFirestoreDoc('observations', newObs.id, { ...newObs, teacherId }).catch(err => {
        console.warn('Error guardando observación en Firestore:', err);
        offlineStorage.addToSyncQueue({ action: 'create', collection: 'observations', data: { ...newObs, teacherId } });
      });
    }
  };

  const clearAllData = () => {
    setCourses([]);
    setActiveCourseId('');
    setStudents([]);
    setActivities([]);
    setSubmissions([]);
    setAttendanceSessions([]);
    setBehaviorRecords([]);
    setObservations([]);
    offlineStorage.clearAllLocal();
  };

  const resetToDemoData = () => {
    setCourses(DEMO_COURSES);
    setActiveCourseId(DEMO_COURSES[0].id);
    setStudents(DEMO_STUDENTS);
    setActivities(DEMO_ACTIVITIES);
    setSubmissions(DEMO_SUBMISSIONS);
    setAttendanceSessions(DEMO_ATTENDANCE_SESSIONS);
    setBehaviorRecords(DEMO_BEHAVIORS);
    setObservations([]);
  };

  // Copia la estructura demo inicial a Firestore para el nuevo usuario docente
  const seedDemoToFirestore = async () => {
    if (!currentUser?.uid || !isFirestoreReady()) return;
    const uid = currentUser.uid;

    const seededCourses = DEMO_COURSES.map(c => ({ id: c.id, data: { ...c, teacherId: uid } }));
    const seededStudents = DEMO_STUDENTS.map(s => ({ id: s.id, data: { ...s, teacherId: uid } }));
    const seededActs = DEMO_ACTIVITIES.map(a => ({ id: a.id, data: { ...a, teacherId: uid } }));
    const seededSubs = DEMO_SUBMISSIONS.map(s => ({ id: s.id, data: { ...s, teacherId: uid } }));
    const seededAtt = DEMO_ATTENDANCE_SESSIONS.map(att => ({ id: att.id, data: { ...att, teacherId: uid } }));
    const seededBeh = DEMO_BEHAVIORS.map(b => ({ id: b.id, data: { ...b, teacherId: uid } }));

    await batchSaveFirestore('courses', seededCourses);
    await batchSaveFirestore('students', seededStudents);
    await batchSaveFirestore('activities', seededActs);
    await batchSaveFirestore('submissions', seededSubs);
    await batchSaveFirestore('attendanceSessions', seededAtt);
    await batchSaveFirestore('behaviorRecords', seededBeh);
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
        deleteCourse,
        addStudent,
        importStudents,
        updateStudent,
        deleteStudent,
        getStudentByCode,
        getStudentById,
        addActivity,
        updateActivity,
        deleteActivity,
        recordSubmission,
        recordAttendance,
        recordAttendanceBulk,
        getTodaySession,
        addBehaviorRecord,
        addObservation,
        clearAllData,
        resetToDemoData,
        seedDemoToFirestore
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
