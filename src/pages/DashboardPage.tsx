import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  TrendingDown,
  AlertTriangle,
  Award,
  CheckCircle2,
  Calendar,
  Filter,
  Users,
  ChevronRight,
  TrendingUp,
  Percent
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { useCourse } from '../context/CourseContext';
import { useAuth } from '../context/AuthContext';
import { calculateStudentRisk } from '../utils/riskEngine';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export const DashboardPage: React.FC = () => {
  const { students, activities, submissions, attendanceSessions, activeCourse } = useCourse();
  const { teacherProfile } = useAuth();
  const navigate = useNavigate();

  const [alertFilter, setAlertFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  const settings = teacherProfile?.settings || {
    gradeScale: { min: 0, max: 5, passingGrade: 3.0 },
    riskThresholds: { minGrade: 3.0, minAttendanceRate: 75, maxUnsubmitted: 3 },
    periods: ['Periodo 1'],
    behaviorCategories: []
  };

  const courseActivities = activities.filter(a => !activeCourse || a.courseId === activeCourse.id);
  const courseSubmissions = submissions.filter(s => courseActivities.some(a => a.id === s.activityId));

  // Cálculo de alertas
  const riskEvaluations = students.map(student =>
    calculateStudentRisk(student, courseActivities, courseSubmissions, attendanceSessions, settings)
  );

  const highRisk = riskEvaluations.filter(r => r.level === 'high');
  const mediumRisk = riskEvaluations.filter(r => r.level === 'medium');
  const lowRisk = riskEvaluations.filter(r => r.level === 'low');

  // Datos para Gráfico 1: Distribución de Notas
  const gradeBins = {
    critico: 0, // < 3.0
    basico: 0,  // 3.0 - 3.7
    alto: 0,    // 3.8 - 4.5
    superior: 0 // 4.6 - 5.0
  };

  riskEvaluations.forEach(r => {
    if (r.currentAverage > 0) {
      if (r.currentAverage < 3.0) gradeBins.critico++;
      else if (r.currentAverage <= 3.7) gradeBins.basico++;
      else if (r.currentAverage <= 4.5) gradeBins.alto++;
      else gradeBins.superior++;
    }
  });

  const gradeDistributionData = {
    labels: ['Bajo (< 3.0)', 'Básico (3.0 - 3.7)', 'Alto (3.8 - 4.5)', 'Superior (4.6 - 5.0)'],
    datasets: [
      {
        label: 'Estudiantes',
        data: [gradeBins.critico, gradeBins.basico, gradeBins.alto, gradeBins.superior],
        backgroundColor: [
          '#f43f5e',
          '#f59e0b',
          '#2563eb',
          '#10b981'
        ],
        borderRadius: 8
      }
    ]
  };

  // Datos para Gráfico 2: Evolución de Asistencia por Fecha
  const attendanceTrendData = {
    labels: attendanceSessions.map(s => s.date.substring(5)),
    datasets: [
      {
        fill: true,
        label: '% Asistencia',
        data: attendanceSessions.map(s => {
          const total = s.summary.total || 1;
          const present = s.summary.present + (s.summary.late * 0.8) + s.summary.excused;
          return Math.round((present / total) * 100);
        }),
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.08)',
        tension: 0.35,
        pointBackgroundColor: '#2563eb',
        pointRadius: 4
      }
    ]
  };

  // Datos para Gráfico 3: Entregas por Actividad
  const activityDeliveryData = {
    labels: activities.map(a => a.title.substring(0, 14) + '...'),
    datasets: [
      {
        label: '% Entregado',
        data: activities.map(act => {
          const subs = submissions.filter(s => s.activityId === act.id);
          const del = subs.filter(s => s.status === 'delivered' || s.status === 'late').length;
          return students.length > 0 ? Math.round((del / students.length) * 100) : 0;
        }),
        backgroundColor: '#3b82f6',
        borderRadius: 6
      }
    ]
  };

  const chartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    },
    scales: {
      x: {
        ticks: { color: '#64748b', font: { size: 10, weight: '600' } },
        grid: { color: 'rgba(226, 232, 240, 0.6)' }
      },
      y: {
        ticks: { color: '#64748b', font: { size: 10, weight: '600' } },
        grid: { color: 'rgba(226, 232, 240, 0.6)' }
      }
    }
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-12">
      {/* CABECERA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <span>Dashboard y Analítica de Aula</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Curso <strong className="text-slate-800">{activeCourse?.name}</strong> • {activeCourse?.subject} ({activeCourse?.currentPeriod})
          </p>
        </div>
      </div>

      {/* GRÁFICOS ANALÍTICOS (AbsenSiswa White Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Gráfico 1: Distribución de Desempeño */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-800">Distribución de Notas del Aula</span>
            <span className="text-[10px] text-slate-400 font-semibold">Escala 0.0 - 5.0</span>
          </div>
          <div className="h-44">
            <Bar data={gradeDistributionData} options={chartOptions} />
          </div>
        </div>

        {/* Gráfico 2: Evolución de Asistencia */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-800">Evolución de Asistencia por Sesión</span>
            <span className="text-[10px] text-blue-600 font-bold">% Asistencia</span>
          </div>
          <div className="h-44">
            <Line data={attendanceTrendData} options={chartOptions} />
          </div>
        </div>

        {/* Gráfico 3: Control de Entregas por Actividad */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 md:col-span-2 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-800">Cumplimiento de Entregas por Actividad</span>
            <span className="text-[10px] text-blue-600 font-bold">{activities.length} actividades</span>
          </div>
          <div className="h-40">
            <Bar data={activityDeliveryData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* MÓDULO INTEGRAL: ALERTAS ACADÉMICAS Y SEGUIMIENTO EXPLICABLE */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              <span>Seguimiento y Alertas Académicas</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Evaluación multifactorial automática basada en notas, entregas y asistencia
            </p>
          </div>

          {/* Filtros de Nivel */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setAlertFilter('all')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                alertFilter === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Todos ({riskEvaluations.length})
            </button>
            <button
              onClick={() => setAlertFilter('high')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                alertFilter === 'high'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100'
              }`}
            >
              Atención ({highRisk.length})
            </button>
            <button
              onClick={() => setAlertFilter('medium')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                alertFilter === 'medium'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100'
              }`}
            >
              Seguimiento ({mediumRisk.length})
            </button>
            <button
              onClick={() => setAlertFilter('low')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                alertFilter === 'low'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              Al Día ({lowRisk.length})
            </button>
          </div>
        </div>

        {/* LISTA EXPLICADA DE ESTUDIANTES CON ALERTA */}
        <div className="space-y-2.5">
          {riskEvaluations
            .filter(r => (alertFilter === 'all' ? true : r.level === alertFilter))
            .map(item => (
              <div
                key={item.studentId}
                onClick={() => navigate(`/students/${item.studentId}`)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs ${
                  item.level === 'high'
                    ? 'bg-rose-50/50 border-rose-200 hover:border-rose-300'
                    : item.level === 'medium'
                    ? 'bg-amber-50/50 border-amber-200 hover:border-amber-300'
                    : 'bg-slate-50/60 border-slate-200/90 hover:border-blue-300'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-extrabold text-sm text-slate-900">
                      #{String(item.listNumber).padStart(2, '0')} {item.studentName}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      item.level === 'high'
                        ? 'bg-rose-100 text-rose-700 border-rose-200'
                        : item.level === 'medium'
                        ? 'bg-amber-100 text-amber-700 border-amber-200'
                        : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                    }`}>
                      {item.level === 'high' ? 'Atención Prioritaria' : item.level === 'medium' ? 'En Seguimiento' : 'Sin Alerta'}
                    </span>
                  </div>

                  {/* Motivos explicados de la alerta */}
                  {item.reasons.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 text-[11px] text-slate-600 mt-1">
                      {item.reasons.map((reason, i) => (
                        <span key={i} className="bg-white px-2 py-0.5 rounded-md border border-slate-200 font-medium">
                          • {reason}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[11px] text-emerald-700 font-medium">Cumple adecuadamente con todas las metas.</span>
                  )}
                </div>

                <div className="flex items-center gap-4 shrink-0 self-end sm:self-center">
                  <div className="text-right text-xs">
                    <div className="text-slate-500 font-medium">Promedio: <strong className="text-slate-900">{item.currentAverage > 0 ? item.currentAverage : '—'}</strong></div>
                    <div className="text-slate-500 font-medium">Asistencia: <strong className="text-slate-900">{item.attendanceRate}%</strong></div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};
