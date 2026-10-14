import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { Student, Course } from '../types';
import { getStudentPortalUrl } from '../utils/codeGenerator';

interface GeneratePdfOptions {
  students: Student[];
  course?: Course | null;
  cardsPerPage?: 6 | 8;
  institutionName?: string;
}

export const qrPdfService = {
  /**
   * Genera y descarga un documento PDF en tamaño Carta (Letter: 215.9mm x 279.4mm)
   * perfectamente diagramado en cuadrícula con carnés recortables para cada estudiante.
   */
  async generateQRCardsPdf({
    students,
    course,
    cardsPerPage = 6,
    institutionName
  }: GeneratePdfOptions): Promise<void> {
    if (!students || students.length === 0) return;

    // Tamaño Carta en mm: 215.9 x 279.4 (Portrait)
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter'
    });

    const pageWidth = 215.9;
    const pageHeight = 279.4;

    const institution = institutionName || course?.institution || 'Institución Educativa';
    const courseTitle = course ? `${course.name} - ${course.subject}` : 'Curso Escolar';

    // Configuración según tarjetas por página
    const cols = 2;
    const rows = cardsPerPage === 8 ? 4 : 3;

    const marginX = 12;
    const marginY = 16;
    const gapX = 10;
    const gapY = cardsPerPage === 8 ? 5 : 8;

    const cardWidth = (pageWidth - marginX * 2 - (cols - 1) * gapX) / cols; // ~91.95 mm
    const cardHeight = (pageHeight - marginY * 2 - (rows - 1) * gapY) / rows; // ~78.4 mm (6) ó ~58 mm (8)

    const totalStudents = students.length;
    const totalPages = Math.ceil(totalStudents / cardsPerPage);

    // Pre-generar todos los códigos QR en DataURL de alta resolución
    const qrDataUrls: Record<string, string> = {};
    for (const student of students) {
      try {
        const portalUrl = getStudentPortalUrl(student.uniqueCode);
        qrDataUrls[student.id] = await QRCode.toDataURL(portalUrl, {
          errorCorrectionLevel: 'M',
          margin: 1,
          width: 320,
          color: {
            dark: '#000000',
            light: '#ffffff'
          }
        });
      } catch (err) {
        console.warn('Error generando QR para PDF:', err);
      }
    }

    let studentIndex = 0;

    for (let page = 0; page < totalPages; page++) {
      if (page > 0) {
        doc.addPage('letter', 'portrait');
      }

      // Encabezado de página
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139); // Slate-500
      doc.text(
        `${institution.toUpperCase()} • ${courseTitle.toUpperCase()} • CARNÉS QR`,
        marginX,
        9
      );

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(
        `Página ${page + 1} de ${totalPages}`,
        pageWidth - marginX,
        9,
        { align: 'right' }
      );

      // Línea divisoria superior suave
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(marginX, 11, pageWidth - marginX, 11);

      // Renderizar cuadrícula de tarjetas de esta página
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (studentIndex >= totalStudents) break;

          const student = students[studentIndex];
          const x = marginX + c * (cardWidth + gapX);
          const y = marginY + r * (cardHeight + gapY);

          // Fondo blanco y borde exterior de la tarjeta
          doc.setFillColor(255, 255, 255);
          doc.setDrawColor(203, 213, 225); // Slate-300
          doc.setLineWidth(0.35);
          doc.roundedRect(x, y, cardWidth, cardHeight, 3.5, 3.5, 'FD');

          // Cabecera de la tarjeta: Título de Institución y Curso
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(6.5);
          doc.setTextColor(37, 99, 235); // Blue-600
          const shortInst = institution.length > 32 ? institution.substring(0, 30) + '...' : institution;
          doc.text(shortInst.toUpperCase(), x + 4, y + 5);

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.5);
          doc.setTextColor(15, 23, 42); // Slate-900
          const shortCourse = courseTitle.length > 28 ? courseTitle.substring(0, 26) + '...' : courseTitle;
          doc.text(shortCourse, x + 4, y + 8.5);

          // Badge número de lista (ej: #01)
          const listNumStr = `#${String(student.listNumber).padStart(2, '0')}`;
          doc.setFillColor(239, 246, 255); // Blue-50
          doc.setDrawColor(191, 219, 254); // Blue-200
          doc.roundedRect(x + cardWidth - 14, y + 3.5, 10, 6, 1.5, 1.5, 'FD');
          doc.setFont('courier', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(29, 78, 216); // Blue-700
          doc.text(listNumStr, x + cardWidth - 9, y + 7.8, { align: 'center' });

          // Línea divisoria bajo cabecera
          doc.setDrawColor(241, 245, 249);
          doc.line(x + 4, y + 10.5, x + cardWidth - 4, y + 10.5);

          // QR Central de alta resolución
          const qrDataUrl = qrDataUrls[student.id];
          const qrSize = cardsPerPage === 8 ? 26 : 33;
          const qrX = x + (cardWidth - qrSize) / 2;
          const qrY = y + 12;

          if (qrDataUrl) {
            doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
          }

          // Código alfanumérico seguro en píldora
          const codeY = qrY + qrSize + 3;
          doc.setFillColor(248, 250, 252); // Slate-50
          doc.setDrawColor(226, 232, 240);
          doc.roundedRect(x + (cardWidth - 32) / 2, codeY - 2.5, 32, 4.5, 1, 1, 'FD');
          doc.setFont('courier', 'bold');
          doc.setFontSize(7.5);
          doc.setTextColor(30, 41, 59); // Slate-800
          doc.text(student.uniqueCode, x + cardWidth / 2, codeY + 0.8, { align: 'center' });

          // Nombre Completo del Estudiante
          const nameY = codeY + 5.5;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.setTextColor(15, 23, 42); // Slate-900

          const splitName = doc.splitTextToSize(student.fullName, cardWidth - 8);
          doc.text(splitName[0] || '', x + cardWidth / 2, nameY, { align: 'center' });

          // Documento si existe
          if (student.documentNumber) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6.5);
            doc.setTextColor(100, 116, 139);
            doc.text(`Doc: ${student.documentNumber}`, x + cardWidth / 2, nameY + 3.2, { align: 'center' });
          }

          // Línea punteada de recorte (✂ Recortar)
          doc.setDrawColor(203, 213, 225);
          doc.setLineDashPattern([1.5, 1.5], 0);
          doc.line(x + 2, y + cardHeight - 3.8, x + cardWidth - 2, y + cardHeight - 3.8);
          doc.setLineDashPattern([], 0); // Reset

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(5.5);
          doc.setTextColor(148, 163, 184); // Slate-400
          doc.text('✂ RECORTAR POR LA LÍNEA', x + cardWidth / 2, y + cardHeight - 1.2, { align: 'center' });

          studentIndex++;
        }
      }

      // Pie de página
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `AulaControl • Carnés generados en formato Carta (Letter) listos para plastificar o pegar en pupitres`,
        pageWidth / 2,
        pageHeight - 5,
        { align: 'center' }
      );
    }

    // Nombre de archivo limpio
    const cleanCourseName = (course?.name || 'curso').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `Carnes_QR_${cleanCourseName}_Carta.pdf`;

    // Descargar el PDF directamente
    doc.save(filename);
  }
};
