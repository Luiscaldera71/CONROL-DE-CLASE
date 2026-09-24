import React, { useState } from 'react';
import { X, UploadCloud, FileSpreadsheet, Check, AlertCircle, ArrowRight, Download } from 'lucide-react';
import { excelService, ParsedStudentRow } from '../../services/excelService';
import { useCourse } from '../../context/CourseContext';
import { useToast } from '../../context/ToastContext';

interface StudentImportModalProps {
  onClose: () => void;
}

export const StudentImportModal: React.FC<StudentImportModalProps> = ({ onClose }) => {
  const { importStudents, activeCourse } = useCourse();
  const { showToast } = useToast();

  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedStudentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [replaceExisting, setReplaceExisting] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);
    setLoading(true);

    try {
      const result = await excelService.parseStudentsFile(selectedFile);
      if (result.students.length === 0) {
        setError('No se encontraron registros válidos en el archivo.');
      } else {
        setParsedData(result.students);
      }
    } catch (err: any) {
      setError(err.message || 'Error al procesar el archivo. Revisa el formato CSV o XLSX.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (parsedData.length === 0 || saving) return;
    setSaving(true);
    setError(null);

    try {
      const count = await importStudents(parsedData, replaceExisting);
      showToast(`✓ Se guardaron ${count} estudiantes en Firebase Firestore`, 'success');
      onClose();
    } catch (err: any) {
      console.error('Error importando estudiantes:', err);
      setError('Error al guardar en Firebase: ' + (err.message || 'Error de conexión o permisos.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        {/* Encabezado */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Importar Estudiantes</h2>
              <p className="text-xs text-slate-400">Curso: {activeCourse?.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-full bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Zona de Carga de Archivo */}
        {!parsedData.length && (
          <div className="py-6 flex-1 flex flex-col justify-center">
            <label className="border-2 border-dashed border-slate-700 hover:border-brand-500 bg-slate-800/40 hover:bg-slate-800/70 rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center">
              <UploadCloud className="w-12 h-12 text-brand-400 mb-3 animate-bounce" />
              <span className="text-sm font-bold text-white mb-1">Arrastra tu archivo aquí o haz clic</span>
              <span className="text-xs text-slate-400 mb-4">Formatos soportados: Excel (.xlsx, .xls) o CSV (.csv)</span>

              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={e => e.target.files?.[0] && handleFileChange(e.target.files[0])}
                className="hidden"
              />

              <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xs font-semibold text-brand-300">
                Seleccionar Archivo
              </div>
            </label>

            {/* Botón para descargar plantilla de ejemplo */}
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => excelService.downloadStudentTemplate(activeCourse?.name || 'Curso')}
                className="text-xs text-brand-400 hover:text-brand-300 font-semibold inline-flex items-center gap-1.5 transition-colors underline"
              >
                <Download className="w-3.5 h-3.5" />
                <span>¿No sabes cómo armarlo? Descargar plantilla de ejemplo en Excel</span>
              </button>
            </div>

            {loading && <p className="text-xs text-brand-400 text-center mt-3 animate-pulse">Analizando archivo y columnas...</p>}
            {error && (
              <div className="mt-3 p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        )}

        {/* Previsualización antes de guardar */}
        {parsedData.length > 0 && (
          <div className="py-3 flex-1 flex flex-col min-h-0">
            <div className="bg-emerald-950/30 border border-emerald-500/30 p-3 rounded-2xl mb-3 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-300 block">
                  ✓ Se encontraron {parsedData.length} estudiantes
                </span>
                <span className="text-[11px] text-emerald-200/70">
                  El sistema generará automáticamente un código único y QR para cada uno.
                </span>
              </div>
              <button
                onClick={() => {
                  setParsedData([]);
                  setFile(null);
                }}
                className="text-xs text-slate-400 hover:text-white px-2 py-1 bg-slate-800 rounded-lg"
              >
                Cambiar
              </button>
            </div>

            {/* Lista Previa */}
            <div className="flex-1 overflow-y-auto space-y-1.5 border border-slate-800 rounded-2xl p-2 bg-slate-950/50">
              {parsedData.slice(0, 15).map((row, idx) => (
                <div key={idx} className="p-2 bg-slate-900 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-400 text-[10px] w-6 text-center">
                      #{idx + 1}
                    </span>
                    <span className="font-semibold text-white">{row.fullName}</span>
                  </div>
                  {row.documentNumber && (
                    <span className="text-[10px] text-slate-400 font-mono">Doc: {row.documentNumber}</span>
                  )}
                </div>
              ))}
              {parsedData.length > 15 && (
                <p className="text-[11px] text-slate-400 text-center py-2">
                  ... y {parsedData.length - 15} estudiantes más
                </p>
              )}
            </div>

            {/* Opción de reemplazo */}
            <div className="pt-3 pb-1">
              <label className="flex items-center gap-2 cursor-pointer bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
                <input
                  type="checkbox"
                  checked={replaceExisting}
                  onChange={e => setReplaceExisting(e.target.checked)}
                  className="rounded border-slate-700 text-brand-500 focus:ring-brand-500 w-4 h-4 bg-slate-900"
                />
                <div className="text-left">
                  <span className="text-xs font-bold text-slate-200 block">
                    Reemplazar estudiantes anteriores del curso
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    Elimina de Firestore los estudiantes antiguos o de prueba para dejar únicamente esta lista.
                  </span>
                </div>
              </label>
            </div>

            {error && (
              <div className="mt-2 p-2.5 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Botones de Confirmación */}
            <div className="pt-3 flex gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={onClose}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded-xl text-xs font-bold transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleConfirmImport}
                className="flex-1 py-3 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-touch flex items-center justify-center gap-1.5 active:scale-95 transition-all"
              >
                {saving ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    <span>Guardando en Firebase...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Guardar e Importar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
