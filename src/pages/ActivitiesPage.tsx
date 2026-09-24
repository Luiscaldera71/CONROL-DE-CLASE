import React, { useState } from 'react';
import {
  BookOpen,
  Plus,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Calendar,
  Percent,
  Search,
  ChevronDown,
  ChevronUp,
  X,
  Save,
  Check,
  Download
} from 'lucide-react';
import { useCourse } from '../context/CourseContext';
import { useToast } from '../context/ToastContext';
import { excelService } from '../services/excelService';
import { Activity, SubmissionStatus } from '../types';

export const ActivitiesPage: React.FC = () => {
  const { activities, students, submissions, activeCourse, addActivity, recordSubmission } = useCourse();
  const { showToast } = useToast();

  const [selectedActivityId, setSelectedActivityId] = useState<string>(activities[0]?.id || '');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'delivered' | 'not_delivered' | 'pending'>('all');
  const [studentSearch, setStudentSearch] = useState('');

  // Form states para nueva actividad
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [weightPercentage, setWeightPercentage] = useState<number>(20);
  const [dueDate, setDueDate] = useState<string>('2026-03-30');
  const [period, setPeriod] = useState<string>(activeCourse?.currentPeriod || 'Periodo 1');

  // Suma de porcentajes
  const totalWeight = activities.reduce((sum, a) => sum + a.weightPercentage, 0);

  const selectedActivity = activities.find(a => a.id === selectedActivityId) || activities[0];

  const handleCreateActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !activeCourse) return;

    const created = addActivity({
      courseId: activeCourse.id,
      title: title.trim(),
      description: description.trim() || undefined,
      period,
      weightPercentage: Number(weightPercentage) || 20,
      maxGrade: 5.0,
      dueDate,
      status: 'active'
    });

    showToast(`✓ Actividad "${created.title}" creada con éxito`, 'success');
    setSelectedActivityId(created.id);
    setTitle('');
    setDescription('');
    setIsCreateModalOpen(false);
  };

  const handleUpdateSubmission = (
    studentId: string,
    status: SubmissionStatus,
    currentGrade?: number | null
  ) => {
    if (!selectedActivity) return;
    recordSubmission(selectedActivity.id, studentId, status, currentGrade);
  };

  const handleGradeChange = (
    studentId: string,
    gradeVal: string,
    currentStatus: SubmissionStatus
  ) => {
    if (!selectedActivity) return;
    const num = gradeVal === '' ? null : Math.min(5.0, Math.max(0.0, parseFloat(gradeVal)));
    recordSubmission(selectedActivity.id, studentId, currentStatus, num);
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* CABECERA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            <span>Gestión de Actividades y Entregas</span>
          </h1>
          <p className="text-xs text-slate-400">
            Curso <strong className="text-slate-200">{activeCourse?.name}</strong> • {activities.length} actividades creadas
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              if (!activeCourse || activities.length === 0) return;
              excelService.exportActivities(activities, activeCourse.name);
              showToast('✓ Listado de actividades exportado a Excel', 'info');
            }}
            disabled={activities.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 text-xs font-semibold disabled:opacity-50 transition-colors"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Exportar Excel</span>
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold shadow-touch active:scale-95 transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Actividad</span>
          </button>
        </div>
      </div>

      {/* ADVERTENCIA DE PORCENTAJES SI NO SUMAN 100% */}
      {totalWeight !== 100 && (
        <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-2xl flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              La ponderación total actual suma <strong>{totalWeight}%</strong>. (Se recomienda que sume 100%).
            </span>
          </div>
        </div>
      )}

      {/* CARRUSEL / SELECTOR HORIZONTAL DE ACTIVIDADES */}
      <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none">
        {activities.map(act => {
          const isSelected = act.id === selectedActivity?.id;
          const actSubmissions = submissions.filter(s => s.activityId === act.id);
          const delivered = actSubmissions.filter(s => s.status === 'delivered' || s.status === 'late').length;
          const percentDelivered = students.length > 0 ? Math.round((delivered / students.length) * 100) : 0;

          return (
            <button
              key={act.id}
              onClick={() => setSelectedActivityId(act.id)}
              className={`flex-shrink-0 w-60 p-3.5 rounded-2xl border text-left transition-all ${
                isSelected
                  ? 'bg-slate-900 border-brand-500 shadow-md ring-1 ring-brand-500/50'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-400">
                  {act.period} • {act.weightPercentage}%
                </span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                  act.status === 'active' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                }`}>
                  {act.status === 'active' ? 'Activa' : 'Cerrada'}
                </span>
              </div>

              <h3 className="font-bold text-xs text-white line-clamp-1 mb-2">
                {act.title}
              </h3>

              {/* Barra de progreso de entregas */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Entregas</span>
                  <span className="font-bold text-slate-200">{percentDelivered}% ({delivered}/{students.length})</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                    style={{ width: `${percentDelivered}%` }}
                  ></div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* DETALLE Y CONTROL DE ENTREGAS DE LA ACTIVIDAD SELECCIONADA */}
      {selectedActivity ? (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 md:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div>
              <h2 className="text-base font-bold text-white">{selectedActivity.title}</h2>
              <p className="text-xs text-slate-400">
                {selectedActivity.description || 'Sin descripción adicional'} • Fecha límite: {selectedActivity.dueDate}
              </p>
            </div>

            {/* Filtros rápidos de estado */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {(['all', 'delivered', 'not_delivered', 'pending'] as const).map(st => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold capitalize transition-all ${
                    filterStatus === st
                      ? 'bg-brand-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {st === 'all' ? 'Todos' : st === 'delivered' ? 'Entregados' : st === 'not_delivered' ? 'No entregaron' : 'Pendientes'}
                </button>
              ))}
            </div>
          </div>

          {/* LISTADO DE ENTREGAS Y NOTAS POR ESTUDIANTE */}
          <div className="space-y-2">
            {students
              .filter(student => {
                const sub = submissions.find(s => s.activityId === selectedActivity.id && s.studentId === student.id);
                const currentStatus = sub?.status || 'pending';
                if (filterStatus === 'all') return true;
                if (filterStatus === 'delivered') return currentStatus === 'delivered' || currentStatus === 'late';
                if (filterStatus === 'not_delivered') return currentStatus === 'not_delivered';
                if (filterStatus === 'pending') return currentStatus === 'pending';
                return true;
              })
              .map(student => {
                const sub = submissions.find(s => s.activityId === selectedActivity.id && s.studentId === student.id);
                const currentStatus: SubmissionStatus = sub?.status || 'pending';
                const currentGrade = sub?.grade !== undefined && sub?.grade !== null ? String(sub.grade) : '';

                return (
                  <div
                    key={student.id}
                    className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    {/* Alumno */}
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                        #{String(student.listNumber).padStart(2, '0')}
                      </span>
                      <div>
                        <h4 className="font-bold text-xs text-white">{student.fullName}</h4>
                        <span className="font-mono text-[10px] text-brand-300">{student.uniqueCode}</span>
                      </div>
                    </div>

                    {/* Estado de Entrega y Calificación */}
                    <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
                      <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl">
                        <button
                          type="button"
                          onClick={() => handleUpdateSubmission(student.id, 'delivered', sub?.grade)}
                          className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                            currentStatus === 'delivered'
                              ? 'bg-emerald-600 text-white'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          ✓ Entregó
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateSubmission(student.id, 'late', sub?.grade)}
                          className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                            currentStatus === 'late'
                              ? 'bg-amber-600 text-white'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          ⏰ Tarde
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateSubmission(student.id, 'not_delivered', null)}
                          className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                            currentStatus === 'not_delivered'
                              ? 'bg-rose-600 text-white'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          ✕ No entregó
                        </button>
                      </div>

                      {/* Input de Nota directa en el celular */}
                      <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2 py-1 rounded-xl">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Nota:</span>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="5"
                          placeholder="—"
                          value={currentGrade}
                          onChange={e => handleGradeChange(student.id, e.target.value, currentStatus)}
                          className="w-14 bg-slate-800 border border-slate-700 rounded-lg px-2 py-0.5 text-xs text-amber-400 font-black text-center focus:outline-none focus:border-brand-500"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      ) : null}

      {/* MODAL CREAR NUEVA ACTIVIDAD */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h2 className="text-base font-bold text-white">Nueva Actividad Académica</h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-full bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateActivity} className="space-y-3.5">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">
                  Título de la Actividad *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Ej: Actividad 4 - Bucles y Condicionales"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">
                  Descripción o Criterios
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Detalles sobre lo que deben entregar los estudiantes..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">
                    Porcentaje (%)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={weightPercentage}
                    onChange={e => setWeightPercentage(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">
                    Fecha Límite
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold shadow-touch active:scale-95 transition-all"
                >
                  Guardar Actividad
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
