import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  GraduationCap,
  Search,
  Camera,
  X,
  Award,
  CalendarCheck2,
  BookOpen,
  Sparkles,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  QrCode,
  ArrowLeft,
  Share2,
  User,
  School,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  FileText,
  Loader2
} from 'lucide-react';
import { useCourse } from '../context/CourseContext';
import { useToast } from '../context/ToastContext';
import { Student, Course, Activity, Submission, AttendanceSession, BehaviorRecord, StudentObservation } from '../types';
import { cleanQRCode, playFeedbackTone, getStudentPortalUrl } from '../utils/codeGenerator';
import { formatColombiaFullDate, getDayNameFromDateString, getColombiaDateString } from '../utils/dateUtils';
import { calculateStudentWeightedAverage } from '../utils/gradeUtils';
import { fetchStudentByCode, fetchStudentPortalData, StudentPortalData } from '../services/firestoreService';

export const StudentPortalPage: React.FC = () => {
  const { code: routeCode } = useParams<{ code?: string }>();
  const [searchParams] = useSearchParams();
  const queryCode = searchParams.get('codigo') || searchParams.get('code') || '';
  const navigate = useNavigate();
  const { showToast } = useToast();

  const {
    students: contextStudents,
    courses: contextCourses,
    activities: contextActivities,
    submissions: contextSubmissions,
    attendanceSessions: contextAttendance,
    behaviorRecords: contextBehaviors,
    observations: contextObservations
  } = useCourse();

  const [inputCode, setInputCode] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [remotePortalData, setRemotePortalData] = useState<StudentPortalData | null>(null);
  const [isLoadingPortal, setIsLoadingPortal] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'calificaciones' | 'asistencia' | 'convivencia' | 'carne'>('calificaciones');
  const [isCameraScanning, setIsCameraScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  // Combinar datos locales y remotos para el portal
  const allStudents: Student[] = remotePortalData?.student
    ? [remotePortalData.student, ...contextStudents.filter(s => s.id !== remotePortalData.student.id)]
    : contextStudents;

  const allCourses: Course[] = remotePortalData?.course
    ? [remotePortalData.course, ...contextCourses.filter(c => c.id !== remotePortalData.course?.id)]
    : contextCourses;

  const allActivities: Activity[] = remotePortalData?.activities?.length
    ? remotePortalData.activities
    : contextActivities;

  const allSubmissions: Submission[] = remotePortalData?.submissions?.length
    ? remotePortalData.submissions
    : contextSubmissions;

  const allAttendance: AttendanceSession[] = remotePortalData?.attendanceSessions?.length
    ? remotePortalData.attendanceSessions
    : contextAttendance;

  const allBehaviors: BehaviorRecord[] = remotePortalData?.behaviorRecords?.length
    ? remotePortalData.behaviorRecords
    : contextBehaviors;

  const allObservations: StudentObservation[] = remotePortalData?.observations?.length
    ? remotePortalData.observations
    : contextObservations;

  const searchAndSetStudent = async (rawQuery: string): Promise<boolean> => {
    const clean = cleanQRCode(rawQuery).trim().toUpperCase();
    if (!clean) return false;

    // 1. Buscar coincidencia local si existe (ej. pruebas en la misma computadora o docente)
    let found = allStudents.find(s => (s.uniqueCode || '').toUpperCase() === clean);
    if (!found) {
      found = allStudents.find(s => s.documentNumber && s.documentNumber.trim().toUpperCase() === clean);
    }
    if (!found) {
      found = allStudents.find(s => s.id === clean);
    }
    if (!found && clean.length >= 3) {
      found = allStudents.find(s => s.fullName.toUpperCase().includes(clean));
    }

    if (found) {
      setSelectedStudent(found);
      try {
        localStorage.setItem('student_portal_saved_code', found.uniqueCode || clean);
      } catch {}
      playFeedbackTone('success');
      return true;
    }

    // 2. Si no está en datos locales (p.ej. teléfono del estudiante sin sesión docente),
    // consultar directamente a Firestore por el código QR
    setIsLoadingPortal(true);
    try {
      const remoteStudent = await fetchStudentByCode(clean);
      if (remoteStudent) {
        const portalData = await fetchStudentPortalData(remoteStudent);
        setRemotePortalData(portalData);
        setSelectedStudent(portalData.student);
        try {
          localStorage.setItem('student_portal_saved_code', portalData.student.uniqueCode || clean);
        } catch {}
        playFeedbackTone('success');
        setIsLoadingPortal(false);
        return true;
      }
    } catch (err) {
      console.error('Error consultando estudiante en Firestore:', err);
    } finally {
      setIsLoadingPortal(false);
    }

    return false;
  };

  // Intentar cargar por código de URL al montar, o por código guardado en localStorage
  useEffect(() => {
    const codeFromUrl = routeCode || queryCode;
    const savedCode = (() => {
      try {
        return localStorage.getItem('student_portal_saved_code') || '';
      } catch {
        return '';
      }
    })();

    const codeToSearch = codeFromUrl || savedCode;
    if (codeToSearch) {
      setInputCode(codeToSearch);
      searchAndSetStudent(codeToSearch).then((found) => {
        if (!found && codeFromUrl) {
          showToast(`No se encontró estudiante con código "${cleanQRCode(codeFromUrl)}"`, 'error');
        }
      });
    }
  }, [routeCode, queryCode]);

  const handleManualSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;

    const found = await searchAndSetStudent(inputCode);
    if (!found) {
      showToast('Estudiante no encontrado. Verifica el código o escanea el QR.', 'error');
    }
  };

  // Cámara para escanear QR del carné
  const startCamera = async () => {
    setCameraError(null);
    setIsCameraScanning(true);

    setTimeout(async () => {
      try {
        const qrScanner = new Html5Qrcode('student-portal-reader');
        html5QrCodeRef.current = qrScanner;

        await qrScanner.start(
          { facingMode: 'environment' },
          {
            fps: 15,
            qrbox: { width: 240, height: 240 },
            aspectRatio: 1.0
          },
          async (decodedText) => {
            const success = await searchAndSetStudent(decodedText);
            if (success) {
              stopCamera();
              showToast('✓ Carné detectado exitosamente', 'success');
            }
          },
          () => {} // Ignorar frames sin QR
        );
      } catch (err: any) {
        console.error('Error al iniciar cámara en portal estudiante:', err);
        setCameraError('No se pudo acceder a la cámara. Por favor escribe tu código manualmente.');
        setIsCameraScanning(false);
      }
    }, 150);
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn('Error al detener cámara:', err);
      }
      html5QrCodeRef.current = null;
    }
    setIsCameraScanning(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Datos del estudiante seleccionado
  const studentCourse = selectedStudent
    ? allCourses.find(c => c.id === selectedStudent.courseId) || remotePortalData?.course || {
        name: 'Curso Asignado',
        gradeLevel: 'Grado General',
        group: 'A',
        academicYear: 2026,
        scheduleDays: ['Lunes', 'Miércoles'],
        institution: remotePortalData?.teacher?.institution || 'Institución Educativa'
      }
    : null;

  const studentSubmissions = selectedStudent
    ? allSubmissions.filter(s => s.studentId === selectedStudent.id)
    : [];

  const courseActivities = selectedStudent
    ? allActivities.filter(a => a.courseId === selectedStudent.courseId)
    : [];

  const weightedAverage = calculateStudentWeightedAverage(courseActivities, studentSubmissions);
  const averageGrade = weightedAverage.average !== null ? weightedAverage.averageFormatted : null;
  const gradedSubmissions = studentSubmissions.filter(s => s.grade !== null && s.grade !== undefined);

  // Asistencia
  let presentCount = 0;
  let lateCount = 0;
  let absentCount = 0;
  let excusedCount = 0;
  const studentAttendanceHistory: { date: string; status: 'present' | 'late' | 'absent' | 'excused'; notes?: string }[] = [];

  if (selectedStudent) {
    allAttendance.forEach(session => {
      const rec = session.records[selectedStudent.id];
      if (rec) {
        if (rec.status === 'present') presentCount++;
        else if (rec.status === 'late') lateCount++;
        else if (rec.status === 'absent') absentCount++;
        else if (rec.status === 'excused') excusedCount++;

        studentAttendanceHistory.push({
          date: session.date,
          status: rec.status,
          notes: rec.notes
        });
      }
    });

    studentAttendanceHistory.sort((a, b) => b.date.localeCompare(a.date));
  }

  const totalClasses = presentCount + lateCount + absentCount + excusedCount;
  const attendanceRate = totalClasses > 0
    ? Math.round(((presentCount + excusedCount + lateCount * 0.8) / totalClasses) * 100)
    : 100;

  // Comportamientos y observaciones
  const studentBehaviors = selectedStudent
    ? allBehaviors.filter(b => b.studentId === selectedStudent.id)
    : [];

  const studentObservations = selectedStudent
    ? allObservations.filter(o => o.studentId === selectedStudent.id)
    : [];

  // Calificación del desempeño
  const numAvg = averageGrade ? parseFloat(averageGrade) : null;
  const performanceStatus = numAvg === null
    ? { text: 'Sin Calificaciones Aún', color: 'bg-slate-100 text-slate-700 border-slate-200' }
    : numAvg >= 4.6
    ? { text: 'Desempeño Superior', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
    : numAvg >= 4.0
    ? { text: 'Desempeño Alto', color: 'bg-blue-50 text-blue-700 border-blue-200' }
    : numAvg >= 3.0
    ? { text: 'Desempeño Básico', color: 'bg-amber-50 text-amber-700 border-amber-200' }
    : { text: 'Desempeño Bajo (En Seguimiento)', color: 'bg-rose-50 text-rose-700 border-rose-200' };

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900 font-sans pb-16">
      {/* BARRA SUPERIOR ABSENSISWA */}
      <header className="bg-white border-b border-slate-200/90 sticky top-0 z-30 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-500/25">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-900 leading-tight">AulaControl</h1>
              <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider block">
                Portal del Estudiante
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedStudent && (
              <button
                type="button"
                onClick={() => {
                  setSelectedStudent(null);
                  setRemotePortalData(null);
                  setInputCode('');
                  try {
                    localStorage.removeItem('student_portal_saved_code');
                  } catch {}
                  navigate('/estudiante', { replace: true });
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cambiar Estudiante</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-3 py-1.5 rounded-xl border border-blue-200 hover:bg-blue-50 text-blue-600 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>Acceso Docente</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {isLoadingPortal ? (
          <div className="max-w-md mx-auto text-center py-20 space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-blue-50 border border-blue-200 flex items-center justify-center mx-auto text-blue-600 shadow-sm">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-slate-900">
                Cargando Perfil Estudiantil
              </h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Conectando con la base de datos institucional para cargar tus calificaciones y asistencias...
              </p>
            </div>
          </div>
        ) : !selectedStudent ? (
          <div className="max-w-md mx-auto space-y-6 pt-4">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-3xl bg-blue-50 border border-blue-200 flex items-center justify-center mx-auto text-blue-600 shadow-sm">
                <QrCode className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-black text-slate-900">
                Consulta tu Progreso Escolar
              </h2>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                Ingresa el código alfanumérico que aparece en tu carné impreso o escanea el código QR con tu celular.
              </p>
            </div>

            {/* FORMULARIO DE CONSULTA */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/90 space-y-4">
              <form onSubmit={handleManualSearch} className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5 px-1">
                    Código de Estudiante o Documento
                  </label>
                  <div className="relative flex items-center">
                    <Search className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none" />
                    <input
                      type="text"
                      required
                      placeholder="Ej: A7K92P o tu nombre"
                      value={inputCode}
                      onChange={e => setInputCode(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 rounded-2xl pl-11 pr-4 py-3 text-sm font-semibold uppercase outline-none transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-2xl text-xs font-bold shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Search className="w-4 h-4" />
                  <span>Consultar Mis Calificaciones y Asistencia</span>
                </button>
              </form>

              <div className="relative flex items-center justify-center my-3">
                <div className="border-t border-slate-200 w-full"></div>
                <span className="bg-white px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  O también
                </span>
              </div>

              {/* BOTÓN CÁMARA */}
              {!isCameraScanning ? (
                <button
                  type="button"
                  onClick={startCamera}
                  className="w-full py-3 bg-slate-50 hover:bg-slate-100 active:scale-[0.98] text-slate-700 border border-slate-200/90 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Camera className="w-4 h-4 text-blue-600" />
                  <span>Escanear Carné QR con la Cámara</span>
                </button>
              ) : (
                <div className="space-y-3 bg-slate-900 rounded-3xl p-4 text-white text-center">
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-blue-400" />
                      Apunta al código QR del carné
                    </span>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="p-1 rounded-xl bg-white/10 hover:bg-white/20 text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div id="student-portal-reader" className="w-full rounded-2xl overflow-hidden bg-black aspect-square"></div>

                  <p className="text-[11px] text-slate-400">
                    Mantén la cámara firme frente al código QR de tu carné.
                  </p>
                </div>
              )}

              {cameraError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{cameraError}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ========================================================
             VISTA 2: PERFIL ACADÉMICO DEL ESTUDIANTE
             ======================================================== */
          <div className="space-y-5">
            {/* ENCABEZADO DE TARJETA BLANCA DEL ESTUDIANTE */}
            <div className="bg-white rounded-3xl p-5 md:p-6 shadow-sm border border-slate-200/90 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-xl flex items-center justify-center shadow-md shadow-blue-500/25 shrink-0 relative">
                  {selectedStudent.fullName.charAt(0)}
                  <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 bg-slate-900 text-white text-[9px] font-bold rounded-md">
                    #{selectedStudent.listNumber}
                  </span>
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg md:text-xl font-black text-slate-900 leading-tight">
                      {selectedStudent.fullName}
                    </h2>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${performanceStatus.color}`}>
                      {performanceStatus.text}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {(studentCourse?.institution || remotePortalData?.teacher?.institution) ? (
                      <span className="text-slate-600 font-semibold">{studentCourse?.institution || remotePortalData?.teacher?.institution} • </span>
                    ) : null}
                    {studentCourse?.name || 'Curso Asignado'} {studentCourse?.gradeLevel ? `(${studentCourse.gradeLevel})` : ''} • Código: <strong className="text-blue-600 font-mono">{selectedStudent.uniqueCode}</strong>
                  </p>
                </div>
              </div>

              {/* ACCIONES RÁPIDAS */}
              <div className="flex items-center gap-2 self-start md:self-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab('carne')}
                  className="px-3.5 py-2 rounded-2xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200 transition-all flex items-center gap-1.5"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Ver Mi Carné QR</span>
                </button>
              </div>
            </div>

            {/* CUADRÍCULA DE MÉTRICAS CLAVE (KPIs estilo AbsenSiswa) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* PROMEDIO ACUMULADO */}
              <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Promedio</span>
                  <Award className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-2xl font-black text-slate-900">
                  {averageGrade ? `${averageGrade}` : '—'}
                  {averageGrade && <span className="text-xs font-semibold text-slate-400 ml-1">/ 5.0</span>}
                </div>
                <p className="text-[10px] text-slate-500 font-medium">
                  {gradedSubmissions.length} {gradedSubmissions.length === 1 ? 'nota registrada' : 'notas registradas'}
                </p>
              </div>

              {/* ASISTENCIA */}
              <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Asistencia</span>
                  <CalendarCheck2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-black text-slate-900">
                  {totalClasses > 0 ? `${attendanceRate}%` : '100%'}
                </div>
                <p className="text-[10px] text-slate-500 font-medium">
                  {presentCount} presentes • {absentCount} ausencias
                </p>
              </div>

              {/* TAREAS ENTREGADAS */}
              <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Actividades</span>
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="text-2xl font-black text-slate-900">
                  {studentSubmissions.filter(s => s.status === 'delivered' || (s.grade !== null && s.grade !== undefined)).length}
                  <span className="text-xs font-semibold text-slate-400 ml-1">/ {courseActivities.length}</span>
                </div>
                <p className="text-[10px] text-slate-500 font-medium">
                  Entregas enviadas
                </p>
              </div>

              {/* CONVIVENCIA */}
              <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Convivencia</span>
                  <Sparkles className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-2xl font-black text-slate-900">
                  {(() => {
                    const pos = studentBehaviors.filter(b => b.type === 'positive' || b.type === 'recognition' || b.type === 'participation').length;
                    const neg = studentBehaviors.filter(b => b.type === 'negative' || b.type === 'warning' || b.type === 'non_compliance').length;
                    const net = pos - neg;
                    return net > 0 ? `+${net}` : `${net}`;
                  })()}
                  <span className="text-xs font-semibold text-slate-400 ml-1">pts</span>
                </div>
                <p className="text-[10px] text-slate-500 font-medium">
                  {studentBehaviors.length} anotaciones
                </p>
              </div>
            </div>

            {/* PESTAÑAS DE NAVEGACIÓN */}
            <div className="flex items-center gap-1.5 p-1.5 bg-white rounded-2xl border border-slate-200/90 overflow-x-auto scrollbar-none text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('calificaciones')}
                className={`py-2 px-3.5 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap touch-manipulation cursor-pointer ${
                  activeTab === 'calificaciones'
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Award className="w-4 h-4" />
                <span>Calificaciones & Tareas</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('asistencia')}
                className={`py-2 px-3.5 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap touch-manipulation cursor-pointer ${
                  activeTab === 'asistencia'
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <CalendarCheck2 className="w-4 h-4" />
                <span>Historial de Asistencia</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('convivencia')}
                className={`py-2 px-3.5 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap touch-manipulation cursor-pointer ${
                  activeTab === 'convivencia'
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>Convivencia & Notas</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('carne')}
                className={`py-2 px-3.5 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap touch-manipulation cursor-pointer ${
                  activeTab === 'carne'
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <QrCode className="w-4 h-4" />
                <span>Carné Digital</span>
              </button>
            </div>

            {/* ========================================================
                CONTENIDO DE LA PESTAÑA: CALIFICACIONES Y TAREAS
               ======================================================== */}
            {activeTab === 'calificaciones' && (
              <div className="space-y-3">
                {courseActivities.length === 0 ? (
                  <div className="bg-white rounded-3xl p-8 text-center border border-slate-200/90 text-slate-500">
                    <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-bold">No hay actividades registradas en este curso todavía.</p>
                  </div>
                ) : (
                  courseActivities.map(act => {
                    const today = getColombiaDateString();
                    const sub = studentSubmissions.find(s => s.activityId === act.id);
                    const isOverdue = Boolean(act.dueDate && act.dueDate < today);
                    const isNotDelivered = sub?.status === 'not_delivered' || (isOverdue && (!sub || sub.status === 'pending'));
                    const effectiveGrade = (sub?.grade !== null && sub?.grade !== undefined)
                      ? Number(sub.grade)
                      : (isNotDelivered ? 1.0 : null);
                    const hasGrade = effectiveGrade !== null;
                    const isPassing = hasGrade && effectiveGrade >= 3.0;

                    return (
                      <div
                        key={act.id}
                        className="bg-white rounded-3xl p-4 md:p-5 border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-blue-200 transition-all"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 uppercase">
                              {act.period || 'Actividad'}
                            </span>
                            {act.weightPercentage && (
                              <span className="text-[10px] font-bold text-blue-600">
                                {act.weightPercentage}% del periodo
                              </span>
                            )}
                            {act.dueDate && (
                              <span className="text-[10px] font-medium text-slate-400">
                                Vence: {act.dueDate}
                              </span>
                            )}
                          </div>

                          <h3 className="text-sm font-bold text-slate-900">{act.title}</h3>
                          {act.description && (
                            <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
                              {act.description}
                            </p>
                          )}

                          {sub?.feedback && (
                            <div className="mt-2 p-2.5 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-900">
                              <span className="font-bold block text-[10px] text-blue-600 uppercase">Comentario del Docente:</span>
                              {sub.feedback}
                            </div>
                          )}
                        </div>

                        {/* NOTA Y ESTADO */}
                        <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                          <div className="text-right">
                            {hasGrade ? (
                              <div className="flex items-baseline justify-end gap-1">
                                <span className={`text-2xl font-black ${isPassing ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  {effectiveGrade.toFixed(1)}
                                </span>
                                <span className="text-xs font-semibold text-slate-400">
                                  / {act.maxGrade || 5.0}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs font-bold text-slate-400">Sin calificar</span>
                            )}

                            <span
                              className={`block text-[10px] font-bold uppercase tracking-wider ${
                                hasGrade
                                  ? isPassing ? 'text-emerald-600' : 'text-rose-600'
                                  : sub?.status === 'delivered'
                                  ? 'text-blue-600'
                                  : 'text-amber-500'
                              }`}
                            >
                              {hasGrade
                                ? isPassing ? '✓ Aprobado' : isNotDelivered ? '✕ No entregó (1.0)' : '✗ No Aprobado'
                                : sub?.status === 'delivered'
                                ? 'Entregado para revisión'
                                : 'Pendiente por entregar'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* ========================================================
                CONTENIDO DE LA PESTAÑA: ASISTENCIA
               ======================================================== */}
            {activeTab === 'asistencia' && (
              <div className="space-y-4">
                {/* RESUMEN DE ASISTENCIA */}
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3">
                    <span className="block text-xl font-black text-emerald-700">{presentCount}</span>
                    <span className="text-[10px] font-bold text-emerald-600 uppercase">Presentes</span>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3">
                    <span className="block text-xl font-black text-amber-700">{lateCount}</span>
                    <span className="text-[10px] font-bold text-amber-600 uppercase">Tardanzas</span>
                  </div>
                  <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3">
                    <span className="block text-xl font-black text-rose-700">{absentCount}</span>
                    <span className="text-[10px] font-bold text-rose-600 uppercase">Inasistencias</span>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3">
                    <span className="block text-xl font-black text-blue-700">{excusedCount}</span>
                    <span className="text-[10px] font-bold text-blue-600 uppercase">Excusadas</span>
                  </div>
                </div>

                {/* HISTORIAL FECHA A FECHA */}
                <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-3">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Historial de Sesiones Registradas
                  </h3>

                  {studentAttendanceHistory.length === 0 ? (
                    <p className="text-xs text-slate-400 py-4 text-center">
                      No hay sesiones de asistencia registradas para este curso aún.
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {studentAttendanceHistory.map((item, idx) => (
                        <div key={idx} className="py-3 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-slate-900 block">
                              {formatColombiaFullDate(item.date)}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {getDayNameFromDateString(item.date)}
                              {item.notes ? ` • Nota: ${item.notes}` : ''}
                            </span>
                          </div>

                          <div>
                            {item.status === 'present' && (
                              <span className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px] flex items-center gap-1">
                                <CheckCircle className="w-3 h-3 text-emerald-600" />
                                Presente
                              </span>
                            )}
                            {item.status === 'late' && (
                              <span className="px-2.5 py-1 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 font-bold text-[10px] flex items-center gap-1">
                                <Clock className="w-3 h-3 text-amber-600" />
                                Retardo
                              </span>
                            )}
                            {item.status === 'absent' && (
                              <span className="px-2.5 py-1 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[10px] flex items-center gap-1">
                                <XCircle className="w-3 h-3 text-rose-600" />
                                Inasistencia
                              </span>
                            )}
                            {item.status === 'excused' && (
                              <span className="px-2.5 py-1 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 font-bold text-[10px] flex items-center gap-1">
                                <FileText className="w-3 h-3 text-blue-600" />
                                Excusado
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ========================================================
                CONTENIDO DE LA PESTAÑA: CONVIVENCIA Y NOTAS
               ======================================================== */}
            {activeTab === 'convivencia' && (
              <div className="space-y-4">
                <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-3">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Registros de Convivencia y Méritos
                  </h3>

                  {studentBehaviors.length === 0 ? (
                    <p className="text-xs text-slate-400 py-4 text-center">
                      No hay registros de convivencia cargados. ¡Buen comportamiento!
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {studentBehaviors.map(b => {
                        const isPositive = b.type === 'positive' || b.type === 'recognition' || b.type === 'participation';
                        return (
                          <div
                            key={b.id}
                            className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50 flex items-start justify-between gap-3 text-xs"
                          >
                            <div>
                              <div className="flex items-center gap-1.5 mb-1">
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                  isPositive
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}>
                                  {b.title || (isPositive ? 'Mérito' : 'Llamado de atención')}
                                </span>
                                <span className="text-[10px] text-slate-400">{b.date}</span>
                              </div>
                              <p className="text-slate-700 font-medium">{b.description}</p>
                            </div>

                            <span className={`text-xs font-black px-2 py-1 rounded-xl ${
                              isPositive
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              {isPositive ? '+1 pt' : '-1 pt'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* OBSERVACIONES DEL DOCENTE */}
                <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-3">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    Observaciones Pedagógicas del Docente
                  </h3>

                  {studentObservations.length === 0 ? (
                    <p className="text-xs text-slate-400 py-4 text-center">
                      No hay observaciones registradas en el cuaderno de seguimiento.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {studentObservations.map(obs => (
                        <div key={obs.id} className="p-3 bg-blue-50/50 border border-blue-100 rounded-2xl text-xs text-slate-800">
                          <p className="font-medium leading-relaxed">{obs.text}</p>
                          <span className="block text-[10px] text-slate-400 mt-1">
                            {formatColombiaFullDate(obs.date)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ========================================================
                CONTENIDO DE LA PESTAÑA: CARNÉ DIGITAL
               ======================================================== */}
            {activeTab === 'carne' && (
              <div className="max-w-md mx-auto space-y-4">
                {/* CARNÉ ESTILO TARJETA OFICIAL */}
                <div className="bg-white rounded-3xl border-2 border-slate-200 p-6 shadow-lg shadow-slate-200/50 text-center space-y-4 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-r from-blue-600 to-indigo-600"></div>

                  <div className="pt-2">
                    <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto shadow-md shadow-blue-500/25 mb-2">
                      <GraduationCap className="w-6 h-6" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      Carné Estudiantil Oficial
                    </h4>
                    <p className="text-xs font-black text-slate-800">
                      {studentCourse?.name || 'AulaControl'}
                    </p>
                  </div>

                  {/* QR ENORME Y NÍTIDO */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-3xl inline-block mx-auto shadow-inner">
                    <QRCodeSVG
                      value={getStudentPortalUrl(selectedStudent.uniqueCode)}
                      size={170}
                      level="H"
                      className="mx-auto"
                    />
                  </div>

                  {/* CÓDIGO Y DATOS */}
                  <div className="space-y-1">
                    <div className="font-mono text-xl font-black text-blue-600 tracking-wider">
                      {selectedStudent.uniqueCode}
                    </div>
                    <h3 className="text-base font-black text-slate-900 leading-tight">
                      #{selectedStudent.listNumber} - {selectedStudent.fullName}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-semibold">
                      {studentCourse?.gradeLevel ? `Grado: ${studentCourse.gradeLevel}` : 'Estudiante Registrado'}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-400 font-medium">
                    Presenta este código QR en la pantalla de tu celular para que el docente registre tu asistencia diaria.
                  </div>
                </div>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({
                          title: `Carné de ${selectedStudent.fullName}`,
                          text: `Mi código de estudiante en AulaControl es: ${selectedStudent.uniqueCode}`,
                          url: window.location.href
                        }).catch(() => {});
                      } else {
                        navigator.clipboard.writeText(selectedStudent.uniqueCode);
                        showToast('✓ Código copiado al portapapeles', 'success');
                      }
                    }}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-2xl text-xs font-bold transition-all inline-flex items-center gap-1.5"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Compartir o Copiar Código</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
