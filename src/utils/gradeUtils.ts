import { Activity, Submission } from '../types';
import { getColombiaDateString } from './dateUtils';

export interface WeightedAverageResult {
  average: number | null;
  averageFormatted: string;
  gradedCount: number;
  totalGradedWeight: number;
}

/**
 * Calcula el promedio ponderado de un estudiante teniendo en cuenta
 * el porcentaje de valor (weightPercentage) de cada actividad.
 * 
 * Reglas pedagógicas del sistema:
 * 1. Si un estudiante no entregó una actividad ('not_delivered'), por defecto tiene nota 1.0.
 * 2. Si se pasa la fecha límite (dueDate) y la actividad estaba pendiente o sin entregar,
 *    automáticamente se evalúa con 1.0 en tiempo real.
 * 3. Las actividades vigentes y aún en plazo que estén pendientes no penalizan antes de tiempo.
 */
export function calculateStudentWeightedAverage(
  activities: Activity[],
  studentSubmissions: Submission[]
): WeightedAverageResult {
  if (!activities || activities.length === 0) {
    return {
      average: null,
      averageFormatted: '—',
      gradedCount: 0,
      totalGradedWeight: 0
    };
  }

  const today = getColombiaDateString();
  let weightedSum = 0;
  let gradedWeightSum = 0;
  let gradedCount = 0;

  activities.forEach(act => {
    const sub = studentSubmissions.find(s => s.activityId === act.id);
    const weight = Math.max(0, Number(act.weightPercentage) || 0);
    if (weight <= 0) return;

    const isOverdue = Boolean(act.dueDate && act.dueDate < today);

    // Caso 1: Tiene calificación numérica registrada
    if (sub && sub.grade !== null && sub.grade !== undefined && !isNaN(Number(sub.grade))) {
      const grade = Number(sub.grade);
      weightedSum += grade * weight;
      gradedWeightSum += weight;
      gradedCount++;
    }
    // Caso 2: Marcado explícitamente como 'not_delivered' (no entregó -> 1.0)
    else if (sub && sub.status === 'not_delivered') {
      const grade = 1.0;
      weightedSum += grade * weight;
      gradedWeightSum += weight;
      gradedCount++;
    }
    // Caso 3: Actividad vencida (pasó la fecha) y el estudiante está pendiente o sin entrega
    // Automáticamente cuenta con nota 1.0 en tiempo real
    else if (isOverdue && (!sub || sub.status === 'pending')) {
      const grade = 1.0;
      weightedSum += grade * weight;
      gradedWeightSum += weight;
      gradedCount++;
    }
  });

  if (gradedCount === 0 || gradedWeightSum === 0) {
    return {
      average: null,
      averageFormatted: '—',
      gradedCount: 0,
      totalGradedWeight: 0
    };
  }

  // Normalizar sobre el total de porcentaje calificado hasta la fecha
  const avg = weightedSum / gradedWeightSum;
  const rounded = parseFloat(avg.toFixed(1));

  return {
    average: rounded,
    averageFormatted: rounded.toFixed(1),
    gradedCount,
    totalGradedWeight: gradedWeightSum
  };
}

/**
 * Obtiene la suma total de porcentajes de las actividades de un curso.
 */
export function getTotalActivitiesWeight(activities: Activity[], excludeActivityId?: string): number {
  return activities
    .filter(a => !excludeActivityId || a.id !== excludeActivityId)
    .reduce((sum, a) => sum + (Number(a.weightPercentage) || 0), 0);
}

/**
 * Obtiene el porcentaje restante disponible hasta el límite máximo de 100%.
 */
export function getRemainingWeight(activities: Activity[], excludeActivityId?: string): number {
  const currentTotal = getTotalActivitiesWeight(activities, excludeActivityId);
  return Math.max(0, 100 - currentTotal);
}

/**
 * Reparte el 100% de manera equitativa entre un listado de actividades.
 * Por ejemplo, 4 actividades -> 25%, 25%, 25%, 25%.
 * 3 actividades -> 34%, 33%, 33%.
 */
export function getEqualWeightsDistribution(activities: Activity[]): Record<string, number> {
  if (!activities || activities.length === 0) return {};
  const count = activities.length;
  const base = Math.floor(100 / count);
  let remainder = 100 - (base * count);

  const result: Record<string, number> = {};
  activities.forEach(a => {
    const bonus = remainder > 0 ? 1 : 0;
    if (remainder > 0) remainder--;
    result[a.id] = base + bonus;
  });
  return result;
}
