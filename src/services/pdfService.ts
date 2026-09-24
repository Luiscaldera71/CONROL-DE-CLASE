import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { Student } from '../types';

export const pdfService = {
  /**
   * Genera un PDF tamaño Carta con exactamente 20 códigos QR por hoja (4 columnas x 5 filas)
   * formateados con líneas de corte punteadas para pegar en los cuadernos de los estudiantes.
   */
  async generateQRCardsPDF(
    students: Student[],
    courseName: string,
    action: 'download' | 'print' = 'download'
  ): Promise<void> {
    if (students.length === 0) return;

    // Dimensiones Hoja Carta en milímetros: 215.9 x 279.4 mm
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter'
    });

    const pageWidth = 215.9;
    const pageHeight = 279.4;

    const marginLeft = 8.0;
    const marginTop = 8.0;

    const cols = 4;
    const rows = 5;
    const itemsPerPage = cols * rows; // 20 por hoja

    const cardWidth = 47.5;
    const cardHeight = 50.0;
    const gapX = 3.0;
    const gapY = 3.0;

    for (let index = 0; index < students.length; index++) {
      const student = students[index];
      const pageIndex = Math.floor(index / itemsPerPage);
      const itemOnPage = index % itemsPerPage;

      // Si no es el primer elemento de la primera página, añadir nueva página cada 20 estudiantes
      if (itemOnPage === 0 && pageIndex > 0) {
        doc.addPage('letter', 'portrait');
      }

      const col = itemOnPage % cols;
      const row = Math.floor(itemOnPage / cols);

      const x = marginLeft + col * (cardWidth + gapX);
      const y = marginTop + row * (cardHeight + gapY);

      // 1. Línea punteada de corte alrededor del sticker
      doc.setDrawColor(160, 160, 160);
      doc.setLineDashPattern([1.5, 1.5], 0);
      doc.setLineWidth(0.3);
      doc.roundedRect(x, y, cardWidth, cardHeight, 1.5, 1.5, 'S');
      doc.setLineDashPattern([], 0); // restaurar continuo

      // 2. Encabezado del sticker: Curso y N° de lista
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(50, 50, 50);

      // Truncar nombre del curso si es muy largo
      const cleanCourse = courseName.length > 18 ? courseName.slice(0, 18) + '...' : courseName;
      doc.text(cleanCourse, x + 2.5, y + 4.5);

      // Badge de N° de lista
      const numStr = `#${String(student.listNumber).padStart(2, '0')}`;
      doc.setFontSize(7.5);
      doc.setTextColor(20, 20, 20);
      doc.text(numStr, x + cardWidth - 2.5, y + 4.5, { align: 'right' });

      // Línea divisoria bajo el encabezado
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.2);
      doc.line(x + 2.0, y + 5.8, x + cardWidth - 2.0, y + 5.8);

      // 3. Generar y dibujar código QR nítido
      try {
        const qrDataUrl = await QRCode.toDataURL(`AC:${student.uniqueCode}`, {
          errorCorrectionLevel: 'M',
          margin: 0,
          width: 200,
          color: {
            dark: '#000000',
            light: '#ffffff'
          }
        });

        const qrSize = 25.0; // 25 mm x 25 mm
        const qrX = x + (cardWidth - qrSize) / 2;
        const qrY = y + 7.0;

        doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
      } catch (qrErr) {
        console.warn('Error al generar QR para estudiante:', student.uniqueCode, qrErr);
      }

      // 4. Código único alfanumérico destacado (badge visual)
      const codeY = y + 34.0;
      doc.setFillColor(243, 244, 246);
      doc.roundedRect(x + (cardWidth - 24) / 2, codeY - 2.8, 24, 4.0, 1, 1, 'F');

      doc.setFont('courier', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(17, 24, 39);
      doc.text(student.uniqueCode, x + cardWidth / 2, codeY, { align: 'center' });

      // 5. Nombre del Estudiante
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(15, 23, 42);

      // Truncar nombre si sobrepasa el ancho de la tarjeta
      let displayName = student.fullName;
      if (displayName.length > 25) {
        displayName = displayName.substring(0, 23) + '..';
      }
      doc.text(displayName, x + cardWidth / 2, y + 41.5, { align: 'center' });

      // Documento de identidad si existe
      if (student.documentNumber) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.5);
        doc.setTextColor(100, 116, 139);
        doc.text(`Doc: ${student.documentNumber}`, x + cardWidth / 2, y + 44.5, { align: 'center' });
      }

      // 6. Pie de tarjeta: Guía de recorte con tijera
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(120, 120, 120);
      doc.text('✂ Recortar y pegar en cuaderno', x + cardWidth / 2, y + 48.2, { align: 'center' });
    }

    const safeCourseName = courseName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `AulaControl_QRs_${safeCourseName}.pdf`;

    if (action === 'print') {
      const blobUrl = doc.output('bloburl');
      window.open(blobUrl, '_blank');
    } else {
      doc.save(filename);
    }
  }
};
