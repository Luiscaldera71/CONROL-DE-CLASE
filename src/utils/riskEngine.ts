import { Student, Activity, Submission, AttendanceSession, RiskAlert, TeacherSettings } from '../types';

export function calculateStudentRisk(
  student: Student,
  activities: Activity[],
  submissions: Submission[],
  attendanceSessions: AttendanceSession[],
  settings: TeacherSettings
): RiskAlert {
  const { minGrade, minAttendanceRate, maxUnsubmitted } = settings.riskThresholds;
  const reasons: string[] = [];

  // 1. Cálculo de Calificaciones / Promedio
  const studentSubmissions = submissions.filter(s => s.studentId === student.id);
  const gradedSubmissions = studentSubmissions.filter(s => s.grade !== null && s.grade !== undefined);
  
  let currentAverage = 0;
  if (gradedSubmissions.length > 0) {
    const totalGrades = gradedSubmissions.reduce((acc, curr) => acc + (curr.grade || 0), 0);
    currentAverage = parseFloat((totalGrades / gradedSubmissions.length).toFixed(1));
  } else {
    // Si no tiene notas aún, promedio neutral en la escala
    currentAverage = settings.gradeScale.passingGrade;
  }

  // 2. Actividades no entregadas / pendientes
  let unsubmittedCount = 0;
  activities.forEach(act => {
    const sub = studentSubmissions.find(s => s.activityId === act.id);
    if (!sub || sub.status === 'not_delivered') {
      unsubmittedCount++;
    }
  });

  // 3. Asistencia
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

  // Evaluación de alertas y causales
  let riskLevel: 'high' | 'medium' | 'low' = 'low';

  if (gradedSubmissions.length > 0 && currentAverage < minGrade) {
    reasons.push(`Bajo promedio actual (${currentAverage.toFixed(1)} / ${settings.gradeScale.max.toFixed(1)}) por debajo del umbral mínimo (${minGrade.toFixed(1)})`);
  }

  if (unsubmittedCount >= maxUnsubmitted) {
    reasons.push(`Acumulación de ${unsubmittedCount} actividades no entregadas o pendientes`);
  } else if (unsubmittedCount > 0 && unsubmittedCount >= Math.floor(maxUnsubmitted / 2)) {
    reasons.push(`${unsubmittedCount} actividad(es) sin entregar`);
  }

  if (totalSessions >= 3 && attendanceRate < minAttendanceRate) {
    reasons.push(`Inasistencias frecuentes: ${attendanceRate}% de asistencia (mínimo requerido: ${minAttendanceRate}%)`);
  }

  // Determinación de severidad
  if (
    (gradedSubmissions.length > 0 && currentAverage < minGrade) ||
    unsubmittedCount >= maxUnsubmitted ||
    (totalSessions >= 3 && attendanceRate < minAttendanceRate)
  ) {
    riskLevel = 'high';
  } else if (reasons.length > 0 || (currentAverage >= minGrade && currentAverage < minGrade + 0.4)) {
    riskLevel = 'medium';
    if (reasons.length === 0) {
      reasons.push(`Rendimiento cercano al límite de aprobación (${currentAverage.toFixed(1)})`);
    }
  }

  // Cálculo de tendencia
  let trend: 'descending' | 'stable' | 'ascending' = 'stable';
  if (gradedSubmissions.length >= 2) {
    const lastTwo = gradedSubmissions.slice(-2);
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
