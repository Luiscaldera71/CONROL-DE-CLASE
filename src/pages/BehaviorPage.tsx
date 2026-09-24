import React, { useState } from 'react';
import { Sparkles, Plus, AlertTriangle, Award, CheckCircle, ShieldAlert, Users, X, Check, Download, TrendingDown, TrendingUp } from 'lucide-react';
import { useCourse } from '../context/CourseContext';
import { useToast } from '../context/ToastContext';
import { excelService } from '../services/excelService';
import { BehaviorType } from '../types';

export const BehaviorPage: React.FC = () => {
  const { behaviorRecords, students, activeCourse, addBehaviorRecord } = useCourse();
  const { showToast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || '');
  const [type, setType] = useState<BehaviorType>('warning');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high'>('medium');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState<number>(-1.0);
  const [observation, setObservation] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedStudentId || !activeCourse) return;

    addBehaviorRecord({
      courseId: activeCourse.id,
      studentId: selectedStudentId,
      date: new Date().toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      type,
      severity,
      title: title.trim(),
      description: description.trim(),
      points: Number(points),
      observation: observation.trim() || undefined
    });

    const std = students.find(s => s.id === selectedStudentId);
    showToast(`✓ Novedad de conducta registrada para ${std?.fullName}`, 'success');
    setTitle('');
    setDescription('');
    setObservation('');
    setIsModalOpen(false);
  };

  const handleExport = () => {
    if (!activeCourse) return;
    excelService.exportBehaviors(behaviorRecords, students, activeCourse.name);
    showToast('✓ Bitácora de comportamiento exportada a Excel', 'info');
  };

  const filteredRecords = behaviorRecords.filter(b => {
    if (filterType === 'all') return true;
    return b.type === filterType;
  });

  // Métricas rápidas de conducta
  let positiveCount = 0;
  let negativeCount = 0;
  let totalPoints = 0;

  behaviorRecords.forEach(b => {
    if (b.type === 'positive' || b.type === 'recognition' || b.type === 'participation') {
      positiveCount++;
    } else {
      negativeCount++;
    }
    if (b.points !== undefined) {
      totalPoints += Number(b.points);
    }
  });

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* CABECERA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <span>Bitácora de Comportamiento y Convivencia</span>
          </h1>
          <p className="text-xs text-slate-400">
            Curso <strong className="text-slate-200">{activeCourse?.name}</strong> • Registro de situaciones disciplinarias y notas formativas
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExport}
            title="Exportar bitácora a Excel"
            disabled={behaviorRecords.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 text-xs font-semibold disabled:opacity-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Exportar Excel</span>
          </button>

          <button
            onClick={() => {
              if (students.length === 0) {
                showToast('Primero debes registrar o importar estudiantes en este curso', 'error');
                return;
              }
              setSelectedStudentId(students[0]?.id || '');
              setIsModalOpen(true);
            }}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold shadow-touch active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Novedad / Nota</span>
          </button>
        </div>
      </div>

      {/* TARJETAS RESUMEN DE COMPORTAMIENTO */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Aportes / Méritos</span>
            <Award className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-black text-emerald-400">+{positiveCount}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Llamados de Atención</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-xl font-black text-rose-400">-{negativeCount}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Balance de Puntos</span>
            {totalPoints >= 0 ? (
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-rose-400" />
            )}
          </div>
          <div className={`text-xl font-black ${totalPoints >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {totalPoints > 0 ? `+${totalPoints.toFixed(1)}` : totalPoints.toFixed(1)}
          </div>
        </div>
      </div>

      {/* FILTROS RÁPIDOS POR CATEGORÍA */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'all', label: 'Todos' },
          { id: 'warning', label: '⚠️ Llamado de Atención' },
          { id: 'non_compliance', label: '❌ Incumplimiento' },
          { id: 'positive', label: '⭐ Positivo / Aporte' },
          { id: 'recognition', label: '🏆 Reconocimiento' }
        ].map(cat => (
          <button
            key={cat.id}
            onClick={() => setFilterType(cat.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              filterType === cat.id
                ? 'bg-brand-600 text-white font-bold'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* LISTADO DE NOVEDADES COMPORTAMENTALES */}
      <div className="space-y-2.5">
        {filteredRecords.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center text-slate-400">
            <Sparkles className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-white">No hay registros de conducta registrados</p>
            <p className="text-xs mt-1">Registra llamados de atención, faltas o reconocimientos a tus estudiantes.</p>
          </div>
        ) : (
          filteredRecords.map(record => {
            const student = students.find(s => s.id === record.studentId);
            const isPositive = record.type === 'positive' || record.type === 'recognition' || record.type === 'participation';

            return (
              <div
                key={record.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isPositive
                    ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-100'
                    : 'bg-rose-950/20 border-rose-900/40 text-rose-100'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">
                      {record.type === 'positive' ? '⭐' : record.type === 'recognition' ? '🏆' : record.type === 'warning' ? '⚠️' : '❌'}
                    </span>
                    <div>
                      <h3 className="font-bold text-sm text-white">
                        {student ? `#${student.listNumber} - ${student.fullName}` : 'Estudiante'}
                      </h3>
                      <span className="text-[10px] text-slate-400">{record.date}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {record.points !== undefined && (
                      <span
                        className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${
                          record.points < 0
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        }`}
                      >
                        {record.points > 0 ? `+${record.points}` : record.points} pts
                      </span>
                    )}

                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        isPositive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      {record.type}
                    </span>
                  </div>
                </div>

                <p className="text-xs font-semibold text-white mb-1">{record.title}</p>
                {record.description && (
                  <p className="text-xs text-slate-300 mb-1">{record.description}</p>
                )}
                {record.observation && (
                  <p className="text-[11px] text-slate-400 italic">Compromiso: "{record.observation}"</p>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* MODAL PARA REGISTRAR NOVEDAD O NOTA COMPORTAMENTAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Registrar Novedad Comportamental</span>
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-full bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3.5">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">
                  Estudiante *
                </label>
                <select
                  value={selectedStudentId}
                  onChange={e => setSelectedStudentId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                >
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      #{s.listNumber} - {s.fullName} ({s.uniqueCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">
                  Tipo de Novedad
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'warning', label: '⚠️ Llamado de Atención', defPoints: -1.0 },
                    { id: 'non_compliance', label: '❌ Incumplimiento', defPoints: -1.5 },
                    { id: 'positive', label: '⭐ Positivo / Aporte', defPoints: 1.0 },
                    { id: 'recognition', label: '🏆 Reconocimiento', defPoints: 2.0 }
                  ].map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setType(item.id as BehaviorType);
                        setPoints(item.defPoints);
                      }}
                      className={`p-2 rounded-xl border text-xs font-bold text-left transition-all ${
                        type === item.id
                          ? 'bg-brand-600/30 border-brand-500 text-white'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ASIGNACIÓN DE NOTA O PUNTOS NEGATIVOS/POSITIVOS */}
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">
                  Puntaje / Nota a Aplicar (Negativa o Positiva)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    value={points}
                    onChange={e => setPoints(Number(e.target.value))}
                    className={`w-28 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm font-black focus:outline-none focus:border-brand-500 ${
                      points < 0 ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                  />
                  <div className="flex gap-1 flex-wrap">
                    {[-2.0, -1.0, -0.5, 0.5, 1.0].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setPoints(val)}
                        className={`text-[11px] font-bold px-2 py-1 rounded-lg border transition-colors ${
                          points === val
                            ? 'bg-brand-600 border-brand-500 text-white'
                            : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                        }`}
                      >
                        {val > 0 ? `+${val}` : val}
                      </button>
                    ))}
                  </div>
                </div>
                <span className="text-[10px] text-slate-500 block mt-1">
                  Se reflejará en la bitácora del estudiante y en el reporte exportable a Excel.
                </span>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">
                  Motivo / Hecho *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Ej: No trajo el material de trabajo o indisciplina en clase"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">
                  Descripción Detallada
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Describe lo sucedido para el debido proceso pedagógico..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">
                  Compromiso del Estudiante (Opcional)
                </label>
                <input
                  type="text"
                  value={observation}
                  onChange={e => setObservation(e.target.value)}
                  placeholder="Ej: Se compromete a presentar la actividad en la próxima sesión..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold shadow-touch active:scale-95 transition-all"
                >
                  Guardar Novedad
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
