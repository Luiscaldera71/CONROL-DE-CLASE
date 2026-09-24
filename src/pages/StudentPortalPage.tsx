import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import {
  QrCode,
  Search,
  Camera,
  CheckCircle2,
  AlertTriangle,
  Clock,
  BookOpen,
  Award,
  Calendar,
  Bell,
  BellRing,
  HeartHandshake,
  Home,
  Share2,
  Copy,
  Sparkles,
  RefreshCw,
  LogOut,
  ChevronRight,
  Info,
  X,
  ShieldCheck,
  Check,
  CalendarCheck2,
  FileText,
  UserCheck,
  AlertCircle
} from 'lucide-react';
import {
  fetchStudentByCode,
  fetchStudentPortalData,
  StudentPortalData
} from '../services/firestoreService';
import { Student, Activity, Submission } from '../types';

export const StudentPortalPage: React.FC = () => {
  const { code: pathCode } = useParams<{ code?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Código a consultar (viene por path /estudiante/:code, query ?code=XXX, o guardado localmente)
  const queryCode = searchParams.get('code') || pathCode || '';

  const [inputCode, setInputCode] = useState(queryCode);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [portalData, setPortalData] = useState<StudentPortalData | null>(null);

  // Cámara QR
  const [showScanner, setShowScanner] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const html5QrScannerRef = useRef<Html5Qrcode | null>(null);

  // Tabs de navegación interna del estudiante
  const [activeTab, setActiveTab] = useState<'summary' | 'activities' | 'attendance' | 'behavior' | 'guidance'>('summary');
  const [activityFilter, setActivityFilter] = useState<'all' | 'pending' | 'graded'>('all');

  // Estado de notificaciones en el dispositivo
  const [notificationsSupported, setNotificationsSupported] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [copiedLink, setCopiedLink] = useState(false);

  // 1. Detectar soporte de notificaciones al montar
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationsSupported(true);
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // 2. Si viene código por URL o hay uno guardado en localStorage, autoconsultar
  useEffect(() => {
    const codeToSearch = queryCode || localStorage.getItem('student_portal_saved_code');
    if (codeToSearch) {
      setInputCode(codeToSearch);
      handleSearch(codeToSearch);
    }
  }, [queryCode]);

  // Manejador del escáner de cámara
  useEffect(() => {
    if (showScanner) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [showScanner]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!html5QrScannerRef.current) {
        html5QrScannerRef.current = new Html5Qrcode('student-portal-camera');
      }
      await html5QrScannerRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 15,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        (decodedText) => {
          // Escaneo exitoso
          stopCamera();
          setShowScanner(false);
          const clean = decodedText.trim().replace(/^AC:/, '');
          setInputCode(clean);
          handleSearch(clean);
        },
        () => {}
      );
    } catch (err: any) {
      console.warn('Error al iniciar cámara en portal estudiantil:', err);
      setCameraError('No se pudo acceder a la cámara. Revisa los permisos de tu navegador o ingresa tu código manualmente.');
    }
  };

  const stopCamera = async () => {
    if (html5QrScannerRef.current && html5QrScannerRef.current.isScanning) {
      try {
        await html5QrScannerRef.current.stop();
        html5QrScannerRef.current.clear();
      } catch (e) {
        console.warn('Error deteniendo cámara:', e);
      }
    }
  };

  // Función principal de búsqueda
  const handleSearch = async (codeToQuery?: string) => {
    const target = (codeToQuery || inputCode).trim().toUpperCase();
    if (!target) {
      setErrorMsg('Por favor ingresa o escanea un código de estudiante.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const student = await fetchStudentByCode(target);
      if (!student) {
        setErrorMsg(`No se encontró ningún estudiante con el código "${target}". Verifica tu código o carnet.`);
        setPortalData(null);
        setLoading(false);
        return;
      }

      // Guardar código para futuras visitas instantáneas
      localStorage.setItem('student_portal_saved_code', student.uniqueCode);
      setSearchParams({ code: student.uniqueCode });

      // Cargar datos completos del portal
      const data = await fetchStudentPortalData(student);
      setPortalData(data);

      // Si el estudiante tiene notificaciones activadas, chequear si hay entregas próximas y alertar
      if ('Notification' in window && Notification.permission === 'granted') {
        checkAndSendLocalAlerts(student, data.activities, data.submissions);
      }
    } catch (err: any) {
      console.error('Error consultando portal:', err);
      setErrorMsg('Ocurrió un error al cargar la información. Revisa tu conexión a internet.');
    } finally {
      setLoading(false);
    }
  };

  // Solicitar permiso de notificaciones y enviar alerta
  const handleEnableNotifications = async () => {
    if (!('Notification' in window)) {
      alert('Tu navegador no soporta notificaciones de escritorio o móvil.');
      return;
    }

    try {
      const perm = await Notification.requestPermission();
      setNotificationPermission(perm);

      if (perm === 'granted') {
        new Notification('🎓 Portal Estudiantil', {
          body: `¡Hola ${portalData?.student.fullName.split(' ')[0] || ''}! Notificaciones activadas con éxito. Te recordaremos tus actividades escolares.`,
          icon: '/favicon.ico'
        });

        if (portalData) {
          checkAndSendLocalAlerts(portalData.student, portalData.activities, portalData.submissions);
        }
      } else {
        alert('Para recibir alertas de entregas debes permitir las notificaciones en la configuración del navegador.');
      }
    } catch (e) {
      console.error('Error solicitando notificaciones:', e);
    }
  };

  // Lógica de alerta preventiva de tareas
  const checkAndSendLocalAlerts = (student: Student, activities: Activity[], submissions: Submission[]) => {
    const today = new Date().toISOString().split('T')[0];

    activities.forEach(act => {
      const sub = submissions.find(s => s.activityId === act.id);
      const isDelivered = sub?.status === 'delivered';
      if (isDelivered) return;

      const notifKey = `notified_act_${act.id}_${today}`;
      if (localStorage.getItem(notifKey)) return; // Ya alertado hoy

      const dueDate = act.dueDate;
      if (!dueDate) return;

      const diffDays = Math.ceil((new Date(dueDate).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        new Notification(`⚠️ ¡Entrega HOY! - ${act.title}`, {
          body: `${student.fullName.split(' ')[0]}, hoy es el último día para entregar "${act.title}". ¡Recuerda enviarla!`,
          icon: '/favicon.ico'
        });
        localStorage.setItem(notifKey, 'true');
      } else if (diffDays > 0 && diffDays <= 3) {
        new Notification(`⏳ Recordatorio de Tarea - ${act.title}`, {
          body: `Te quedan ${diffDays} días (Límite: ${dueDate}) para presentar "${act.title}".`,
          icon: '/favicon.ico'
        });
        localStorage.setItem(notifKey, 'true');
      } else if (diffDays < 0) {
        new Notification(`🚨 Actividad Atrasada - ${act.title}`, {
          body: `La actividad "${act.title}" venció el ${dueDate}. Consulta con tu profesor.`,
          icon: '/favicon.ico'
        });
        localStorage.setItem(notifKey, 'true');
      }
    });
  };

  const handleClearSession = () => {
    localStorage.removeItem('student_portal_saved_code');
    setPortalData(null);
    setInputCode('');
    setSearchParams({});
    navigate('/estudiante', { replace: true });
  };

  const handleCopyLink = () => {
    if (!portalData) return;
    const url = `${window.location.origin}/estudiante?code=${portalData.student.uniqueCode}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Cálculos estadísticos para el portal
  const calculateStats = () => {
    if (!portalData) return null;
    const { student, activities, submissions, attendanceSessions, behaviorRecords } = portalData;

    // Asistencia
    let presentCount = 0;
    let lateCount = 0;
    let absentCount = 0;
    let excusedCount = 0;
    let totalSessions = 0;

    attendanceSessions.forEach(session => {
      const rec = session.records?.[student.id];
      if (rec) {
        totalSessions++;
        if (rec.status === 'present') presentCount++;
        else if (rec.status === 'late') lateCount++;
        else if (rec.status === 'absent') absentCount++;
        else if (rec.status === 'excused') excusedCount++;
      }
    });

    const attendanceRate = totalSessions > 0
      ? Math.round(((presentCount + lateCount * 0.5) / totalSessions) * 100)
      : 100;

    // Actividades y notas
    let deliveredCount = 0;
    let gradedCount = 0;
    let sumGrades = 0;
    let pendingAlerts: Array<{ activity: Activity; daysLeft: number; statusText: string; isUrgent: boolean }> = [];

    const todayStr = new Date().toISOString().split('T')[0];

    activities.forEach(act => {
      const sub = submissions.find(s => s.activityId === act.id);
      if (sub?.status === 'delivered') {
        deliveredCount++;
        if (typeof sub.grade === 'number' && !isNaN(sub.grade)) {
          gradedCount++;
          sumGrades += sub.grade;
        }
      } else {
        // Tarea pendiente
        let daysLeft = 999;
        let isUrgent = false;
        let statusText = 'Pendiente';

        if (act.dueDate) {
          daysLeft = Math.ceil((new Date(act.dueDate).getTime() - new Date(todayStr).getTime()) / (1000 * 60 * 60 * 24));
          if (daysLeft < 0) {
            statusText = `Atrasada (${Math.abs(daysLeft)} días)`;
            isUrgent = true;
          } else if (daysLeft === 0) {
            statusText = 'Vence HOY';
            isUrgent = true;
          } else if (daysLeft <= 3) {
            statusText = `Vence en ${daysLeft} días`;
            isUrgent = true;
          } else {
            statusText = `Límite: ${act.dueDate}`;
          }
        }

        pendingAlerts.push({ activity: act, daysLeft, statusText, isUrgent });
      }
    });

    // Ordenar alertas: urgentes primero
    pendingAlerts.sort((a, b) => a.daysLeft - b.daysLeft);

    const averageGrade = gradedCount > 0 ? (sumGrades / gradedCount).toFixed(1) : 'Sin calificar';

    // Comportamiento
    const merits = behaviorRecords.filter(r => r.type === 'positive' || r.type === 'recognition' || r.type === 'participation');
    const demerits = behaviorRecords.filter(r => r.type === 'negative' || r.type === 'warning' || r.type === 'non_compliance');

    return {
      totalSessions,
      presentCount,
      lateCount,
      absentCount,
      excusedCount,
      attendanceRate,
      deliveredCount,
      totalActivities: activities.length,
      gradedCount,
      averageGrade,
      pendingAlerts,
      meritsCount: merits.length,
      demeritsCount: demerits.length
    };
  };

  const stats = calculateStats();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-brand-500 selection:text-white">
      {/* BARRA SUPERIOR INSTITUCIONAL */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-30 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-brand-500/20">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black tracking-widest text-brand-400 uppercase">Portal Estudiantil</span>
                <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold rounded-md flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Solo Lectura
                </span>
              </div>
              <h1 className="text-sm font-bold text-slate-100 leading-tight">
                {portalData?.teacher?.institution || portalData?.course?.institution || 'Seguimiento Académico y Familiar'}
              </h1>
            </div>
          </div>

          {portalData && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyLink}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-700"
                title="Copiar enlace de acceso directo"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{copiedLink ? '¡Copiado!' : 'Compartir'}</span>
              </button>
              <button
                onClick={handleClearSession}
                className="p-1.5 bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 rounded-lg text-xs transition-colors border border-slate-700"
                title="Cerrar consulta o cambiar estudiante"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 space-y-6">
        {/* PANTALLA 1: SI NO HA CONSULTADO O BUSCADOR */}
        {!portalData && (
          <div className="max-w-md mx-auto py-8 space-y-6 animate-fade-in">
            {/* HERO BIENVENIDA */}
            <div className="text-center space-y-2">
              <div className="inline-flex p-3 bg-brand-500/10 rounded-2xl border border-brand-500/20 text-brand-400 mb-2">
                <QrCode className="w-10 h-10 animate-pulse" />
              </div>
              <h2 className="text-2xl font-black text-white">Consulta tu Progreso</h2>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Escanea el código QR de tu cuaderno o ingresa tu código único de 6 caracteres para ver tus tareas, notas y asistencia.
              </p>
            </div>

            {/* ERROR */}
            {errorMsg && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* MODAL / VISOR CÁMARA SI ESTÁ ACTIVO */}
            {showScanner ? (
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-brand-400" />
                    Apunta al código QR del cuaderno
                  </span>
                  <button
                    onClick={() => setShowScanner(false)}
                    className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div
                  id="student-portal-camera"
                  className="w-full aspect-square bg-black rounded-xl overflow-hidden border border-slate-700 relative"
                />

                {cameraError && (
                  <p className="text-xs text-amber-400 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
                    {cameraError}
                  </p>
                )}

                <p className="text-[11px] text-center text-slate-400">
                  Mantén el código QR centrado dentro del marco para escanearlo automáticamente.
                </p>
              </div>
            ) : (
              /* CAJA DE INGRESO MANUAL O BOTÓN ESCANEAR */
              <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-4">
                <button
                  type="button"
                  onClick={() => setShowScanner(true)}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-brand-500/25 transition-all transform active:scale-98"
                >
                  <Camera className="w-5 h-5" />
                  <span>Escanear Código QR con Cámara</span>
                </button>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-slate-800"></div>
                  <span className="flex-shrink mx-3 text-[11px] text-slate-500 font-bold uppercase tracking-wider">o ingresar código</span>
                  <div className="flex-grow border-t border-slate-800"></div>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSearch();
                  }}
                  className="space-y-3"
                >
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                      Código Único o N° de Documento
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={inputCode}
                        onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                        placeholder="Ej: A7K92P o documento"
                        className="w-full bg-slate-950 border border-slate-800 focus:border-brand-500 rounded-xl px-4 py-3 text-white text-base tracking-widest uppercase font-mono placeholder:tracking-normal placeholder:font-sans placeholder:text-slate-600 focus:outline-none"
                      />
                      <Search className="w-5 h-5 text-slate-500 absolute right-3.5 top-3.5 pointer-events-none" />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors border border-slate-700 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-brand-400" />
                        <span>Verificando en la base de datos...</span>
                      </>
                    ) : (
                      <>
                        <span>Consultar Mi Progreso</span>
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* AYUDA PARA FAMILIAS */}
            <div className="p-4 bg-indigo-950/20 border border-indigo-500/20 rounded-2xl flex items-start gap-3">
              <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
              <div className="text-xs text-indigo-200/80 space-y-1">
                <p className="font-bold text-indigo-200">Información para Padres y Acudientes</p>
                <p>
                  Este portal es una herramienta transparente de consulta. Podrá verificar en tiempo real las asistencias, entregas de actividades y llamados de atención de su acudido.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* PANTALLA 2: DATOS DEL ESTUDIANTE CARGADOS */}
        {portalData && stats && (
          <div className="space-y-6 animate-fade-in pb-12">
            {/* FICHA DE IDENTIDAD DEL ESTUDIANTE */}
            <div className="p-5 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 rounded-2xl shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-brand-500/5 rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 bg-brand-500/20 text-brand-300 font-mono font-bold text-xs rounded-md border border-brand-500/30">
                      Código: {portalData.student.uniqueCode}
                    </span>
                    <span className="px-2 py-0.5 bg-slate-800 text-slate-300 text-xs rounded-md border border-slate-700">
                      Lista #{portalData.student.listNumber}
                    </span>
                    {portalData.course && (
                      <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 text-xs font-semibold rounded-md border border-indigo-500/30">
                        {portalData.course.name} • {portalData.course.subject}
                      </span>
                    )}
                  </div>
                  <h2 className="text-2xl font-black text-white tracking-tight">
                    {portalData.student.fullName}
                  </h2>
                  <div className="text-xs text-slate-400 flex flex-wrap gap-x-4 gap-y-1 pt-1">
                    {portalData.student.documentNumber && (
                      <span>Doc: <strong className="text-slate-300">{portalData.student.documentNumber}</strong></span>
                    )}
                    <span>Docente: <strong className="text-slate-300">{portalData.teacher?.displayName || 'Docente Titular'}</strong></span>
                    <span>Colegio: <strong className="text-slate-300">{portalData.teacher?.institution || portalData.course?.institution || 'Institución Educativa'}</strong></span>
                  </div>
                </div>

                <div className="flex sm:flex-col gap-2 shrink-0">
                  <button
                    onClick={() => handleSearch(portalData.student.uniqueCode)}
                    disabled={loading}
                    className="flex-1 sm:flex-none px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-slate-700"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-brand-400' : ''}`} />
                    <span>Actualizar</span>
                  </button>
                  <button
                    onClick={handleClearSession}
                    className="flex-1 sm:flex-none px-3 py-2 bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-slate-700"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Salir</span>
                  </button>
                </div>
              </div>
            </div>

            {/* TARJETA DE ACTIVACIÓN DE NOTIFICACIONES EN EL CELULAR */}
            {notificationsSupported && notificationPermission !== 'granted' && (
              <div className="p-4 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-amber-500/20 text-amber-300 rounded-xl shrink-0 mt-0.5">
                    <BellRing className="w-5 h-5 animate-bounce" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">¿Deseas recibir alertas de tareas en tu celular?</h3>
                    <p className="text-xs text-amber-200/80">
                      Te enviaremos notificaciones cuando una tarea esté próxima a vencer o cuando haya actividades pendientes.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleEnableNotifications}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 shrink-0 transition-transform active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <Bell className="w-4 h-4" />
                  <span>Activar Alertas en Celular</span>
                </button>
              </div>
            )}

            {/* SECCIÓN CRÍTICA: ALERTAS DE TAREAS Y FECHAS LÍMITE */}
            {stats.pendingAlerts.length > 0 && (
              <div className="p-4 bg-rose-950/20 border border-rose-500/30 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-rose-400">
                    <AlertTriangle className="w-5 h-5 shrink-0 animate-pulse" />
                    <h3 className="text-sm font-black uppercase tracking-wider">
                      Tareas Pendientes y Fechas Límite ({stats.pendingAlerts.length})
                    </h3>
                  </div>
                  <span className="text-[11px] font-bold text-rose-300/80 bg-rose-500/10 px-2 py-0.5 rounded-md">
                    ¡Revisa antes del plazo!
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {stats.pendingAlerts.map(({ activity, daysLeft, statusText, isUrgent }) => (
                    <div
                      key={activity.id}
                      className={`p-3 rounded-xl border flex items-start justify-between gap-2.5 transition-all ${
                        isUrgent
                          ? 'bg-rose-500/10 border-rose-500/40 text-rose-200'
                          : 'bg-slate-900 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="space-y-1">
                        <p className="text-xs font-bold leading-snug">{activity.title}</p>
                        <p className="text-[11px] opacity-75">
                          {activity.period} • Vale {activity.weightPercentage}% • Nota máx: {activity.maxGrade}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                            daysLeft < 0
                              ? 'bg-rose-600 text-white'
                              : daysLeft === 0
                              ? 'bg-amber-500 text-slate-950'
                              : daysLeft <= 3
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {statusText}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* KPI METRICS CARDS */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Asistencia */}
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CalendarCheck2 className="w-3.5 h-3.5 text-emerald-400" />
                  Asistencia
                </span>
                <div className="flex items-baseline gap-2">
                  <span className={`text-2xl font-black ${
                    stats.attendanceRate >= 80 ? 'text-emerald-400' : stats.attendanceRate >= 65 ? 'text-amber-400' : 'text-rose-400'
                  }`}>
                    {stats.attendanceRate}%
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {stats.presentCount}/{stats.totalSessions} clases
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      stats.attendanceRate >= 80 ? 'bg-emerald-500' : stats.attendanceRate >= 65 ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, stats.attendanceRate))}%` }}
                  />
                </div>
              </div>

              {/* Promedio Calificaciones */}
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-brand-400" />
                  Promedio
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-white">
                    {stats.averageGrade}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    ({stats.gradedCount} calificadas)
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 truncate">
                  {stats.deliveredCount} entregadas de {stats.totalActivities}
                </p>
              </div>

              {/* Tareas Pendientes */}
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  Por Entregar
                </span>
                <div className="flex items-baseline gap-2">
                  <span className={`text-2xl font-black ${
                    stats.pendingAlerts.length === 0 ? 'text-emerald-400' : 'text-amber-400'
                  }`}>
                    {stats.pendingAlerts.length}
                  </span>
                  <span className="text-[11px] text-slate-500">actividades</span>
                </div>
                <p className="text-[10px] text-slate-400 truncate">
                  {stats.pendingAlerts.length === 0 ? '¡Al día con las tareas!' : 'Tienes entregas pendientes'}
                </p>
              </div>

              {/* Comportamiento */}
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  Convivencia
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                    +{stats.meritsCount} méritos
                  </span>
                  <span className="text-xs font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded">
                    {stats.demeritsCount} faltas
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 truncate">
                  {stats.demeritsCount === 0 ? 'Conducta ejemplar' : 'Revisar recomendaciones'}
                </p>
              </div>
            </div>

            {/* BARRA DE TABS DE DETALLE */}
            <div className="flex border-b border-slate-800 gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setActiveTab('summary')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  activeTab === 'summary'
                    ? 'bg-brand-600 text-white shadow-md'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Resumen General</span>
              </button>

              <button
                onClick={() => setActiveTab('activities')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  activeTab === 'activities'
                    ? 'bg-brand-600 text-white shadow-md'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Actividades y Notas ({portalData.activities.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('attendance')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  activeTab === 'attendance'
                    ? 'bg-brand-600 text-white shadow-md'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Historial de Asistencia</span>
              </button>

              <button
                onClick={() => setActiveTab('behavior')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  activeTab === 'behavior'
                    ? 'bg-brand-600 text-white shadow-md'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Comportamental ({portalData.behaviorRecords.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('guidance')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  activeTab === 'guidance'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                }`}
              >
                <HeartHandshake className="w-3.5 h-3.5 text-amber-300" />
                <span>Consejos Hogar y Familia</span>
              </button>
            </div>

            {/* CONTENIDO DE LOS TABS */}

            {/* TAB 1: RESUMEN GENERAL & CONSEJOS CLAVE */}
            {activeTab === 'summary' && (
              <div className="space-y-5 animate-fade-in">
                {/* CONSEJO DESTACADO PEDAGÓGICO */}
                <div className="p-5 bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-slate-900 border border-indigo-500/30 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-indigo-300">
                    <Sparkles className="w-5 h-5 text-indigo-400" />
                    <h3 className="text-sm font-black uppercase tracking-wider">Orientación Pedagógica para el Estudiante</h3>
                  </div>
                  <p className="text-xs text-indigo-100 leading-relaxed">
                    {stats.pendingAlerts.length > 0 ? (
                      <>
                        Tienes <strong>{stats.pendingAlerts.length} actividad(es) pendiente(s)</strong> por entregar. Es fundamental que hoy reserves de 45 a 60 minutos en casa sin distracciones para completarlas. ¡Organiza tu tiempo y pide apoyo a tu familia si tienes dudas!
                      </>
                    ) : stats.attendanceRate < 80 ? (
                      <>
                        Tu asistencia se encuentra en <strong>{stats.attendanceRate}%</strong>. La presencia constante en el salón es indispensable para no perder el hilo de las explicaciones y fortalecer tu aprendizaje. ¡Ánimo y puntualidad cada mañana!
                      </>
                    ) : (
                      <>
                        ¡Felicitaciones por tu compromiso! Vas al día con tus compromisos y mantienes una excelente asistencia ({stats.attendanceRate}%). Sigue repasando tus apuntes y apoya a tus compañeros que lo necesiten.
                      </>
                    )}
                  </p>
                  <div className="pt-1 flex items-center justify-between">
                    <button
                      onClick={() => setActiveTab('guidance')}
                      className="text-xs font-bold text-indigo-300 hover:text-indigo-200 flex items-center gap-1"
                    >
                      <span>Ver guía completa de consejos para la casa</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* PRÓXIMAS ACTIVIDADES */}
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-4 h-4 text-brand-400" />
                    Últimas Actividades Asignadas
                  </h3>

                  {portalData.activities.length === 0 ? (
                    <p className="text-xs text-slate-500 py-4 text-center">No hay actividades registradas en este curso.</p>
                  ) : (
                    <div className="space-y-2">
                      {portalData.activities.slice(0, 4).map(act => {
                        const sub = portalData.submissions.find(s => s.activityId === act.id);
                        const isDelivered = sub?.status === 'delivered';
                        return (
                          <div
                            key={act.id}
                            className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="space-y-0.5">
                              <p className="font-bold text-white">{act.title}</p>
                              <p className="text-[11px] text-slate-400">
                                {act.dueDate ? `Límite: ${act.dueDate}` : 'Sin fecha límite'} • Vale {act.weightPercentage}%
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              {isDelivered ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                                  <CheckCircle2 className="w-3 h-3" />
                                  {sub.grade !== null && sub.grade !== undefined ? `Nota: ${sub.grade}` : 'Entregada'}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">
                                  <Clock className="w-3 h-3" />
                                  Pendiente
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: ACTIVIDADES Y NOTAS DETALLADAS */}
            {activeTab === 'activities' && (
              <div className="space-y-4 animate-fade-in">
                {/* FILTROS */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400 font-medium">Filtrar:</span>
                  <button
                    onClick={() => setActivityFilter('all')}
                    className={`px-2.5 py-1 rounded-lg font-bold ${
                      activityFilter === 'all' ? 'bg-brand-600 text-white' : 'bg-slate-900 text-slate-400'
                    }`}
                  >
                    Todas ({portalData.activities.length})
                  </button>
                  <button
                    onClick={() => setActivityFilter('pending')}
                    className={`px-2.5 py-1 rounded-lg font-bold ${
                      activityFilter === 'pending' ? 'bg-amber-600 text-white' : 'bg-slate-900 text-slate-400'
                    }`}
                  >
                    Pendientes ({stats.pendingAlerts.length})
                  </button>
                  <button
                    onClick={() => setActivityFilter('graded')}
                    className={`px-2.5 py-1 rounded-lg font-bold ${
                      activityFilter === 'graded' ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-400'
                    }`}
                  >
                    Calificadas ({stats.gradedCount})
                  </button>
                </div>

                {portalData.activities.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-8">No hay actividades publicadas para este curso.</p>
                ) : (
                  <div className="space-y-3">
                    {portalData.activities
                      .filter(act => {
                        const sub = portalData.submissions.find(s => s.activityId === act.id);
                        const isDelivered = sub?.status === 'delivered';
                        if (activityFilter === 'pending') return !isDelivered;
                        if (activityFilter === 'graded') return isDelivered && typeof sub?.grade === 'number';
                        return true;
                      })
                      .map(act => {
                        const sub = portalData.submissions.find(s => s.activityId === act.id);
                        const isDelivered = sub?.status === 'delivered';
                        const todayStr = new Date().toISOString().split('T')[0];
                        const daysLeft = act.dueDate
                          ? Math.ceil((new Date(act.dueDate).getTime() - new Date(todayStr).getTime()) / (1000 * 60 * 60 * 24))
                          : 999;

                        return (
                          <div
                            key={act.id}
                            className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2 hover:border-slate-700 transition-colors"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="px-2 py-0.5 bg-slate-800 text-slate-300 text-[10px] font-bold rounded">
                                    {act.period}
                                  </span>
                                  <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 text-[10px] font-bold rounded">
                                    Peso: {act.weightPercentage}%
                                  </span>
                                  <span className="px-2 py-0.5 bg-slate-800 text-slate-300 text-[10px] rounded">
                                    Máx: {act.maxGrade}
                                  </span>
                                </div>
                                <h4 className="text-sm font-bold text-white">{act.title}</h4>
                                {act.description && (
                                  <p className="text-xs text-slate-400 mt-1">{act.description}</p>
                                )}
                              </div>

                              <div className="text-left sm:text-right shrink-0">
                                {isDelivered ? (
                                  <div className="space-y-0.5">
                                    <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold rounded-lg inline-flex items-center gap-1">
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      {sub.grade !== null && sub.grade !== undefined
                                        ? `Nota: ${sub.grade} / ${act.maxGrade}`
                                        : 'Entregada (En revisión)'}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="space-y-0.5">
                                    <span
                                      className={`px-2.5 py-1 text-xs font-bold rounded-lg inline-flex items-center gap-1 ${
                                        daysLeft < 0
                                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                          : daysLeft === 0
                                          ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40'
                                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                                      }`}
                                    >
                                      <Clock className="w-3.5 h-3.5" />
                                      {daysLeft < 0
                                        ? 'Vencida'
                                        : daysLeft === 0
                                        ? 'Vence Hoy'
                                        : `Vence en ${daysLeft} días`}
                                    </span>
                                    {act.dueDate && (
                                      <p className="text-[10px] text-slate-500">Fecha: {act.dueDate}</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* RETROALIMENTACIÓN DEL DOCENTE */}
                            {sub?.feedback && (
                              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-300 space-y-1">
                                <span className="text-[10px] font-bold text-brand-400 uppercase tracking-wider block">
                                  Observación / Retroalimentación del Docente:
                                </span>
                                <p className="italic">"{sub.feedback}"</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: ASISTENCIA DETALLADA */}
            {activeTab === 'attendance' && (
              <div className="space-y-4 animate-fade-in">
                {/* RESUMEN DE ASISTENCIA */}
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-xl">
                    <p className="text-xl font-black text-emerald-400">{stats.presentCount}</p>
                    <p className="text-[10px] font-bold text-emerald-300/80 uppercase">Presente</p>
                  </div>
                  <div className="p-3 bg-amber-950/20 border border-amber-500/30 rounded-xl">
                    <p className="text-xl font-black text-amber-400">{stats.lateCount}</p>
                    <p className="text-[10px] font-bold text-amber-300/80 uppercase">Retardo</p>
                  </div>
                  <div className="p-3 bg-rose-950/20 border border-rose-500/30 rounded-xl">
                    <p className="text-xl font-black text-rose-400">{stats.absentCount}</p>
                    <p className="text-[10px] font-bold text-rose-300/80 uppercase">Inasistencia</p>
                  </div>
                  <div className="p-3 bg-indigo-950/20 border border-indigo-500/30 rounded-xl">
                    <p className="text-xl font-black text-indigo-400">{stats.excusedCount}</p>
                    <p className="text-[10px] font-bold text-indigo-300/80 uppercase">Justificada</p>
                  </div>
                </div>

                {/* LISTADO DE FECHAS */}
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-400" />
                    Registro de Fechas de Clase
                  </h4>

                  {portalData.attendanceSessions.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-4">No hay sesiones de asistencia registradas aún.</p>
                  ) : (
                    <div className="divide-y divide-slate-800 max-h-96 overflow-y-auto pr-1">
                      {portalData.attendanceSessions
                        .slice()
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map(session => {
                          const record = session.records?.[portalData.student.id];
                          const status = record?.status;

                          return (
                            <div key={session.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                              <div>
                                <p className="font-bold text-white">{session.date}</p>
                                <p className="text-[11px] text-slate-400">
                                  {session.period} {record?.source ? `• Registro: ${record.source === 'qr' ? 'Escaneo QR' : 'Manual'}` : ''}
                                </p>
                              </div>
                              <div>
                                {status === 'present' && (
                                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded text-[11px] font-bold flex items-center gap-1">
                                    <Check className="w-3 h-3" /> Asistió
                                  </span>
                                )}
                                {status === 'late' && (
                                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded text-[11px] font-bold flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> Retardo
                                  </span>
                                )}
                                {status === 'absent' && (
                                  <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded text-[11px] font-bold flex items-center gap-1">
                                    <X className="w-3 h-3" /> Ausente
                                  </span>
                                )}
                                {status === 'excused' && (
                                  <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded text-[11px] font-bold flex items-center gap-1">
                                    <ShieldCheck className="w-3 h-3" /> Excusa
                                  </span>
                                )}
                                {!status && (
                                  <span className="px-2 py-0.5 bg-slate-800 text-slate-500 rounded text-[11px]">
                                    No convocado
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: COMPORTAMIENTO Y CONVIVENCIA */}
            {activeTab === 'behavior' && (
              <div className="space-y-4 animate-fade-in">
                {portalData.behaviorRecords.length === 0 ? (
                  <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
                    <Sparkles className="w-8 h-8 text-emerald-400 mx-auto" />
                    <p className="text-sm font-bold text-white">Sin llamados de atención ni faltas</p>
                    <p className="text-xs text-slate-400">
                      El estudiante no tiene faltas disciplinarias registradas. ¡Felicitaciones por mantener un comportamiento respetuoso!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {portalData.behaviorRecords.map(rec => {
                      const isPositive = rec.type === 'positive' || rec.type === 'recognition' || rec.type === 'participation';
                      return (
                        <div
                          key={rec.id}
                          className={`p-4 rounded-2xl border space-y-2 ${
                            isPositive
                              ? 'bg-emerald-950/20 border-emerald-500/30'
                              : 'bg-rose-950/20 border-rose-500/30'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                isPositive
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-rose-500/20 text-rose-300'
                              }`}
                            >
                              {isPositive ? 'Reconocimiento / Mérito' : 'Llamado de Atención / Falta'}
                            </span>
                            <span className="text-[11px] text-slate-400">{rec.date}</span>
                          </div>
                          <h4 className="text-sm font-bold text-white">{rec.title}</h4>
                          <p className="text-xs text-slate-300">{rec.description}</p>
                          {rec.observation && (
                            <p className="text-xs text-slate-400 italic bg-slate-950/50 p-2.5 rounded-lg border border-slate-800">
                              Nota docente: "{rec.observation}"
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: GUÍA DE CONSEJOS PARA EL HOGAR Y LA FAMILIA */}
            {activeTab === 'guidance' && (
              <div className="space-y-5 animate-fade-in">
                {/* ENCABEZADO */}
                <div className="p-4 bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-slate-900 border border-indigo-500/30 rounded-2xl flex items-start gap-3">
                  <HeartHandshake className="w-6 h-6 text-amber-300 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-white">Consejos Pedagógicos para el Estudiante y su Familia</h3>
                    <p className="text-xs text-indigo-200/80">
                      Pautas prácticas para fortalecer el rendimiento escolar, la disciplina en el aula y los hábitos de convivencia en casa.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* CONSEJO 1: HÁBITOS DE ESTUDIO Y ENTREGA DE TAREAS */}
                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2 text-brand-400 font-bold text-xs uppercase tracking-wider">
                      <BookOpen className="w-4 h-4" />
                      <span>1. Entrega Oportuna de Actividades</span>
                    </div>
                    <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside leading-relaxed">
                      <li>
                        <strong>Establece un horario fijo de estudio:</strong> Dedica diariamente entre 45 y 60 minutos al llegar del colegio para adelantar guías y tareas.
                      </li>
                      <li>
                        <strong>Espacio sin distracciones:</strong> Apaga la televisión y evita revisar redes sociales o videojuegos mientras resuelves tus compromisos.
                      </li>
                      <li>
                        <strong>No esperes al último día:</strong> Las dudas se resuelven mejor con tiempo. Pregunta a tu docente con días de anticipación.
                      </li>
                    </ul>
                  </div>

                  {/* CONSEJO 2: CONVIVENCIA EN CASA Y COLEGIO */}
                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
                      <Sparkles className="w-4 h-4" />
                      <span>2. Cómo Portarse en Casa y Clase</span>
                    </div>
                    <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside leading-relaxed">
                      <li>
                        <strong>Respeto y escucha activa:</strong> Atiende las indicaciones de tus padres y profesores a la primera señal, sin discutir irrespetuosamente.
                      </li>
                      <li>
                        <strong>Colabora en las tareas del hogar:</strong> Ordenar tu cuarto, tender tu cama y cuidar tus útiles fortalece tu responsabilidad escolar.
                      </li>
                      <li>
                        <strong>Diálogo ante las diferencias:</strong> Expresa tus emociones con serenidad. Si algo te disgusta, dialoga con respeto en lugar de reaccionar con enojo.
                      </li>
                    </ul>
                  </div>

                  {/* CONSEJO 3: PUNTUALIDAD Y DESCANSO */}
                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                      <CalendarCheck2 className="w-4 h-4" />
                      <span>3. Puntualidad y Rutina Diaria</span>
                    </div>
                    <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside leading-relaxed">
                      <li>
                        <strong>La noche anterior:</strong> Alista tu maleta, cuadernos, cartuchera y uniforme desde la noche para evitar prisas matutinas.
                      </li>
                      <li>
                        <strong>Descanso de 8 a 9 horas:</strong> Irte a dormir temprano permite que tu cerebro consolide lo aprendido y llegues con energía.
                      </li>
                      <li>
                        <strong>Llegar 10 minutos antes:</strong> La puntualidad demuestra respeto hacia el profesor y hacia tus compañeros.
                      </li>
                    </ul>
                  </div>

                  {/* CONSEJO 4: GUÍA PARA PADRES Y ACUDIENTES */}
                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                      <Home className="w-4 h-4" />
                      <span>4. Rol de los Padres y Acudientes</span>
                    </div>
                    <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside leading-relaxed">
                      <li>
                        <strong>Revisión diaria:</strong> Pregúntele hoy a su hijo: <em>"¿Qué viste en clase? ¿Qué actividades tienes pendientes para esta semana?"</em>
                      </li>
                      <li>
                        <strong>Felicite los logros:</strong> Reconozca su esfuerzo cuando entregue a tiempo o reciba un mérito; la motivación positiva transforma vidas.
                      </li>
                      <li>
                        <strong>Alianza con el docente:</strong> Ante llamados de atención, converse serenamente con su hijo y establezcan compromisos en casa.
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* PIE DE PÁGINA */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 px-4 text-center text-[11px] text-slate-600">
        <p>Sistema de Gestión Escolar • Portal de Acceso Estudiantil y Familiar • Solo Consulta</p>
      </footer>
    </div>
  );
};

export default StudentPortalPage;
