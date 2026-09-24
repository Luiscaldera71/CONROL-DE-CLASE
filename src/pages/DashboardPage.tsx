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

  // Cálculo de alertas
  const riskEvaluations = students.map(student =>
    calculateStudentRisk(student, activities, submissions, attendanceSessions, settings)
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
    if (r.currentAverage < 3.0) gradeBins.critico++;
    else if (r.currentAverage <= 3.7) gradeBins.basico++;
    else if (r.currentAverage <= 4.5) gradeBins.alto++;
    else gradeBins.superior++;
  });

  const gradeDistributionData = {
    labels: ['Bajo (< 3.0)', 'Básico (3.0 - 3.7)', 'Alto (3.8 - 4.5)', 'Superior (4.6 - 5.0)'],
    datasets: [
      {
        label: 'Estudiantes',
        data: [gradeBins.critico, gradeBins.basico, gradeBins.alto, gradeBins.superior],
        backgroundColor: [
          'rgba(244, 63, 94, 0.7)',
          'rgba(245, 158, 11, 0.7)',
          'rgba(99, 102, 241, 0.7)',
          'rgba(16, 185, 129, 0.7)'
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
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        tension: 0.35,
        pointBackgroundColor: '#10b981'
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
        backgroundColor: 'rgba(99, 102, 241, 0.7)',
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
        ticks: { color: '#94a3b8', font: { size: 10 } },
        grid: { color: 'rgba(51, 65, 85, 0.3)' }
      },
      y: {
        ticks: { color: '#94a3b8', font: { size: 10 } },
        grid: { color: 'rgba(51, 65, 85, 0.3)' }
      }
    }
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* CABECERA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            <span>Dashboard y Analítica de Aula</span>
          </h1>
          <p className="text-xs text-slate-400">
            Curso <strong className="text-slate-200">{activeCourse?.name}</strong> • {activeCourse?.subject} ({activeCourse?.currentPeriod})
          </p>
        </div>
      </div>

      {/* GRÁFICOS ANALÍTICOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Gráfico 1: Distribución de Desempeño */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-white">Distribución de Notas del Aula</span>
            <span className="text-[10px] text-slate-400">Escala 0.0 - 5.0</span>
          </div>
          <div className="h-44">
            <Bar data={gradeDistributionData} options={chartOptions} />
          </div>
        </div>

        {/* Gráfico 2: Evolución de Asistencia */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-white">Evolución de Asistencia por Sesión</span>
            <span className="text-[10px] text-emerald-400 font-bold">% Asistencia</span>
          </div>
          <div className="h-44">
            <Line data={attendanceTrendData} options={chartOptions} />
          </div>
        </div>

        {/* Gráfico 3: Control de Entregas por Actividad */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 md:col-span-2 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-white">Cumplimiento de Entregas por Actividad</span>
            <span className="text-[10px] text-brand-300 font-bold">{activities.length} actividades</span>
          </div>
          <div className="h-40">
            <Bar data={activityDeliveryData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* MÓDULO INTEGRAL: ALERTAS ACADÉMICAS Y SEGUIMIENTO EXPLICABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 md:p-5 space-y-3.5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              <span>Seguimiento y Alertas Académicas</span>
            </h2>
            <p className="text-xs text-slate-400">
              Evaluación multifactorial automática basada en notas, entregas y asistencia
            </p>
          </div>

          {/* Filtros de Nivel */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setAlertFilter('all')}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold ${
                alertFilter === 'all' ? 'bg-brand-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              Todos ({riskEvaluations.length})
            </button>
            <button
              onClick={() => setAlertFilter('high')}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold ${
                alertFilter === 'high' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-rose-300'
              }`}
            >
              Atención ({highRisk.length})
            </button>
            <button
              onClick={() => setAlertFilter('medium')}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold ${
                alertFilter === 'medium' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-amber-300'
              }`}
            >
              Seguimiento ({mediumRisk.length})
            </button>
            <button
              onClick={() => setAlertFilter('low')}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold ${
                alertFilter === 'low' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-emerald-300'
              }`}
            >
              Al Día ({lowRisk.length})
            </button>
          </div>
        </div>

        {/* LISTA EXPLICADA DE ESTUDIANTES CON ALERTA */}
        <div className="space-y-2">
          {riskEvaluations
            .filter(r => (alertFilter === 'all' ? true : r.level === alertFilter))
            .map(item => (
              <div
                key={item.studentId}
                onClick={() => navigate(`/students/${item.studentId}`)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  item.level === 'high'
                    ? 'bg-rose-950/20 border-rose-900/40 hover:border-rose-700/60'
                    : item.level === 'medium'
                    ? 'bg-amber-950/20 border-amber-900/40 hover:border-amber-700/60'
                    : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700/60'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-bold text-sm text-white">
                      #{String(item.listNumber).padStart(2, '0')} {item.studentName}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      item.level === 'high'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : item.level === 'medium'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    }`}>
                      {item.level === 'high' ? 'Atención Prioritaria' : item.level === 'medium' ? 'En Seguimiento' : 'Sin Alerta'}
                    </span>
                  </div>

                  {/* Motivos explicados de la alerta */}
                  {item.reasons.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 text-[11px] text-slate-300 mt-1">
                      {item.reasons.map((reason, i) => (
                        <span key={i} className="bg-slate-900/90 px-2 py-0.5 rounded-md border border-slate-800">
                          • {reason}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[11px] text-emerald-400">Cumple adecuadamente con todas las metas.</span>
                  )}
                </div>

                <div className="flex items-center gap-4 shrink-0 self-end sm:self-center">
                  <div className="text-right text-xs">
                    <div className="text-slate-400">Promedio: <strong className="text-white">{item.currentAverage}</strong></div>
                    <div className="text-slate-400">Asistencia: <strong className="text-white">{item.attendanceRate}%</strong></div>
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
