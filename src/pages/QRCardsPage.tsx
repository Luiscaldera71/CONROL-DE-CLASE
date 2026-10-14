import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  CheckSquare,
  Square,
  Download,
  FileText,
  ArrowLeft,
  Sparkles,
  Layers,
  Check
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCourse } from '../context/CourseContext';
import { useToast } from '../context/ToastContext';
import { qrPdfService } from '../services/qrPdfService';
import { getStudentPortalUrl } from '../utils/codeGenerator';

export const QRCardsPage: React.FC = () => {
  const { students, activeCourse } = useCourse();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(
    new Set(students.map(s => s.id))
  );

  const [cardsPerPage, setCardsPerPage] = useState<6 | 8>(6);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

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

  const handleDownloadPdf = async () => {
    if (studentsToPrint.length === 0) return;

    try {
      setIsGeneratingPdf(true);
      showToast('Generando documento PDF en tamaño Carta con códigos QR...', 'info');

      await qrPdfService.generateQRCardsPdf({
        students: studentsToPrint,
        course: activeCourse,
        cardsPerPage,
        institutionName: activeCourse?.institution
      });

      showToast(`✓ Documento PDF en tamaño Carta descargado con éxito`, 'success');
    } catch (err) {
      console.error('Error generando PDF:', err);
      showToast('Error al generar el PDF. Inténtalo de nuevo.', 'error');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const studentsToPrint = students.filter(s => selectedStudentIds.has(s.id));
  const totalPages = Math.ceil(studentsToPrint.length / cardsPerPage);

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-12">
      {/* BARRA SUPERIOR (OCULTA EN IMPRESIÓN) */}
      <div className="no-print bg-white border border-slate-200/90 p-4 md:p-5 rounded-3xl shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => navigate('/students')}
              className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg md:text-xl font-extrabold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <span>Carnés QR Imprimibles (Tamaño Carta)</span>
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Curso: <strong className="text-slate-800">{activeCourse?.name}</strong> • Documento PDF organizado en páginas múltiples
              </p>
            </div>
          </div>

          {/* BOTÓN DE ACCIÓN: DESCARGAR PDF */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf || studentsToPrint.length === 0}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all disabled:opacity-50"
            >
              {isGeneratingPdf ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Generando PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Descargar PDF Carta ({studentsToPrint.length})</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* CONTROLES Y FILTROS DE DIAGRAMACIÓN */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
            >
              {selectedStudentIds.size === students.length ? (
                <>
                  <CheckSquare className="w-4 h-4 text-blue-600" />
                  <span>Deseleccionar ({selectedStudentIds.size})</span>
                </>
              ) : (
                <>
                  <Square className="w-4 h-4 text-slate-400" />
                  <span>Seleccionar Todos ({students.length})</span>
                </>
              )}
            </button>

            <span className="text-slate-500 font-medium">
              Total: <strong>{studentsToPrint.length}</strong> estudiantes ({totalPages} {totalPages === 1 ? 'página' : 'páginas'} Carta)
            </span>
          </div>

          {/* Selector de cantidad por página Carta */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 p-1 rounded-xl">
            <span className="text-[10px] text-slate-500 font-bold px-2 uppercase">Distribución Carta:</span>
            <button
              type="button"
              onClick={() => setCardsPerPage(6)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                cardsPerPage === 6
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              6 por página (Recomendado)
            </button>
            <button
              type="button"
              onClick={() => setCardsPerPage(8)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                cardsPerPage === 8
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              8 por página
            </button>
          </div>
        </div>
      </div>

      {/* MENSAJE EXPLICATIVO */}
      <div className="no-print bg-white border border-slate-200/90 rounded-2xl p-4 text-xs shadow-xs space-y-1.5">
        <span className="text-blue-700 font-extrabold flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-amber-500" />
          Doble Propósito de los Carnés QR
        </span>
        <p className="text-slate-600 leading-relaxed">
          • <strong>Para el Estudiante:</strong> Al escanear con la cámara de su celular, se abrirá directamente en <strong className="text-blue-600">https://controldeclase.vercel.app</strong> su boletín de notas, asistencias y tareas.<br />
          • <strong>Para el Docente:</strong> Al escanear desde la app AulaControl (Android o Web), registrará la asistencia al instante.
        </p>
      </div>

      {/* CUADRÍCULA DE CARNÉS (OPTIMIZADA PARA PANTALLA E IMPRESIÓN CARTA) */}
      <div className="print-cards-grid grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {students.map(student => {
          const isSelected = selectedStudentIds.has(student.id);

          return (
            <div
              key={student.id}
              className={`print-card relative rounded-2xl border-2 transition-all overflow-hidden ${
                isSelected
                  ? 'border-blue-500 bg-white text-slate-900 shadow-xs print:border-slate-400 print:bg-white print:text-black'
                  : 'border-slate-200 bg-slate-50/60 text-slate-400 no-print'
              }`}
            >
              {/* Checkbox de Selección en Pantalla */}
              <button
                type="button"
                onClick={() => toggleSelectStudent(student.id)}
                className="no-print absolute top-3 right-3 p-1 rounded-lg bg-white/90 border border-slate-200 text-slate-700 hover:bg-slate-100 z-10 shadow-xs"
              >
                {isSelected ? (
                  <CheckSquare className="w-4 h-4 text-blue-600" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {/* Diseño de Carnet Escolar */}
              <div className="p-4 flex flex-col items-center text-center">
                {/* Cabecera del Carné */}
                <div className="w-full pb-2 mb-2 border-b border-slate-100 print:border-slate-300 flex items-center justify-between text-left">
                  <div>
                    <span className="text-[10px] uppercase font-extrabold tracking-wider text-blue-600 print:text-slate-600 block">
                      {activeCourse?.institution || 'Colegio Integrado'}
                    </span>
                    <span className="text-xs font-bold text-slate-900 print:text-black">
                      {activeCourse?.name} • {activeCourse?.subject}
                    </span>
                  </div>
                  <span className="w-7 h-7 rounded-lg bg-blue-50 print:bg-slate-200 text-blue-700 print:text-black font-extrabold text-xs flex items-center justify-center font-mono border border-blue-200/80">
                    #{String(student.listNumber).padStart(2, '0')}
                  </span>
                </div>

                {/* Código QR Central */}
                <div className="bg-white p-3 rounded-2xl shadow-xs print:shadow-none inline-block my-1 border border-slate-200">
                  <QRCodeSVG
                    value={getStudentPortalUrl(student.uniqueCode)}
                    size={130}
                    level="M"
                    includeMargin={false}
                  />
                </div>

                {/* Código Seguro Alfanumérico */}
                <div className="mt-2 font-mono text-xs font-black text-blue-700 print:text-black tracking-widest bg-blue-50 print:bg-slate-100 px-3 py-0.5 rounded-lg border border-blue-200">
                  {student.uniqueCode}
                </div>

                {/* Nombre del Estudiante */}
                <h3 className="font-extrabold text-sm text-slate-900 print:text-black mt-2 leading-snug line-clamp-1">
                  {student.fullName}
                </h3>

                {student.documentNumber && (
                  <span className="text-[10px] text-slate-500 print:text-slate-600 font-mono font-medium">
                    Doc: {student.documentNumber}
                  </span>
                )}

                {/* Línea punteada de recorte para tijeras */}
                <div className="w-full pt-2 mt-2 border-t border-dashed border-slate-200 print:border-slate-400 text-[9px] text-slate-400 print:text-slate-500 uppercase tracking-widest flex items-center justify-center gap-1 font-semibold">
                  <span>✂ Recortar por la línea</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
