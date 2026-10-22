import React, { useState, useEffect } from 'react';
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
  Check,
  AlertCircle,
  RotateCcw
} from 'lucide-react';
import { useCourse } from '../context/CourseContext';
import { useToast } from '../context/ToastContext';
import { excelService } from '../services/excelService';
import { AttendanceStatus } from '../types';
import { getAttendanceAccess } from '../utils/attendanceUtils';
import {
  getColombiaDateString,
  getDayNameFromDateString,
  formatColombiaFullDate,
  getColombiaTimeString,
  formatTime12h
} from '../utils/dateUtils';

export const AttendancePage: React.FC = () => {
  const { students, activeCourse, attendanceSessions, recordAttendance, recordAttendanceBulk } = useCourse();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Fecha seleccionada por defecto en hora de Colombia (America/Bogota, UTC-5)
  const todayColombia = getColombiaDateString();
  const [selectedDate, setSelectedDate] = useState<string>(todayColombia);

  // Hora actual en Colombia con actualización cada minuto
  const [colombiaTime, setColombiaTime] = useState<string>(getColombiaTimeString());

  useEffect(() => {
    const timer = setInterval(() => {
      setColombiaTime(getColombiaTimeString());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Sesión para la fecha seleccionada
  const currentSession = attendanceSessions.find(s => s.date === selectedDate);
  const sessionRecords = currentSession?.records || {};

  // Contadores
  let presentCount = 0;
  let absentCount = 0;
  let lateCount = 0;
  let excusedCount = 0;

  let unmarkedCount = 0;

  students.forEach(student => {
    const status = sessionRecords[student.id]?.status;
    if (!status) unmarkedCount++;
    else if (status === 'present') presentCount++;
    else if (status === 'absent') absentCount++;
    else if (status === 'late') lateCount++;
    else if (status === 'excused') excusedCount++;
  });

  // Verificación del horario del curso según el día seleccionado
  const selectedDayName = getDayNameFromDateString(selectedDate);
  const scheduledDays = activeCourse?.scheduleDays || [];
  const isScheduledDay = scheduledDays.length === 0 || scheduledDays.includes(selectedDayName);
  const isToday = selectedDate === todayColombia;

  const access = getAttendanceAccess(scheduledDays, selectedDate, selectedDayName, todayColombia, Boolean(currentSession));
  const locked = !access.allowed;

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    if (locked) {
      showToast(access.reason, 'warning');
      return;
    }
    recordAttendance(selectedDate, studentId, status, 'manual');
  };

  const unmarkedStudents = students.filter(s => !sessionRecords[s.id]);

  // Solo afecta a quienes aún no tienen estado: no pisa ausentes/tardes ya marcados
  const markUnmarked = (status: AttendanceStatus) => {
    if (unmarkedStudents.length === 0 || locked) return;
    recordAttendanceBulk(selectedDate, unmarkedStudents.map(s => ({ studentId: s.id, status })), 'manual');
    showToast(
      status === 'present'
        ? `✓ ${unmarkedStudents.length} sin marcar quedaron como presentes`
        : `✓ ${unmarkedStudents.length} sin marcar quedaron como ausentes`,
      'success'
    );
  };

  const handleExport = () => {
    if (!activeCourse) return;
    excelService.exportAttendance(attendanceSessions, students, activeCourse.name);
    showToast(`✓ Registro de asistencia exportado a Excel`, 'info');
  };

  const changeDateByDays = (days: number) => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d + days, 12, 0, 0);
    setSelectedDate(getColombiaDateString(dateObj));
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-12">
      {/* CABECERA (Estilo AbsenSiswa) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarCheck2 className="w-5 h-5 text-blue-600" />
            <span>Control de Asistencia</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Curso: <strong className="text-slate-800">{activeCourse?.name}</strong> • {activeCourse?.subject}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => navigate('/scanner')}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>Escanear con QR</span>
          </button>

          <button
            onClick={handleExport}
            title="Exportar a Excel"
            className="p-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-xl border border-slate-200 text-xs shadow-xs transition-colors"
          >
            <Download className="w-4 h-4 text-emerald-600" />
          </button>
        </div>
      </div>

      {/* BARRA DE FECHA Y HORA COLOMBIA (AMERICA/BOGOTA) */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => changeDateByDays(-1)}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors"
            title="Día anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex flex-col items-center text-center">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="bg-transparent border-none text-sm font-extrabold text-slate-900 focus:outline-none cursor-pointer"
              />
            </div>
            <span className="text-xs font-bold text-slate-700 mt-0.5">
              {formatColombiaFullDate(selectedDate)}
            </span>
          </div>

          <button
            onClick={() => changeDateByDays(1)}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors"
            title="Día siguiente"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* DETALLE HORARIO COLOMBIA Y DÍAS DE CLASE DOCENTE */}
        <div className="pt-2.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-xl font-bold text-[11px]">
              <Clock className="w-3.5 h-3.5" />
              <span>Hora Colombia: {formatTime12h(colombiaTime)}</span>
            </div>

            {!isToday && (
              <button
                onClick={() => setSelectedDate(todayColombia)}
                className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-xl text-[11px] font-bold transition-colors"
              >
                <RotateCcw className="w-3 h-3 text-blue-600" />
                <span>Ir a Hoy</span>
              </button>
            )}
          </div>

          {/* Estado de programación del curso */}
          <div className="flex items-center gap-1.5">
            {isScheduledDay ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-xl">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>Día de clase programado ({selectedDayName})</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-xl">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>Fuera del horario habitual ({scheduledDays.join(', ')})</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================
          TARJETAS CONTADORAS (Estilo AbsenSiswa Screen 5)
          Present (Verde), Late (Ámbar), Absent (Rojo)
         ======================================================== */}
      <div className="grid grid-cols-3 gap-3">
        {/* Presentes */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 text-center shadow-xs">
          <span className="text-xs font-bold text-slate-500 block mb-1">Presentes</span>
          <div className="text-2xl md:text-3xl font-black text-emerald-600">{presentCount}</div>
        </div>

        {/* Tardes */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 text-center shadow-xs">
          <span className="text-xs font-bold text-slate-500 block mb-1">Tardes</span>
          <div className="text-2xl md:text-3xl font-black text-amber-500">{lateCount}</div>
        </div>

        {/* Ausentes */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 text-center shadow-xs">
          <span className="text-xs font-bold text-slate-500 block mb-1">Ausentes</span>
          <div className="text-2xl md:text-3xl font-black text-rose-600">{absentCount}</div>
        </div>
      </div>

      {locked && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-3 text-xs font-bold">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>{access.reason}</span>
        </div>
      )}
      {!locked && !isToday && currentSession && (
        <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 text-blue-800 rounded-2xl p-3 text-xs font-bold">
          <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <span>Estás corrigiendo la asistencia de una clase anterior (edición manual).</span>
        </div>
      )}

      {/* ESTADO DE LA LISTA Y ATAJOS PARA LOS QUE AÚN NO TIENEN ESTADO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <span className={`text-xs font-bold ${unmarkedCount > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
          {unmarkedCount > 0
            ? `${unmarkedCount} de ${students.length} sin marcar`
            : students.length > 0 ? '✓ Lista completa' : ''}
        </span>
        {unmarkedCount > 0 && !locked && (
          <div className="flex items-center gap-2 flex-wrap sm:justify-end">
            <button
              onClick={() => markUnmarked('present')}
              className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 border border-blue-200/80 active:scale-95 transition-all shadow-xs"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Sin marcar → Presentes</span>
            </button>
            <button
              onClick={() => markUnmarked('absent')}
              className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 border border-rose-200/80 active:scale-95 transition-all shadow-xs"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Sin marcar → Ausentes</span>
            </button>
          </div>
        )}
      </div>

      {/* ========================================================
          LISTA DE ASISTENCIA MANUAL TÁCTIL
         ======================================================== */}
      <div className="space-y-2">
        {students.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center text-slate-400">
            No hay estudiantes en este curso todavía.
          </div>
        ) : (
          students.map(student => {
            const rec = sessionRecords[student.id];
            const currentStatus: AttendanceStatus | undefined = rec?.status;

            return (
              <div
                key={student.id}
                className="bg-white border border-slate-200/90 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs hover:border-slate-300 transition-all"
              >
                {/* Info Alumno */}
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0 border border-blue-100">
                    #{String(student.listNumber).padStart(2, '0')}
                  </span>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{student.fullName}</h3>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                      <span className="font-mono text-blue-600">{student.uniqueCode}</span>
                      {rec?.source === 'qr' && (
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.2 rounded-md font-bold flex items-center gap-0.5">
                          <QrCode className="w-2.5 h-2.5" /> QR
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Botones de Estado Táctiles (Píldoras AbsenSiswa) */}
                <div className="grid grid-cols-4 gap-1.5 sm:flex sm:items-center shrink-0">
                  <button
                    type="button"
                    disabled={locked}
                    onClick={() => handleStatusChange(student.id, 'present')}
                    className={`py-1.5 px-3 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
                      currentStatus === 'present'
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Presente
                  </button>

                  <button
                    type="button"
                    disabled={locked}
                    onClick={() => handleStatusChange(student.id, 'absent')}
                    className={`py-1.5 px-3 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
                      currentStatus === 'absent'
                        ? 'bg-rose-600 border-rose-600 text-white shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Ausente
                  </button>

                  <button
                    type="button"
                    disabled={locked}
                    onClick={() => handleStatusChange(student.id, 'late')}
                    className={`py-1.5 px-3 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
                      currentStatus === 'late'
                        ? 'bg-amber-500 border-amber-500 text-white shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Tarde
                  </button>

                  <button
                    type="button"
                    disabled={locked}
                    onClick={() => handleStatusChange(student.id, 'excused')}
                    className={`py-1.5 px-3 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
                      currentStatus === 'excused'
                        ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Excusa
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

