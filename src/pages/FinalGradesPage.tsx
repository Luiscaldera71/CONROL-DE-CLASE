import React, { useState } from 'react';
import {
  GraduationCap,
  Download,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  Award,
  Sparkles,
  CalendarCheck2,
  BookOpen,
  Sliders,
  ChevronRight,
  X,
  FileSpreadsheet,
  Info,
  TrendingUp,
  AlertCircle,
  HeartHandshake
} from 'lucide-react';
import { useCourse } from '../context/CourseContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { excelService } from '../services/excelService';
import { Student, ComponentWeights } from '../types';
import { calculateStudentWeightedAverage } from '../utils/gradeUtils';
import { getColombiaDateString } from '../utils/dateUtils';
import { getStudentAttendanceStats } from '../utils/attendanceUtils';

const DEFAULT_WEIGHTS: ComponentWeights = {
  academic: 0.85,
  attendance: 0.15
};

export const FinalGradesPage: React.FC = () => {
  const { students, activities, submissions, attendanceSessions, behaviorRecords, activeCourse, updateCourse } = useCourse();
  const { teacherProfile } = useAuth();
  const { showToast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState<'all' | 'superior' | 'alto' | 'basico' | 'bajo' | 'sin_notas'>('all');

  // Obtener ponderación guardada del curso o de localStorage
  const getInitialWeights = (): ComponentWeights => {
    if (activeCourse?.componentWeights) {
      const cw = activeCourse.componentWeights;
      if (typeof cw.academic === 'number' && typeof cw.attendance === 'number') {
        const total = cw.academic + cw.attendance;
        if (total > 0) {
          return {
            academic: parseFloat((cw.academic / total).toFixed(2)),
            attendance: parseFloat((1 - (cw.academic / total)).toFixed(2))
          };
        }
      }
    }
    if (activeCourse?.id) {
      const stored = localStorage.getItem(`aulacontrol_weights_${activeCourse.id}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (typeof parsed.academic === 'number' && typeof parsed.attendance === 'number') {
            const total = parsed.academic + parsed.attendance;
            if (total > 0) {
              return {
                academic: parseFloat((parsed.academic / total).toFixed(2)),
                attendance: parseFloat((1 - (parsed.academic / total)).toFixed(2))
              };
            }
          }
        } catch (e) {
          // ignore
        }
      }
    }
    return DEFAULT_WEIGHTS;
  };

  const [weights, setWeights] = useState<ComponentWeights>(getInitialWeights);
  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);
  const [selectedStudentForReport, setSelectedStudentForReport] = useState<Student | null>(null);

  // Cargar ponderaciones guardadas cuando cambia el curso activo
  React.useEffect(() => {
    if (activeCourse) {
      setWeights(getInitialWeights());
    }
  }, [activeCourse?.id, activeCourse?.componentWeights]);

  // Solo actividades del curso activo
  const courseActivities = activities.filter(a => !activeCourse || a.courseId === activeCourse.id);
  const courseActivityIds = new Set(courseActivities.map(a => a.id));

  // Helper para calcular métricas integrales de un estudiante
  const getStudentMetrics = (student: Student) => {
    // 1. Académico (Ponderado exactamente según porcentajes de actividades del curso activo)
    const studentSubs = submissions.filter(
      sub => sub.studentId === student.id && courseActivityIds.has(sub.activityId)
    );
    const weighted = calculateStudentWeightedAverage(courseActivities, studentSubs);
    const hasAcademicGrades = weighted.average !== null;
    const academicAvg = weighted.average; // number | null
    const deliveredCount = studentSubs.filter(sub => sub.status === 'delivered').length;

    // 2. Asistencia (Nota de 0.0 a 5.0 según porcentaje asistido)
    const attStats = getStudentAttendanceStats(attendanceSessions, student.id);
    const { absent: absentCount, late: lateCount, excused: excusedCount, rate: attendanceRate } = attStats;
    const attendanceGrade = parseFloat(((attendanceRate / 100) * 5.0).toFixed(1));

    // 3. Convivencia (Ajuste directo de décimas a la definitiva)
    // Aporte / Participación: +0.1
    // Reconocimiento: +0.2
    // Llamado de atención: -0.1
    // Incumplimiento: -0.2
    // Si no tiene novedades: 0.0 (no regala puntos)
    const studentBeh = behaviorRecords.filter(b => b.studentId === student.id);
    let aporteCount = 0;          // +0.1
    let reconocimientoCount = 0;  // +0.2
    let llamadoAtencionCount = 0; // -0.1
    let incumplimientoCount = 0;  // -0.2

    studentBeh.forEach(b => {
      if (b.type === 'recognition') {
        reconocimientoCount++;
      } else if (b.type === 'positive' || b.type === 'participation' || b.type === 'social') {
        aporteCount++;
      } else if (b.type === 'warning') {
        llamadoAtencionCount++;
      } else if (b.type === 'non_compliance' || b.type === 'negative') {
        incumplimientoCount++;
      }
    });

    const convivenciaAdjustment = parseFloat((
      (aporteCount * 0.1) +
      (reconocimientoCount * 0.2) -
      (llamadoAtencionCount * 0.1) -
      (incumplimientoCount * 0.2)
    ).toFixed(2));

    // 4. Nota Definitiva
    // CRÍTICO: Si el estudiante NO tiene notas académicas evaluadas, NO puede aprobar ni ganar
    // únicamente con asistencia y convivencia. La nota definitiva queda pendiente (null).
    let finalGrade: number | null = null;
    let level: 'SUPERIOR' | 'ALTO' | 'BÁSICO' | 'BAJO' | 'SIN NOTAS' | 'PENDIENTE' = 'SIN NOTAS';
    let levelColor = 'text-slate-600 bg-slate-100 border-slate-300';
    let diagnosis = '';

    if (!hasAcademicGrades) {
      if (courseActivities.length === 0) {
        level = 'SIN NOTAS';
        levelColor = 'text-slate-600 bg-slate-100 border-slate-300';
        diagnosis = 'Sin actividades académicas registradas en este curso. Debe crear actividades y registrar calificaciones para emitir la definitiva.';
      } else {
        level = 'PENDIENTE';
        levelColor = 'text-amber-800 bg-amber-50 border-amber-300';
        diagnosis = `Pendiente de calificación académica (0 de ${courseActivities.length} actividades evaluadas). No es posible aprobar la asignatura solo con asistencia y convivencia.`;
      }
    } else {
      // Base ponderada: Académico + Asistencia (100%)
      const baseGrade = (academicAvg! * weights.academic) + (attendanceGrade * weights.attendance);
      // Convivencia: Suma o resta directamente décimas
      finalGrade = Math.min(5.0, Math.max(1.0, parseFloat((baseGrade + convivenciaAdjustment).toFixed(1))));

      // 5. Escala Nacional MEN
      if (finalGrade >= 4.6) {
        level = 'SUPERIOR';
        levelColor = 'text-emerald-700 bg-emerald-50 border-emerald-300';
        diagnosis = 'Desempeño sobresaliente con excelente liderazgo y participación positiva.';
      } else if (finalGrade >= 4.0) {
        level = 'ALTO';
        levelColor = 'text-blue-700 bg-blue-50 border-blue-300';
        diagnosis = 'Rendimiento académico satisfactorio y adecuado comportamiento escolar.';
      } else if (finalGrade >= 3.0) {
        level = 'BÁSICO';
        levelColor = 'text-amber-700 bg-amber-50 border-amber-200';
        diagnosis = 'Alcanza los desempeños básicos necesarios; se recomienda reforzar hábitos de estudio.';
      } else {
        level = 'BAJO';
        levelColor = 'text-rose-700 bg-rose-50 border-rose-300';
        diagnosis = `Requiere plan de mejoramiento pedagógico inmediato (${absentCount} ausencias registradas y compromisos pendientes).`;
      }

      // Alertas complementarias
      if (absentCount >= 3 || (absentCount > 0 && attendanceRate < 75)) {
        diagnosis = `Alerta por inasistencias acumuladas (${absentCount} fallas). Puede comprometer la aprobación por inasistencia.`;
      } else if (convivenciaAdjustment < 0) {
        diagnosis = 'Registra llamados de atención o incumplimientos que disminuyeron su nota definitiva.';
      } else if (convivenciaAdjustment > 0) {
        diagnosis = 'Sus aportes destacados y reconocimientos de convivencia incrementaron su nota definitiva.';
      }
    }

    return {
      hasAcademicGrades,
      academicAvg,
      deliveredCount,
      totalActivities: courseActivities.length,
      attendanceRate,
      attendanceGrade,
      absentCount,
      lateCount,
      excusedCount,
      presentCount: attStats.present + attStats.excused + attStats.late,
      convivenciaAdjustment,
      positiveCount: aporteCount + reconocimientoCount,
      negativeCount: llamadoAtencionCount + incumplimientoCount,
      aporteCount,
      reconocimientoCount,
      llamadoAtencionCount,
      incumplimientoCount,
      finalGrade,
      level,
      levelColor,
      diagnosis
    };
  };

  // Cálculo global para estadísticas
  const studentMetricsList = students.map(s => ({
    student: s,
    metrics: getStudentMetrics(s)
  }));

  const gradedStudents = studentMetricsList.filter(item => item.metrics.finalGrade !== null);

  const globalAvg = gradedStudents.length > 0
    ? (gradedStudents.reduce((acc, curr) => acc + (curr.metrics.finalGrade || 0), 0) / gradedStudents.length).toFixed(1)
    : '—';

  const countSuperior = studentMetricsList.filter(item => item.metrics.level === 'SUPERIOR').length;
  const countAlto = studentMetricsList.filter(item => item.metrics.level === 'ALTO').length;
  const countBasico = studentMetricsList.filter(item => item.metrics.level === 'BÁSICO').length;
  const countBajo = studentMetricsList.filter(item => item.metrics.level === 'BAJO').length;
  const countSinNotas = studentMetricsList.filter(item => item.metrics.level === 'SIN NOTAS' || item.metrics.level === 'PENDIENTE').length;

  const passingPercent = gradedStudents.length > 0
    ? Math.round(((gradedStudents.length - countBajo) / gradedStudents.length) * 100)
    : 0;

  // Filtrado de alumnos
  const filteredList = studentMetricsList.filter(({ student, metrics }) => {
    const matchesSearch =
      student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.uniqueCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(student.listNumber) === searchTerm.trim() ||
      (student.documentNumber && student.documentNumber.includes(searchTerm.trim()));

    if (!matchesSearch) return false;

    if (filterLevel === 'all') return true;
    if (filterLevel === 'superior') return metrics.level === 'SUPERIOR';
    if (filterLevel === 'alto') return metrics.level === 'ALTO';
    if (filterLevel === 'basico') return metrics.level === 'BÁSICO';
    if (filterLevel === 'bajo') return metrics.level === 'BAJO';
    if (filterLevel === 'sin_notas') return metrics.level === 'SIN NOTAS' || metrics.level === 'PENDIENTE';

    return true;
  });

  const handleExportExcel = () => {
    if (!activeCourse) return;
    excelService.exportFinalGrades({
      course: activeCourse,
      students,
      activities,
      submissions,
      attendanceSessions,
      behaviorRecords,
      weights
    });
    showToast(`✓ Informe de Notas Definitivas exportado a Excel con fórmulas y colores`, 'success');
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto pb-12">
      {/* CABECERA PRINCIPAL */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-blue-600" />
            <span>Notas Definitivas y Consolidado Integral</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Curso <strong className="text-slate-800">{activeCourse?.name}</strong> • Ponderación: Académico {Math.round(weights.academic * 100)}%, Asistencia {Math.round(weights.attendance * 100)}% • Convivencia por aporte/descuento de décimas (+0.1, +0.2, -0.1, -0.2)
          </p>
        </div>

        {/* ACCIONES SUPERIORES */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Configurar Ponderación */}
          <button
            onClick={() => setIsWeightModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold shadow-xs transition-all"
            title="Ajustar porcentaje asignado a notas académicas y asistencia"
          >
            <Sliders className="w-4 h-4 text-slate-500" />
            <span>Ponderación</span>
          </button>

          {/* Exportar a Excel */}
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
            title="Exportar planilla Excel con fórmulas automáticas para cambiar notas"
          >
            <Download className="w-4 h-4" />
            <span>Exportar Excel (Fórmulas)</span>
          </button>
        </div>
      </div>

      {/* MÉTRICAS GLOBALES DEL CURSO */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white border border-slate-200/90 p-3.5 rounded-2xl shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Promedio Definitivo</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-blue-600">{globalAvg}</span>
            <span className="text-xs text-slate-400">/ 5.0</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">{gradedStudents.length} con notas</span>
        </div>

        <div className="bg-white border border-slate-200/90 p-3.5 rounded-2xl shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Tasa Aprobación</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-emerald-600">{passingPercent}%</span>
            <span className="text-xs text-slate-400">({Math.max(0, gradedStudents.length - countBajo)} est.)</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Sobre evaluados</span>
        </div>

        <div className="bg-white border border-slate-200/90 p-3.5 rounded-2xl shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Nivel Superior y Alto</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-blue-700">{countSuperior + countAlto}</span>
            <span className="text-xs text-slate-400">destacados</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Sobresalientes</span>
        </div>

        <div className="bg-white border border-slate-200/90 p-3.5 rounded-2xl shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">En Riesgo (Bajo)</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-rose-600">{countBajo}</span>
            <span className="text-xs text-slate-400">reprobando</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Plan de mejora</span>
        </div>

        <div className="bg-white border border-slate-200/90 p-3.5 rounded-2xl shadow-xs col-span-2 sm:col-span-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Sin Calificaciones</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-600">{countSinNotas}</span>
            <span className="text-xs text-slate-400">pendientes</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Requiere evaluar</span>
        </div>
      </div>

      {/* BARRA DE BÚSQUEDA Y FILTROS POR DESEMPEÑO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex-1 bg-white border border-slate-200/90 rounded-2xl px-3.5 py-2.5 flex items-center gap-2 shadow-xs">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar estudiante por nombre, documento o código..."
            className="w-full bg-transparent text-xs text-slate-900 placeholder-slate-400 focus:outline-none font-medium"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="text-slate-400 hover:text-slate-600 text-xs">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filtros por Escala MEN */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 bg-slate-100/80 p-1 rounded-2xl border border-slate-200/80 shrink-0">
          <button
            onClick={() => setFilterLevel('all')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterLevel === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Todos ({students.length})
          </button>
          <button
            onClick={() => setFilterLevel('superior')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterLevel === 'superior' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500 hover:text-emerald-700'
            }`}
          >
            Superior ({countSuperior})
          </button>
          <button
            onClick={() => setFilterLevel('alto')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterLevel === 'alto' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500 hover:text-blue-700'
            }`}
          >
            Alto ({countAlto})
          </button>
          <button
            onClick={() => setFilterLevel('basico')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterLevel === 'basico' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-500 hover:text-amber-700'
            }`}
          >
            Básico ({countBasico})
          </button>
          <button
            onClick={() => setFilterLevel('bajo')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterLevel === 'bajo' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-500 hover:text-rose-700'
            }`}
          >
            Bajo ({countBajo})
          </button>
          <button
            onClick={() => setFilterLevel('sin_notas')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterLevel === 'sin_notas' ? 'bg-slate-700 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Sin Notas ({countSinNotas})
          </button>
        </div>
      </div>

      {/* TABLA PRINCIPAL DE CONSOLIDADO */}
      <div className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/90 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3 w-10 text-center">N°</th>
                <th className="py-3 px-3 min-w-[200px]">Estudiante</th>
                <th className="py-3 px-3 text-center min-w-[120px] bg-blue-50/40 text-blue-900">
                  Académico ({Math.round(weights.academic * 100)}%)
                </th>
                <th className="py-3 px-3 text-center min-w-[120px] bg-emerald-50/40 text-emerald-900">
                  Asistencia ({Math.round(weights.attendance * 100)}%)
                </th>
                <th className="py-3 px-3 text-center min-w-[120px] bg-purple-50/40 text-purple-900">
                  Convivencia (Ajuste)
                </th>
                <th className="py-3 px-3 text-center min-w-[95px] bg-blue-100/60 text-blue-950 font-black">
                  Definitiva
                </th>
                <th className="py-3 px-3 text-center min-w-[110px]">Desempeño</th>
                <th className="py-3 px-3 min-w-[220px]">Observación Pedagógica</th>
                <th className="py-3 px-3 text-center w-16">Boletín</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-xs text-slate-400 font-medium">
                    No se encontraron estudiantes para este criterio.
                  </td>
                </tr>
              ) : (
                filteredList.map(({ student, metrics }) => (
                  <tr key={student.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-500 text-[11px]">
                      #{String(student.listNumber).padStart(2, '0')}
                    </td>

                    {/* Identificación */}
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900 leading-tight">{student.fullName}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono text-[10px] text-blue-600 font-semibold">{student.uniqueCode}</span>
                        {student.documentNumber && (
                          <span className="text-[10px] text-slate-400">• Doc: {student.documentNumber}</span>
                        )}
                      </div>
                    </td>

                    {/* Componente Académico */}
                    <td className="py-3 px-3 text-center bg-blue-50/10">
                      <div className="font-black text-sm text-slate-800">
                        {metrics.academicAvg !== null ? (
                          metrics.academicAvg.toFixed(1)
                        ) : (
                          <span className="text-slate-400 font-mono font-bold">—</span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {metrics.deliveredCount}/{metrics.totalActivities} entregadas
                      </div>
                    </td>

                    {/* Componente Asistencia */}
                    <td className="py-3 px-3 text-center bg-emerald-50/10">
                      <div className="font-black text-sm text-emerald-700">{metrics.attendanceRate}%</div>
                      <div className="text-[10px] text-slate-400">
                        {metrics.presentCount} pres. • {metrics.absentCount} fallas
                      </div>
                    </td>

                    {/* Componente Convivencia (Ajuste de décimas directo) */}
                    <td className="py-3 px-3 text-center bg-purple-50/10">
                      <div className={`font-black text-sm font-mono ${
                        metrics.convivenciaAdjustment > 0
                          ? 'text-emerald-700'
                          : metrics.convivenciaAdjustment < 0
                          ? 'text-rose-700'
                          : 'text-slate-600'
                      }`}>
                        {metrics.convivenciaAdjustment > 0
                          ? `+${metrics.convivenciaAdjustment.toFixed(1)}`
                          : metrics.convivenciaAdjustment < 0
                          ? metrics.convivenciaAdjustment.toFixed(1)
                          : '0.0'}
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">
                        {metrics.convivenciaAdjustment > 0
                          ? `${metrics.positiveCount} aporte(s)/rec.`
                          : metrics.convivenciaAdjustment < 0
                          ? `${metrics.negativeCount} llamado(s)/inc.`
                          : 'Sin novedades'}
                      </div>
                    </td>

                    {/* NOTA DEFINITIVA PONDERADA */}
                    <td className="py-3 px-3 text-center bg-blue-100/30">
                      {metrics.finalGrade !== null ? (
                        <span className="text-base font-black text-blue-900 bg-white px-2.5 py-1 rounded-xl border border-blue-200/90 shadow-2xs inline-block">
                          {metrics.finalGrade.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-xl border border-dashed border-slate-300 inline-block">
                          Pendiente
                        </span>
                      )}
                    </td>

                    {/* Escala Nacional MEN */}
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black border uppercase tracking-wider inline-block ${metrics.levelColor}`}>
                        {metrics.level}
                      </span>
                    </td>

                    {/* Observación Pedagógica */}
                    <td className="py-3 px-3">
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {metrics.diagnosis}
                      </p>
                    </td>

                    {/* Botón Ver Boletín */}
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => setSelectedStudentForReport(student)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-xl text-xs font-bold transition-all"
                        title="Ver informe individual completo"
                      >
                        Ver
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================
          MODAL: CONFIGURAR PONDERACIÓN DE COMPONENTES
         ======================================================== */}
      {isWeightModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] uppercase font-bold text-blue-600 block">Ajuste de Evaluación</span>
                <h2 className="text-base font-extrabold text-slate-900">Ponderación de Componentes</h2>
              </div>
              <button
                onClick={() => setIsWeightModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Ajusta los porcentajes entre el componente Académico y la Asistencia. La suma total es exactamente el 100%.
            </p>

            <div className="space-y-4">
              {/* Académico */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                  <span>Componente Académico (Calificaciones)</span>
                  <span className="text-blue-600 font-mono text-sm">{Math.round(weights.academic * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="95"
                  step="5"
                  value={Math.round(weights.academic * 100)}
                  onChange={e => {
                    const academicPct = Number(e.target.value);
                    const attendancePct = 100 - academicPct;
                    setWeights({
                      academic: parseFloat((academicPct / 100).toFixed(2)),
                      attendance: parseFloat((attendancePct / 100).toFixed(2))
                    });
                  }}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              {/* Asistencia */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                  <span>Componente de Asistencia a Clases</span>
                  <span className="text-emerald-600 font-mono text-sm">{Math.round(weights.attendance * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="50"
                  step="5"
                  value={Math.round(weights.attendance * 100)}
                  onChange={e => {
                    const attendancePct = Number(e.target.value);
                    const academicPct = 100 - attendancePct;
                    setWeights({
                      academic: parseFloat((academicPct / 100).toFixed(2)),
                      attendance: parseFloat((attendancePct / 100).toFixed(2))
                    });
                  }}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>

              {/* Tarjeta Explicativa de Convivencia */}
              <div className="bg-purple-50/70 border border-purple-200 rounded-2xl p-3 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-purple-900">
                  <HeartHandshake className="w-4 h-4 text-purple-600 shrink-0" />
                  <span>Convivencia Escolar (Ajuste directo por décimas)</span>
                </div>
                <p className="text-purple-700 text-[11px] leading-relaxed">
                  No tiene porcentaje ni puntos netos regalados. Se suman décimas a la definitiva si aporta o se descuentan si incumple:
                </p>
                <div className="grid grid-cols-2 gap-1.5 text-[11px] pt-1">
                  <div className="bg-white/90 p-1.5 rounded-xl border border-purple-100 flex items-center justify-between">
                    <span className="text-slate-700">⭐ Aporte:</span>
                    <span className="font-extrabold text-emerald-600 font-mono">+0.1</span>
                  </div>
                  <div className="bg-white/90 p-1.5 rounded-xl border border-purple-100 flex items-center justify-between">
                    <span className="text-slate-700">🏆 Reconocimiento:</span>
                    <span className="font-extrabold text-emerald-700 font-mono">+0.2</span>
                  </div>
                  <div className="bg-white/90 p-1.5 rounded-xl border border-purple-100 flex items-center justify-between">
                    <span className="text-slate-700">⚠️ Llamado atención:</span>
                    <span className="font-extrabold text-amber-600 font-mono">-0.1</span>
                  </div>
                  <div className="bg-white/90 p-1.5 rounded-xl border border-purple-100 flex items-center justify-between">
                    <span className="text-slate-700">❌ Incumplimiento:</span>
                    <span className="font-extrabold text-rose-600 font-mono">-0.2</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex justify-between text-xs font-bold">
              <span>Suma Total Ponderada:</span>
              <span className="text-emerald-600 font-mono text-sm">
                {Math.round((weights.academic + weights.attendance) * 100)}% (100% Exacto)
              </span>
            </div>

            <button
              onClick={() => {
                if (activeCourse?.id) {
                  localStorage.setItem(`aulacontrol_weights_${activeCourse.id}`, JSON.stringify(weights));
                  updateCourse(activeCourse.id, { componentWeights: weights });
                }
                setIsWeightModalOpen(false);
                showToast('✓ Ponderación guardada y asegurada para este curso', 'success');
              }}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/25 active:scale-95 transition-all"
            >
              Guardar Ponderación Permanentemente
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: BOLETÍN INFORMATIVO INDIVIDUAL DEL ESTUDIANTE
         ======================================================== */}
      {selectedStudentForReport && (() => {
        const metrics = getStudentMetrics(selectedStudentForReport);
        const studentSubs = submissions.filter(sub => sub.studentId === selectedStudentForReport.id);
        const studentBeh = behaviorRecords.filter(b => b.studentId === selectedStudentForReport.id);

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-xl shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <span className="text-[10px] uppercase font-bold text-blue-600 block">Boletín Individual Consolidado</span>
                  <h2 className="text-base font-extrabold text-slate-900">
                    #{String(selectedStudentForReport.listNumber).padStart(2, '0')} {selectedStudentForReport.fullName}
                  </h2>
                  <span className="text-xs text-slate-500 font-mono">
                    Código: {selectedStudentForReport.uniqueCode} {selectedStudentForReport.documentNumber && `• Doc: ${selectedStudentForReport.documentNumber}`}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedStudentForReport(null)}
                  className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tarjeta de Calificación Definitiva */}
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-4 rounded-2xl flex items-center justify-between shadow-md">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-blue-200 block">Nota Definitiva Ponderada</span>
                  <div className="text-3xl font-black">
                    {metrics.finalGrade !== null ? (
                      <>
                        {metrics.finalGrade.toFixed(1)} <span className="text-sm font-normal text-blue-200">/ 5.0</span>
                      </>
                    ) : (
                      <span className="text-xl">Pendiente</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-blue-200 block">Escala Nacional MEN</span>
                  <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-xl text-xs font-black uppercase tracking-wider inline-block mt-0.5">
                    {metrics.level}
                  </span>
                </div>
              </div>

              {/* Desglose de Componentes */}
              <div className="grid grid-cols-3 gap-2.5 text-center">
                <div className="bg-blue-50/70 border border-blue-200 p-3 rounded-2xl">
                  <span className="text-[10px] font-bold text-blue-800 uppercase block">Académico ({Math.round(weights.academic * 100)}%)</span>
                  <div className="text-xl font-black text-blue-900 mt-0.5">
                    {metrics.academicAvg !== null ? metrics.academicAvg.toFixed(1) : '—'}
                  </div>
                  <span className="text-[10px] text-blue-600">{metrics.deliveredCount}/{metrics.totalActivities} tareas</span>
                </div>

                <div className="bg-emerald-50/70 border border-emerald-200 p-3 rounded-2xl">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase block">Asistencia ({Math.round(weights.attendance * 100)}%)</span>
                  <div className="text-xl font-black text-emerald-900 mt-0.5">{metrics.attendanceGrade.toFixed(1)}</div>
                  <span className="text-[10px] text-emerald-600">{metrics.attendanceRate}% ({metrics.absentCount} fallas)</span>
                </div>

                <div className="bg-purple-50/70 border border-purple-200 p-3 rounded-2xl">
                  <span className="text-[10px] font-bold text-purple-800 uppercase block">Convivencia (Ajuste)</span>
                  <div className={`text-xl font-black mt-0.5 font-mono ${metrics.convivenciaAdjustment > 0 ? 'text-emerald-700' : metrics.convivenciaAdjustment < 0 ? 'text-rose-700' : 'text-slate-600'}`}>
                    {metrics.convivenciaAdjustment > 0 ? `+${metrics.convivenciaAdjustment.toFixed(1)}` : metrics.convivenciaAdjustment < 0 ? metrics.convivenciaAdjustment.toFixed(1) : '0.0'}
                  </div>
                  <span className="text-[10px] text-purple-600">
                    +{metrics.positiveCount} / -{metrics.negativeCount} novedades
                  </span>
                </div>
              </div>

              {/* Diagnóstico Pedagógico */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1">
                <span className="text-xs font-bold text-slate-800 block flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-blue-600" />
                  Juicio Pedagógico Descriptivo
                </span>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {metrics.diagnosis}
                </p>
              </div>

              {/* Detalle de Actividades */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-700 block">Detalle de Evaluaciones:</span>
                <div className="max-h-36 overflow-y-auto space-y-1 pr-1 border border-slate-100 rounded-2xl p-2">
                  {courseActivities.length === 0 ? (
                    <div className="text-center text-xs text-slate-400 py-3">No hay actividades creadas en este curso</div>
                  ) : (
                    courseActivities.map(act => {
                      const today = getColombiaDateString();
                      const sub = studentSubs.find(s => s.activityId === act.id);
                      const isOverdue = Boolean(act.dueDate && act.dueDate < today);
                      const isNotDelivered = sub?.status === 'not_delivered' || (isOverdue && (!sub || sub.status === 'pending'));
                      const gradeVal = sub?.grade !== null && sub?.grade !== undefined && !isNaN(Number(sub.grade))
                        ? Number(sub.grade).toFixed(1)
                        : (isNotDelivered ? '1.0' : 'Sin nota');

                      return (
                        <div key={act.id} className="flex items-center justify-between text-xs py-1 px-2 rounded-xl bg-slate-50">
                          <span className="text-slate-800 font-medium truncate max-w-[260px]">
                            {act.title} ({act.weightPercentage}%)
                          </span>
                          <span className={`font-bold font-mono ${gradeVal === 'Sin nota' ? 'text-slate-400' : isNotDelivered && (!sub || sub.status === 'not_delivered') ? 'text-rose-600' : 'text-blue-700'}`}>
                            {gradeVal} {isNotDelivered && (!sub || sub.status === 'not_delivered') && <span className="text-[10px] font-normal text-rose-500">(No entregó)</span>}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedStudentForReport(null)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
              >
                Cerrar Boletín
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
