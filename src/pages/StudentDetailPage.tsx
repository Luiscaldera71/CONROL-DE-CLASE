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
  UserCheck,
  ExternalLink
} from 'lucide-react';
import { useCourse } from '../context/CourseContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { calculateStudentRisk } from '../utils/riskEngine';
import { getStudentPortalUrl } from '../utils/codeGenerator';
import { calculateStudentWeightedAverage } from '../utils/gradeUtils';
import { getColombiaDateString } from '../utils/dateUtils';

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
        <p className="text-slate-500 mb-4 font-medium">Estudiante no encontrado en este curso.</p>
        <button
          onClick={() => navigate('/students')}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
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

  const courseActivities = activities.filter(a => a.courseId === student.courseId);
  const courseSubmissions = submissions.filter(s => courseActivities.some(a => a.id === s.activityId));

  const risk = calculateStudentRisk(student, courseActivities, courseSubmissions, attendanceSessions, settings);

  // Calificaciones Ponderadas
  const studentSubs = courseSubmissions.filter(s => s.studentId === student.id);
  const weighted = calculateStudentWeightedAverage(courseActivities, studentSubs);
  const studentAvg = weighted.averageFormatted;

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
    <div className="space-y-4 max-w-4xl mx-auto pb-12">
      {/* BOTÓN VOLVER */}
      <button
        onClick={() => navigate('/students')}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors py-1"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Volver a la lista</span>
      </button>

      {/* CABECERA CON PERFIL Y QR (AbsenSiswa Style Screen 7) */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200/60 text-blue-600 font-extrabold text-2xl flex items-center justify-center shrink-0 shadow-xs">
            #{String(student.listNumber).padStart(2, '0')}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-mono text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-lg">
                {student.uniqueCode}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Curso: <strong className="text-slate-700">{activeCourse?.name}</strong>
              </span>
            </div>
            <h1 className="text-lg md:text-2xl font-extrabold text-slate-900 tracking-tight leading-tight">
              {student.fullName}
            </h1>
            {student.documentNumber && (
              <p className="text-xs text-slate-500 font-mono mt-0.5">Doc: {student.documentNumber}</p>
            )}
          </div>
        </div>

        {/* QR Pequeño Interactivo con borde limpio */}
        <div className="bg-slate-50 p-3 rounded-2xl inline-block self-start sm:self-center border border-slate-200/90 shrink-0 text-center">
          <div className="bg-white p-2 rounded-xl shadow-xs inline-block">
            <QRCodeSVG value={getStudentPortalUrl(student.uniqueCode)} size={84} level="M" />
          </div>
          <span className="block text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">QR Estudiante</span>
          <a
            href={`/estudiante?codigo=${student.uniqueCode}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 border border-blue-200"
          >
            <ExternalLink className="w-3 h-3" />
            <span>Ver como Estudiante</span>
          </a>
        </div>
      </div>

      {/* PANEL DE ALERTA ACADÉMICA / CAUSAL EXPLICABLE */}
      {risk.level !== 'low' && (
        <div className={`p-4 rounded-2xl border flex items-start gap-3.5 ${
          risk.level === 'high'
            ? 'bg-rose-50 border-rose-200 text-rose-800'
            : 'bg-amber-50 border-amber-200 text-amber-800'
        }`}>
          <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${risk.level === 'high' ? 'text-rose-500' : 'text-amber-500'}`} />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-900">
                {risk.level === 'high' ? 'Alerta de Atención Prioritaria' : 'En Seguimiento Académico'}
              </span>
            </div>
            <p className="text-xs text-slate-600">
              ¿Por qué aparece esta alerta? Motivos identificados según las configuraciones del docente:
            </p>
            <ul className="text-xs space-y-1 pt-1">
              {risk.reasons.map((r, i) => (
                <li key={i} className="flex items-center gap-1.5 font-medium text-slate-700">
                  <span className={`w-1.5 h-1.5 rounded-full ${risk.level === 'high' ? 'bg-rose-500' : 'bg-amber-500'}`}></span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* KPI CARDS RESUMEN (AbsenSiswa Style) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200/90 p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-semibold">Promedio</span>
            <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Award className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600">{studentAvg}</div>
          <div className="text-[10px] text-slate-400 font-medium mt-0.5">Escala 0.0 - 5.0</div>
        </div>

        <div className="bg-white border border-slate-200/90 p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-semibold">Asistencia</span>
            <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CalendarCheck2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600">{risk.attendanceRate}%</div>
          <div className="text-[10px] text-slate-400 font-medium mt-0.5">{presentCount} asistencias registradas</div>
        </div>

        <div className="bg-white border border-slate-200/90 p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-semibold">Entregas</span>
            <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <BookOpen className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-600">{deliveredCount} / {activities.length}</div>
          <div className="text-[10px] text-slate-400 font-medium mt-0.5">{risk.unsubmittedCount} no entregadas</div>
        </div>

        <div className="bg-white border border-slate-200/90 p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-semibold">Comportamiento</span>
            <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-indigo-600">{studentBehaviors.length}</div>
          <div className="text-[10px] text-slate-400 font-medium mt-0.5">Novedades en bitácora</div>
        </div>
      </div>

      {/* PESTAÑAS DETALLADAS (AbsenSiswa Pill Tabs) */}
      <div className="flex gap-2 border-b border-slate-200 pb-2 overflow-x-auto scrollbar-none">
        {[
          { id: 'summary', label: 'Actividades y Notas' },
          { id: 'attendance', label: 'Historial Asistencia' },
          { id: 'behavior', label: 'Comportamiento' },
          { id: 'observations', label: 'Observaciones Privadas' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* CONTENIDO PESTAÑA: ACTIVIDADES Y NOTAS */}
      {activeTab === 'summary' && (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-4 md:p-5 space-y-2.5 shadow-xs">
          {activities.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">No hay actividades registradas en este curso.</p>
          ) : (
            activities.map(act => {
              const today = getColombiaDateString();
              const sub = studentSubs.find(s => s.activityId === act.id);
              const isOverdue = Boolean(act.dueDate && act.dueDate < today);
              const status = sub?.status || (isOverdue ? 'not_delivered' : 'pending');
              const grade = sub?.grade !== null && sub?.grade !== undefined 
                ? sub.grade.toFixed(1) 
                : (status === 'not_delivered' ? '1.0' : '—');

              return (
                <div
                  key={act.id}
                  className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-2xl flex items-center justify-between gap-3 text-xs hover:border-blue-200 transition-colors"
                >
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs">{act.title}</h4>
                    <span className="text-[11px] text-slate-500">
                      Ponderación: {act.weightPercentage}% • Límite: {act.dueDate}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                      status === 'delivered'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : status === 'late'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : status === 'not_delivered'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}>
                      {status === 'delivered' ? '✓ Entregó' : status === 'late' ? '⏰ Tarde' : status === 'not_delivered' ? '✕ No entregó' : 'Pendiente'}
                    </span>

                    <span className="font-mono font-black text-amber-600 text-sm bg-white border border-slate-200 px-2.5 py-1 rounded-lg shadow-xs">
                      {grade}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* CONTENIDO PESTAÑA: ASISTENCIA */}
      {activeTab === 'attendance' && (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-4 md:p-5 space-y-3 shadow-xs">
          <div className="grid grid-cols-4 gap-2 text-center text-xs bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
            <div>
              <span className="text-emerald-600 font-extrabold text-lg block">{presentCount}</span>
              <span className="text-[10px] text-slate-500 font-semibold block">Presentes</span>
            </div>
            <div>
              <span className="text-rose-600 font-extrabold text-lg block">{absentCount}</span>
              <span className="text-[10px] text-slate-500 font-semibold block">Ausentes</span>
            </div>
            <div>
              <span className="text-amber-600 font-extrabold text-lg block">{lateCount}</span>
              <span className="text-[10px] text-slate-500 font-semibold block">Tardanzas</span>
            </div>
            <div>
              <span className="text-blue-600 font-extrabold text-lg block">{excusedCount}</span>
              <span className="text-[10px] text-slate-500 font-semibold block">Excusas</span>
            </div>
          </div>

          <div className="space-y-2">
            {attendanceSessions.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No hay sesiones de asistencia registradas.</p>
            ) : (
              attendanceSessions.map(session => {
                const rec = session.records[student.id];
                const st = rec?.status || 'present';

                return (
                  <div key={session.id} className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between text-xs">
                    <span className="text-slate-700 font-semibold">Clase del {session.date}</span>
                    <span className={`px-2.5 py-0.5 rounded-lg font-bold text-[10px] ${
                      st === 'present' ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' :
                      st === 'absent' ? 'text-rose-700 bg-rose-50 border border-rose-200' :
                      st === 'late' ? 'text-amber-700 bg-amber-50 border border-amber-200' : 'text-blue-700 bg-blue-50 border border-blue-200'
                    }`}>
                      {st.toUpperCase()}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* CONTENIDO PESTAÑA: COMPORTAMIENTO */}
      {activeTab === 'behavior' && (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-4 md:p-5 space-y-2.5 shadow-xs">
          {studentBehaviors.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">No tiene registros comportamentales.</p>
          ) : (
            studentBehaviors.map(b => (
              <div key={b.id} className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs space-y-1">
                <div className="flex justify-between font-bold text-slate-900">
                  <span>{b.title}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{b.date}</span>
                </div>
                <p className="text-slate-600">{b.description}</p>
                {b.observation && <p className="text-[11px] text-slate-500 italic">Nota: {b.observation}</p>}
              </div>
            ))
          )}
        </div>
      )}

      {/* CONTENIDO PESTAÑA: OBSERVACIONES */}
      {activeTab === 'observations' && (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-4 md:p-5 space-y-4 shadow-xs">
          <form onSubmit={handleAddObservation} className="flex gap-2">
            <input
              type="text"
              value={newObsText}
              onChange={e => setNewObsText(e.target.value)}
              placeholder="Escribe una observación pedagógica privada..."
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
            />
            <button
              type="submit"
              disabled={!newObsText.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Guardar</span>
            </button>
          </form>

          <div className="space-y-2">
            {studentObs.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">Sin observaciones registradas.</p>
            ) : (
              studentObs.map(obs => (
                <div key={obs.id} className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs">
                  <div className="flex justify-between text-[10px] text-slate-400 mb-1 font-semibold">
                    <span>Docente</span>
                    <span>{obs.date}</span>
                  </div>
                  <p className="text-slate-700 font-medium">{obs.text}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
