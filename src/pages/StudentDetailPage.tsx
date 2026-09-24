import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import {
  ArrowLeft,
  QrCode,
  Award,
  CalendarCheck2,
  BookOpen,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  FileText,
  Plus,
  Send,
  Share2,
  ExternalLink
} from 'lucide-react';
import { useCourse } from '../context/CourseContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { calculateStudentRisk } from '../utils/riskEngine';

export const StudentDetailPage: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const { students, activities, submissions, attendanceSessions, behaviorRecords, observations, activeCourse, addObservation } = useCourse();
  const { teacherProfile } = useAuth();
  const { showToast } = useToast();

  const [newObsText, setNewObsText] = useState('');
  const [activeTab, setActiveTab] = useState<'summary' | 'grades' | 'attendance' | 'behavior' | 'observations'>('summary');

  const student = students.find(s => s.id === studentId);

  if (!student) {
    return (
      <div className="max-w-md mx-auto text-center py-12">
        <p className="text-slate-400 mb-4">Estudiante no encontrado en este curso.</p>
        <button
          onClick={() => navigate('/students')}
          className="px-4 py-2 bg-brand-600 text-white rounded-xl text-xs font-bold"
        >
          Volver a estudiantes
        </button>
      </div>
    );
  }

  // Cálculos de Alerta
  const settings = teacherProfile?.settings || {
    gradeScale: { min: 0, max: 5, passingGrade: 3.0 },
    riskThresholds: { minGrade: 3.0, minAttendanceRate: 75, maxUnsubmitted: 3 },
    periods: ['Periodo 1'],
    behaviorCategories: []
  };

  const risk = calculateStudentRisk(student, activities, submissions, attendanceSessions, settings);

  // Calificaciones
  const studentSubs = submissions.filter(s => s.studentId === student.id);
  const gradedSubs = studentSubs.filter(s => s.grade !== null && s.grade !== undefined);
  const studentAvg = gradedSubs.length > 0
    ? (gradedSubs.reduce((acc, curr) => acc + (curr.grade || 0), 0) / gradedSubs.length).toFixed(1)
    : '—';

  // Entregas
  const deliveredCount = studentSubs.filter(s => s.status === 'delivered' || s.status === 'late').length;

  // Asistencia
  let presentCount = 0;
  let absentCount = 0;
  let lateCount = 0;
  let excusedCount = 0;

  attendanceSessions.forEach(session => {
    const rec = session.records[student.id];
    if (rec) {
      if (rec.status === 'present') presentCount++;
      else if (rec.status === 'absent') absentCount++;
      else if (rec.status === 'late') lateCount++;
      else if (rec.status === 'excused') excusedCount++;
    }
  });

  // Comportamientos
  const studentBehaviors = behaviorRecords.filter(b => b.studentId === student.id);

  // Observaciones
  const studentObs = observations.filter(o => o.studentId === student.id);

  const handleAddObservation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newObsText.trim()) return;
    addObservation(student.id, newObsText.trim());
    showToast(`✓ Observación guardada`, 'success');
    setNewObsText('');
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* BOTÓN VOLVER */}
      <button
        onClick={() => navigate('/students')}
        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Volver a la lista</span>
      </button>

      {/* CABECERA CON PERFIL Y QR */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white font-black text-xl flex items-center justify-center shrink-0 shadow-touch">
            #{String(student.listNumber).padStart(2, '0')}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-mono text-xs font-black bg-brand-500/20 text-brand-300 border border-brand-500/40 px-2 py-0.5 rounded-lg">
                {student.uniqueCode}
              </span>
              <span className="text-xs text-slate-400">
                Curso: <strong className="text-slate-200">{activeCourse?.name}</strong>
              </span>
            </div>
            <h1 className="text-lg md:text-2xl font-bold text-white tracking-tight leading-tight">
              {student.fullName}
            </h1>
            {student.documentNumber && (
              <p className="text-xs text-slate-400 font-mono mt-0.5">Doc: {student.documentNumber}</p>
            )}
          </div>
        </div>

        {/* QR Pequeño Interactivo y Acciones de Portal */}
        <div className="flex flex-col sm:flex-row items-center gap-3 self-start sm:self-center">
          <div className="bg-white p-2.5 rounded-2xl inline-block border border-slate-200 shrink-0 shadow-md">
            <QRCodeSVG value={`AC:${student.uniqueCode}`} size={75} level="M" />
          </div>
          <div className="flex flex-row sm:flex-col gap-2 w-full sm:w-auto">
            <button
              onClick={() => {
                const url = `${window.location.origin}/estudiante?code=${student.uniqueCode}`;
                navigator.clipboard.writeText(url);
                showToast(`✓ Enlace del estudiante copiado al portapapeles`, 'success');
              }}
              title="Copiar enlace único de consulta para el acudiente"
              className="flex-1 sm:flex-initial px-3 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Copiar Link</span>
            </button>
            <a
              href={`/estudiante?code=${student.uniqueCode}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-initial px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Ver Portal</span>
            </a>
          </div>
        </div>
      </div>

      {/* PANEL DE ALERTA ACADÉMICA / CAUSAL EXPLICABLE */}
      {risk.level !== 'low' && (
        <div className={`p-4 rounded-3xl border flex items-start gap-3.5 ${
          risk.level === 'high'
            ? 'bg-rose-950/30 border-rose-900/50 text-rose-200'
            : 'bg-amber-950/30 border-amber-900/50 text-amber-200'
        }`}>
          <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${risk.level === 'high' ? 'text-rose-400' : 'text-amber-400'}`} />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white">
                {risk.level === 'high' ? 'Alerta de Atención Prioritaria' : 'En Seguimiento Académico'}
              </span>
            </div>
            <p className="text-xs text-slate-300">
              ¿Por qué aparece esta alerta? Motivos identificados según las configuraciones del docente:
            </p>
            <ul className="text-xs space-y-1 pt-1">
              {risk.reasons.map((r, i) => (
                <li key={i} className="flex items-center gap-1.5 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* KPI CARDS RESUMEN */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Promedio</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">{studentAvg}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Escala 0.0 - 5.0</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Asistencia</span>
            <CalendarCheck2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">{risk.attendanceRate}%</div>
          <div className="text-[10px] text-slate-400 mt-0.5">{presentCount} asistencias registradas</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Entregas</span>
            <BookOpen className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-indigo-400">{deliveredCount} / {activities.length}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">{risk.unsubmittedCount} no entregadas</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Comportamiento</span>
            <Sparkles className="w-4 h-4 text-brand-400" />
          </div>
          <div className="text-2xl font-black text-brand-300">{studentBehaviors.length}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Novedades en bitácora</div>
        </div>
      </div>

      {/* PESTAÑAS DETALLADAS */}
      <div className="flex gap-2 border-b border-slate-800 pb-2 overflow-x-auto scrollbar-none">
        {[
          { id: 'summary', label: 'Actividades y Notas' },
          { id: 'attendance', label: 'Historial Asistencia' },
          { id: 'behavior', label: 'Comportamiento' },
          { id: 'observations', label: 'Observaciones Privadas' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-brand-600 text-white shadow-touch'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* CONTENIDO PESTAÑA: ACTIVIDADES Y NOTAS */}
      {activeTab === 'summary' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-2">
          {activities.map(act => {
            const sub = studentSubs.find(s => s.activityId === act.id);
            const status = sub?.status || 'pending';
            const grade = sub?.grade !== null && sub?.grade !== undefined ? sub.grade.toFixed(1) : '—';

            return (
              <div
                key={act.id}
                className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-2xl flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <h4 className="font-bold text-white text-xs">{act.title}</h4>
                  <span className="text-[10px] text-slate-400">
                    Ponderación: {act.weightPercentage}% • Límite: {act.dueDate}
                  </span>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                    status === 'delivered'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : status === 'late'
                      ? 'bg-amber-500/20 text-amber-300'
                      : status === 'not_delivered'
                      ? 'bg-rose-500/20 text-rose-300'
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    {status === 'delivered' ? '✓ Entregó' : status === 'late' ? '⏰ Tarde' : status === 'not_delivered' ? '✕ No entregó' : 'Pendiente'}
                  </span>

                  <span className="font-mono font-bold text-amber-400 text-sm bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-lg">
                    {grade}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CONTENIDO PESTAÑA: ASISTENCIA */}
      {activeTab === 'attendance' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-2">
          <div className="grid grid-cols-4 gap-2 text-center text-xs mb-3 bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
            <div>
              <span className="text-emerald-400 font-bold text-base">{presentCount}</span>
              <span className="text-[10px] text-slate-400 block">Presentes</span>
            </div>
            <div>
              <span className="text-rose-400 font-bold text-base">{absentCount}</span>
              <span className="text-[10px] text-slate-400 block">Ausentes</span>
            </div>
            <div>
              <span className="text-amber-400 font-bold text-base">{lateCount}</span>
              <span className="text-[10px] text-slate-400 block">Tardanzas</span>
            </div>
            <div>
              <span className="text-blue-400 font-bold text-base">{excusedCount}</span>
              <span className="text-[10px] text-slate-400 block">Excusas</span>
            </div>
          </div>

          <div className="space-y-1.5">
            {attendanceSessions.map(session => {
              const rec = session.records[student.id];
              const st = rec?.status || 'present';

              return (
                <div key={session.id} className="p-2.5 bg-slate-950/40 border border-slate-800/80 rounded-xl flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">Clase del {session.date}</span>
                  <span className={`px-2 py-0.5 rounded-lg font-bold text-[10px] ${
                    st === 'present' ? 'text-emerald-400 bg-emerald-500/10' :
                    st === 'absent' ? 'text-rose-400 bg-rose-500/10' :
                    st === 'late' ? 'text-amber-400 bg-amber-500/10' : 'text-blue-400 bg-blue-500/10'
                  }`}>
                    {st.toUpperCase()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CONTENIDO PESTAÑA: COMPORTAMIENTO */}
      {activeTab === 'behavior' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-2">
          {studentBehaviors.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">No tiene registros comportamentales.</p>
          ) : (
            studentBehaviors.map(b => (
              <div key={b.id} className="p-3 bg-slate-950/60 border border-slate-800 rounded-2xl text-xs space-y-1">
                <div className="flex justify-between font-bold text-white">
                  <span>{b.title}</span>
                  <span className="text-[10px] text-slate-400">{b.date}</span>
                </div>
                <p className="text-slate-300">{b.description}</p>
                {b.observation && <p className="text-[11px] text-slate-400 italic">Nota: {b.observation}</p>}
              </div>
            ))
          )}
        </div>
      )}

      {/* CONTENIDO PESTAÑA: OBSERVACIONES */}
      {activeTab === 'observations' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-4">
          <form onSubmit={handleAddObservation} className="flex gap-2">
            <input
              type="text"
              value={newObsText}
              onChange={e => setNewObsText(e.target.value)}
              placeholder="Escribe una observación pedagógica privada..."
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
            <button
              type="submit"
              disabled={!newObsText.trim()}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-touch flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Guardar</span>
            </button>
          </form>

          <div className="space-y-2">
            {studentObs.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">Sin observaciones registradas.</p>
            ) : (
              studentObs.map(obs => (
                <div key={obs.id} className="p-3 bg-slate-950/60 border border-slate-800 rounded-2xl text-xs">
                  <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                    <span>Docente</span>
                    <span>{obs.date}</span>
                  </div>
                  <p className="text-slate-200">{obs.text}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
