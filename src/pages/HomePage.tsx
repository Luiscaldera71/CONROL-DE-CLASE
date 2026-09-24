import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  QrCode,
  Zap,
  Users,
  BookOpen,
  Printer,
  TrendingDown,
  CheckCircle,
  AlertTriangle,
  Award,
  ChevronRight,
  GraduationCap,
  Database,
  PlusCircle,
  Sparkles
} from 'lucide-react';
import { useCourse } from '../context/CourseContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { calculateStudentRisk } from '../utils/riskEngine';

export const HomePage: React.FC = () => {
  const { courses, activeCourse, students, activities, submissions, attendanceSessions } = useCourse();
  const { teacherProfile } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Cálculo de alertas del curso activo
  const settings = teacherProfile?.settings || {
    gradeScale: { min: 0, max: 5, passingGrade: 3.0 },
    riskThresholds: { minGrade: 3.0, minAttendanceRate: 75, maxUnsubmitted: 3 },
    periods: ['Periodo 1'],
    behaviorCategories: []
  };

  const riskEvaluations = students.map(student =>
    calculateStudentRisk(student, activities, submissions, attendanceSessions, settings)
  );

  const highRiskStudents = riskEvaluations.filter(r => r.level === 'high');
  const mediumRiskStudents = riskEvaluations.filter(r => r.level === 'medium');

  // Promedio global del curso
  const gradedSubs = submissions.filter(s => s.grade !== null && s.grade !== undefined);
  const globalAverage = gradedSubs.length > 0
    ? (gradedSubs.reduce((acc, curr) => acc + (curr.grade || 0), 0) / gradedSubs.length).toFixed(1)
    : '—';

  // Porcentaje global de entregas
  const totalSubmissionsExpected = students.length * activities.length;
  const deliveredCount = submissions.filter(s => s.status === 'delivered' || s.status === 'late').length;
  const deliveryRate = totalSubmissionsExpected > 0
    ? Math.round((deliveredCount / totalSubmissionsExpected) * 100)
    : 0;

  // Porcentaje promedio de asistencia
  let totalAttendances = 0;
  let presentAttendances = 0;
  attendanceSessions.forEach(session => {
    Object.values(session.records).forEach(r => {
      totalAttendances++;
      if (r.status === 'present' || r.status === 'excused') presentAttendances++;
      else if (r.status === 'late') presentAttendances += 0.8;
    });
  });
  const attendanceRate = totalAttendances > 0
    ? Math.round((presentAttendances / totalAttendances) * 100)
    : 100;

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* SALUDO Y ENCABEZADO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 p-4 md:p-6 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">👋</span>
            <h1 className="text-lg md:text-2xl font-bold text-white tracking-tight">
              Hola, {teacherProfile?.displayName?.split(' ')[0] || 'Profesor'}
            </h1>
          </div>
          <p className="text-xs md:text-sm text-slate-400">
            {activeCourse ? (
              <>
                Curso seleccionado: <strong className="text-brand-300 font-semibold">{activeCourse.name}</strong> • {activeCourse.subject} ({activeCourse.currentPeriod})
              </>
            ) : (
              <span>Institución: <strong className="text-brand-300 font-semibold">{teacherProfile?.institution || 'Sin asignar'}</strong></span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeCourse && (
            <button
              onClick={() => navigate('/scanner')}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white rounded-xl font-bold text-sm shadow-touch active:scale-95 transition-all"
            >
              <QrCode className="w-4 h-4" />
              <span>Escanear QR</span>
            </button>
          )}
        </div>
      </div>

      {/* BANNER DE BIENVENIDA SI AÚN NO TIENE CURSOS EN SU CUENTA */}
      {courses.length === 0 && (
        <div className="bg-gradient-to-br from-indigo-950/70 via-slate-900 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 md:p-8 text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <GraduationCap className="w-9 h-9" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold text-white tracking-tight">
              ¡Bienvenido a AulaControl! Tu cuenta está conectada a Firestore.
            </h2>
            <p className="text-xs md:text-sm text-slate-300 max-w-lg mx-auto">
              Para comenzar a gestionar tu clase, crea tu primer grupo académico o importa el listado de tus estudiantes desde un archivo de Excel.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => navigate('/courses')}
              className="w-full sm:w-auto px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs md:text-sm font-bold shadow-lg shadow-brand-500/25 transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Crear mi Primer Curso</span>
            </button>
            <button
              onClick={() => navigate('/students')}
              className="w-full sm:w-auto px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs md:text-sm font-semibold transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <Users className="w-4 h-4" />
              <span>Gestionar e Importar Estudiantes</span>
            </button>
          </div>
        </div>
      )}

      {/* MÉTRICAS CLAVE (KPIs) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 md:gap-4">
        {/* Estudiantes */}
        <div
          onClick={() => navigate('/students')}
          className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 p-3.5 rounded-xl cursor-pointer transition-all active:scale-95"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Estudiantes</span>
            <Users className="w-4 h-4 text-brand-400" />
          </div>
          <div className="text-2xl font-black text-white">{students.length}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">En lista activa</div>
        </div>

        {/* Asistencia */}
        <div
          onClick={() => navigate('/attendance')}
          className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 p-3.5 rounded-xl cursor-pointer transition-all active:scale-95"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Asistencia</span>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">{attendanceRate}%</div>
          <div className="text-[10px] text-slate-400 mt-0.5">{attendanceSessions.length} sesiones registradas</div>
        </div>

        {/* Actividades Entregadas */}
        <div
          onClick={() => navigate('/activities')}
          className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 p-3.5 rounded-xl cursor-pointer transition-all active:scale-95"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Entregas</span>
            <BookOpen className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-indigo-400">{deliveryRate}%</div>
          <div className="text-[10px] text-slate-400 mt-0.5">{activities.length} actividades activas</div>
        </div>

        {/* Promedio General */}
        <div
          onClick={() => navigate('/grades')}
          className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 p-3.5 rounded-xl cursor-pointer transition-all active:scale-95"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Promedio</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">{globalAverage}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Escala {settings.gradeScale.min} - {settings.gradeScale.max}</div>
        </div>

        {/* Alertas Académicas */}
        <div
          onClick={() => navigate('/dashboard')}
          className="col-span-2 lg:col-span-1 bg-slate-900/90 border border-rose-900/40 hover:border-rose-700/60 p-3.5 rounded-xl cursor-pointer transition-all active:scale-95"
        >
          <div className="flex items-center justify-between text-rose-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Atención</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400">{highRiskStudents.length}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">+{mediumRiskStudents.length} en seguimiento</div>
        </div>
      </div>

      {/* ACCIONES RÁPIDAS EN EL AULA (TÁCTILES, BOTONES GRANDES) */}
      <div>
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 px-1">
          Acciones Frecuentes en el Aula
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Botón Principal: Escanear */}
          <button
            onClick={() => navigate('/scanner')}
            className="flex flex-col items-center justify-center p-4 bg-gradient-to-b from-brand-600 to-indigo-700 hover:from-brand-500 hover:to-indigo-600 rounded-2xl text-white shadow-touch active:scale-95 transition-all text-center gap-2"
          >
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <QrCode className="w-7 h-7" />
            </div>
            <div>
              <span className="block font-bold text-sm">Escanear Estudiante</span>
              <span className="text-[10px] text-brand-100 opacity-90">Acción instantánea</span>
            </div>
          </button>

          {/* Asistencia Rápida */}
          <button
            onClick={() => navigate('/attendance/quick-scan')}
            className="flex flex-col items-center justify-center p-4 bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl text-white active:scale-95 transition-all text-center gap-2"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Zap className="w-7 h-7" />
            </div>
            <div>
              <span className="block font-bold text-sm">Asistencia Rápida</span>
              <span className="text-[10px] text-slate-400">Escaneo continuo</span>
            </div>
          </button>

          {/* Control Entregas */}
          <button
            onClick={() => navigate('/activities')}
            className="flex flex-col items-center justify-center p-4 bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl text-white active:scale-95 transition-all text-center gap-2"
          >
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <BookOpen className="w-7 h-7" />
            </div>
            <div>
              <span className="block font-bold text-sm">Revisar Actividades</span>
              <span className="text-[10px] text-slate-400">Entregas y notas</span>
            </div>
          </button>

          {/* Imprimir Carnés QR */}
          <button
            onClick={() => navigate('/qr-cards')}
            className="flex flex-col items-center justify-center p-4 bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl text-white active:scale-95 transition-all text-center gap-2"
          >
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Printer className="w-7 h-7" />
            </div>
            <div>
              <span className="block font-bold text-sm">Carnés QR</span>
              <span className="text-[10px] text-slate-400">Imprimir hoja A4</span>
            </div>
          </button>
        </div>
      </div>

      {/* SECCIÓN "¿QUIÉNES NECESITAN ATENCIÓN?" (EXPLICABLE Y CONFIGURABLE) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 md:p-5">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
            <div>
              <h2 className="text-sm md:text-base font-bold text-white">¿Quiénes necesitan atención?</h2>
              <p className="text-[11px] text-slate-400">Estudiantes con alertas basadas en los umbrales configurados</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-xs text-brand-400 hover:text-brand-300 font-semibold flex items-center gap-1"
          >
            <span>Ver todo</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {highRiskStudents.length === 0 && mediumRiskStudents.length === 0 ? (
          <div className="p-6 text-center text-slate-400 bg-slate-950/40 rounded-xl border border-slate-800/60">
            <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-white">¡Excelente! Ningún estudiante presenta alertas críticas hoy.</p>
            <p className="text-xs mt-1">Todos se encuentran por encima de los umbrales de nota y asistencia.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {highRiskStudents.slice(0, 4).map(alert => (
              <div
                key={alert.studentId}
                onClick={() => navigate(`/students/${alert.studentId}`)}
                className="p-3 bg-rose-950/20 border border-rose-900/30 hover:border-rose-700/50 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 cursor-pointer transition-colors"
              >
                <div className="flex items-start gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 mt-1 shrink-0 animate-pulse"></span>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white text-sm">
                        #{String(alert.listNumber).padStart(2, '0')} {alert.studentName}
                      </span>
                      <span className="text-[10px] bg-rose-500/20 text-rose-300 font-semibold px-2 py-0.5 rounded-full border border-rose-500/30">
                        Atención prioritaria
                      </span>
                    </div>
                    {/* Motivos explicados de la alerta */}
                    <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] text-rose-200/80">
                      {alert.reasons.map((r, i) => (
                        <span key={i} className="bg-rose-950/50 px-2 py-0.5 rounded-md border border-rose-800/40">
                          • {r}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                  <div className="text-right text-xs">
                    <div className="text-slate-400">Promedio: <strong className="text-rose-300 font-bold">{alert.currentAverage}</strong></div>
                    <div className="text-slate-400">Asistencia: <strong className="text-slate-200">{alert.attendanceRate}%</strong></div>
                  </div>
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
