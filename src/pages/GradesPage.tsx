import React, { useState } from 'react';
import {
  Award,
  Download,
  Filter,
  Search,
  Plus,
  Edit3,
  Edit2,
  CheckCircle,
  AlertTriangle,
  X,
  FileSpreadsheet,
  ArrowRight,
  Save,
  Check,
  Percent,
  Calendar,
  Sparkles,
  Sliders
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCourse } from '../context/CourseContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { excelService } from '../services/excelService';
import { Student, Activity, SubmissionStatus } from '../types';
import {
  calculateStudentWeightedAverage,
  getTotalActivitiesWeight,
  getRemainingWeight,
  getEqualWeightsDistribution
} from '../utils/gradeUtils';
import { getColombiaDateString } from '../utils/dateUtils';

export const GradesPage: React.FC = () => {
  const { students, activities, submissions, activeCourse, recordSubmission, addActivity, updateActivity } = useCourse();
  const { teacherProfile } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'passing' | 'failing'>('all');
  const passingGrade = teacherProfile?.settings?.gradeScale?.passingGrade || 3.0;

  // Estados para modal de edición manual por estudiante
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studentGradesDraft, setStudentGradesDraft] = useState<Record<string, { grade: string; status: SubmissionStatus }>>({});

  // Estados para crear nueva actividad directamente
  const [isNewActivityOpen, setIsNewActivityOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newWeight, setNewWeight] = useState(20);
  const [newDueDate, setNewDueDate] = useState('2026-03-30');
  const [newPeriod, setNewPeriod] = useState(activeCourse?.currentPeriod || 'Periodo 1');

  // Estados para editar porcentaje de una actividad
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [editActivityWeight, setEditActivityWeight] = useState<number>(20);
  const [editActivityTitle, setEditActivityTitle] = useState('');

  // Control de porcentajes totales
  const totalWeight = getTotalActivitiesWeight(activities);
  const remainingWeight = getRemainingWeight(activities);

  // Filtrado de alumnos usando el promedio ponderado exacto
  const filteredStudents = students.filter(s => {
    const matchesSearch =
      s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.uniqueCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(s.listNumber) === searchTerm.trim() ||
      (s.documentNumber && s.documentNumber.includes(searchTerm.trim()));

    if (!matchesSearch) return false;

    if (filterMode === 'all') return true;

    const studentSubs = submissions.filter(sub => sub.studentId === s.id);
    const weighted = calculateStudentWeightedAverage(activities, studentSubs);

    if (weighted.average === null) return filterMode === 'failing';
    if (filterMode === 'passing') return weighted.average >= passingGrade;
    if (filterMode === 'failing') return weighted.average < passingGrade;

    return true;
  });

  // Estadísticas globales del curso usando el promedio ponderado exacto
  const studentAverages = students.map(student => {
    const studentSubs = submissions.filter(s => s.studentId === student.id);
    const weighted = calculateStudentWeightedAverage(activities, studentSubs);
    return weighted.average;
  }).filter((a): a is number => a !== null);

  const courseAvg = studentAverages.length > 0
    ? (studentAverages.reduce((acc, c) => acc + c, 0) / studentAverages.length).toFixed(1)
    : '—';

  const passingCount = studentAverages.filter(a => a >= passingGrade).length;
  const failingCount = studentAverages.filter(a => a < passingGrade).length;

  const handleExport = () => {
    if (!activeCourse) return;
    excelService.exportGrades(activities, submissions, students, activeCourse.name, activeCourse);
    showToast(`✓ Planilla de calificaciones con porcentajes y fórmulas exportada a Excel`, 'success');
  };

  // Abrir modal de edición por estudiante
  const handleOpenStudentEditor = (student: Student) => {
    const today = getColombiaDateString();
    const draft: Record<string, { grade: string; status: SubmissionStatus }> = {};
    activities.forEach(act => {
      const sub = submissions.find(s => s.studentId === student.id && s.activityId === act.id);
      const isOverdue = Boolean(act.dueDate && act.dueDate < today);
      const status: SubmissionStatus = sub?.status
        ? sub.status
        : (isOverdue ? 'not_delivered' : 'pending');
      const gradeStr = (sub && sub.grade !== null && sub.grade !== undefined)
        ? String(sub.grade)
        : (status === 'not_delivered' ? '1.0' : '');

      draft[act.id] = {
        grade: gradeStr,
        status
      };
    });
    setStudentGradesDraft(draft);
    setEditingStudent(student);
  };

  // Guardar calificaciones del modal de estudiante
  const handleSaveStudentGrades = () => {
    if (!editingStudent) return;

    activities.forEach(act => {
      const item = studentGradesDraft[act.id];
      if (item) {
        let numVal = item.grade === '' ? null : Math.min(5.0, Math.max(0.0, parseFloat(item.grade)));
        if (item.status === 'not_delivered' && (numVal === null || isNaN(numVal))) {
          numVal = 1.0;
        }
        recordSubmission(act.id, editingStudent.id, item.status, numVal);
      }
    });

    showToast(`✓ Calificaciones actualizadas para ${editingStudent.fullName}`, 'success');
    setEditingStudent(null);
  };

  // Abrir modal para crear nueva actividad
  const handleOpenNewActivityModal = () => {
    const defaultW = remainingWeight > 0 ? Math.min(20, remainingWeight) : 0;
    setNewWeight(defaultW);
    setNewTitle('');
    setIsNewActivityOpen(true);
  };

  // Crear nueva actividad en el acto validando límite de 100%
  const handleCreateActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !activeCourse) return;

    const numWeight = Number(newWeight) || 0;

    if (totalWeight + numWeight > 100) {
      showToast(`Error: Supera el 100%. Solo dispones de ${remainingWeight}%`, 'error');
      return;
    }

    if (numWeight <= 0) {
      showToast('El porcentaje de la actividad debe ser mayor a 0%', 'warning');
      return;
    }

    const created = addActivity({
      courseId: activeCourse.id,
      title: newTitle.trim(),
      period: newPeriod,
      weightPercentage: numWeight,
      maxGrade: 5.0,
      dueDate: newDueDate,
      status: 'active'
    });

    showToast(`✓ Actividad "${created.title}" (${numWeight}%) creada con éxito`, 'success');
    setNewTitle('');
    setIsNewActivityOpen(false);
  };

  // Abrir editor de porcentaje de actividad existente
  const handleOpenActivityEdit = (act: Activity) => {
    setEditingActivity(act);
    setEditActivityTitle(act.title);
    setEditActivityWeight(act.weightPercentage);
  };

  // Guardar edición de porcentaje de actividad
  const handleSaveActivityEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingActivity || !editActivityTitle.trim()) return;

    const otherWeight = getTotalActivitiesWeight(activities, editingActivity.id);
    const numWeight = Number(editActivityWeight) || 0;

    if (otherWeight + numWeight > 100) {
      const maxAvailable = 100 - otherWeight;
      showToast(`Error: Supera el 100%. Máximo permitido para esta actividad: ${maxAvailable}%`, 'error');
      return;
    }

    updateActivity(editingActivity.id, {
      title: editActivityTitle.trim(),
      weightPercentage: numWeight
    });

    showToast(`✓ Porcentaje de "${editActivityTitle}" ajustado a ${numWeight}%`, 'success');
    setEditingActivity(null);
  };

  // Repartir 100% por igual
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

  // Asignar nota rápida en el modal
  const handleSetQuickGrade = (activityId: string, gradeNum: number) => {
    setStudentGradesDraft(prev => ({
      ...prev,
      [activityId]: {
        ...prev[activityId],
        grade: gradeNum.toFixed(1),
        status: 'delivered'
      }
    }));
  };

  // Calcular promedio ponderado en vivo del modal
  const calculateModalDraftAvg = (): string => {
    let weightedSum = 0;
    let gradedWeights = 0;

    activities.forEach(act => {
      const draftItem = studentGradesDraft[act.id];
      if (draftItem && draftItem.grade !== '') {
        const num = parseFloat(draftItem.grade);
        if (!isNaN(num)) {
          const w = Math.max(0, act.weightPercentage || 0);
          weightedSum += num * w;
          gradedWeights += w;
        }
      }
    });

    if (gradedWeights === 0) return '—';
    return (weightedSum / gradedWeights).toFixed(1);
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto pb-12">
      {/* CABECERA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            <span>Planilla de Calificaciones Ponderadas</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Curso <strong className="text-slate-800">{activeCourse?.name}</strong> • Cálculo ponderado por porcentajes • Total evaluado: <strong className={totalWeight === 100 ? 'text-emerald-600' : 'text-blue-600'}>{totalWeight}%</strong> / 100%
          </p>
        </div>

        {/* ACCIONES SUPERIORES */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Botón Ir a Notas Definitivas */}
          <button
            onClick={() => navigate('/definitivas')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-xl text-xs font-bold transition-all"
            title="Ver consolidado con asistencia y comportamiento"
          >
            <FileSpreadsheet className="w-4 h-4 text-blue-600" />
            <span>Notas Definitivas</span>
            <ArrowRight className="w-3.5 h-3.5 text-blue-500" />
          </button>

          {/* Botón Nueva Actividad */}
          <button
            onClick={handleOpenNewActivityModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nueva Actividad</span>
          </button>

          {/* Botón Exportar Excel con Fórmulas */}
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold shadow-xs transition-all"
            title="Descargar Excel con formato y fórmulas de cálculo automático ponderado"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Exportar Excel (Fórmulas)</span>
          </button>
        </div>
      </div>

      {/* BARRA DE ESTADO DE PORCENTAJES (LÍMITE ESTRICTO DE 100%) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <Percent className="w-4 h-4 text-blue-600 shrink-0" />
          <div>
            <span className="font-bold text-slate-800">Ponderación de Actividades: </span>
            <span className={`font-black ${totalWeight === 100 ? 'text-emerald-600' : totalWeight > 100 ? 'text-rose-600' : 'text-blue-600'}`}>
              {totalWeight}% de 100%
            </span>
            {remainingWeight > 0 ? (
              <span className="text-slate-500 ml-1.5">({remainingWeight}% disponible)</span>
            ) : totalWeight === 100 ? (
              <span className="text-emerald-700 font-bold ml-1.5">✓ 100% completo</span>
            ) : (
              <span className="text-rose-600 font-bold ml-1.5">⚠️ Supera el 100%</span>
            )}
          </div>
        </div>

        {activities.length > 1 && totalWeight !== 100 && (
          <button
            onClick={handleDistributeEqually}
            className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[11px] font-bold transition-all self-start sm:self-auto flex items-center gap-1.5"
            title="Repartir 100% en partes iguales entre todas las actividades"
          >
            <Sliders className="w-3 h-3 text-blue-600" />
            <span>Repartir 100% por igual</span>
          </button>
        )}
      </div>

      {/* MÉTRICAS RÁPIDAS DE RENDIMIENTO PONDERADO */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200/90 p-3.5 rounded-2xl shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Promedio Ponderado Curso</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-600">{courseAvg}</span>
            <span className="text-xs text-slate-400">/ 5.0</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 p-3.5 rounded-2xl shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Aprobando (≥ {passingGrade.toFixed(1)})</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600">{passingCount}</span>
            <span className="text-xs font-bold text-slate-400">de {students.length} alumnos</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 p-3.5 rounded-2xl shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">En Riesgo (&lt; {passingGrade.toFixed(1)})</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-600">{failingCount}</span>
            <span className="text-xs font-bold text-slate-400">requieren apoyo</span>
          </div>
        </div>
      </div>

      {/* BARRA DE BÚSQUEDA Y FILTROS RÁPIDOS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex-1 bg-white border border-slate-200/90 rounded-2xl px-3.5 py-2.5 flex items-center gap-2 shadow-xs">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, código o número de lista..."
            className="w-full bg-transparent text-xs text-slate-900 placeholder-slate-400 focus:outline-none font-medium"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="text-slate-400 hover:text-slate-600 text-xs">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filtros por Estado */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-slate-100/80 p-1 rounded-2xl border border-slate-200/80">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterMode === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Todos ({students.length})
          </button>
          <button
            onClick={() => setFilterMode('passing')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterMode === 'passing' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500 hover:text-emerald-700'
            }`}
          >
            Aprobando ({passingCount})
          </button>
          <button
            onClick={() => setFilterMode('failing')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterMode === 'failing' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-500 hover:text-rose-700'
            }`}
          >
            En Riesgo ({failingCount})
          </button>
        </div>
      </div>

      {/* TABLA DE CALIFICACIONES PONDERADAS CON EDICIÓN CELDA A CELDA */}
      <div className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/90 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3 w-12 text-center">N°</th>
                <th className="py-3 px-3 min-w-[200px]">Estudiante</th>
                {activities.map(act => (
                  <th key={act.id} className="py-3 px-2 text-center min-w-[105px]" title={act.title}>
                    <div className="flex items-center justify-center gap-1">
                      <span className="line-clamp-1 text-slate-700">{act.title}</span>
                      <button
                        onClick={() => handleOpenActivityEdit(act)}
                        className="text-slate-400 hover:text-blue-600 p-0.5 rounded"
                        title="Editar porcentaje de esta actividad"
                      >
                        <Edit2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                    <div className="text-[10px] text-blue-600 font-mono font-black mt-0.5">
                      ({act.weightPercentage}%)
                    </div>
                  </th>
                ))}
                <th className="py-3 px-3 text-center min-w-[95px] bg-blue-50/60 text-blue-900 font-extrabold">
                  Promedio Ponderado
                </th>
                <th className="py-3 px-3 text-center w-20">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={activities.length + 4} className="py-10 text-center text-xs text-slate-400 font-medium">
                    {activities.length === 0 ? (
                      <div className="space-y-2">
                        <p>Aún no hay actividades creadas en este curso.</p>
                        <button
                          onClick={handleOpenNewActivityModal}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
                        >
                          + Crear Primera Actividad
                        </button>
                      </div>
                    ) : (
                      'No se encontraron estudiantes para este criterio de búsqueda.'
                    )}
                  </td>
                </tr>
              ) : (
                filteredStudents.map(student => {
                  const studentSubs = submissions.filter(s => s.studentId === student.id);
                  const weighted = calculateStudentWeightedAverage(activities, studentSubs);
                  const avg = weighted.averageFormatted;
                  const isFailing = weighted.average !== null && weighted.average < passingGrade;

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/70 transition-colors group">
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-500 text-[11px]">
                        #{String(student.listNumber).padStart(2, '0')}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900 leading-tight">{student.fullName}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-[10px] text-blue-600 font-medium">{student.uniqueCode}</span>
                          {student.documentNumber && (
                            <span className="text-[10px] text-slate-400">• Doc: {student.documentNumber}</span>
                          )}
                        </div>
                      </td>

                      {/* Notas por actividad (Edición manual celda a celda) */}
                      {activities.map(act => {
                        const sub = studentSubs.find(s => s.activityId === act.id);
                        const today = getColombiaDateString();
                        const isOverdue = Boolean(act.dueDate && act.dueDate < today);
                        const isNotDelivered = sub?.status === 'not_delivered' || (isOverdue && (!sub || sub.status === 'pending'));
                        const gradeVal = (sub?.grade !== null && sub?.grade !== undefined)
                          ? sub.grade.toFixed(1)
                          : (isNotDelivered ? '1.0' : '');

                        return (
                          <td key={act.id} className="py-2 px-2 text-center">
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max="5"
                              placeholder={isNotDelivered ? "1.0" : "—"}
                              value={gradeVal}
                              onChange={e => {
                                const valStr = e.target.value;
                                if (valStr === '') {
                                  recordSubmission(act.id, student.id, isOverdue ? 'not_delivered' : 'pending', isOverdue ? 1.0 : null);
                                } else {
                                  const num = Math.min(5.0, Math.max(0.0, parseFloat(valStr)));
                                  recordSubmission(act.id, student.id, 'delivered', isNaN(num) ? null : num);
                                }
                              }}
                              className={`w-14 text-center font-bold py-1.5 px-1 rounded-xl text-xs focus:outline-none transition-all ${
                                gradeVal !== '' && parseFloat(gradeVal) < passingGrade
                                  ? 'bg-rose-50 border border-rose-300 text-rose-700 font-black'
                                  : gradeVal !== ''
                                  ? 'bg-amber-50 border border-amber-300 text-amber-700 font-black'
                                  : 'bg-slate-50 border border-slate-200 text-slate-400 focus:bg-white focus:border-blue-500'
                              }`}
                            />
                          </td>
                        );
                      })}

                      {/* Promedio Ponderado Calculado Exactamente */}
                      <td className="py-2.5 px-3 text-center bg-blue-50/20">
                        <span className={`px-2.5 py-1 rounded-xl font-black text-xs inline-block ${
                          isFailing
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : avg !== '—'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'text-slate-400'
                        }`}>
                          {avg}
                        </span>
                      </td>

                      {/* Botón Acción: Modal de Edición Completa */}
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => handleOpenStudentEditor(student)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 transition-colors"
                          title={`Editar calificaciones de ${student.fullName}`}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================
          MODAL: EDITAR CALIFICACIONES DE UN ESTUDIANTE
         ======================================================== */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] uppercase font-bold text-blue-600 block">Editar Calificaciones Ponderadas</span>
                <h2 className="text-base font-extrabold text-slate-900 leading-tight">
                  #{String(editingStudent.listNumber).padStart(2, '0')} {editingStudent.fullName}
                </h2>
                <span className="text-xs text-slate-500 font-mono">Código: {editingStudent.uniqueCode}</span>
              </div>
              <button
                onClick={() => setEditingStudent(null)}
                className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Promedio Ponderado en Vivo */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Promedio Ponderado Calculado</span>
                <span className="text-xs text-slate-600">Calculado según los porcentajes de cada taller</span>
              </div>
              <span className="text-2xl font-black text-blue-600 bg-white px-3 py-1 rounded-xl border border-slate-200">
                {calculateModalDraftAvg()}
              </span>
            </div>

            {/* Listado de Actividades con sus Porcentajes */}
            <div className="space-y-3">
              {activities.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No hay actividades creadas en este curso.</p>
              ) : (
                activities.map(act => {
                  const draftItem = studentGradesDraft[act.id] || { grade: '', status: 'pending' };

                  return (
                    <div
                      key={act.id}
                      className="bg-slate-50/70 border border-slate-200 rounded-2xl p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-slate-900 block">{act.title}</span>
                          <span className="text-[10px] text-blue-600 font-black">
                            Vale {act.weightPercentage}% de la nota
                          </span>
                        </div>

                        {/* Input de Nota */}
                        <div className="flex items-center gap-1.5">
                          <label className="text-[10px] font-bold text-slate-400">Nota:</label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="5"
                            value={draftItem.grade}
                            onChange={e => {
                              const val = e.target.value;
                              setStudentGradesDraft(prev => ({
                                ...prev,
                                [act.id]: {
                                  ...prev[act.id],
                                  grade: val,
                                  status: val ? 'delivered' : 'pending'
                                }
                              }));
                            }}
                            placeholder="0.0"
                            className="w-16 py-1 px-2 text-center font-black text-sm bg-white border border-slate-300 rounded-xl focus:border-blue-600 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Botones de Asignación Rápida */}
                      <div className="flex items-center gap-1 flex-wrap pt-1 border-t border-slate-200/60">
                        <span className="text-[9px] text-slate-400 font-semibold mr-1">Rápido:</span>
                        {[5.0, 4.5, 4.0, 3.5, 3.0, 1.0].map(val => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => handleSetQuickGrade(act.id, val)}
                            className="px-2 py-0.5 rounded-lg bg-white hover:bg-blue-50 border border-slate-200 text-[10px] font-bold text-slate-700 hover:text-blue-600 transition-colors"
                          >
                            {val.toFixed(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Botones Modal */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveStudentGrades}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/25 active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>Guardar Cambios</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: CREAR NUEVA ACTIVIDAD CON LÍMITE ESTRICTO DE 100%
         ======================================================== */}
      {isNewActivityOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] uppercase font-bold text-blue-600 block">Nueva Evaluación</span>
                <h2 className="text-base font-extrabold text-slate-900">Agregar Actividad a Calificar</h2>
              </div>
              <button
                onClick={() => setIsNewActivityOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
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
                      Las actividades existentes ya suman el <strong>100%</strong> de la nota. Para crear una nueva, debes bajarle el porcentaje a alguna de las anteriores.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handleDistributeEqually();
                    setIsNewActivityOpen(false);
                  }}
                  className="w-full py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  Repartir 100% por igual entre todas
                </button>
              </div>
            )}

            <form onSubmit={handleCreateActivity} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Título de la Actividad *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="Ej: Taller 1 - Diagramas de Flujo"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Porcentaje con validación estricta de 100% */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">Porcentaje (%) *</label>
                    <span className="text-[10px] font-bold text-blue-600">Disp: {remainingWeight}%</span>
                  </div>
                  <input
                    type="number"
                    min="1"
                    max={Math.max(1, remainingWeight)}
                    required
                    value={newWeight}
                    onChange={e => setNewWeight(Number(e.target.value))}
                    className={`w-full border rounded-2xl px-3.5 py-2.5 text-xs font-black transition-all focus:outline-none ${
                      totalWeight + newWeight > 100
                        ? 'bg-rose-50 border-rose-300 text-rose-700'
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-blue-600'
                    }`}
                  />
                  {totalWeight + newWeight > 100 && (
                    <span className="text-[10px] text-rose-600 font-bold block mt-1">
                      ¡Supera el 100%! Máx: {remainingWeight}%
                    </span>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Periodo</label>
                  <input
                    type="text"
                    value={newPeriod}
                    onChange={e => setNewPeriod(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Botón de ajuste rápido a disponible */}
              {remainingWeight > 0 && newWeight !== remainingWeight && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setNewWeight(remainingWeight)}
                    className="text-[10px] text-blue-600 hover:text-blue-700 font-bold underline"
                  >
                    Asignar todo el porcentaje restante ({remainingWeight}%)
                  </button>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Fecha Límite</label>
                <input
                  type="date"
                  value={newDueDate}
                  onChange={e => setNewDueDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewActivityOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={totalWeight + newWeight > 100 || newWeight <= 0 || remainingWeight <= 0}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/25 active:scale-95 transition-all"
                >
                  Crear y Calificar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: EDITAR PORCENTAJE DE UNA ACTIVIDAD DESDE PLANILLA
         ======================================================== */}
      {editingActivity && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] uppercase font-bold text-blue-600 block">Modificar Porcentaje</span>
                <h2 className="text-base font-extrabold text-slate-900">{editingActivity.title}</h2>
              </div>
              <button
                onClick={() => setEditingActivity(null)}
                className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveActivityEdit} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Título</label>
                <input
                  type="text"
                  required
                  value={editActivityTitle}
                  onChange={e => setEditActivityTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                {(() => {
                  const otherW = getTotalActivitiesWeight(activities, editingActivity.id);
                  const maxAllowed = 100 - otherW;
                  const isOver = otherW + editActivityWeight > 100;

                  return (
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-bold text-slate-700">Porcentaje de Valor (%) *</label>
                        <span className="text-[10px] font-bold text-blue-600">Máximo: {maxAllowed}%</span>
                      </div>
                      <input
                        type="number"
                        min="1"
                        max={maxAllowed}
                        required
                        value={editActivityWeight}
                        onChange={e => setEditActivityWeight(Number(e.target.value))}
                        className={`w-full border rounded-2xl px-3.5 py-2.5 text-xs font-black transition-all focus:outline-none ${
                          isOver
                            ? 'bg-rose-50 border-rose-300 text-rose-700'
                            : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-blue-600'
                        }`}
                      />
                      {isOver && (
                        <span className="text-[10px] text-rose-600 font-bold block mt-1">
                          Supera el 100% total. Máximo disponible: {maxAllowed}%
                        </span>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingActivity(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={getTotalActivitiesWeight(activities, editingActivity.id) + editActivityWeight > 100 || editActivityWeight <= 0}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/25 active:scale-95 transition-all"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
