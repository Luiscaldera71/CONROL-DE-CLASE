import { Student, Activity, Submission, AttendanceSession, RiskAlert, TeacherSettings } from '../types';
import { calculateStudentWeightedAverage } from './gradeUtils';
import { getColombiaDateString } from './dateUtils';

export function calculateStudentRisk(
  student: Student,
  activities: Activity[],
  submissions: Submission[],
  attendanceSessions: AttendanceSession[],
  settings: TeacherSettings
): RiskAlert {
  const { minGrade, minAttendanceRate, maxUnsubmitted } = settings.riskThresholds;
  const reasons: string[] = [];

  // 1. Filtrar entregas únicamente de actividades válidas existentes en este curso
  const validActivityIds = new Set(activities.map(a => a.id));
  const studentSubmissions = submissions.filter(
    s => s.studentId === student.id && validActivityIds.has(s.activityId)
  );

  // 2. Cálculo de Asistencia
  let totalSessions = 0;
  let presentOrExcused = 0;

  attendanceSessions.forEach(session => {
    const record = session.records[student.id];
    if (record) {
      totalSessions++;
      if (record.status === 'present' || record.status === 'excused') {
        presentOrExcused++;
      } else if (record.status === 'late') {
        presentOrExcused += 0.8; // Tardanza cuenta como 80%
      }
    }
  });

  const attendanceRate = totalSessions > 0
    ? Math.round((presentOrExcused / totalSessions) * 100)
    : 100;

  // Alerta de asistencia si tiene suficientes sesiones evaluadas
  const hasAttendanceRisk = totalSessions >= 3 && attendanceRate < minAttendanceRate;
  if (hasAttendanceRisk) {
    reasons.push(`Inasistencias frecuentes: ${attendanceRate}% de asistencia (mínimo requerido: ${minAttendanceRate}%)`);
  }

  // =========================================================================
  // REGLA CLAVE: Si NO hay actividades creadas en el curso, o ninguna ha sido
  // calificada/vencida, NINGÚN estudiante puede ponerse en riesgo académico por 0.0.
  // =========================================================================
  if (activities.length === 0) {
    return {
      studentId: student.id,
      studentName: student.fullName,
      listNumber: student.listNumber,
      uniqueCode: student.uniqueCode,
      level: hasAttendanceRisk ? 'high' : 'low',
      currentAverage: 0,
      attendanceRate,
      unsubmittedCount: 0,
      trend: 'stable',
      reasons
    };
  }

  // 3. Cálculo de Promedio Ponderado real con actividades válidas
  const weighted = calculateStudentWeightedAverage(activities, studentSubmissions);
  const hasAcademicAverage = weighted.average !== null;
  const currentAverage = hasAcademicAverage ? weighted.average! : 0;

  // 4. Actividades no entregadas / vencidas
  const today = getColombiaDateString();
  let unsubmittedCount = 0;

  activities.forEach(act => {
    const sub = studentSubmissions.find(s => s.activityId === act.id);
    const isOverdue = Boolean(act.dueDate && act.dueDate < today);
    if (sub?.status === 'not_delivered' || (isOverdue && (!sub || sub.status === 'pending'))) {
      unsubmittedCount++;
    }
  });

  // Solo se evalúa bajo promedio si el estudiante realmente tiene notas emitidas
  if (hasAcademicAverage) {
    if (currentAverage < minGrade) {
      reasons.push(`Bajo promedio actual (${currentAverage.toFixed(1)} / ${settings.gradeScale.max.toFixed(1)}) por debajo del umbral mínimo (${minGrade.toFixed(1)})`);
    } else if (currentAverage < minGrade + 0.4) {
      reasons.push(`Rendimiento cercano al límite de aprobación (${currentAverage.toFixed(1)})`);
    }
  }

  if (unsubmittedCount >= maxUnsubmitted) {
    reasons.push(`Acumulación de ${unsubmittedCount} actividades no entregadas o vencidas`);
  } else if (unsubmittedCount > 0 && unsubmittedCount >= Math.max(1, Math.floor(maxUnsubmitted / 2))) {
    reasons.push(`${unsubmittedCount} actividad(es) sin entregar`);
  }

  // 5. Determinación de severidad
  let riskLevel: 'high' | 'medium' | 'low' = 'low';

  if (
    (hasAcademicAverage && currentAverage < minGrade) ||
    unsubmittedCount >= maxUnsubmitted ||
    hasAttendanceRisk
  ) {
    riskLevel = 'high';
  } else if (reasons.length > 0) {
    riskLevel = 'medium';
  }

  // 6. Cálculo de tendencia
  let trend: 'descending' | 'stable' | 'ascending' = 'stable';
  const gradedList = studentSubmissions.filter(s => s.grade !== null && s.grade !== undefined);
  if (gradedList.length >= 2) {
    const lastTwo = gradedList.slice(-2);
    if ((lastTwo[1].grade || 0) < (lastTwo[0].grade || 0) - 0.3) {
      trend = 'descending';
    } else if ((lastTwo[1].grade || 0) > (lastTwo[0].grade || 0) + 0.3) {
      trend = 'ascending';
    }
  }

  return {
    studentId: student.id,
    studentName: student.fullName,
    listNumber: student.listNumber,
    uniqueCode: student.uniqueCode,
    level: riskLevel,
    currentAverage,
    attendanceRate,
    unsubmittedCount,
    trend,
    reasons
  };
}
