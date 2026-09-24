import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarCheck2,
  Zap,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Download,
  Calendar,
  ChevronLeft,
  ChevronRight,
  QrCode,
  Users,
  UserPlus
} from 'lucide-react';
import { useCourse } from '../context/CourseContext';
import { useToast } from '../context/ToastContext';
import { excelService } from '../services/excelService';
import { AttendanceStatus } from '../types';

export const AttendancePage: React.FC = () => {
  const { students, activeCourse, attendanceSessions, recordAttendance } = useCourse();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Buscar sesión para la fecha seleccionada
  const currentSession = attendanceSessions.find(s => s.date === selectedDate);
  const sessionRecords = currentSession?.records || {};

  // Contadores para la fecha seleccionada
  let presentCount = 0;
  let absentCount = 0;
  let lateCount = 0;
  let excusedCount = 0;

  students.forEach(student => {
    const rec = sessionRecords[student.id];
    const status = rec?.status || 'present'; // Default si se inicia sesión hoy
    if (status === 'present') presentCount++;
    else if (status === 'absent') absentCount++;
    else if (status === 'late') lateCount++;
    else if (status === 'excused') excusedCount++;
  });

  const total = students.length;
  const attendanceRate = total > 0
    ? Math.round(((presentCount + excusedCount + (lateCount * 0.8)) / total) * 100)
    : 100;

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    recordAttendance(selectedDate, studentId, status, 'manual');
  };

  const markAllPresent = () => {
    students.forEach(s => {
      recordAttendance(selectedDate, s.id, 'present', 'manual');
    });
    showToast(`✓ Todos los estudiantes marcados como presentes`, 'success');
  };

  const handleExport = () => {
    if (!activeCourse) return;
    excelService.exportAttendance(attendanceSessions, students, activeCourse.name);
    showToast(`✓ Registro de asistencia exportado a Excel`, 'info');
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* CABECERA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <CalendarCheck2 className="w-5 h-5 text-emerald-400" />
            <span>Control de Asistencia</span>
          </h1>
          <p className="text-xs text-slate-400">
            Curso: <strong className="text-slate-200">{activeCourse?.name}</strong> • {activeCourse?.subject}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Botón Escaneo Rápido */}
          <button
            onClick={() => navigate('/scanner')}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-lg active:scale-95 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>Pase Rápido con QR</span>
          </button>

          <button
            onClick={handleExport}
            title="Exportar a Excel"
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 text-xs"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* SELECTOR DE FECHA Y RESUMEN DEL DÍA */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Selector de Fecha */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            title="Día anterior"
            onClick={() => {
              const d = new Date(selectedDate + 'T12:00:00');
              d.setDate(d.getDate() - 1);
              setSelectedDate(d.toISOString().split('T')[0]);
            }}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-brand-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-medium focus:outline-none focus:border-brand-500"
            />
          </div>

          <button
            type="button"
            title="Día siguiente"
            onClick={() => {
              const d = new Date(selectedDate + 'T12:00:00');
              d.setDate(d.getDate() + 1);
              setSelectedDate(d.toISOString().split('T')[0]);
            }}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            className="text-[10px] text-slate-400 hover:text-white px-2 py-1 bg-slate-800/80 rounded-lg font-medium"
          >
            Hoy
          </button>
        </div>

        {/* Tarjetas métricas del día */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-950/50 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>{presentCount} Presentes</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-950/50 border border-rose-500/30 rounded-xl text-xs text-rose-300 font-bold">
            <span className="w-2 h-2 rounded-full bg-rose-400"></span>
            <span>{absentCount} Ausentes</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-950/50 border border-amber-500/30 rounded-xl text-xs text-amber-300 font-bold">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span>{lateCount} Tardes</span>
          </div>

          <button
            onClick={markAllPresent}
            className="text-[11px] text-brand-400 hover:text-brand-300 font-semibold px-2 py-1 bg-slate-800 rounded-lg ml-auto md:ml-0"
          >
            Marcar todos presentes
          </button>
        </div>
      </div>

      {/* LISTADO TÁCTIL DE ESTUDIANTES PARA ASISTENCIA MANUAL */}
      {students.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400">
            <Users className="w-7 h-7" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">No hay estudiantes en este curso</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              Para pasar lista por QR o de forma manual, primero registra o importa los estudiantes desde un archivo Excel.
            </p>
          </div>
          <button
            onClick={() => navigate('/students')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-500/20 active:scale-95 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>Gestionar o Importar Estudiantes</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {students.map(student => {
            const rec = sessionRecords[student.id];
            const currentStatus: AttendanceStatus = rec?.status || 'present';

            return (
              <div
                key={student.id}
                className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                {/* Info Alumno */}
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                    #{String(student.listNumber).padStart(2, '0')}
                  </span>
                  <div>
                    <h3 className="font-bold text-sm text-white">{student.fullName}</h3>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                      <span className="font-mono text-brand-300">{student.uniqueCode}</span>
                      {rec?.source === 'qr' && (
                        <span className="bg-emerald-500/10 text-emerald-400 px-1 rounded flex items-center gap-0.5">
                          <QrCode className="w-2.5 h-2.5" /> Escaneado
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Botones de Estado Táctil (1-Tap) */}
                <div className="grid grid-cols-4 gap-1.5 sm:flex sm:items-center shrink-0">
                  <button
                    type="button"
                    onClick={() => handleStatusChange(student.id, 'present')}
                    className={`py-1.5 px-2.5 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
                      currentStatus === 'present'
                        ? 'bg-emerald-600 border-emerald-500 text-white shadow-sm'
                        : 'bg-slate-800/80 border-slate-700/80 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Presente
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStatusChange(student.id, 'absent')}
                    className={`py-1.5 px-2.5 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
                      currentStatus === 'absent'
                        ? 'bg-rose-600 border-rose-500 text-white shadow-sm'
                        : 'bg-slate-800/80 border-slate-700/80 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Ausente
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStatusChange(student.id, 'late')}
                    className={`py-1.5 px-2.5 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
                      currentStatus === 'late'
                        ? 'bg-amber-600 border-amber-500 text-white shadow-sm'
                        : 'bg-slate-800/80 border-slate-700/80 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Tarde
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStatusChange(student.id, 'excused')}
                    className={`py-1.5 px-2.5 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
                      currentStatus === 'excused'
                        ? 'bg-blue-600 border-blue-500 text-white shadow-sm'
                        : 'bg-slate-800/80 border-slate-700/80 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Excusa
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
