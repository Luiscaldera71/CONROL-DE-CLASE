import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  QrCode,
  Zap,
  Users,
  BookOpen,
  Printer,
  CheckCircle,
  AlertTriangle,
  Award,
  ChevronRight,
  CalendarCheck2,
  Calendar,
  Sparkles,
  GraduationCap,
  FileSpreadsheet,
  TrendingUp
} from 'lucide-react';
import { useCourse } from '../context/CourseContext';
import { useAuth } from '../context/AuthContext';
import { calculateStudentRisk } from '../utils/riskEngine';
import { calculateStudentWeightedAverage } from '../utils/gradeUtils';
import { ATTENDANCE_WEIGHTS, getStudentAttendanceStats } from '../utils/attendanceUtils';
import { getLocalDateString, getColombiaDayName, formatColombiaFullDate, formatTime12h } from '../utils/dateUtils';

export const HomePage: React.FC = () => {
  const { activeCourse, students, activities, submissions, attendanceSessions, behaviorRecords } = useCourse();
  const { teacherProfile } = useAuth();
  const navigate = useNavigate();

  // Settings
  const settings = teacherProfile?.settings || {
    gradeScale: { min: 0, max: 5, passingGrade: 3.0 },
    riskThresholds: { minGrade: 3.0, minAttendanceRate: 75, maxUnsubmitted: 3 },
    periods: ['Periodo 1'],
    behaviorCategories: []
  };

  const courseActivities = activities.filter(a => !activeCourse || a.courseId === activeCourse.id);
  const courseSubmissions = submissions.filter(s => courseActivities.some(a => a.id === s.activityId));

  const riskEvaluations = students.map(student =>
    calculateStudentRisk(student, courseActivities, courseSubmissions, attendanceSessions, settings)
  );

  const highRiskStudents = riskEvaluations.filter(r => r.level === 'high');
  const mediumRiskStudents = riskEvaluations.filter(r => r.level === 'medium');

  // Promedio global
  const gradedSubs = courseSubmissions.filter(s => s.grade !== null && s.grade !== undefined);
  const globalAverage = gradedSubs.length > 0
    ? (gradedSubs.reduce((acc, curr) => acc + (curr.grade || 0), 0) / gradedSubs.length).toFixed(1)
    : '—';

  // Porcentaje global de entregas
  const totalSubmissionsExpected = students.length * courseActivities.length;
  const deliveredCount = courseSubmissions.filter(s => s.status === 'delivered' || s.status === 'late').length;
  const deliveryRate = totalSubmissionsExpected > 0
    ? Math.round((deliveredCount / totalSubmissionsExpected) * 100)
    : 0;

  // Asistencia del curso
  let totalAttendances = 0;
  let presentAttendances = 0;
  const activeStudentIds = new Set(students.map(s => s.id));
  attendanceSessions.forEach(session => {
    Object.values(session.records).forEach(r => {
      if (!activeStudentIds.has(r.studentId)) return;
      totalAttendances++;
      presentAttendances += ATTENDANCE_WEIGHTS[r.status];
    });
  });
  const attendanceRate = totalAttendances > 0
    ? Math.round((presentAttendances / totalAttendances) * 100)
    : 100;

  // Métricas integrales de Notas Definitivas (Ponderadas con asistencia y convivencia)
  const courseActs = activities.filter(a => !activeCourse || a.courseId === activeCourse.id);
  const courseActIds = new Set(courseActs.map(a => a.id));
  const weights = activeCourse?.componentWeights || { academic: 0.85, attendance: 0.15 };

  let countWithDefinitiva = 0;
  let countSinNotasDefinitiva = 0;
  let sumDefinitiva = 0;
  let countAprobadosDefinitiva = 0;

  students.forEach(student => {
    const studentSubs = submissions.filter(
      sub => sub.studentId === student.id && courseActIds.has(sub.activityId)
    );
    const weighted = calculateStudentWeightedAverage(courseActs, studentSubs);

    if (weighted.average === null) {
      countSinNotasDefinitiva++;
    } else {
      countWithDefinitiva++;

      // Asistencia del estudiante
      const stAttRate = getStudentAttendanceStats(attendanceSessions, student.id).rate;
      const stAttGrade = parseFloat(((stAttRate / 100) * 5.0).toFixed(1));

      // Convivencia: ajuste directo por décimas (+0.1, +0.2, -0.1, -0.2)
      const stBeh = behaviorRecords.filter(b => b.studentId === student.id);
      let ap = 0;
      let rec = 0;
      let llam = 0;
      let inc = 0;
      stBeh.forEach(b => {
        if (b.type === 'recognition') rec++;
        else if (b.type === 'positive' || b.type === 'participation' || b.type === 'social') ap++;
        else if (b.type === 'warning') llam++;
        else if (b.type === 'non_compliance' || b.type === 'negative') inc++;
      });
      const convivenciaAdjustment = (ap * 0.1) + (rec * 0.2) - (llam * 0.1) - (inc * 0.2);

      const baseGrade = (weighted.average * weights.academic) + (stAttGrade * weights.attendance);
      const def = Math.min(5.0, Math.max(1.0, parseFloat((baseGrade + convivenciaAdjustment).toFixed(1))));
      sumDefinitiva += def;
      if (def >= 3.0) countAprobadosDefinitiva++;
    }
  });

  const finalAvgFormatted = countWithDefinitiva > 0
    ? (sumDefinitiva / countWithDefinitiva).toFixed(1)
    : '—';
  const finalPassingRate = countWithDefinitiva > 0
    ? Math.round((countAprobadosDefinitiva / countWithDefinitiva) * 100)
    : 0;

  const currentDayName = getColombiaDayName();
  const hasClassToday = activeCourse?.scheduleDays ? activeCourse.scheduleDays.includes(currentDayName) : true;
  const todayStr = formatColombiaFullDate();

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-12">
      {/* ========================================================
          HERO CARD (Estilo AbsenSiswa Screen 3)
          Tarjeta azul profunda con status del día y botón rápido
         ======================================================== */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 rounded-3xl p-5 md:p-7 text-white shadow-xl shadow-blue-500/20">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-blue-200 uppercase tracking-wider block">
                Control de Aula • {activeCourse?.name || 'Selecciona un Curso'}
              </span>
              {hasClassToday ? (
                <span className="bg-emerald-500/25 text-emerald-200 border border-emerald-400/30 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                  ✓ Hoy dictas clase ({currentDayName}{activeCourse?.scheduleTime ? ` • ${formatTime12h(activeCourse.scheduleTime)}${activeCourse.scheduleEndTime ? ` - ${formatTime12h(activeCourse.scheduleEndTime)}` : ''}` : ''})
                </span>
              ) : (
                <span className="bg-white/10 text-blue-100 px-2 py-0.5 rounded-full text-[10px] font-medium">
                  Hoy no dictas este curso ({activeCourse?.scheduleDays?.join(', ') || 'Sin días'})
                </span>
              )}
            </div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-white capitalize">
              {todayStr}
            </h1>
            <p className="text-xs text-blue-100 max-w-md">
              Docente: <span className="font-bold">{teacherProfile?.displayName || 'Profesor'}</span> • Materia: <span className="font-bold">{activeCourse?.subject || 'General'}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="bg-white/15 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-2 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-xs font-bold text-white">{attendanceRate}% Asistencia</span>
            </div>

            <button
              onClick={() => navigate('/scanner')}
              className="bg-white text-blue-700 hover:bg-blue-50 font-black text-xs px-4 py-2.5 rounded-2xl shadow-md transition-all active:scale-95 flex items-center gap-2"
            >
              <QrCode className="w-4 h-4 text-blue-600" />
              <span>Escanear QR</span>
            </button>
          </div>
        </div>

        {/* Círculos decorativos sutiles */}
        <div className="absolute -right-8 -bottom-10 w-40 h-40 rounded-full bg-white/10 pointer-events-none"></div>
        <div className="absolute right-24 -top-8 w-28 h-28 rounded-full bg-white/5 pointer-events-none"></div>
      </div>

      {/* ========================================================
          ACCIONES FRECUENTES EN CUADRÍCULA (SQUIRCLES AbsenSiswa)
         ======================================================== */}
      <div>
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-1">
          Acciones Principales
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {/* Check In / Escaneo */}
          <button
            onClick={() => navigate('/scanner')}
            className="bg-white hover:bg-slate-50 border border-slate-200/90 rounded-3xl p-4 flex flex-col items-center justify-center text-center gap-2.5 shadow-xs transition-all hover:border-blue-300 hover:shadow-md active:scale-95 touch-manipulation"
          >
            <div className="w-13 h-13 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <span className="block font-bold text-xs text-slate-900">Escanear QR</span>
              <span className="text-[10px] text-slate-400 font-medium">Asistencia Cámara</span>
            </div>
          </button>

          {/* Historial Asistencia */}
          <button
            onClick={() => navigate('/attendance')}
            className="bg-white hover:bg-slate-50 border border-slate-200/90 rounded-3xl p-4 flex flex-col items-center justify-center text-center gap-2.5 shadow-xs transition-all hover:border-emerald-300 hover:shadow-md active:scale-95 touch-manipulation"
          >
            <div className="w-13 h-13 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <CalendarCheck2 className="w-6 h-6" />
            </div>
            <div>
              <span className="block font-bold text-xs text-slate-900">Pasar Lista</span>
              <span className="text-[10px] text-slate-400 font-medium">Historial & Fechas</span>
            </div>
          </button>

          {/* Actividades / Tareas */}
          <button
            onClick={() => navigate('/activities')}
            className="bg-white hover:bg-slate-50 border border-slate-200/90 rounded-3xl p-4 flex flex-col items-center justify-center text-center gap-2.5 shadow-xs transition-all hover:border-purple-300 hover:shadow-md active:scale-95 touch-manipulation"
          >
            <div className="w-13 h-13 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <span className="block font-bold text-xs text-slate-900">Actividades</span>
              <span className="text-[10px] text-slate-400 font-medium">Calificar Tareas</span>
            </div>
          </button>

          {/* NOTAS DEFINITIVAS (Botón solicitado por el docente) */}
          <button
            onClick={() => navigate('/definitivas')}
            className="bg-gradient-to-b from-white to-blue-50/40 hover:to-blue-100/60 border border-blue-200 rounded-3xl p-4 flex flex-col items-center justify-center text-center gap-2.5 shadow-xs transition-all hover:border-blue-400 hover:shadow-md active:scale-95 touch-manipulation group"
          >
            <div className="w-13 h-13 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/25 group-hover:scale-105 transition-transform">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <span className="block font-black text-xs text-blue-900">Notas Definitivas</span>
              <span className="text-[10px] text-blue-600 font-bold">Consolidado & Excel</span>
            </div>
          </button>

          {/* Carnés QR */}
          <button
            onClick={() => navigate('/qr-cards')}
            className="bg-white hover:bg-slate-50 border border-slate-200/90 rounded-3xl p-4 flex flex-col items-center justify-center text-center gap-2.5 shadow-xs transition-all hover:border-amber-300 hover:shadow-md active:scale-95 touch-manipulation col-span-2 sm:col-span-1"
          >
            <div className="w-13 h-13 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
              <Printer className="w-6 h-6" />
            </div>
            <div>
              <span className="block font-bold text-xs text-slate-900">Carnés QR</span>
              <span className="text-[10px] text-slate-400 font-medium">Descargar PDF</span>
            </div>
          </button>
        </div>
      </div>

      {/* ========================================================
          KPIs / RESUMEN GENERAL (Tarjetas Blancas Pulcras)
         ======================================================== */}
      <div>
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-1">
          Resumen del Curso
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Estudiantes */}
          <div
            onClick={() => navigate('/students')}
            className="bg-white border border-slate-200/90 rounded-3xl p-4 cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-[11px] font-bold">Estudiantes</span>
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">{students.length}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">En lista activa</div>
          </div>

          {/* Asistencia Global */}
          <div
            onClick={() => navigate('/attendance')}
            className="bg-white border border-slate-200/90 rounded-3xl p-4 cursor-pointer hover:border-emerald-300 hover:shadow-sm transition-all"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-[11px] font-bold">Asistencia</span>
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-600">{attendanceRate}%</div>
            <div className="text-[10px] text-slate-400 mt-0.5">{attendanceSessions.length} sesiones registradas</div>
          </div>

          {/* Entregas */}
          <div
            onClick={() => navigate('/activities')}
            className="bg-white border border-slate-200/90 rounded-3xl p-4 cursor-pointer hover:border-indigo-300 hover:shadow-sm transition-all"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-[11px] font-bold">Entregas</span>
              <BookOpen className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-black text-indigo-600">{deliveryRate}%</div>
            <div className="text-[10px] text-slate-400 mt-0.5">{activities.length} actividades activas</div>
          </div>

          {/* Promedio Evaluaciones */}
          <div
            onClick={() => navigate('/grades')}
            className="bg-white border border-slate-200/90 rounded-3xl p-4 cursor-pointer hover:border-amber-300 hover:shadow-sm transition-all"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-[11px] font-bold">Prom. Tareas</span>
              <Award className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black text-amber-600">{globalAverage}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Actividades evaluadas</div>
          </div>

          {/* NOTAS DEFINITIVAS (Métrica Directa Solicitada) */}
          <div
            onClick={() => navigate('/definitivas')}
            className="bg-gradient-to-br from-blue-50/70 via-white to-indigo-50/40 border border-blue-200 rounded-3xl p-4 cursor-pointer hover:border-blue-400 hover:shadow-md transition-all col-span-2 lg:col-span-1"
          >
            <div className="flex items-center justify-between text-blue-900 mb-1.5">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-700">Definitiva Curso</span>
              <GraduationCap className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-blue-900">{finalAvgFormatted}</span>
              <span className="text-xs text-blue-500 font-bold">/ 5.0</span>
            </div>
            <div className="text-[10px] text-blue-600 font-semibold mt-0.5">
              {countWithDefinitiva > 0
                ? `${finalPassingRate}% pasan (${countWithDefinitiva} eval.)`
                : `${countSinNotasDefinitiva} est. pendientes`}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          ALERTAS ACADÉMICAS / SEGUIMIENTO
         ======================================================== */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Estudiantes en Seguimiento</h2>
              <p className="text-[11px] text-slate-500">Alertas por inasistencias o tareas pendientes</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1"
          >
            <span>Ver todo</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {highRiskStudents.length === 0 && mediumRiskStudents.length === 0 ? (
          <div className="p-6 text-center text-slate-500 bg-slate-50 rounded-2xl border border-slate-100">
            <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-800">¡Todo al día!</p>
            <p className="text-[11px] text-slate-500 mt-0.5">No hay estudiantes en situación de riesgo en este curso.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {[...highRiskStudents, ...mediumRiskStudents].slice(0, 4).map(evalData => (
              <div
                key={evalData.studentId}
                onClick={() => navigate(`/students/${evalData.studentId}`)}
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/70 hover:bg-slate-100/70 border border-slate-100 cursor-pointer transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                    {evalData.studentName[0]}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">{evalData.studentName}</span>
                    <span className="text-[10px] text-slate-500">N° {evalData.listNumber || '—'} • {evalData.reasons[0] || 'Alerta académica'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                    evalData.level === 'high'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {evalData.level === 'high' ? 'Riesgo Alto' : 'En Seguimiento'}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
