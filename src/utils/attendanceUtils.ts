import { AttendanceSession, AttendanceStatus } from '../types';
import { getDayNameFromDateString } from './dateUtils';

/**
 * Peso con el que cada estado suma a la asistencia efectiva.
 * Fuente única para Inicio, Dashboard, Notas Definitivas, Riesgo, Portal y Excel.
 */
export const ATTENDANCE_WEIGHTS: Record<AttendanceStatus, number> = {
  present: 1,
  excused: 1,
  late: 0.8,
  absent: 0
};

/**
 * Regla para tomar asistencia en una fecha:
 * - Nunca en fechas futuras.
 * - Solo en días de clase del horario del curso (si tiene horario definido).
 * - Una fecha que ya tiene lista (día de clase pasado) sí se puede corregir de forma manual.
 */
export function getAttendanceAccess(
  scheduleDays: string[] | undefined,
  dateStr: string,
  dayName: string,
  todayStr: string,
  hasSession: boolean
): { allowed: boolean; reason: string } {
  if (dateStr > todayStr) {
    return { allowed: false, reason: 'No se puede tomar asistencia en fechas futuras.' };
  }
  const isClassDay = !scheduleDays || scheduleDays.length === 0 || scheduleDays.includes(dayName);
  // Los días fuera del horario no cuentan, tengan o no una lista antigua
  if (!isClassDay) {
    return { allowed: false, reason: `Este curso no tiene clase el ${dayName}; no se puede tomar asistencia ese día.` };
  }
  return { allowed: true, reason: '' };
}

/**
 * Descarta las sesiones registradas en días fuera del horario del curso:
 * no se cuentan en porcentajes, notas, riesgo ni exportaciones.
 */
export function filterClassDaySessions(
  sessions: AttendanceSession[],
  scheduleDays: string[] | undefined
): AttendanceSession[] {
  if (!scheduleDays || scheduleDays.length === 0) return sessions;
  return sessions.filter(s => scheduleDays.includes(getDayNameFromDateString(s.date)));
}

export interface StudentAttendanceStats {
  present: number;
  absent: number;
  late: number;
  excused: number;
  /** Clases en las que el estudiante SÍ tiene un estado marcado */
  counted: number;
  /** Porcentaje 0-100 (100 si aún no hay clases marcadas) */
  rate: number;
}

export function getStudentAttendanceStats(
  sessions: AttendanceSession[],
  studentId: string
): StudentAttendanceStats {
  const stats = { present: 0, absent: 0, late: 0, excused: 0, counted: 0, rate: 100 };
  let weighted = 0;

  sessions.forEach(session => {
    const rec = session.records[studentId];
    if (!rec) return; // sin marcar: no se cuenta ni a favor ni en contra
    stats.counted++;
    stats[rec.status]++;
    weighted += ATTENDANCE_WEIGHTS[rec.status];
  });

  if (stats.counted > 0) {
    stats.rate = Math.min(100, Math.round((weighted / stats.counted) * 100));
  }
  return stats;
}
