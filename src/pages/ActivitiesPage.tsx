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
  Edit2,
  Trash2,
  Sliders,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { useCourse } from '../context/CourseContext';
import { useToast } from '../context/ToastContext';
import { Activity, SubmissionStatus } from '../types';
import { getTotalActivitiesWeight, getRemainingWeight, getEqualWeightsDistribution } from '../utils/gradeUtils';
import { getColombiaDateString } from '../utils/dateUtils';

export const ActivitiesPage: React.FC = () => {
  const { activities, students, submissions, activeCourse, addActivity, updateActivity, deleteActivity, recordSubmission } = useCourse();
  const { showToast } = useToast();

  const [selectedActivityId, setSelectedActivityId] = useState<string>(activities[0]?.id || '');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'delivered' | 'not_delivered' | 'pending'>('all');
  const [studentSearch, setStudentSearch] = useState('');

  // Form states para nueva actividad
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [weightPercentage, setWeightPercentage] = useState<number>(20);
  const [dueDate, setDueDate] = useState<string>('2026-03-30');
  const [period, setPeriod] = useState<string>(activeCourse?.currentPeriod || 'Periodo 1');

  // Form states para editar actividad existente
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editWeight, setEditWeight] = useState<number>(20);
  const [editDueDate, setEditDueDate] = useState('');

  // Suma de porcentajes actuales
  const totalWeight = getTotalActivitiesWeight(activities);
  const remainingWeight = getRemainingWeight(activities);

  const selectedActivity = activities.find(a => a.id === selectedActivityId) || activities[0];

  const handleOpenCreateModal = () => {
    const defaultW = remainingWeight > 0 ? Math.min(20, remainingWeight) : 0;
    setWeightPercentage(defaultW);
    setTitle('');
    setDescription('');
    setIsCreateModalOpen(true);
  };

  const handleCreateActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !activeCourse) return;

    const numWeight = Number(weightPercentage) || 0;

    // Validación estricta: No permitir superar el 100%
    if (totalWeight + numWeight > 100) {
      showToast(`Error: La suma de porcentajes no puede superar el 100%. Disponible: ${remainingWeight}%`, 'error');
      return;
    }

    if (numWeight <= 0) {
      showToast('El porcentaje de la actividad debe ser mayor a 0%', 'warning');
      return;
    }

    const created = addActivity({
      courseId: activeCourse.id,
      title: title.trim(),
      description: description.trim() || undefined,
      period,
      weightPercentage: numWeight,
      maxGrade: 5.0,
      dueDate,
      status: 'active'
    });

    showToast(`✓ Actividad "${created.title}" (${numWeight}%) creada con éxito`, 'success');
    setSelectedActivityId(created.id);
    setTitle('');
    setDescription('');
    setIsCreateModalOpen(false);
  };

  const handleOpenEditModal = () => {
    if (!selectedActivity) return;
    setEditTitle(selectedActivity.title);
    setEditDescription(selectedActivity.description || '');
    setEditWeight(selectedActivity.weightPercentage);
    setEditDueDate(selectedActivity.dueDate || '2026-03-30');
    setIsEditModalOpen(true);
  };

  const handleSaveEditActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedActivity || !editTitle.trim()) return;

    const otherActivitiesWeight = getTotalActivitiesWeight(activities, selectedActivity.id);
    const numWeight = Number(editWeight) || 0;

    if (otherActivitiesWeight + numWeight > 100) {
      const maxForThis = 100 - otherActivitiesWeight;
      showToast(`Error: Supera el 100%. Máximo permitido para esta actividad: ${maxForThis}%`, 'error');
      return;
    }

    updateActivity(selectedActivity.id, {
      title: editTitle.trim(),
      description: editDescription.trim() || undefined,
      weightPercentage: numWeight,
      dueDate: editDueDate
    });

    showToast(`✓ Actividad actualizada correctamente (${numWeight}%)`, 'success');
    setIsEditModalOpen(false);
  };

  const handleDeleteActivity = () => {
    if (!selectedActivity) return;
    if (confirm(`¿Estás seguro de eliminar la actividad "${selectedActivity.title}"? Se borrarán sus calificaciones.`)) {
      deleteActivity(selectedActivity.id);
      showToast(`✓ Actividad eliminada`, 'info');
      setSelectedActivityId(activities.filter(a => a.id !== selectedActivity.id)[0]?.id || '');
    }
  };

  // Repartir 100% equitativamente entre todas las actividades
  const handleDistributeEqually = () => {
    if (activities.length === 0) return;
    const distribution = getEqualWeightsDistribution(activities);
    activities.forEach(act => {
      const newW = distribution[act.id];
      if (newW !== undefined) {
        updateActivity(act.id, { weightPercentage: newW });
      }
    });
    showToast(`✓ 100% distribuido equitativamente entre las ${activities.length} actividades`, 'success');
  };

  const handleUpdateSubmission = (
    studentId: string,
    status: SubmissionStatus,
    currentGrade?: number | null
  ) => {
    if (!selectedActivity) return;
    const gradeToSet = status === 'not_delivered'
      ? (currentGrade !== null && currentGrade !== undefined && !isNaN(Number(currentGrade)) ? currentGrade : 1.0)
      : currentGrade;
    recordSubmission(selectedActivity.id, studentId, status, gradeToSet);
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
    <div className="space-y-4 max-w-5xl mx-auto pb-12">
      {/* CABECERA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <span>Gestión de Actividades y Entregas</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Curso <strong className="text-slate-800">{activeCourse?.name}</strong> • {activities.length} actividades • Total evaluado: <strong className={totalWeight === 100 ? 'text-emerald-600' : 'text-blue-600'}>{totalWeight}%</strong> / 100%
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {activities.length > 1 && totalWeight !== 100 && (
            <button
              onClick={handleDistributeEqually}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
              title="Ajustar todas las actividades para que sumen exactamente 100%"
            >
              <Sliders className="w-3.5 h-3.5 text-blue-600" />
              <span>Distribuir 100% Igual</span>
            </button>
          )}

          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Actividad</span>
          </button>
        </div>
      </div>

      {/* BARRA DE CONTROL DE PORCENTAJES (LÍMITE ESTRICTO DE 100%) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-2">
        <div className="flex items-center justify-between text-xs font-bold">
          <div className="flex items-center gap-2">
            <Percent className="w-4 h-4 text-blue-600" />
            <span>Distribución de Porcentajes del Periodo</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded-lg text-xs font-black ${
              totalWeight === 100
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                : totalWeight > 100
                ? 'bg-rose-50 text-rose-700 border border-rose-300'
                : 'bg-blue-50 text-blue-700 border border-blue-300'
            }`}>
              {totalWeight}% de 100%
            </span>
            {remainingWeight > 0 && (
              <span className="text-[11px] text-slate-500 font-medium">
                (Disponible: {remainingWeight}%)
              </span>
            )}
          </div>
        </div>

        {/* Barra visual de progreso */}
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
          {activities.map((act, idx) => {
            const colors = ['bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 'bg-teal-500', 'bg-amber-500', 'bg-cyan-500'];
            const color = colors[idx % colors.length];
            return (
              <div
                key={act.id}
                title={`${act.title}: ${act.weightPercentage}%`}
                className={`h-full ${color} transition-all border-r border-white/50 first:rounded-l-full last:rounded-r-full`}
                style={{ width: `${Math.min(100, act.weightPercentage)}%` }}
              ></div>
            );
          })}
        </div>

        {/* Mensajes de advertencia o confirmación */}
        {totalWeight > 100 ? (
          <div className="flex items-center gap-1.5 text-xs text-rose-700 font-bold bg-rose-50 p-2 rounded-xl border border-rose-200">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>
              Los porcentajes suman {totalWeight}%, superando el 100%. Debes editar las actividades existentes para ajustarlas.
            </span>
          </div>
        ) : totalWeight === 100 ? (
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-bold bg-emerald-50 p-2 rounded-xl border border-emerald-200">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>Ponderación perfecta: El 100% de la evaluación está asignado en este curso.</span>
          </div>
        ) : (
          <p className="text-[11px] text-slate-500">
            Tienes {remainingWeight}% disponible para futuras actividades o evaluaciones.
          </p>
        )}
      </div>

      {/* SELECTOR HORIZONTAL DE ACTIVIDADES */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
        {activities.map(act => {
          const isSelected = act.id === selectedActivity?.id;
          const actSubmissions = submissions.filter(s => s.activityId === act.id);
          const delivered = actSubmissions.filter(s => s.status === 'delivered' || s.status === 'late').length;
          const percentDelivered = students.length > 0 ? Math.round((delivered / students.length) * 100) : 0;

          return (
            <button
              key={act.id}
              onClick={() => setSelectedActivityId(act.id)}
              className={`flex-shrink-0 w-64 p-4 rounded-2xl border text-left transition-all ${
                isSelected
                  ? 'bg-blue-50/80 border-blue-500 shadow-xs ring-2 ring-blue-500/20'
                  : 'bg-white border-slate-200/90 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
                  {act.period} • <strong className="text-blue-900">{act.weightPercentage}%</strong>
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-lg font-bold ${
                  act.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
                }`}>
                  {act.status === 'active' ? 'Activa' : 'Cerrada'}
                </span>
              </div>

              <h3 className="font-bold text-xs text-slate-900 line-clamp-1 mb-2.5">
                {act.title}
              </h3>

              {/* Barra de progreso de entregas */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                  <span>Entregas</span>
                  <span className="font-bold text-slate-800">{percentDelivered}% ({delivered}/{students.length})</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-300"
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
        <div className="bg-white border border-slate-200/90 rounded-3xl p-4 md:p-5 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-900">{selectedActivity.title}</h2>
                <span className="px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-blue-800 text-xs font-black">
                  Vale {selectedActivity.weightPercentage}%
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {selectedActivity.description || 'Sin descripción adicional'} • Fecha límite: {selectedActivity.dueDate}
              </p>
            </div>

            {/* Acciones de la Actividad: Editar Porcentaje y Eliminar */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenEditModal}
                className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-colors"
                title="Editar título o porcentaje de esta actividad"
              >
                <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Editar Actividad</span>
              </button>

              <button
                onClick={handleDeleteActivity}
                className="p-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl text-rose-600 transition-colors"
                title="Eliminar actividad"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filtros de estado y buscador de alumnos */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={studentSearch}
                onChange={e => setStudentSearch(e.target.value)}
                placeholder="Buscar alumno en esta actividad..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs focus:bg-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {(['all', 'delivered', 'not_delivered', 'pending'] as const).map(st => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                    filterStatus === st
                      ? 'bg-blue-600 text-white font-bold shadow-xs'
                      : 'bg-slate-50 text-slate-600 border border-slate-200/80 hover:bg-slate-100'
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
              .filter(s => s.fullName.toLowerCase().includes(studentSearch.toLowerCase()) || String(s.listNumber) === studentSearch.trim())
              .filter(s => {
                const today = getColombiaDateString();
                const isOverdue = Boolean(selectedActivity?.dueDate && selectedActivity.dueDate < today);
                if (filterStatus === 'all') return true;
                const sub = submissions.find(sub => sub.studentId === s.id && sub.activityId === selectedActivity.id);
                const currentStatus = sub ? sub.status : (isOverdue ? 'not_delivered' : 'pending');
                return currentStatus === filterStatus;
              })
              .map(student => {
                const today = getColombiaDateString();
                const isOverdue = Boolean(selectedActivity?.dueDate && selectedActivity.dueDate < today);
                const sub = submissions.find(s => s.studentId === student.id && s.activityId === selectedActivity.id);
                const status: SubmissionStatus = sub?.status || (isOverdue ? 'not_delivered' : 'pending');
                const grade = (sub?.grade !== null && sub?.grade !== undefined)
                  ? sub.grade
                  : (status === 'not_delivered' ? 1.0 : '');

                return (
                  <div
                    key={student.id}
                    className="p-3 bg-slate-50/70 border border-slate-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-100/60 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 font-black text-xs flex items-center justify-center font-mono shrink-0 border border-blue-200/70">
                        #{String(student.listNumber).padStart(2, '0')}
                      </span>
                      <div>
                        <span className="text-xs font-bold text-slate-900 block leading-tight">{student.fullName}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-slate-400 font-mono">Cód: {student.uniqueCode}</span>
                          {isOverdue && status === 'not_delivered' && !sub && (
                            <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-md border border-rose-200">
                              Plazo vencido (1.0)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center flex-wrap">
                      {/* Selector de Estado */}
                      <select
                        value={status}
                        onChange={e => {
                          const newStatus = e.target.value as SubmissionStatus;
                          const newGrade = newStatus === 'not_delivered'
                            ? (grade !== '' ? Number(grade) : 1.0)
                            : (grade !== '' ? Number(grade) : null);
                          handleUpdateSubmission(student.id, newStatus, newGrade);
                        }}
                        className={`text-xs font-bold py-1.5 px-2.5 rounded-xl border focus:outline-none transition-all ${
                          status === 'delivered'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : status === 'late'
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : status === 'not_delivered'
                            ? 'bg-rose-50 text-rose-800 border-rose-300'
                            : 'bg-white text-slate-600 border-slate-300'
                        }`}
                      >
                        <option value="pending">Pendiente</option>
                        <option value="delivered">Entregado</option>
                        <option value="not_delivered">No entregó</option>
                      </select>

                      {/* Input de Calificación */}
                      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2 py-1">
                        <span className="text-[10px] font-bold text-slate-400">Nota:</span>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="5"
                          placeholder={status === 'not_delivered' ? "1.0" : "—"}
                          value={grade}
                          onChange={e => handleGradeChange(student.id, e.target.value, status)}
                          className="w-12 text-center font-black text-xs text-slate-900 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-8 text-center">
          <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-xs text-slate-400">No hay actividades creadas en este curso.</p>
        </div>
      )}

      {/* ========================================================
          MODAL: CREAR NUEVA ACTIVIDAD CON VALIDACIÓN DE 100%
         ======================================================== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] uppercase font-bold text-blue-600 block">Nueva Evaluación</span>
                <h2 className="text-base font-extrabold text-slate-900">Crear Actividad</h2>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Alerta si el 100% ya fue alcanzado */}
            {remainingWeight <= 0 && (
              <div className="bg-rose-50 border border-rose-300 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-start gap-2 text-rose-800 text-xs font-bold">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="block font-black">Límite del 100% completado</span>
                    <span className="font-normal text-rose-700 text-[11px] leading-tight block mt-0.5">
                      Las actividades existentes ya suman el <strong>100%</strong> de la nota. Para crear una nueva, debes bajarle el porcentaje a alguna de las anteriores o redistribuir.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handleDistributeEqually();
                    setIsCreateModalOpen(false);
                  }}
                  className="w-full py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  Repartir 100% por igual entre todas
                </button>
              </div>
            )}

            <form onSubmit={handleCreateActivity} className="space-y-3.5">
              <div>
                <label className="text-xs text-slate-700 font-semibold block mb-1">
                  Título de la Actividad *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Ej: Taller 1 - Lógica y Algoritmos"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="text-xs text-slate-700 font-semibold block mb-1">
                  Descripción o Criterios
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Detalles sobre la entrega..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Porcentaje con validación estricta */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-slate-700 font-semibold">
                      Porcentaje (%) *
                    </label>
                    <span className="text-[10px] font-bold text-blue-600">
                      Disp: {remainingWeight}%
                    </span>
                  </div>
                  <input
                    type="number"
                    min="1"
                    max={Math.max(1, remainingWeight)}
                    required
                    value={weightPercentage}
                    onChange={e => setWeightPercentage(Number(e.target.value))}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-black transition-all focus:outline-none ${
                      totalWeight + weightPercentage > 100
                        ? 'bg-rose-50 border-rose-300 text-rose-700'
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-blue-500'
                    }`}
                  />
                  {totalWeight + weightPercentage > 100 && (
                    <span className="text-[10px] text-rose-600 font-bold block mt-1">
                      ¡Supera el 100%! Máx: {remainingWeight}%
                    </span>
                  )}
                </div>

                <div>
                  <label className="text-xs text-slate-700 font-semibold block mb-1">
                    Fecha Límite
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Botón de ajuste rápido a disponible */}
              {remainingWeight > 0 && weightPercentage !== remainingWeight && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setWeightPercentage(remainingWeight)}
                    className="text-[10px] text-blue-600 hover:text-blue-700 font-bold underline"
                  >
                    Asignar todo el porcentaje restante ({remainingWeight}%)
                  </button>
                </div>
              )}

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={totalWeight + weightPercentage > 100 || weightPercentage <= 0 || remainingWeight <= 0}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
                >
                  Guardar Actividad
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: EDITAR ACTIVIDAD Y SU PORCENTAJE
         ======================================================== */}
      {isEditModalOpen && selectedActivity && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] uppercase font-bold text-blue-600 block">Modificar Evaluación</span>
                <h2 className="text-base font-extrabold text-slate-900">Editar Actividad</h2>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditActivity} className="space-y-3.5">
              <div>
                <label className="text-xs text-slate-700 font-semibold block mb-1">
                  Título de la Actividad *
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="text-xs text-slate-700 font-semibold block mb-1">
                  Descripción
                </label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Edición de Porcentaje */}
                <div>
                  {(() => {
                    const otherW = getTotalActivitiesWeight(activities, selectedActivity.id);
                    const maxForThis = 100 - otherW;
                    const isOver = otherW + editWeight > 100;

                    return (
                      <>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs text-slate-700 font-semibold">
                            Porcentaje (%) *
                          </label>
                          <span className="text-[10px] font-bold text-blue-600">
                            Máx: {maxForThis}%
                          </span>
                        </div>
                        <input
                          type="number"
                          min="1"
                          max={maxForThis}
                          required
                          value={editWeight}
                          onChange={e => setEditWeight(Number(e.target.value))}
                          className={`w-full border rounded-xl px-3 py-2 text-xs font-black transition-all focus:outline-none ${
                            isOver
                              ? 'bg-rose-50 border-rose-300 text-rose-700'
                              : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-blue-500'
                          }`}
                        />
                        {isOver && (
                          <span className="text-[10px] text-rose-600 font-bold block mt-1">
                            Supera el 100%. Máximo: {maxForThis}%
                          </span>
                        )}
                      </>
                    );
                  })()}
                </div>

                <div>
                  <label className="text-xs text-slate-700 font-semibold block mb-1">
                    Fecha Límite
                  </label>
                  <input
                    type="date"
                    value={editDueDate}
                    onChange={e => setEditDueDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={getTotalActivitiesWeight(activities, selectedActivity.id) + editWeight > 100 || editWeight <= 0}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
