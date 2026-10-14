import React, { useState } from 'react';
import { X, UploadCloud, FileSpreadsheet, Check, AlertCircle, Download, CheckCircle2, FileCheck2, ArrowDownToLine } from 'lucide-react';
import { excelService, ParsedStudentRow } from '../../services/excelService';
import { useCourse } from '../../context/CourseContext';
import { useToast } from '../../context/ToastContext';

interface StudentImportModalProps {
  onClose: () => void;
}

export const StudentImportModal: React.FC<StudentImportModalProps> = ({ onClose }) => {
  const { importStudents, activeCourse, courses, selectCourse } = useCourse();
  const { showToast } = useToast();

  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedStudentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDownloadTemplate = () => {
    try {
      excelService.downloadStudentTemplate(activeCourse?.name, activeCourse);
      showToast('✓ Descargando formato oficial de estudiantes (.xlsx)', 'success');
    } catch (err: any) {
      console.error(err);
      showToast('Error al generar la plantilla de Excel', 'error');
    }
  };

  const handleFileChange = async (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);
    setLoading(true);

    try {
      const result = await excelService.parseStudentsFile(selectedFile);
      if (result.students.length === 0) {
        setError('No se encontraron registros válidos de estudiantes en el archivo. Asegúrate de incluir la columna "NOMBRES Y APELLIDOS".');
      } else {
        setParsedData(result.students);
      }
    } catch (err: any) {
      setError(err.message || 'Error al procesar el archivo. Revisa que sea un formato Excel (.xlsx, .xls) o CSV válido.');
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleConfirmImport = () => {
    if (parsedData.length === 0) return;
    const count = importStudents(parsedData);
    showToast(`✓ Se importaron ${count} estudiantes exitosamente a ${activeCourse?.name || 'tu curso'}`, 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl p-5 md:p-6 w-full max-w-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Encabezado */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200/80 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Cargar Estudiantes desde Excel</h2>
              {courses.length > 1 ? (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs text-slate-500 font-medium">Curso destino:</span>
                  <select
                    value={activeCourse?.id || ''}
                    onChange={(e) => selectCourse(e.target.value)}
                    className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.studentCount || 0} est.)
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <p className="text-xs text-slate-500 font-medium">
                  Curso destino: <strong className="text-slate-800">{activeCourse?.name || 'General'}</strong>
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenido Principal */}
        <div className="py-4 flex-1 flex flex-col min-h-0 overflow-y-auto space-y-4">
          {!parsedData.length ? (
            <>
              {/* PASO 1: Descargar Formato Oficial */}
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                      Paso 1: Formato
                    </span>
                    <span className="text-xs font-bold text-emerald-950">Descarga la Plantilla Oficial</span>
                  </div>
                  <p className="text-[11px] text-emerald-800/90 leading-relaxed">
                    Usa este formato predeterminado en Excel (.xlsx) con las columnas requeridas (Nombres, Documento, etc.). Solo llénalo con la lista de tus alumnos y guárdalo.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="shrink-0 flex items-center justify-center gap-2 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                >
                  <ArrowDownToLine className="w-4 h-4" />
                  <span>Descargar Plantilla (.xlsx)</span>
                </button>
              </div>

              {/* PASO 2: Subir Archivo Completado */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-600 text-white px-2 py-0.5 rounded-full">
                      Paso 2: Subir
                    </span>
                    <span className="text-xs font-bold text-slate-800">Sube la lista completada</span>
                  </div>
                  <span className="text-[11px] text-slate-400">Excel (.xlsx, .xls) o CSV</span>
                </div>

                <label
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center ${
                    isDragging
                      ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/20'
                      : 'border-slate-300 hover:border-blue-500 bg-slate-50/60 hover:bg-slate-50'
                  }`}
                >
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200/80 flex items-center justify-center mb-2.5">
                    <UploadCloud className="w-6 h-6 animate-pulse" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 mb-0.5">
                    {file ? file.name : 'Arrastra tu archivo Excel aquí o haz clic para seleccionarlo'}
                  </span>
                  <span className="text-[11px] text-slate-500 mb-3">
                    Acepta plantillas de AulaControl o listas oficiales del colegio
                  </span>

                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={e => e.target.files?.[0] && handleFileChange(e.target.files[0])}
                    className="hidden"
                  />

                  <div className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold shadow-xs">
                    Examinar archivo en tu equipo
                  </div>
                </label>
              </div>

              {loading && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 text-xs flex items-center justify-center gap-2 animate-pulse font-medium">
                  <FileSpreadsheet className="w-4 h-4 animate-spin" />
                  <span>Leyendo archivo y organizando estudiantes...</span>
                </div>
              )}

              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold">No se pudo procesar el archivo</p>
                    <p className="text-[11px] text-rose-600 mt-0.5">{error}</p>
                  </div>
                </div>
              )}

              {/* Guía rápida */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 text-[11px] text-slate-600 space-y-1">
                <p className="font-bold text-slate-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Compatibilidad garantizada</span>
                </p>
                <p>• El sistema detecta automáticamente la columna de nombres (sea completa o separada en apellidos y nombres).</p>
                <p>• A cada estudiante se le asignará un código institucional único y su carnet QR para el registro de asistencia.</p>
              </div>
            </>
          ) : (
            /* Vista previa antes de confirmar */
            <div className="space-y-3 flex-1 flex flex-col min-h-0">
              <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <FileCheck2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-emerald-950 block">
                      ✓ Se detectaron {parsedData.length} estudiantes listos
                    </span>
                    <span className="text-[11px] text-emerald-800 font-medium">
                      Revisa la lista a continuación antes de integrarlos al curso.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setParsedData([]);
                    setFile(null);
                    setError(null);
                  }}
                  className="text-xs text-slate-600 hover:text-slate-900 px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-bold shadow-xs transition-all"
                >
                  Cambiar Archivo
                </button>
              </div>

              {/* Listado previo */}
              <div className="flex-1 overflow-y-auto space-y-1.5 border border-slate-200 rounded-2xl p-2.5 bg-slate-50/60 max-h-[280px]">
                {parsedData.map((row, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-white rounded-xl border border-slate-200/80 flex items-center justify-between text-xs shadow-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-slate-500 font-bold text-[10px] w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center">
                        #{row.listNumber || idx + 1}
                      </span>
                      <span className="font-bold text-slate-800">{row.fullName}</span>
                    </div>
                    {row.documentNumber && (
                      <span className="text-[11px] text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded-md">
                        Doc: {row.documentNumber}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Pie de acción */}
        <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all text-center"
          >
            Cancelar
          </button>

          {parsedData.length > 0 && (
            <button
              type="button"
              onClick={handleConfirmImport}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5 active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>Confirmar ({parsedData.length} Estudiantes)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
