import React, { useState } from 'react';
import {
  X,
  CheckCircle,
  BookOpen,
  Award,
  AlertTriangle,
  FileText,
  Clock,
  Sparkles,
  ChevronRight,
  Save,
  Check
} from 'lucide-react';
import { Student, AttendanceStatus, SubmissionStatus, BehaviorType } from '../../types';
import { useCourse } from '../../context/CourseContext';
import { useToast } from '../../context/ToastContext';
import { playFeedbackTone, triggerHapticFeedback } from '../../utils/codeGenerator';
import { getLocalDateString } from '../../utils/dateUtils';

interface QuickActionModalProps {
  student: Student;
  onClose: () => void;
  onSuccessReturnToScanner: () => void;
}

export const QuickActionModal: React.FC<QuickActionModalProps> = ({
  student,
  onClose,
  onSuccessReturnToScanner
}) => {
  const {
    activeCourse,
    activities,
    submissions,
    recordAttendance,
    recordSubmission,
    addBehaviorRecord,
    addObservation
  } = useCourse();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'menu' | 'attendance' | 'activity' | 'grade' | 'behavior' | 'observation'>('menu');

  // Estados locales para formularios rápidos
  const today = getLocalDateString();
  const [selectedActivityId, setSelectedActivityId] = useState<string>(activities[0]?.id || '');
  const [submissionStatus, setSubmissionStatus] = useState<SubmissionStatus>('delivered');
  const [gradeInput, setGradeInput] = useState<string>('4.5');
  const [behaviorType, setBehaviorType] = useState<BehaviorType>('positive');
  const [behaviorTitle, setBehaviorTitle] = useState<string>('Participación activa');
  const [observationText, setObservationText] = useState<string>('');

  const finishAction = (message: string) => {
    playFeedbackTone('success');
    triggerHapticFeedback();
    showToast(message, 'success');
    onSuccessReturnToScanner();
  };

  // Registrar Asistencia Directa
  const handleQuickAttendance = (status: AttendanceStatus) => {
    if (!recordAttendance(today, student.id, status, 'qr')) {
      showToast('Hoy no es día de clase de este curso: no se puede tomar asistencia.', 'warning');
      return;
    }
    const statusLabels: Record<AttendanceStatus, string> = {
      present: 'Presente',
      absent: 'Ausente',
      late: 'Tardanza',
      excused: 'Excusa justificada'
    };
    finishAction(`✓ Asistencia registrada: ${student.fullName} (${statusLabels[status]})`);
  };

  // Guardar Entrega de Actividad & Nota
  const handleSaveActivity = () => {
    if (!selectedActivityId) return;
    let grade = gradeInput ? parseFloat(gradeInput) : null;
    if (submissionStatus === 'not_delivered' && (grade === null || isNaN(grade))) {
      grade = 1.0;
    }
    recordSubmission(selectedActivityId, student.id, submissionStatus, grade);
    const act = activities.find(a => a.id === selectedActivityId);
    finishAction(`✓ Actividad "${act?.title?.substring(0, 20)}..." registrada`);
  };

  // Guardar Comportamiento
  const handleSaveBehavior = () => {
    if (!behaviorTitle) return;
    addBehaviorRecord({
      courseId: activeCourse?.id || '',
      studentId: student.id,
      date: new Date().toLocaleString(),
      type: behaviorType,
      severity: behaviorType === 'positive' || behaviorType === 'recognition' ? 'low' : 'medium',
      title: behaviorTitle,
      description: `Registro ágil vía escaneo QR en clase.`
    });
    finishAction(`✓ Comportamiento registrado para ${student.fullName}`);
  };

  // Guardar Observación
  const handleSaveObservation = () => {
    if (!observationText.trim()) return;
    addObservation(student.id, observationText.trim());
    finishAction(`✓ Observación guardada para ${student.fullName}`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* ENCABEZADO CON IDENTIDAD DEL ESTUDIANTE */}
        <div className="flex items-start justify-between pb-3.5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-lg">
                #{String(student.listNumber).padStart(2, '0')}
              </span>
              <span className="text-xs font-mono font-bold bg-slate-100 px-2 py-0.5 rounded-lg text-slate-700">
                {student.uniqueCode}
              </span>
            </div>
            <h2 className="text-lg font-black text-slate-900 mt-1 leading-tight">
              {student.fullName}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Curso: <strong className="text-slate-700">{activeCourse?.name}</strong> • {activeCourse?.subject}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENIDO SEGÚN PESTAÑA */}
        {activeTab === 'menu' && (
          <div className="py-4 space-y-2.5">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              ¿Qué deseas registrar?
            </p>

            {/* Opción 1: Asistencia */}
            <button
              onClick={() => setActiveTab('attendance')}
              className="w-full flex items-center justify-between p-3.5 bg-slate-50/70 hover:bg-slate-100/80 border border-slate-200/90 rounded-2xl text-left active:scale-[0.98] transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold border border-emerald-100 shrink-0">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <span className="block font-bold text-sm text-slate-900">ASISTENCIA</span>
                  <span className="text-xs text-slate-500">Presente, ausente, tardanza o excusa</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            {/* Opción 2: Actividad / Entrega */}
            <button
              onClick={() => setActiveTab('activity')}
              className="w-full flex items-center justify-between p-3.5 bg-slate-50/70 hover:bg-slate-100/80 border border-slate-200/90 rounded-2xl text-left active:scale-[0.98] transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100 shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <span className="block font-bold text-sm text-slate-900">ACTIVIDAD / ENTREGA</span>
                  <span className="text-xs text-slate-500">Marcar entrega y asignar nota</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            {/* Opción 3: Comportamiento */}
            <button
              onClick={() => setActiveTab('behavior')}
              className="w-full flex items-center justify-between p-3.5 bg-slate-50/70 hover:bg-slate-100/80 border border-slate-200/90 rounded-2xl text-left active:scale-[0.98] transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <span className="block font-bold text-sm text-slate-900">COMPORTAMIENTO</span>
                  <span className="text-xs text-slate-500">Positivo, llamado o reconocimiento</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            {/* Opción 4: Observación */}
            <button
              onClick={() => setActiveTab('observation')}
              className="w-full flex items-center justify-between p-3.5 bg-slate-50/70 hover:bg-slate-100/80 border border-slate-200/90 rounded-2xl text-left active:scale-[0.98] transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <span className="block font-bold text-sm text-slate-900">OBSERVACIÓN</span>
                  <span className="text-xs text-slate-500">Nota privada para el seguimiento</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        )}

        {/* SUB-MENU: ASISTENCIA */}
        {activeTab === 'attendance' && (
          <div className="py-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase">Estado de Asistencia Hoy</span>
              <button onClick={() => setActiveTab('menu')} className="text-xs text-blue-600 font-bold hover:underline">
                ← Volver
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => handleQuickAttendance('present')}
                className="p-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-sm flex flex-col items-center justify-center gap-1.5 shadow-md shadow-emerald-500/25 active:scale-95 transition-all"
              >
                <CheckCircle className="w-6 h-6" />
                <span>✓ PRESENTE</span>
              </button>

              <button
                onClick={() => handleQuickAttendance('absent')}
                className="p-4 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-bold text-sm flex flex-col items-center justify-center gap-1.5 shadow-md shadow-rose-500/25 active:scale-95 transition-all"
              >
                <X className="w-6 h-6" />
                <span>✕ AUSENTE</span>
              </button>

              <button
                onClick={() => handleQuickAttendance('late')}
                className="p-4 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-bold text-sm flex flex-col items-center justify-center gap-1.5 shadow-md shadow-amber-500/25 active:scale-95 transition-all"
              >
                <Clock className="w-6 h-6" />
                <span>⏰ TARDE</span>
              </button>

              <button
                onClick={() => handleQuickAttendance('excused')}
                className="p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm flex flex-col items-center justify-center gap-1.5 shadow-md shadow-blue-500/25 active:scale-95 transition-all"
              >
                <FileText className="w-6 h-6" />
                <span>📝 EXCUSA</span>
              </button>
            </div>
          </div>
        )}

        {/* SUB-MENU: ACTIVIDADES Y NOTA */}
        {activeTab === 'activity' && (
          <div className="py-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase">Registrar Actividad</span>
              <button onClick={() => setActiveTab('menu')} className="text-xs text-blue-600 font-bold hover:underline">
                ← Volver
              </button>
            </div>

            <div>
              <label className="text-xs text-slate-700 font-bold block mb-1">Seleccionar Actividad</label>
              <select
                value={selectedActivityId}
                onChange={e => setSelectedActivityId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-3 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
              >
                {activities.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.title} ({a.weightPercentage}%)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-700 font-bold block mb-1">Estado de Entrega</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'delivered', label: '✓ Entregó' },
                  { id: 'late', label: '⏰ Tardía' },
                  { id: 'not_delivered', label: '✕ No entregó' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setSubmissionStatus(opt.id as SubmissionStatus);
                      if (opt.id === 'not_delivered' && !gradeInput) {
                        setGradeInput('1.0');
                      }
                    }}
                    className={`py-2 px-2 text-xs font-bold rounded-xl border text-center transition-all ${
                      submissionStatus === opt.id
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-700 font-bold block mb-1">
                Calificación / Nota (Escala 0.0 - 5.0)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="5"
                value={gradeInput}
                onChange={e => setGradeInput(e.target.value)}
                placeholder="4.5"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-3 text-base font-black text-blue-600 focus:outline-none focus:border-blue-600"
              />
            </div>

            <button
              onClick={handleSaveActivity}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-500/25 active:scale-95 transition-all mt-2"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Registro</span>
            </button>
          </div>
        )}

        {/* SUB-MENU: COMPORTAMIENTO */}
        {activeTab === 'behavior' && (
          <div className="py-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase">Bitácora de Comportamiento</span>
              <button onClick={() => setActiveTab('menu')} className="text-xs text-blue-600 font-bold hover:underline">
                ← Volver
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { type: 'positive', label: '⭐ Positivo / Aporte' },
                { type: 'recognition', label: '🏆 Reconocimiento' },
                { type: 'warning', label: '⚠️ Llamado de Atención' },
                { type: 'non_compliance', label: '❌ Incumplimiento' }
              ].map(opt => (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => setBehaviorType(opt.type as BehaviorType)}
                  className={`p-2.5 text-xs font-bold rounded-2xl border text-left transition-all ${
                    behaviorType === opt.type
                      ? 'bg-amber-50 border-amber-300 text-amber-800'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div>
              <label className="text-xs text-slate-700 font-bold block mb-1">Título o Motivo</label>
              <input
                type="text"
                value={behaviorTitle}
                onChange={e => setBehaviorTitle(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-3 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>

            <button
              onClick={handleSaveBehavior}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-500/25 active:scale-95 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Registrar Comportamiento</span>
            </button>
          </div>
        )}

        {/* SUB-MENU: OBSERVACIÓN */}
        {activeTab === 'observation' && (
          <div className="py-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase">Nueva Observación Individual</span>
              <button onClick={() => setActiveTab('menu')} className="text-xs text-blue-600 font-bold hover:underline">
                ← Volver
              </button>
            </div>

            <textarea
              rows={3}
              value={observationText}
              onChange={e => setObservationText(e.target.value)}
              placeholder="Escribe aquí un comentario o seguimiento para este estudiante..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
            />

            <button
              onClick={handleSaveObservation}
              disabled={!observationText.trim()}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-500/25 active:scale-95 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Observación</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
