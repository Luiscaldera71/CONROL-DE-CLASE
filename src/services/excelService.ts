import * as XLSX from 'xlsx';
import { Student, AttendanceSession, Activity, Submission, BehaviorRecord } from '../types';

export interface ParsedStudentRow {
  listNumber?: number;
  fullName: string;
  documentNumber?: string;
  grade?: string;
  group?: string;
}

export const excelService = {
  // Descargar plantilla Excel modelo para cargar estudiantes
  downloadStudentTemplate(courseName: string = 'Curso'): void {
    const templateData = [
      {
        'N°': 1,
        'Nombre Completo': 'GÓMEZ PÉREZ CARLOS ANDRÉS',
        'Documento': '1098765432'
      },
      {
        'N°': 2,
        'Nombre Completo': 'MARTÍNEZ LÓPEZ ANA SOFÍA',
        'Documento': '1098765433'
      },
      {
        'N°': 3,
        'Nombre Completo': 'RODRÍGUEZ SILVA MATEO',
        'Documento': '1098765434'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    // Configurar anchos de columna recomendados
    ws['!cols'] = [{ wch: 6 }, { wch: 35 }, { wch: 18 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla Estudiantes');
    XLSX.writeFile(wb, `Plantilla_Estudiantes_${courseName.replace(/\s+/g, '_')}.xlsx`);
  },

  // Parsear archivo CSV o XLSX con autodetección inteligente de columnas
  parseStudentsFile(file: File): Promise<{
    students: ParsedStudentRow[];
    columnCount: number;
    rawColumns: string[];
  }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          if (!rawRows || rawRows.length === 0) {
            return reject(new Error('El archivo de Excel está vacío.'));
          }

          // Identificar fila de encabezados examinando las primeras 10 filas
          let headerRowIdx = -1;
          for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
            const rowStr = (rawRows[i] || []).join(' ').toLowerCase();
            if (
              rowStr.includes('nombre') ||
              rowStr.includes('estudiante') ||
              rowStr.includes('alumno') ||
              rowStr.includes('apellido')
            ) {
              headerRowIdx = i;
              break;
            }
          }

          if (headerRowIdx === -1) {
            headerRowIdx = 0; // fallback a primera fila
          }

          const headers: string[] = (rawRows[headerRowIdx] || []).map((h: any) => String(h || '').trim());

          // Buscar columnas
          const nameColIdx = headers.findIndex(h => {
            const lower = h.toLowerCase();
            return (
              (lower.includes('nombre') && !lower.includes('apellido')) ||
              lower.includes('estudiante') ||
              lower.includes('alumno') ||
              lower.includes('nombre completo')
            );
          });

          const lastNameColIdx = headers.findIndex(h => {
            const lower = h.toLowerCase();
            return lower.includes('apellido');
          });

          // Caso especial: una sola columna llamada "Apellidos y Nombres" o "Nombres y Apellidos"
          const fullCombinedColIdx = headers.findIndex(h => {
            const lower = h.toLowerCase();
            return lower.includes('apellidos y nombres') || lower.includes('nombres y apellidos');
          });

          const docColIdx = headers.findIndex(h => {
            const lower = h.toLowerCase();
            return (
              lower.includes('documento') ||
              lower.includes('identificación') ||
              lower.includes('identificacion') ||
              lower.includes('cedula') ||
              lower.includes('cédula') ||
              lower.includes('ti') ||
              lower.includes('tarjeta') ||
              lower.includes('dni') ||
              lower.includes('id')
            );
          });

          const listColIdx = headers.findIndex(h => {
            const lower = h.toLowerCase();
            return (
              lower === 'n°' ||
              lower === 'no' ||
              lower === 'num' ||
              lower === '#' ||
              lower.includes('lista') ||
              lower.includes('orden')
            );
          });

          const effectiveNameIdx = fullCombinedColIdx !== -1 ? fullCombinedColIdx : nameColIdx;

          if (effectiveNameIdx === -1 && lastNameColIdx === -1) {
            return reject(
              new Error(
                'No se encontró una columna con nombres de estudiantes (ej: "Nombre Completo", "Estudiante" o "Apellidos"). Revisa los encabezados de tu Excel.'
              )
            );
          }

          const students: ParsedStudentRow[] = [];

          for (let r = headerRowIdx + 1; r < rawRows.length; r++) {
            const row = rawRows[r];
            if (!row || row.length === 0) continue;

            let fullName = '';

            // Si hay columna de apellidos y nombres separadas
            if (lastNameColIdx !== -1 && nameColIdx !== -1 && lastNameColIdx !== nameColIdx) {
              const last = String(row[lastNameColIdx] || '').trim();
              const first = String(row[nameColIdx] || '').trim();
              if (last && first) {
                fullName = `${last} ${first}`;
              } else {
                fullName = last || first;
              }
            } else if (effectiveNameIdx !== -1) {
              fullName = String(row[effectiveNameIdx] || '').trim();
            } else if (lastNameColIdx !== -1) {
              fullName = String(row[lastNameColIdx] || '').trim();
            }

            if (!fullName || fullName.length < 3) continue;

            // Limpiar comas o espacios dobles
            fullName = fullName.replace(/\s+/g, ' ').trim();

            const doc = docColIdx !== -1 ? String(row[docColIdx] || '').trim() : undefined;
            const listNum = listColIdx !== -1 ? parseInt(String(row[listColIdx] || ''), 10) : undefined;

            students.push({
              listNumber: !isNaN(listNum as any) ? listNum : students.length + 1,
              fullName,
              documentNumber: doc && doc.length > 2 ? doc : undefined
            });
          }

          if (students.length === 0) {
            return reject(new Error('No se encontraron filas con datos de estudiantes válidos debajo del encabezado.'));
          }

          resolve({
            students,
            columnCount: headers.length,
            rawColumns: headers
          });
        } catch (err: any) {
          reject(new Error(`Error al procesar el archivo Excel: ${err?.message || err}`));
        }
      };

      reader.onerror = () => reject(new Error('Error al leer el archivo.'));
      reader.readAsArrayBuffer(file);
    });
  },

  // Exportar listado de estudiantes a XLSX
  exportStudents(students: Student[], courseName: string): void {
    const data = students.map(s => ({
      'N° Lista': s.listNumber,
      'Nombre Completo': s.fullName,
      'Código QR': s.uniqueCode,
      'Documento': s.documentNumber || '—',
      'Fecha Registro': new Date(s.createdAt).toLocaleDateString()
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [{ wch: 10 }, { wch: 35 }, { wch: 14 }, { wch: 16 }, { wch: 15 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Estudiantes');
    XLSX.writeFile(wb, `AulaControl_Estudiantes_${courseName.replace(/\s+/g, '_')}.xlsx`);
  },

  // Exportar Asistencia
  exportAttendance(sessions: AttendanceSession[], students: Student[], courseName: string): void {
    const sortedDates = [...sessions].sort((a, b) => a.date.localeCompare(b.date));
    const data: any[] = [];

    students.forEach(s => {
      const row: any = {
        'N°': s.listNumber,
        'Estudiante': s.fullName,
        'Código': s.uniqueCode
      };

      let presentCount = 0;
      let absentCount = 0;
      let lateCount = 0;
      let excusedCount = 0;

      sortedDates.forEach(sess => {
        const rec = sess.records[s.id];
        const statusMap: any = { present: 'P', absent: 'F', late: 'R', excused: 'E' };
        const val = rec ? statusMap[rec.status] || '—' : '—';
        row[sess.date] = val;

        if (rec?.status === 'present') presentCount++;
        else if (rec?.status === 'absent') absentCount++;
        else if (rec?.status === 'late') lateCount++;
        else if (rec?.status === 'excused') excusedCount++;
      });

      row['Total Presentes (P)'] = presentCount;
      row['Total Faltas (F)'] = absentCount;
      row['Total Retardos (R)'] = lateCount;
      row['Total Excusas (E)'] = excusedCount;

      data.push(row);
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Asistencia');
    XLSX.writeFile(wb, `AulaControl_Asistencia_${courseName.replace(/\s+/g, '_')}.xlsx`);
  },

  // Exportar Notas y Calificaciones
  exportGrades(activities: Activity[], submissions: Submission[], students: Student[], courseName: string): void {
    const data: any[] = [];

    students.forEach(s => {
      const studentSubs = submissions.filter(sub => sub.studentId === s.id);
      const row: any = {
        'N°': s.listNumber,
        'Estudiante': s.fullName,
        'Código': s.uniqueCode
      };

      let weightedSum = 0;
      let totalWeight = 0;

      activities.forEach(act => {
        const sub = studentSubs.find(sub => sub.activityId === act.id);
        const gradeVal = sub?.grade !== null && sub?.grade !== undefined ? sub.grade : '—';
        row[`${act.title.substring(0, 20)} (${act.weightPercentage}%)`] = gradeVal;

        if (typeof gradeVal === 'number') {
          weightedSum += gradeVal * (act.weightPercentage / 100);
          totalWeight += act.weightPercentage;
        }
      });

      // Promedio ponderado real
      row['Definitiva Ponderada'] = totalWeight > 0 ? (weightedSum / (totalWeight / 100)).toFixed(2) : '—';
      data.push(row);
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Calificaciones');
    XLSX.writeFile(wb, `AulaControl_Notas_${courseName.replace(/\s+/g, '_')}.xlsx`);
  },

  // Exportar Listado de Actividades
  exportActivities(activities: Activity[], courseName: string): void {
    const data = activities.map((a, idx) => ({
      'N°': idx + 1,
      'Título': a.title,
      'Estado': a.status === 'active' ? 'Activa' : 'Cerrada',
      'Periodo': a.period,
      'Ponderación (%)': a.weightPercentage,
      'Nota Máxima': a.maxGrade,
      'Fecha Límite': a.dueDate,
      'Descripción': a.description || '—'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [{ wch: 5 }, { wch: 30 }, { wch: 15 }, { wch: 12 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 30 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Actividades');
    XLSX.writeFile(wb, `AulaControl_Actividades_${courseName.replace(/\s+/g, '_')}.xlsx`);
  },

  // Exportar Bitácora de Comportamiento y Convivencia
  exportBehaviors(records: BehaviorRecord[], students: Student[], courseName: string): void {
    const studentMap = new Map(students.map(s => [s.id, s]));

    const data = records.map((b, idx) => {
      const student = studentMap.get(b.studentId);
      return {
        'N°': idx + 1,
        'Fecha': b.date,
        'N° Lista': student?.listNumber || '—',
        'Estudiante': student?.fullName || 'Desconocido',
        'Código': student?.uniqueCode || '—',
        'Tipo': b.type.toUpperCase(),
        'Nivel/Gravedad': b.severity ? b.severity.toUpperCase() : 'LEVE',
        'Título/Falta o Mérito': b.title,
        'Puntaje/Nota Negativa': (b as any).points !== undefined ? (b as any).points : (b.type === 'positive' ? '+1' : '-1'),
        'Descripción': b.description || '—',
        'Observación Pedagógica': b.observation || '—'
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [{ wch: 5 }, { wch: 14 }, { wch: 8 }, { wch: 32 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 28 }, { wch: 18 }, { wch: 35 }, { wch: 35 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Comportamiento');
    XLSX.writeFile(wb, `AulaControl_Comportamiento_${courseName.replace(/\s+/g, '_')}.xlsx`);
  }
};
