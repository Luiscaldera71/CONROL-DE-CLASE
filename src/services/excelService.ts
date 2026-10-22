import * as XLSX from 'xlsx-js-style';
import { Student, AttendanceSession, Activity, Submission, BehaviorRecord, Course } from '../types';
import { calculateStudentWeightedAverage } from '../utils/gradeUtils';
import { getColombiaDateString } from '../utils/dateUtils';
import { ATTENDANCE_WEIGHTS, getStudentAttendanceStats } from '../utils/attendanceUtils';

export interface ParsedStudentRow {
  listNumber?: number;
  fullName: string;
  documentNumber?: string;
  grade?: string;
  group?: string;
}

// Convertidor de índice de columna base 0 a letra de Excel (0 -> A, 27 -> AB)
function colToLetter(colIndex: number): string {
  let letter = '';
  let temp = colIndex;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

// Estilos de celda predefinidos para un diseño visual elegante y profesional
const STYLES = {
  mainHeader: {
    font: { name: 'Calibri', sz: 14, bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '1E3A8A' } }, // Deep Navy Blue
    alignment: { horizontal: 'center', vertical: 'center' }
  },
  subHeader: {
    font: { name: 'Calibri', sz: 10, italic: true, color: { rgb: 'E2E8F0' } },
    fill: { fgColor: { rgb: '1E40AF' } },
    alignment: { horizontal: 'center', vertical: 'center' }
  },
  tableHeader: {
    font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '2563EB' } }, // Royal Blue
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: {
      top: { style: 'thin', color: { rgb: 'CBD5E1' } },
      bottom: { style: 'medium', color: { rgb: '0F172A' } },
      left: { style: 'thin', color: { rgb: 'CBD5E1' } },
      right: { style: 'thin', color: { rgb: 'CBD5E1' } }
    }
  },
  accentHeader: {
    font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '059669' } }, // Emerald Green
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: {
      top: { style: 'thin', color: { rgb: 'CBD5E1' } },
      bottom: { style: 'medium', color: { rgb: '065F46' } },
      left: { style: 'thin', color: { rgb: 'CBD5E1' } },
      right: { style: 'thin', color: { rgb: 'CBD5E1' } }
    }
  },
  goldHeader: {
    font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: 'D97706' } }, // Amber / Gold
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: {
      top: { style: 'thin', color: { rgb: 'CBD5E1' } },
      bottom: { style: 'medium', color: { rgb: '92400E' } },
      left: { style: 'thin', color: { rgb: 'CBD5E1' } },
      right: { style: 'thin', color: { rgb: 'CBD5E1' } }
    }
  },
  cellNormal: {
    font: { name: 'Calibri', sz: 10, color: { rgb: '0F172A' } },
    alignment: { vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'E2E8F0' } },
      bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
      left: { style: 'thin', color: { rgb: 'E2E8F0' } },
      right: { style: 'thin', color: { rgb: 'E2E8F0' } }
    }
  },
  cellZebra: {
    font: { name: 'Calibri', sz: 10, color: { rgb: '0F172A' } },
    fill: { fgColor: { rgb: 'F8FAFC' } },
    alignment: { vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'E2E8F0' } },
      bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
      left: { style: 'thin', color: { rgb: 'E2E8F0' } },
      right: { style: 'thin', color: { rgb: 'E2E8F0' } }
    }
  },
  cellCenter: {
    font: { name: 'Calibri', sz: 10, color: { rgb: '0F172A' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'E2E8F0' } },
      bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
      left: { style: 'thin', color: { rgb: 'E2E8F0' } },
      right: { style: 'thin', color: { rgb: 'E2E8F0' } }
    }
  },
  cellCenterZebra: {
    font: { name: 'Calibri', sz: 10, color: { rgb: '0F172A' } },
    fill: { fgColor: { rgb: 'F8FAFC' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'E2E8F0' } },
      bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
      left: { style: 'thin', color: { rgb: 'E2E8F0' } },
      right: { style: 'thin', color: { rgb: 'E2E8F0' } }
    }
  },
  cellGrade: {
    font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: '1E293B' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'E2E8F0' } },
      bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
      left: { style: 'thin', color: { rgb: 'E2E8F0' } },
      right: { style: 'thin', color: { rgb: 'E2E8F0' } }
    }
  },
  cellAverage: {
    font: { name: 'Calibri', sz: 10.5, bold: true, color: { rgb: '065F46' } },
    fill: { fgColor: { rgb: 'D1FAE5' } }, // Soft green
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'A7F3D0' } },
      bottom: { style: 'thin', color: { rgb: 'A7F3D0' } },
      left: { style: 'thin', color: { rgb: 'A7F3D0' } },
      right: { style: 'thin', color: { rgb: 'A7F3D0' } }
    }
  },
  cellDefinitiva: {
    font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: '1E3A8A' } },
    fill: { fgColor: { rgb: 'DBEAFE' } }, // Soft Blue
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'medium', color: { rgb: '3B82F6' } },
      bottom: { style: 'medium', color: { rgb: '3B82F6' } },
      left: { style: 'medium', color: { rgb: '3B82F6' } },
      right: { style: 'medium', color: { rgb: '3B82F6' } }
    }
  },
  cellDesempeno: {
    font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: '1E293B' } },
    fill: { fgColor: { rgb: 'FEF3C7' } }, // Soft amber
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'FDE68A' } },
      bottom: { style: 'thin', color: { rgb: 'FDE68A' } },
      left: { style: 'thin', color: { rgb: 'FDE68A' } },
      right: { style: 'thin', color: { rgb: 'FDE68A' } }
    }
  },
  footerSummary: {
    font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: '1E293B' } },
    fill: { fgColor: { rgb: 'F1F5F9' } },
    alignment: { vertical: 'center' },
    border: {
      top: { style: 'medium', color: { rgb: '94A3B8' } },
      bottom: { style: 'medium', color: { rgb: '94A3B8' } }
    }
  }
};

export const excelService = {
  /**
   * Generar y descargar la plantilla oficial en Excel (.xlsx) para que los docentes
   * ingresen el listado de estudiantes y lo vuelvan a subir.
   */
  downloadStudentTemplate(courseName?: string, course?: Course | null): void {
    const wb = XLSX.utils.book_new();
    const ws: any = {};

    const effectiveCourseName = courseName || course?.name || 'General';
    const institution = course?.institution || 'Institución Educativa';
    const titleText = `AULACONTROL - FORMATO OFICIAL DE IMPORTACIÓN DE ESTUDIANTES`;
    const subTitle = `${institution} • Curso: ${effectiveCourseName} • Año ${new Date().getFullYear()}`;
    const instructionText = `INSTRUCCIONES: Escribe o pega tus estudiantes en la columna "NOMBRES Y APELLIDOS". Puedes borrar los ejemplos. Guarda el archivo y súbelo a AulaControl.`;

    // Fila 1: Título Principal
    ws['A1'] = { t: 's', v: titleText, s: STYLES.mainHeader };
    // Fila 2: Subtítulo Institucional
    ws['A2'] = { t: 's', v: subTitle, s: STYLES.subHeader };
    // Fila 3: Instrucciones
    ws['A3'] = {
      t: 's',
      v: instructionText,
      s: {
        font: { name: 'Calibri', sz: 9.5, italic: true, bold: true, color: { rgb: '92400E' } },
        fill: { fgColor: { rgb: 'FEF3C7' } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: {
          top: { style: 'thin', color: { rgb: 'FDE68A' } },
          bottom: { style: 'thin', color: { rgb: 'FDE68A' } },
          left: { style: 'thin', color: { rgb: 'FDE68A' } },
          right: { style: 'thin', color: { rgb: 'FDE68A' } }
        }
      }
    };

    // Fila 4: Encabezados de Tabla
    const headers = [
      'N° LISTA',
      'NOMBRES Y APELLIDOS * (Obligatorio)',
      'DOCUMENTO DE IDENTIDAD (Opcional)',
      'OBSERVACIONES / TELÉFONO (Opcional)'
    ];

    headers.forEach((h, idx) => {
      const colLetter = colToLetter(idx);
      ws[`${colLetter}4`] = { t: 's', v: h, s: STYLES.accentHeader };
    });

    // Filas 5 a 7: Estudiantes de ejemplo representativos
    const sampleRows = [
      { num: 1, name: 'ÁLVAREZ RAMÍREZ SOFÍA', doc: '1098765401', obs: 'Acudiente: 3001234567' },
      { num: 2, name: 'CASTRO VARGAS JUAN SEBASTIÁN', doc: '1098765402', obs: '' },
      { num: 3, name: 'HERNÁNDEZ PINEDA VALENTINA', doc: '1098765403', obs: '' }
    ];

    let currentRow = 5;
    sampleRows.forEach((st, idx) => {
      const isZebra = idx % 2 === 1;
      const cellStyle = isZebra ? STYLES.cellZebra : STYLES.cellNormal;
      const centerStyle = isZebra ? STYLES.cellCenterZebra : STYLES.cellCenter;

      ws[`A${currentRow}`] = { t: 'n', v: st.num, s: centerStyle };
      ws[`B${currentRow}`] = { t: 's', v: st.name, s: cellStyle };
      ws[`C${currentRow}`] = { t: 's', v: st.doc, s: centerStyle };
      ws[`D${currentRow}`] = { t: 's', v: st.obs, s: cellStyle };
      currentRow++;
    });

    // Filas 8 a 40: Filas vacías preformateadas listas para escribir o pegar
    for (let i = 4; i <= 35; i++) {
      const isZebra = i % 2 === 1;
      const cellStyle = isZebra ? STYLES.cellZebra : STYLES.cellNormal;
      const centerStyle = isZebra ? STYLES.cellCenterZebra : STYLES.cellCenter;

      ws[`A${currentRow}`] = { t: 'n', v: i, s: centerStyle };
      ws[`B${currentRow}`] = { t: 's', v: '', s: cellStyle };
      ws[`C${currentRow}`] = { t: 's', v: '', s: centerStyle };
      ws[`D${currentRow}`] = { t: 's', v: '', s: cellStyle };
      currentRow++;
    }

    // Merges
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }, // A1:D1
      { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } }, // A2:D2
      { s: { r: 2, c: 0 }, e: { r: 2, c: 3 } }  // A3:D3
    ];

    // Ancho de columnas
    ws['!cols'] = [
      { wch: 12 }, // N°
      { wch: 45 }, // Nombres y Apellidos
      { wch: 28 }, // Documento
      { wch: 35 }  // Observaciones
    ];

    // Altura de filas
    ws['!rows'] = [
      { hpt: 26 }, // Fila 1 Título
      { hpt: 18 }, // Fila 2 Subtítulo
      { hpt: 28 }, // Fila 3 Instrucciones
      { hpt: 26 }  // Fila 4 Encabezados
    ];

    ws['!ref'] = `A1:D${currentRow - 1}`;

    XLSX.utils.book_append_sheet(wb, ws, 'Estudiantes');
    const safeName = effectiveCourseName.replace(/[^a-zA-Z0-9_\-]/g, '_');
    XLSX.writeFile(wb, `Formato_Estudiantes_${safeName}.xlsx`);
  },

  // Parsear archivo CSV o XLSX de importación
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
            return reject(new Error('El archivo está vacío.'));
          }

          // Detección inteligente de la fila de encabezados
          let headerRowIdx = -1;
          for (let i = 0; i < Math.min(rawRows.length, 15); i++) {
            const row = rawRows[i] || [];
            const rowStr = row.join(' ').toLowerCase();

            // Descartar filas de títulos principales o de instrucciones generales
            if (rowStr.includes('formato oficial') || rowStr.includes('instrucciones:')) {
              continue;
            }

            const hasNameCol = row.some((cell: any) => {
              const lower = String(cell || '').toLowerCase().trim();
              return (
                lower.includes('nombre') ||
                lower.includes('estudiante') ||
                lower.includes('alumno') ||
                lower.includes('apellidos')
              );
            });

            const nonEmptyCells = row.filter((c: any) => String(c || '').trim().length > 0);
            if (hasNameCol && (nonEmptyCells.length >= 2 || rowStr.includes('lista') || rowStr.includes('documento'))) {
              headerRowIdx = i;
              break;
            }
          }

          if (headerRowIdx === -1) {
            headerRowIdx = 0;
          }

          const headers: string[] = (rawRows[headerRowIdx] || []).map((h: any) => String(h || '').trim());

          // Buscar columna de nombre completo o columnas separadas
          let nameColIdx = headers.findIndex(h => {
            const lower = h.toLowerCase();
            return (
              lower.includes('nombres y apellidos') ||
              lower.includes('nombre completo') ||
              lower.includes('estudiante') ||
              lower.includes('alumno') ||
              lower === 'nombre' ||
              lower === 'nombres'
            );
          });

          let apellidosColIdx = -1;
          let nombresColIdx = -1;
          if (nameColIdx === -1) {
            nameColIdx = headers.findIndex(h => {
              const lower = h.toLowerCase();
              return lower.includes('nombre') || lower.includes('apellidos');
            });

            if (nameColIdx === -1) {
              apellidosColIdx = headers.findIndex(h => h.toLowerCase().includes('apellido'));
              nombresColIdx = headers.findIndex(h => h.toLowerCase().includes('nombre'));
            }
          }

          const docColIdx = headers.findIndex(h => {
            const lower = h.toLowerCase();
            return (
              lower.includes('documento') ||
              lower.includes('identificación') ||
              lower.includes('identificacion') ||
              lower.includes('cedula') ||
              lower.includes('cédula') ||
              lower.includes('ti') ||
              lower === 'doc' ||
              lower === 'dni'
            );
          });

          const listColIdx = headers.findIndex(h => {
            const lower = h.toLowerCase();
            return (
              lower.includes('n°') ||
              lower.includes('no.') ||
              lower.includes('num') ||
              lower.includes('lista')
            );
          });

          if (nameColIdx === -1 && (apellidosColIdx === -1 || nombresColIdx === -1)) {
            return reject(new Error('No se encontró una columna con los nombres de los estudiantes (ej: "NOMBRES Y APELLIDOS"). Por favor descarga y usa el formato oficial.'));
          }

          const students: ParsedStudentRow[] = [];

          for (let r = headerRowIdx + 1; r < rawRows.length; r++) {
            const row = rawRows[r];
            if (!row || row.length === 0) continue;

            let name = '';
            if (nameColIdx !== -1) {
              name = String(row[nameColIdx] || '').trim();
            } else if (apellidosColIdx !== -1 && nombresColIdx !== -1) {
              const ape = String(row[apellidosColIdx] || '').trim();
              const nom = String(row[nombresColIdx] || '').trim();
              name = `${ape} ${nom}`.trim();
            }

            if (!name || name.length < 3) continue;

            const lowerName = name.toLowerCase();
            // Ignorar textos explicativos o filas de resumen
            if (
              lowerName.startsWith('instrucciones') ||
              lowerName.startsWith('total') ||
              lowerName.startsWith('ejemplo:') ||
              lowerName.includes('escribe o pega') ||
              lowerName.includes('obligatorio')
            ) {
              continue;
            }

            const docRaw = docColIdx !== -1 ? String(row[docColIdx] || '').trim() : '';
            const doc = docRaw && docRaw !== '—' && docRaw !== '-' ? docRaw : undefined;
            const listNumRaw = listColIdx !== -1 ? parseInt(String(row[listColIdx] || ''), 10) : NaN;

            students.push({
              listNumber: !isNaN(listNumRaw) ? listNumRaw : students.length + 1,
              fullName: name,
              documentNumber: doc
            });
          }

          resolve({
            students,
            columnCount: headers.length,
            rawColumns: headers
          });
        } catch (err) {
          reject(err);
        }
      };

      reader.onerror = () => reject(new Error('Error al leer el archivo.'));
      reader.readAsArrayBuffer(file);
    });
  },

  /**
   * Exportar listado de estudiantes a XLSX con encabezado institucional,
   * estilos con colores y columnas ajustadas.
   */
  exportStudents(students: Student[], courseName: string, course?: Course | null): void {
    const wb = XLSX.utils.book_new();
    const ws: any = {};

    const institution = course?.institution || 'Institución Educativa';
    const titleText = `LISTADO OFICIAL DE ESTUDIANTES - ${courseName.toUpperCase()}`;
    const subTitle = `${institution} • Asignatura: ${course?.subject || 'General'} • Generado el ${new Date().toLocaleDateString('es-CO')}`;

    // Fila 1: Título Principal
    ws['A1'] = { t: 's', v: titleText, s: STYLES.mainHeader };
    // Fila 2: Subtítulo
    ws['A2'] = { t: 's', v: subTitle, s: STYLES.subHeader };

    // Fila 4: Encabezados de Tabla
    const headers = ['N° LISTA', 'NOMBRE COMPLETO DEL ESTUDIANTE', 'CÓDIGO ÚNICO (QR)', 'DOCUMENTO / TI', 'FECHA DE REGISTRO'];
    headers.forEach((h, idx) => {
      const colLetter = colToLetter(idx);
      ws[`${colLetter}4`] = { t: 's', v: h, s: STYLES.tableHeader };
    });

    // Filas de Datos (desde fila 5)
    let currentRow = 5;
    students.forEach((s, idx) => {
      const isZebra = idx % 2 === 1;
      const cellStyle = isZebra ? STYLES.cellZebra : STYLES.cellNormal;
      const centerStyle = isZebra ? STYLES.cellCenterZebra : STYLES.cellCenter;

      ws[`A${currentRow}`] = { t: 'n', v: s.listNumber, s: centerStyle };
      ws[`B${currentRow}`] = { t: 's', v: s.fullName, s: cellStyle };
      ws[`C${currentRow}`] = { t: 's', v: s.uniqueCode, s: centerStyle };
      ws[`D${currentRow}`] = { t: 's', v: s.documentNumber || '—', s: centerStyle };
      ws[`E${currentRow}`] = { t: 's', v: new Date(s.createdAt).toLocaleDateString('es-CO'), s: centerStyle };
      currentRow++;
    });

    // Fila de Resumen Final
    ws[`A${currentRow}`] = { t: 's', v: 'TOTAL:', s: STYLES.footerSummary };
    ws[`B${currentRow}`] = { t: 's', v: `${students.length} Estudiantes Registrados`, s: STYLES.footerSummary };
    ws[`C${currentRow}`] = { t: 's', v: '', s: STYLES.footerSummary };
    ws[`D${currentRow}`] = { t: 's', v: '', s: STYLES.footerSummary };
    ws[`E${currentRow}`] = { t: 's', v: '', s: STYLES.footerSummary };

    // Merges
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }, // Título A1:E1
      { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } }  // Subtítulo A2:E2
    ];

    // Ancho de columnas
    ws['!cols'] = [
      { wch: 10 }, // N°
      { wch: 38 }, // Nombre
      { wch: 18 }, // Código
      { wch: 18 }, // Documento
      { wch: 20 }  // Fecha
    ];

    ws['!rows'] = [
      { hpt: 26 }, // Fila 1
      { hpt: 18 }, // Fila 2
      { hpt: 8 },  // Fila 3 vacía
      { hpt: 24 }  // Fila 4 Headers
    ];

    ws['!ref'] = `A1:E${currentRow}`;

    XLSX.utils.book_append_sheet(wb, ws, 'Estudiantes');
    XLSX.writeFile(wb, `AulaControl_Estudiantes_${courseName.replace(/\s+/g, '_')}.xlsx`);
  },

  /**
   * Exportar Calificaciones a XLSX con diseño moderno a colores y
   * FÓRMULAS VIVAS de Excel para calcular los promedios en automático.
   */
  exportGrades(
    activities: Activity[],
    submissions: Submission[],
    students: Student[],
    courseName: string,
    course?: Course | null
  ): void {
    const wb = XLSX.utils.book_new();
    const ws: any = {};

    const institution = course?.institution || 'Institución Educativa';
    const subject = course?.subject || 'Asignatura';
    const period = course?.currentPeriod || 'Periodo Actual';

    // Determinar total de columnas
    // Col 0: N°, Col 1: Estudiante, Col 2: Código
    // Col 3 ... 3 + activities.length - 1: Actividades
    // Col Last-1: Promedio
    // Col Last: Estado (Aprobado / Reprobado)
    const totalCols = 3 + activities.length + 2;
    const lastColIndex = totalCols - 1;
    const lastColLetter = colToLetter(lastColIndex);

    // 1. Título y Subtítulo
    ws['A1'] = {
      t: 's',
      v: `PLANILLA OFICIAL DE CALIFICACIONES — ${courseName.toUpperCase()} (${subject.toUpperCase()})`,
      s: STYLES.mainHeader
    };
    ws['A2'] = {
      t: 's',
      v: `${institution} • ${period} • Escala 0.0 a 5.0 (Aprobación ≥ 3.0) • Generado: ${new Date().toLocaleDateString('es-CO')}`,
      s: STYLES.subHeader
    };

    // 2. Encabezados de Tabla (Fila 4)
    ws['A4'] = { t: 's', v: 'N°', s: STYLES.tableHeader };
    ws['B4'] = { t: 's', v: 'ESTUDIANTE', s: STYLES.tableHeader };
    ws['C4'] = { t: 's', v: 'CÓDIGO', s: STYLES.tableHeader };

    const firstActCol = 3; // 'D'
    const lastActCol = 3 + activities.length - 1;

    activities.forEach((act, idx) => {
      const colLetter = colToLetter(firstActCol + idx);
      ws[`${colLetter}4`] = {
        t: 's',
        v: `${act.title}\n(${act.weightPercentage}%)`,
        s: STYLES.tableHeader
      };
    });

    const promColLetter = colToLetter(firstActCol + activities.length);
    const estadoColLetter = colToLetter(firstActCol + activities.length + 1);

    ws[`${promColLetter}4`] = { t: 's', v: 'PROMEDIO', s: STYLES.accentHeader };
    ws[`${estadoColLetter}4`] = { t: 's', v: 'ESTADO', s: STYLES.goldHeader };

    // 3. Filas de Estudiantes (Fila 5 en adelante)
    let currentRow = 5;
    const startRow = 5;

    students.forEach((s, sIdx) => {
      const isZebra = sIdx % 2 === 1;
      const baseCenter = isZebra ? STYLES.cellCenterZebra : STYLES.cellCenter;
      const baseText = isZebra ? STYLES.cellZebra : STYLES.cellNormal;

      ws[`A${currentRow}`] = { t: 'n', v: s.listNumber, s: baseCenter };
      ws[`B${currentRow}`] = { t: 's', v: s.fullName, s: baseText };
      ws[`C${currentRow}`] = { t: 's', v: s.uniqueCode, s: baseCenter };

      const studentSubs = submissions.filter(sub => sub.studentId === s.id);
      let weightedSum = 0;
      let totalW = 0;
      const today = getColombiaDateString();

      activities.forEach((act, actIdx) => {
        const colLetter = colToLetter(firstActCol + actIdx);
        const sub = studentSubs.find(sub => sub.activityId === act.id);
        const w = Number(act.weightPercentage) || 0;
        const isOverdue = Boolean(act.dueDate && act.dueDate < today);
        const isNotDelivered = sub?.status === 'not_delivered' || (isOverdue && (!sub || sub.status === 'pending'));

        if (sub && sub.grade !== null && sub.grade !== undefined && !isNaN(Number(sub.grade))) {
          const val = Number(sub.grade);
          ws[`${colLetter}${currentRow}`] = {
            t: 'n',
            v: val,
            z: '0.0',
            s: STYLES.cellGrade
          };
          weightedSum += val * w;
          totalW += w;
        } else if (isNotDelivered) {
          // No entregó o vencida: nota 1.0 por defecto
          ws[`${colLetter}${currentRow}`] = {
            t: 'n',
            v: 1.0,
            z: '0.0',
            s: STYLES.cellGrade
          };
          weightedSum += 1.0 * w;
          totalW += w;
        } else {
          ws[`${colLetter}${currentRow}`] = {
            t: 's',
            v: '',
            s: baseCenter
          };
        }
      });

      const initialAvg = totalW > 0 ? parseFloat((weightedSum / totalW).toFixed(1)) : 0;

      // FÓRMULA VIVA DE EXCEL: Promedio Ponderado de notas
      // e.g.: =ROUND((D5*50 + E5*50) / 100, 1)
      if (activities.length > 0) {
        const totalActsWeight = activities.reduce((sum, a) => sum + (Number(a.weightPercentage) || 0), 0) || 100;
        const weightedParts = activities.map((act, actIdx) => {
          const colLetter = colToLetter(firstActCol + actIdx);
          const w = Number(act.weightPercentage) || 0;
          return `${colLetter}${currentRow}*${w}`;
        });

        const formulaAvg = `ROUND((${weightedParts.join(' + ')}) / ${totalActsWeight}, 1)`;

        ws[`${promColLetter}${currentRow}`] = {
          t: 'n',
          f: formulaAvg,
          v: initialAvg,
          z: '0.0',
          s: STYLES.cellAverage
        };

        // FÓRMULA VIVA DE EXCEL: Estado Aprobado / Reprobado
        // =IF(G5>=3.0, "APROBADO", "REPROBADO")
        const formulaEstado = `IF(${promColLetter}${currentRow}>=3.0, "APROBADO", "REPROBADO")`;
        ws[`${estadoColLetter}${currentRow}`] = {
          t: 's',
          f: formulaEstado,
          v: initialAvg >= 3.0 ? 'APROBADO' : 'REPROBADO',
          s: STYLES.cellDesempeno
        };
      } else {
        ws[`${promColLetter}${currentRow}`] = { t: 's', v: '—', s: baseCenter };
        ws[`${estadoColLetter}${currentRow}`] = { t: 's', v: '—', s: baseCenter };
      }

      currentRow++;
    });

    const endRow = currentRow - 1;

    // 4. Filas de Métricas Globales al Final
    if (students.length > 0) {
      currentRow++; // Fila vacía separadora

      // Fila Promedio del Curso
      ws[`B${currentRow}`] = { t: 's', v: 'PROMEDIO GENERAL DEL CURSO:', s: STYLES.footerSummary };
      ws[`${promColLetter}${currentRow}`] = {
        t: 'n',
        f: `ROUND(AVERAGE(${promColLetter}${startRow}:${promColLetter}${endRow}), 1)`,
        s: STYLES.accentHeader,
        z: '0.0'
      };

      currentRow++;
      // Fila Estudiantes Aprobados
      ws[`B${currentRow}`] = { t: 's', v: 'TOTAL ESTUDIANTES APROBADOS (≥ 3.0):', s: STYLES.footerSummary };
      ws[`${promColLetter}${currentRow}`] = {
        t: 'n',
        f: `COUNTIF(${promColLetter}${startRow}:${promColLetter}${endRow}, ">=3.0")`,
        s: STYLES.tableHeader
      };

      currentRow++;
      // Fila Estudiantes en Riesgo
      ws[`B${currentRow}`] = { t: 's', v: 'TOTAL EN RIESGO / REPROBADOS (< 3.0):', s: STYLES.footerSummary };
      ws[`${promColLetter}${currentRow}`] = {
        t: 'n',
        f: `COUNTIF(${promColLetter}${startRow}:${promColLetter}${endRow}, "<3.0")`,
        s: STYLES.goldHeader
      };
    }

    // Configuración de visualización y anchos
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: lastColIndex } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: lastColIndex } }
    ];

    const colWidths = [
      { wch: 8 },  // N°
      { wch: 34 }, // Nombre
      { wch: 15 }  // Código
    ];
    activities.forEach(a => {
      colWidths.push({ wch: Math.max(14, Math.min(22, a.title.length + 3)) });
    });
    colWidths.push({ wch: 14 }); // Promedio
    colWidths.push({ wch: 16 }); // Estado

    ws['!cols'] = colWidths;
    ws['!rows'] = [{ hpt: 26 }, { hpt: 18 }, { hpt: 8 }, { hpt: 30 }];
    ws['!ref'] = `A1:${lastColLetter}${currentRow}`;

    XLSX.utils.book_append_sheet(wb, ws, 'Calificaciones');
    XLSX.writeFile(wb, `AulaControl_Calificaciones_${courseName.replace(/\s+/g, '_')}.xlsx`);
  },

  /**
   * Exportar Asistencia a XLSX con estados formateados
   */
  exportAttendance(sessions: AttendanceSession[], students: Student[], courseName: string, course?: Course | null): void {
    const wb = XLSX.utils.book_new();
    const ws: any = {};

    const totalCols = 3 + sessions.length + 2;
    const lastColIndex = totalCols - 1;
    const lastColLetter = colToLetter(lastColIndex);

    ws['A1'] = {
      t: 's',
      v: `REGISTRO OFICIAL DE ASISTENCIA — ${courseName.toUpperCase()}`,
      s: STYLES.mainHeader
    };
    ws['A2'] = {
      t: 's',
      v: `${course?.institution || 'Institución'} • Convenciones: P=Presente, A=Ausente, T=Tardanza, E=Excusa • Generado: ${new Date().toLocaleDateString('es-CO')}`,
      s: STYLES.subHeader
    };

    ws['A4'] = { t: 's', v: 'N°', s: STYLES.tableHeader };
    ws['B4'] = { t: 's', v: 'ESTUDIANTE', s: STYLES.tableHeader };
    ws['C4'] = { t: 's', v: 'CÓDIGO', s: STYLES.tableHeader };

    sessions.forEach((sess, idx) => {
      const colLetter = colToLetter(3 + idx);
      ws[`${colLetter}4`] = { t: 's', v: sess.date, s: STYLES.tableHeader };
    });

    const colPresentes = colToLetter(3 + sessions.length);
    const colPorcentaje = colToLetter(3 + sessions.length + 1);

    ws[`${colPresentes}4`] = { t: 's', v: 'ASISTENCIAS', s: STYLES.accentHeader };
    ws[`${colPorcentaje}4`] = { t: 's', v: '% ASISTENCIA', s: STYLES.goldHeader };

    let currentRow = 5;
    const startRow = 5;

    students.forEach((s, sIdx) => {
      const isZebra = sIdx % 2 === 1;
      const baseCenter = isZebra ? STYLES.cellCenterZebra : STYLES.cellCenter;
      const baseText = isZebra ? STYLES.cellZebra : STYLES.cellNormal;

      ws[`A${currentRow}`] = { t: 'n', v: s.listNumber, s: baseCenter };
      ws[`B${currentRow}`] = { t: 's', v: s.fullName, s: baseText };
      ws[`C${currentRow}`] = { t: 's', v: s.uniqueCode, s: baseCenter };

      let pCount = 0;
      let markedCount = 0;
      sessions.forEach((sess, idx) => {
        const colLetter = colToLetter(3 + idx);
        const rec = sess.records[s.id];
        let val = '—';
        if (rec) {
          if (rec.status === 'present') { val = 'P'; }
          else if (rec.status === 'late') { val = 'T'; }
          else if (rec.status === 'excused') { val = 'E'; }
          else if (rec.status === 'absent') { val = 'A'; }
          pCount += ATTENDANCE_WEIGHTS[rec.status];
          markedCount++;
        }
        ws[`${colLetter}${currentRow}`] = { t: 's', v: val, s: baseCenter };
      });

      if (sessions.length > 0) {
        const firstSessCol = colToLetter(3);
        const lastSessCol = colToLetter(3 + sessions.length - 1);

        // Fórmulas Vivas (P y E suman 1, T suma 0.8, A suma 0; las celdas "—" no cuentan)
        const rng = `${firstSessCol}${currentRow}:${lastSessCol}${currentRow}`;
        ws[`${colPresentes}${currentRow}`] = {
          t: 'n',
          f: `COUNTIF(${rng}, "P")+COUNTIF(${rng}, "E")+0.8*COUNTIF(${rng}, "T")`,
          v: parseFloat(pCount.toFixed(1)),
          s: STYLES.cellAverage
        };

        const markedFormula = `(COUNTIF(${rng}, "P")+COUNTIF(${rng}, "E")+COUNTIF(${rng}, "T")+COUNTIF(${rng}, "A"))`;
        ws[`${colPorcentaje}${currentRow}`] = {
          t: 'n',
          f: `IF(${markedFormula}=0, 100, ROUND((${colPresentes}${currentRow}/${markedFormula})*100, 0))`,
          v: markedCount > 0 ? Math.round((pCount / markedCount) * 100) : 100,
          z: '0"%"',
          s: STYLES.cellDesempeno
        };
      }

      currentRow++;
    });

    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: lastColIndex } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: lastColIndex } }
    ];

    const colWidths = [{ wch: 8 }, { wch: 34 }, { wch: 15 }];
    sessions.forEach(() => colWidths.push({ wch: 13 }));
    colWidths.push({ wch: 15 }, { wch: 15 });

    ws['!cols'] = colWidths;
    ws['!ref'] = `A1:${lastColLetter}${currentRow}`;

    XLSX.utils.book_append_sheet(wb, ws, 'Asistencia');
    XLSX.writeFile(wb, `AulaControl_Asistencia_${courseName.replace(/\s+/g, '_')}.xlsx`);
  },

  /**
   * Exportar NOTAS DEFINITIVAS Y CONSOLIDADO INTEGRAL
   * Incluye componente Académico, Asistencia y Convivencial/Comportamental,
   * con FÓRMULAS VIVAS de cálculo ponderado y escala cualitativa MEN.
   */
  exportFinalGrades({
    course,
    students,
    activities,
    submissions,
    attendanceSessions,
    behaviorRecords,
    weights = { academic: 0.85, attendance: 0.15 }
  }: {
    course: Course | null;
    students: Student[];
    activities: Activity[];
    submissions: Submission[];
    attendanceSessions: AttendanceSession[];
    behaviorRecords: BehaviorRecord[];
    weights?: { academic: number; attendance: number; behavior?: number };
  }): void {
    const wb = XLSX.utils.book_new();
    const ws: any = {};

    const courseName = course?.name || 'Curso';
    const institution = course?.institution || 'Institución Educativa';
    const period = course?.currentPeriod || 'Periodo Escolar';

    // Total columnas:
    // A: N°
    // B: Estudiante
    // C: Documento
    // D: Código
    // E: Promedio Académico (0.0-5.0)
    // F: Tareas Entregadas
    // G: % Asistencia
    // H: Ausencias (Fallas)
    // I: Novedades Convivencia (Detalle)
    // J: Ajuste Convivencia (Décimas)
    // K: NOTA DEFINITIVA (0.0-5.0) [FÓRMULA VIVA]
    // L: DESEMPEÑO CUALITATIVO (MEN) [FÓRMULA VIVA]
    // M: Observación / Juicio Valorativo
    const lastColIndex = 12; // 'M'
    const lastColLetter = 'M';

    // 1. Encabezado Institucional
    ws['A1'] = {
      t: 's',
      v: `INFORME CONSOLIDADO DE NOTAS DEFINITIVAS — ${courseName.toUpperCase()}`,
      s: STYLES.mainHeader
    };
    ws['A2'] = {
      t: 's',
      v: `${institution} • ${period} • Ponderación: Académico (${Math.round(weights.academic * 100)}%), Asistencia (${Math.round(weights.attendance * 100)}%) • Convivencia por ajuste directo de décimas (+0.1, +0.2, -0.1, -0.2) • ${new Date().toLocaleDateString('es-CO')}`,
      s: STYLES.subHeader
    };

    // 2. Encabezados de Columna (Fila 4)
    const headers = [
      { text: 'N°', style: STYLES.tableHeader },
      { text: 'ESTUDIANTE', style: STYLES.tableHeader },
      { text: 'DOCUMENTO', style: STYLES.tableHeader },
      { text: 'CÓDIGO QR', style: STYLES.tableHeader },
      { text: `PROM. ACADÉMICO\n(${Math.round(weights.academic * 100)}%)`, style: STYLES.tableHeader },
      { text: 'TAREAS\nENTREGADAS', style: STYLES.tableHeader },
      { text: `% ASISTENCIA\n(${Math.round(weights.attendance * 100)}%)`, style: STYLES.tableHeader },
      { text: 'FALLAS\n(AUSENCIAS)', style: STYLES.tableHeader },
      { text: 'NOVEDADES\nCONVIVENCIA', style: STYLES.tableHeader },
      { text: 'AJUSTE CONV.\n(DÉCIMAS)', style: STYLES.tableHeader },
      { text: 'NOTA DEFINITIVA\n(0.0 - 5.0)', style: STYLES.accentHeader },
      { text: 'DESEMPEÑO\n(ESCALA MEN)', style: STYLES.goldHeader },
      { text: 'OBSERVACIÓN PEDAGÓGICA INTEGRAL', style: STYLES.tableHeader }
    ];

    headers.forEach((h, idx) => {
      const colLetter = colToLetter(idx);
      ws[`${colLetter}4`] = { t: 's', v: h.text, s: h.style };
    });

    let currentRow = 5;
    const startRow = 5;

    students.forEach((s, sIdx) => {
      const isZebra = sIdx % 2 === 1;
      const baseCenter = isZebra ? STYLES.cellCenterZebra : STYLES.cellCenter;
      const baseText = isZebra ? STYLES.cellZebra : STYLES.cellNormal;

      // 1. Datos Académicos (Ponderado exacto con notas y 1.0 por no entregado / vencida)
      const courseActs = activities.filter(a => !course || a.courseId === course.id);
      const courseActIds = new Set(courseActs.map(a => a.id));
      const studentSubs = submissions.filter(sub => sub.studentId === s.id && courseActIds.has(sub.activityId));
      const weighted = calculateStudentWeightedAverage(courseActs, studentSubs);
      const hasGrades = weighted.average !== null;
      const academicAvg = weighted.average;
      const deliveredCount = studentSubs.filter(sub => sub.status === 'delivered').length;

      // 2. Datos de Asistencia
      const attStats = getStudentAttendanceStats(attendanceSessions, s.id);
      const absentCount = attStats.absent;
      const attendanceRate = attStats.rate;
      const attendanceGrade = parseFloat(((attendanceRate / 100) * 5.0).toFixed(1));

      // 3. Convivencia (Ajuste directo de décimas: +0.1 aporte, +0.2 reconocimiento, -0.1 llamado, -0.2 incumplimiento)
      const studentBeh = behaviorRecords.filter(b => b.studentId === s.id);
      let aporteCount = 0;          // +0.1
      let reconocimientoCount = 0;  // +0.2
      let llamadoAtencionCount = 0; // -0.1
      let incumplimientoCount = 0;  // -0.2

      studentBeh.forEach(b => {
        if (b.type === 'recognition') {
          reconocimientoCount++;
        } else if (b.type === 'positive' || b.type === 'participation' || b.type === 'social') {
          aporteCount++;
        } else if (b.type === 'warning') {
          llamadoAtencionCount++;
        } else if (b.type === 'negative' || b.type === 'non_compliance') {
          incumplimientoCount++;
        }
      });

      const convivenciaAdjustment = parseFloat((
        (aporteCount * 0.1) +
        (reconocimientoCount * 0.2) -
        (llamadoAtencionCount * 0.1) -
        (incumplimientoCount * 0.2)
      ).toFixed(2));

      const posCount = aporteCount + reconocimientoCount;
      const negCount = llamadoAtencionCount + incumplimientoCount;
      let behSummary = 'Sin novedades';
      if (posCount > 0 && negCount > 0) {
        behSummary = `+${posCount} / -${negCount}`;
      } else if (posCount > 0) {
        behSummary = `+${posCount} positiva${posCount > 1 ? 's' : ''}`;
      } else if (negCount > 0) {
        behSummary = `-${negCount} llamado${negCount > 1 ? 's' : ''}`;
      }

      // 4. Cálculo Ponderado Inicial
      let initialDefinitiva: number | string = 'PENDIENTE';
      let initialDesempeno = 'SIN NOTAS';
      let observacion = 'Muestra buen compromiso y adecuada convivencia escolar.';

      if (!hasGrades) {
        observacion = 'Sin calificaciones académicas registradas. No es posible emitir definitiva solo con asistencia y convivencia.';
        if (absentCount >= 3 || (absentCount > 0 && attendanceRate < 75)) {
          observacion += ` Alerta: Registra ${absentCount} fallas de asistencia.`;
        }
      } else {
        const baseGrade = (academicAvg! * weights.academic) + (attendanceGrade * weights.attendance);
        const numDef = Math.min(5.0, Math.max(1.0, parseFloat((baseGrade + convivenciaAdjustment).toFixed(1))));
        initialDefinitiva = numDef;

        if (numDef >= 4.6) {
          initialDesempeno = 'SUPERIOR';
          observacion = 'Desempeño sobresaliente y liderazgo ejemplar en todas las actividades y convivencia escolar.';
        } else if (numDef >= 4.0) {
          initialDesempeno = 'ALTO';
          observacion = 'Buen rendimiento académico con cumplimiento satisfactorio y sana convivencia escolar.';
        } else if (numDef >= 3.0) {
          initialDesempeno = 'BÁSICO';
          observacion = 'Alcanza los desempeños básicos; se recomienda mayor dedicación para mejorar su promedio.';
        } else {
          initialDesempeno = 'BAJO';
          observacion = `Requiere plan de mejoramiento pedagógico inmediato (${absentCount} ausencias y entregas pendientes).`;
        }

        if (absentCount >= 3 || (absentCount > 0 && attendanceRate < 75)) {
          observacion = `Alerta por inasistencias reiteradas (${absentCount} ausencias). Afecta el rendimiento general.`;
        } else if (convivenciaAdjustment < 0) {
          observacion = 'Debe fortalecer el cumplimiento de normas de convivencia y compromisos de clase.';
        } else if (convivenciaAdjustment > 0) {
          observacion = 'Sus aportes destacados y reconocimientos de convivencia beneficiaron su nota definitiva.';
        }
      }

      // Escribir Celdas
      ws[`A${currentRow}`] = { t: 'n', v: s.listNumber, s: baseCenter };
      ws[`B${currentRow}`] = { t: 's', v: s.fullName, s: baseText };
      ws[`C${currentRow}`] = { t: 's', v: s.documentNumber || '—', s: baseCenter };
      ws[`D${currentRow}`] = { t: 's', v: s.uniqueCode, s: baseCenter };

      // Col E: Académico
      if (hasGrades) {
        ws[`E${currentRow}`] = { t: 'n', v: academicAvg, z: '0.0', s: STYLES.cellGrade };
      } else {
        ws[`E${currentRow}`] = { t: 's', v: '—', s: baseCenter };
      }

      // Col F: Tareas entregadas
      ws[`F${currentRow}`] = { t: 's', v: `${deliveredCount}/${courseActs.length}`, s: baseCenter };
      // Col G: % Asistencia
      ws[`G${currentRow}`] = { t: 'n', v: attendanceRate, z: '0"%"', s: baseCenter };
      // Col H: Fallas
      ws[`H${currentRow}`] = { t: 'n', v: absentCount, s: baseCenter };
      // Col I: Novedades Convivencia (Resumen)
      ws[`I${currentRow}`] = { t: 's', v: behSummary, s: baseCenter };
      // Col J: Ajuste Convivencia (Décimas directas)
      ws[`J${currentRow}`] = {
        t: 'n',
        v: convivenciaAdjustment,
        z: '+0.0;-0.0;0.0',
        s: STYLES.cellGrade
      };

      // Col K: FÓRMULA VIVA NOTA DEFINITIVA:
      // =IF(ISNUMBER(E5), MIN(5.0, MAX(1.0, ROUND((E5*weights.academic) + ((G5/100*5.0)*weights.attendance) + J5, 1))), "PENDIENTE")
      const formulaDef = `IF(ISNUMBER(E${currentRow}), MIN(5.0, MAX(1.0, ROUND((E${currentRow}*${weights.academic}) + ((G${currentRow}/100*5.0)*${weights.attendance}) + J${currentRow}, 1))), "PENDIENTE")`;
      ws[`K${currentRow}`] = {
        t: hasGrades ? 'n' : 's',
        f: formulaDef,
        v: initialDefinitiva,
        ...(hasGrades ? { z: '0.0', s: STYLES.cellDefinitiva } : { s: baseCenter })
      };

      // Col L: FÓRMULA VIVA DESEMPEÑO CUALITATIVO (MEN):
      // =IF(NOT(ISNUMBER(K5)), "SIN NOTAS", IF(K5>=4.6, "SUPERIOR", IF(K5>=4.0, "ALTO", IF(K5>=3.0, "BÁSICO", "BAJO"))))
      const formulaDesemp = `IF(NOT(ISNUMBER(K${currentRow})), "SIN NOTAS", IF(K${currentRow}>=4.6, "SUPERIOR", IF(K${currentRow}>=4.0, "ALTO", IF(K${currentRow}>=3.0, "BÁSICO", "BAJO"))))`;
      ws[`L${currentRow}`] = {
        t: 's',
        f: formulaDesemp,
        v: initialDesempeno,
        s: hasGrades ? STYLES.cellDesempeno : baseCenter
      };

      // Col M: Observación
      ws[`M${currentRow}`] = { t: 's', v: observacion, s: baseText };

      currentRow++;
    });

    const endRow = currentRow - 1;

    // Resumen Final
    if (students.length > 0) {
      currentRow++;
      ws[`B${currentRow}`] = { t: 's', v: 'PROMEDIO DEFINITIVO GENERAL:', s: STYLES.footerSummary };
      ws[`K${currentRow}`] = {
        t: 'n',
        f: `ROUND(AVERAGE(K${startRow}:K${endRow}), 1)`,
        z: '0.0',
        s: STYLES.accentHeader
      };

      currentRow++;
      ws[`B${currentRow}`] = { t: 's', v: 'ESTUDIANTES EN DESEMPEÑO SUPERIOR (≥ 4.6):', s: STYLES.footerSummary };
      ws[`K${currentRow}`] = {
        t: 'n',
        f: `COUNTIF(K${startRow}:K${endRow}, ">=4.6")`,
        s: STYLES.tableHeader
      };

      currentRow++;
      ws[`B${currentRow}`] = { t: 's', v: 'ESTUDIANTES EN DESEMPEÑO BAJO (< 3.0):', s: STYLES.footerSummary };
      ws[`K${currentRow}`] = {
        t: 'n',
        f: `COUNTIF(K${startRow}:K${endRow}, "<3.0")`,
        s: STYLES.goldHeader
      };
    }

    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: lastColIndex } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: lastColIndex } }
    ];

    ws['!cols'] = [
      { wch: 8 },  // N°
      { wch: 34 }, // Estudiante
      { wch: 18 }, // Documento
      { wch: 15 }, // Código
      { wch: 18 }, // Académico
      { wch: 14 }, // Tareas
      { wch: 16 }, // % Asistencia
      { wch: 14 }, // Fallas
      { wch: 18 }, // Novedades Convivencia
      { wch: 16 }, // Ajuste Convivencia
      { wch: 18 }, // NOTA DEFINITIVA
      { wch: 18 }, // DESEMPEÑO MEN
      { wch: 45 }  // Observación
    ];

    ws['!rows'] = [{ hpt: 26 }, { hpt: 18 }, { hpt: 8 }, { hpt: 30 }];
    ws['!ref'] = `A1:${lastColLetter}${currentRow}`;

    XLSX.utils.book_append_sheet(wb, ws, 'Definitivas');
    XLSX.writeFile(wb, `AulaControl_Notas_Definitivas_${courseName.replace(/\s+/g, '_')}.xlsx`);
  }
};
