import React, { useState } from 'react';
import { Sparkles, Plus, AlertTriangle, Award, CheckCircle, ShieldAlert, Users, X, Check } from 'lucide-react';
import { useCourse } from '../context/CourseContext';
import { useToast } from '../context/ToastContext';
import { BehaviorType } from '../types';

export const BehaviorPage: React.FC = () => {
  const { behaviorRecords, students, activeCourse, addBehaviorRecord } = useCourse();
  const { showToast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || '');
  const [type, setType] = useState<BehaviorType>('positive');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high'>('low');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [observation, setObservation] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedStudentId || !activeCourse) return;

    addBehaviorRecord({
      courseId: activeCourse.id,
      studentId: selectedStudentId,
      date: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
      type,
      severity,
      title: title.trim(),
      description: description.trim(),
      observation: observation.trim() || undefined
    });

    const std = students.find(s => s.id === selectedStudentId);
    showToast(`✓ Registro de comportamiento añadido para ${std?.fullName}`, 'success');
    setTitle('');
    setDescription('');
    setObservation('');
    setIsModalOpen(false);
  };

  const filteredRecords = behaviorRecords.filter(b => {
    if (filterType === 'all') return true;
    return b.type === filterType;
  });

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-12">
      {/* CABECERA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <span>Bitácora de Comportamiento</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Curso <strong className="text-slate-800">{activeCourse?.name}</strong> • Seguimiento y situaciones formativas
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Novedad</span>
        </button>
      </div>

      {/* FILTROS RÁPIDOS POR CATEGORÍA (AbsenSiswa Pill Filter) */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'all', label: 'Todos' },
          { id: 'positive', label: '⭐ Aporte (+0.1)' },
          { id: 'recognition', label: '🏆 Reconocimiento (+0.2)' },
          { id: 'warning', label: '⚠️ Llamado de Atención (-0.1)' },
          { id: 'non_compliance', label: '❌ Incumplimiento (-0.2)' }
        ].map(cat => (
          <button
            key={cat.id}
            onClick={() => setFilterType(cat.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              filterType === cat.id
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white border border-slate-200/90 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* LISTADO DE NOVEDADES COMPORTAMENTALES */}
      <div className="space-y-3">
        {filteredRecords.length === 0 ? (
          <div className="bg-white border border-slate-200/90 rounded-3xl p-8 text-center text-slate-400 shadow-xs">
            <Sparkles className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">No hay registros con este filtro</p>
            <p className="text-xs mt-1 text-slate-500 font-medium">Registra eventos positivos o formativos para el seguimiento.</p>
          </div>
        ) : (
          filteredRecords.map(record => {
            const student = students.find(s => s.id === record.studentId);
            const isPositive = record.type === 'positive' || record.type === 'recognition' || record.type === 'social';

            return (
              <div
                key={record.id}
                className={`p-4 rounded-2xl border transition-all shadow-xs ${
                  isPositive
                    ? 'bg-white border-emerald-200 hover:border-emerald-300'
                    : 'bg-white border-amber-200 hover:border-amber-300'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">
                      {record.type === 'positive' ? '⭐' : record.type === 'recognition' ? '🏆' : record.type === 'warning' ? '⚠️' : '❌'}
                    </span>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900">{record.title}</h3>
                      <p className="text-xs text-slate-500 font-medium">
                        Estudiante: <strong className="text-slate-800">#{student?.listNumber} {student?.fullName || 'Estudiante'}</strong>
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200 shrink-0 font-mono">
                    {record.date}
                  </span>
                </div>

                <p className="text-xs text-slate-600 mb-2 leading-relaxed">
                  {record.description}
                </p>

                {record.observation && (
                  <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-[11px] text-slate-600">
                    <strong className="text-slate-800">Compromiso / Observación del Docente:</strong> {record.observation}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* MODAL CREAR REGISTRO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 md:p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-base font-extrabold text-slate-900">Registrar Novedad Comportamental</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3.5">
              <div>
                <label className="text-xs text-slate-700 font-semibold block mb-1">
                  Estudiante *
                </label>
                <select
                  value={selectedStudentId}
                  onChange={e => setSelectedStudentId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                >
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      #{s.listNumber} - {s.fullName} ({s.uniqueCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-700 font-semibold block mb-1">
                  Tipo de Novedad (Impacto en Convivencia)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'positive', label: '⭐ Aporte (+0.1)' },
                    { id: 'recognition', label: '🏆 Reconocimiento (+0.2)' },
                    { id: 'warning', label: '⚠️ Llamado de Atención (-0.1)' },
                    { id: 'non_compliance', label: '❌ Incumplimiento (-0.2)' }
                  ].map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setType(item.id as BehaviorType)}
                      className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all ${
                        type === item.id
                          ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-700 font-semibold block mb-1">
                  Título / Hecho *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Ej: Destacada participación en la actividad"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="text-xs text-slate-700 font-semibold block mb-1">
                  Descripción del Hecho
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Describe lo sucedido en el aula..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="text-xs text-slate-700 font-semibold block mb-1">
                  Compromiso / Observación (Opcional)
                </label>
                <input
                  type="text"
                  value={observation}
                  onChange={e => setObservation(e.target.value)}
                  placeholder="Ej: Se compromete a cuidar el orden..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
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
