import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Printer,
  CheckSquare,
  Square,
  ArrowLeft,
  Scissors,
  LayoutGrid,
  Download,
  ExternalLink,
  FileText
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCourse } from '../context/CourseContext';
import { useToast } from '../context/ToastContext';
import { pdfService } from '../services/pdfService';

export const QRCardsPage: React.FC = () => {
  const { students, activeCourse } = useCourse();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(
    new Set(students.map(s => s.id))
  );

  // Formato: 'stickers' (para cuadernos, 20 por hoja) o 'badges' (carnets medianos, 9 por hoja)
  const [printLayout, setPrintLayout] = useState<'stickers' | 'badges'>('stickers');
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const toggleSelectAll = () => {
    if (selectedStudentIds.size === students.length) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(students.map(s => s.id)));
    }
  };

  const toggleSelectStudent = (id: string) => {
    const updated = new Set(selectedStudentIds);
    if (updated.has(id)) {
      updated.delete(id);
    } else {
      updated.add(id);
    }
    setSelectedStudentIds(updated);
  };

  const studentsToPrint = students.filter(s => selectedStudentIds.has(s.id));

  // 20 por hoja carta en stickers, 9 en badges
  const itemsPerPage = printLayout === 'stickers' ? 20 : 9;

  // Agrupar en páginas de 20 estudiantes exactamente
  const paginatedStudents = [];
  for (let i = 0; i < studentsToPrint.length; i += itemsPerPage) {
    paginatedStudents.push(studentsToPrint.slice(i, i + itemsPerPage));
  }

  const handleDownloadPDF = async () => {
    if (studentsToPrint.length === 0) return;
    setGeneratingPdf(true);
    try {
      showToast('Generando PDF de alta resolución...', 'info');
      await pdfService.generateQRCardsPDF(
        studentsToPrint,
        activeCourse?.name || 'Curso',
        'download'
      );
      showToast('✓ PDF descargado con éxito. ¡Listo para imprimir!', 'success');
    } catch (err: any) {
      console.error(err);
      showToast('Error al generar PDF: ' + err.message, 'error');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleOpenPDF = async () => {
    if (studentsToPrint.length === 0) return;
    setGeneratingPdf(true);
    try {
      await pdfService.generateQRCardsPDF(
        studentsToPrint,
        activeCourse?.name || 'Curso',
        'print'
      );
    } catch (err: any) {
      console.error(err);
      showToast('Error al abrir PDF: ' + err.message, 'error');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleNativePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-12">
      {/* ESTILOS CSS EXCLUSIVOS PARA IMPRESIÓN LIMPIA TAMAÑO CARTA PAGINADA */}
      <style>{`
        @media print {
          @page {
            size: letter portrait;
            margin: 8mm 8mm 8mm 8mm;
          }
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print, header, aside, nav, button {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
          }
          .print-page-sheet {
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            display: block !important;
            width: 100% !important;
            min-height: 98vh !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-container {
            display: grid !important;
            gap: 3.5mm !important;
            width: 100% !important;
          }
          .print-grid-stickers {
            grid-template-columns: repeat(4, 1fr) !important;
            grid-template-rows: repeat(5, 1fr) !important;
          }
          .print-grid-badges {
            grid-template-columns: repeat(3, 1fr) !important;
          }
          .print-item {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            background: #ffffff !important;
            color: #000000 !important;
            border: 1px dashed #64748b !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      {/* BARRA SUPERIOR DE CONTROL (OCULTA AL IMPRIMIR) */}
      <div className="no-print flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-3xl shadow-xl">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/students')}
            className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <Printer className="w-5 h-5 text-amber-400" />
              <span>Imprimir Códigos QR para Cuadernos</span>
            </h1>
            <p className="text-xs text-slate-400">
              Curso: <strong className="text-slate-200">{activeCourse?.name}</strong> • 20 stickers por hoja tamaño Carta
            </p>
          </div>
        </div>

        {/* ACCIONES Y BOTONES DE DESCARGA / IMPRESIÓN */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Seleccionar Todos */}
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
          >
            {selectedStudentIds.size === students.length ? (
              <>
                <CheckSquare className="w-4 h-4 text-brand-400" />
                <span>Todos ({selectedStudentIds.size})</span>
              </>
            ) : (
              <>
                <Square className="w-4 h-4 text-slate-400" />
                <span>Seleccionar Todos</span>
              </>
            )}
          </button>

          {/* Botón Principal: DESCARGAR PDF MULTI-PÁGINA */}
          <button
            onClick={handleDownloadPDF}
            disabled={studentsToPrint.length === 0 || generatingPdf}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black shadow-lg shadow-brand-500/20 active:scale-95 transition-all disabled:opacity-50"
          >
            {generatingPdf ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>Descargar PDF ({studentsToPrint.length})</span>
          </button>

          {/* Botón: Abrir PDF / Vista previa */}
          <button
            onClick={handleOpenPDF}
            disabled={studentsToPrint.length === 0 || generatingPdf}
            title="Abrir visor de PDF para imprimir directamente"
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 text-xs transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
          </button>

          {/* Botón: Imprimir desde Navegador */}
          <button
            onClick={handleNativePrint}
            disabled={studentsToPrint.length === 0}
            className="p-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold transition-colors"
            title="Imprimir diálogo del navegador"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* GUÍA DE IMPRESIÓN Y ESTIMACIÓN DE HOJAS (OCULTO EN PRINT) */}
      <div className="no-print bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 text-xs text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Scissors className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <p className="font-semibold text-white">
              Organización de {studentsToPrint.length} estudiantes: {paginatedStudents.length} hoja(s) tamaño Carta
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Cada hoja contiene exactamente <strong>20 stickers</strong> organizados en 4 columnas por 5 filas. Cada código QR es de 25 mm, ideal para pegar en la esquina del cuaderno y escanearlo rápidamente al revisar tareas.
            </p>
          </div>
        </div>
        <div className="text-[11px] text-slate-400 font-mono bg-slate-800 px-3 py-1.5 rounded-xl shrink-0 text-center">
          Páginas requeridas: <strong className="text-amber-300">{paginatedStudents.length}</strong>
        </div>
      </div>

      {/* LISTA PAGINADA DE CÓDIGOS QR */}
      {studentsToPrint.length === 0 ? (
        <div className="no-print bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center text-slate-400">
          <LayoutGrid className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-white">No hay estudiantes seleccionados</p>
          <p className="text-xs mt-1">Selecciona al menos un estudiante para generar los códigos.</p>
        </div>
      ) : (
        paginatedStudents.map((pageStudents, pageIndex) => (
          <div key={pageIndex} className="print-page-sheet bg-slate-900/40 border border-slate-800/60 rounded-3xl p-4 sm:p-6 mb-6">
            {/* Indicador de página en pantalla */}
            <div className="no-print flex items-center justify-between pb-3 mb-4 border-b border-slate-800 text-xs text-slate-400 font-semibold">
              <span className="flex items-center gap-1.5 text-brand-300 font-bold">
                <FileText className="w-4 h-4" />
                <span>Hoja Carta #{pageIndex + 1} de {paginatedStudents.length}</span>
              </span>
              <span>{pageStudents.length} stickers en esta hoja</span>
            </div>

            {/* Cuadrícula de 20 por página (4 columnas x 5 filas) */}
            <div
              className={`print-container grid gap-3 ${
                printLayout === 'stickers'
                  ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 print-grid-stickers'
                  : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 print-grid-badges'
              }`}
            >
              {pageStudents.map(student => (
                <div
                  key={student.id}
                  className={`print-item relative rounded-2xl border border-dashed transition-all overflow-hidden p-2.5 flex flex-col items-center justify-between text-center ${
                    printLayout === 'stickers' ? 'min-h-[145px]' : 'min-h-[220px]'
                  } bg-slate-900/90 border-slate-700 text-white print:border-slate-400 print:bg-white print:text-black`}
                >
                  {/* Botón de deselección en pantalla */}
                  <button
                    type="button"
                    onClick={() => toggleSelectStudent(student.id)}
                    className="no-print absolute top-1.5 right-1.5 p-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 z-10"
                    title="Excluir de la impresión"
                  >
                    <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
                  </button>

                  {/* Cabecera del Sticker */}
                  <div className="w-full flex items-center justify-between border-b border-slate-800 print:border-slate-300 pb-1 mb-1 text-[10px] font-semibold text-slate-400 print:text-slate-700">
                    <span className="truncate max-w-[110px] font-bold text-brand-400 print:text-black">
                      {activeCourse?.name || 'AulaControl'}
                    </span>
                    <span className="font-mono bg-slate-800 print:bg-slate-200 px-1.5 py-0.2 rounded text-white print:text-black font-bold text-[10px]">
                      #{String(student.listNumber).padStart(2, '0')}
                    </span>
                  </div>

                  {/* CÓDIGO QR COMPACTO Y NÍTIDO */}
                  <div className="bg-white p-1.5 rounded-lg shadow-sm print:shadow-none inline-block my-0.5 border border-slate-200">
                    <QRCodeSVG
                      value={`AC:${student.uniqueCode}`}
                      size={printLayout === 'stickers' ? 76 : 115}
                      level="M"
                      includeMargin={false}
                    />
                  </div>

                  {/* CÓDIGO Y NOMBRE DEL ESTUDIANTE */}
                  <div className="w-full mt-1">
                    <span className="font-mono text-[10px] font-black tracking-wider text-amber-300 print:text-black bg-slate-800/60 print:bg-slate-100 px-1.5 py-0.5 rounded inline-block mb-0.5">
                      {student.uniqueCode}
                    </span>
                    <h3 className="font-bold text-[11px] leading-tight text-white print:text-black line-clamp-1">
                      {student.fullName}
                    </h3>
                  </div>

                  {/* Línea de corte para recortar con tijera */}
                  <div className="w-full pt-1 mt-1 border-t border-dotted border-slate-800 print:border-slate-400 text-[8px] text-slate-500 print:text-slate-600 uppercase flex items-center justify-center gap-1 font-mono">
                    <span>✂ pegar en cuaderno</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
};
