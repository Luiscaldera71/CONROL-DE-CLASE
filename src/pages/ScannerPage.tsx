import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Camera,
  Flashlight,
  FlashlightOff,
  RefreshCw,
  Zap,
  Search,
  CheckCircle,
  AlertCircle,
  X,
  Users
} from 'lucide-react';
import { useCourse } from '../context/CourseContext';
import { useToast } from '../context/ToastContext';
import { Student } from '../types';
import { cleanQRCode, playFeedbackTone, triggerHapticFeedback } from '../utils/codeGenerator';
import { getLocalDateString } from '../utils/dateUtils';
import { QuickActionModal } from '../components/qr/QuickActionModal';

export const ScannerPage: React.FC = () => {
  const { students, courses, activeCourse, selectCourse, getStudentByCode, recordAttendance, recordAttendanceBulk, getTodaySession } = useCourse();
  const { showToast } = useToast();

  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scannedStudent, setScannedStudent] = useState<Student | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  
  // Modo Asistencia Rápida
  const [isRapidMode, setIsRapidMode] = useState(false);
  const [rapidSessionStats, setRapidSessionStats] = useState<{ lastStudentName?: string }>({});
  const [showRapidSummary, setShowRapidSummary] = useState(false);

  // Manual fallback search
  const [manualCode, setManualCode] = useState('');
  const [manualDropdownOpen, setManualDropdownOpen] = useState(false);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const lastScannedTimeRef = useRef<number>(0);
  const lastScannedCodeRef = useRef<string>('');
  const onScanSuccessRef = useRef<(text: string) => void>(() => {});

  const today = getLocalDateString();

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode('qr-reader-container');
      }

      await html5QrCodeRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 15,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        // Siempre la versión más reciente del handler (evita closures obsoletos: modo rápido, estudiantes, curso)
        (text: string) => onScanSuccessRef.current(text),
        () => {} // Ignorar frames vacíos
      );

      setIsScanning(true);

      try {
        const capabilities = (html5QrCodeRef.current as any).getRunningTrackCapabilities();
        if (capabilities && capabilities.torch) {
          setTorchSupported(true);
        }
      } catch {
        // Torch no soportado
      }
    } catch (err: any) {
      console.warn('Error iniciando cámara:', err);
      setCameraError('No se pudo acceder a la cámara. Revisa los permisos o usa el buscador manual.');
      setIsScanning(false);
    }
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (e) {
        console.warn('Error al detener cámara:', e);
      }
    }
    setIsScanning(false);
  };

  const toggleTorch = async () => {
    if (!html5QrCodeRef.current) return;
    try {
      const nextState = !torchOn;
      await (html5QrCodeRef.current as any).applyVideoConstraints({
        advanced: [{ torch: nextState }]
      });
      setTorchOn(nextState);
    } catch {
      showToast('Tu cámara no soporta linterna', 'info');
    }
  };

  const onScanSuccess = (decodedText: string) => {
    const now = Date.now();
    // Extraer infaliblemente sólo el código del estudiante (ignorar el link de Vercel)
    const cleanCode = cleanQRCode(decodedText);

    if (!cleanCode) return;

    if (cleanCode === lastScannedCodeRef.current && now - lastScannedTimeRef.current < 1800) {
      return;
    }

    lastScannedTimeRef.current = now;
    lastScannedCodeRef.current = cleanCode;

    const found = getStudentByCode(cleanCode);

    if (!found) {
      playFeedbackTone('alert');
      showToast(`Código ${cleanCode} no encontrado en tus cursos`, 'warning');
      return;
    }

    // Si el estudiante pertenece a un curso distinto al activo, cambiar de curso automáticamente
    if (activeCourse && found.courseId !== activeCourse.id) {
      selectCourse(found.courseId);
    }

    triggerHapticFeedback();

    if (isRapidMode) {
      // No degradar a "presente" a quien ya estaba marcado como tarde/excusa hoy
      const existing = getTodaySession()?.records[found.id];
      const keepStatus = existing && existing.status !== 'absent' ? existing.status : 'present';
      if (!recordAttendance(today, found.id, keepStatus, 'qr')) {
        playFeedbackTone('alert');
        showToast('Hoy no es día de clase de este curso: no se puede tomar asistencia.', 'warning');
        return;
      }
      playFeedbackTone('rapid');
      setRapidSessionStats(prev => ({ ...prev, lastStudentName: found.fullName }));
      showToast(`✓ ${keepStatus === 'present' ? 'Presente' : 'Ya registrado'}: #${found.listNumber} ${found.fullName}`, 'success');
    } else {
      playFeedbackTone('success');
      setScannedStudent(found);
    }
  };
  onScanSuccessRef.current = onScanSuccess;

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    const found = getStudentByCode(manualCode.trim()) || 
      students.find(s => s.fullName.toLowerCase().includes(manualCode.toLowerCase()) || String(s.listNumber) === manualCode.trim());

    if (found) {
      setScannedStudent(found);
      setManualCode('');
      setManualDropdownOpen(false);
    } else {
      showToast('Estudiante no encontrado en el curso activo', 'error');
    }
  };

  // Conteo real de hoy a partir de los registros (los que no tienen registro = sin marcar)
  const todayRecords = getTodaySession()?.records || {};
  const todayCounts = { present: 0, absent: 0, late: 0, excused: 0, unmarked: 0 };
  students.forEach(s => {
    const st = todayRecords[s.id]?.status;
    if (st) todayCounts[st]++;
    else todayCounts.unmarked++;
  });

  const finishRapidSession = () => {
    setShowRapidSummary(true);
  };

  // Cierra la lista: quienes no pasaron por el escáner quedan ausentes
  const markUnmarkedAbsent = () => {
    const pending = students.filter(s => !todayRecords[s.id]);
    if (pending.length > 0) {
      const ok = recordAttendanceBulk(today, pending.map(s => ({ studentId: s.id, status: 'absent' as const })), 'manual');
      if (ok) showToast(`✓ ${pending.length} estudiante(s) marcados como ausentes`, 'success');
      else showToast('Hoy no es día de clase de este curso: no se puede tomar asistencia.', 'warning');
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-4">
      {/* ========================================================
          CABECERA DE CHECK IN (Estilo AbsenSiswa Screen 4)
         ======================================================== */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            Check In / Escanear QR
          </h1>
          <p className="text-xs text-slate-500">
            Curso: <strong className="text-slate-800">{activeCourse?.name}</strong> ({students.length} alumnos)
          </p>
        </div>

        {/* Toggle Modo Rápido */}
        <button
          onClick={() => setIsRapidMode(!isRapidMode)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
            isRapidMode
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Zap className={`w-3.5 h-3.5 ${isRapidMode ? 'text-emerald-600' : 'text-slate-400'}`} />
          <span>{isRapidMode ? 'Rápido ON' : 'Normal'}</span>
        </button>
      </div>

      {/* BANNER MODO RÁPIDO */}
      {isRapidMode && (
        <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl flex items-center justify-between animate-in fade-in duration-150">
          <div>
            <span className="text-xs font-bold text-emerald-800 block">Modo Escaneo Continuo</span>
            <span className="text-[11px] text-emerald-700">
              {rapidSessionStats.lastStudentName ? `Último: ${rapidSessionStats.lastStudentName}` : 'Apunta a los carnés QR uno tras otro'}
            </span>
          </div>
          <button
            onClick={finishRapidSession}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm"
          >
            Finalizar
          </button>
        </div>
      )}

      {/* ========================================================
          ÁREA DEL VISOR QR (Marco Limpio con esquinas azules)
         ======================================================== */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm space-y-4">
        <div className="relative bg-slate-900 rounded-3xl overflow-hidden aspect-square flex items-center justify-center shadow-inner">
          {/* Contenedor del video HTML5 QR */}
          <div id="qr-reader-container" className="w-full h-full object-cover"></div>

          {/* Recuadro visual de enfoque con esquinas azules AbsenSiswa */}
          {isScanning && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-60 h-60 border-2 border-blue-500/60 rounded-3xl relative animate-pulse">
                {/* Esquinas azules */}
                <div className="absolute -top-1 -left-1 w-7 h-7 border-t-4 border-l-4 border-blue-500 rounded-tl-2xl"></div>
                <div className="absolute -top-1 -right-1 w-7 h-7 border-t-4 border-r-4 border-blue-500 rounded-tr-2xl"></div>
                <div className="absolute -bottom-1 -left-1 w-7 h-7 border-b-4 border-l-4 border-blue-500 rounded-bl-2xl"></div>
                <div className="absolute -bottom-1 -right-1 w-7 h-7 border-b-4 border-r-4 border-blue-500 rounded-br-2xl"></div>
              </div>
            </div>
          )}

          {/* CONTROLES FLOTANTES */}
          <div className="absolute top-3 right-3 flex items-center gap-2 z-20">
            {torchSupported && (
              <button
                onClick={toggleTorch}
                className={`p-2.5 rounded-full backdrop-blur-md transition-all ${
                  torchOn ? 'bg-amber-400 text-slate-950 font-bold' : 'bg-black/40 text-white hover:bg-black/60'
                }`}
                title="Linterna"
              >
                {torchOn ? <Flashlight className="w-4 h-4" /> : <FlashlightOff className="w-4 h-4" />}
              </button>
            )}

            <button
              onClick={() => {
                stopCamera();
                startCamera();
              }}
              className="p-2.5 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md"
              title="Reiniciar cámara"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Error de cámara */}
          {cameraError && (
            <div className="absolute inset-0 bg-slate-950/90 p-6 flex flex-col items-center justify-center text-center z-10">
              <AlertCircle className="w-10 h-10 text-rose-400 mb-2" />
              <p className="text-xs text-rose-200 mb-3">{cameraError}</p>
              <button
                onClick={startCamera}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
              >
                Reintentar
              </button>
            </div>
          )}
        </div>

        {/* TEXTO GUÍA */}
        <div className="text-center space-y-1">
          <h2 className="text-sm font-black text-slate-900">Escanear Carné QR</h2>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Apunta la cámara al carné impreso o celular del estudiante para registrar la asistencia al instante.
          </p>
        </div>

        {/* BOTÓN PRINCIPAL AZUL ELEVADO */}
        <button
          onClick={isScanning ? stopCamera : startCamera}
          className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-blue-500/25 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <Camera className="w-4 h-4" />
          <span>{isScanning ? 'Pausar Cámara' : 'Iniciar Escáner'}</span>
        </button>
      </div>

      {/* ========================================================
          BÚSQUEDA MANUAL / CHECK IN ALTERNATIVO
         ======================================================== */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm space-y-2.5">
        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
          Búsqueda o Registro Manual
        </label>
        <form onSubmit={handleManualSearch} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={manualCode}
              onChange={e => setManualCode(e.target.value)}
              placeholder="Código, nombre o número de lista..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:outline-none"
            />
            {manualCode && (
              <button
                type="button"
                onClick={() => setManualCode('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold shadow-sm flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Buscar</span>
          </button>
        </form>

        {/* Botón para desplegar lista */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
          <span>O selecciona directo:</span>
          <button
            type="button"
            onClick={() => setManualDropdownOpen(!manualDropdownOpen)}
            className="text-blue-600 hover:text-blue-700 font-bold"
          >
            {manualDropdownOpen ? 'Ocultar lista' : `Ver ${students.length} estudiantes`}
          </button>
        </div>

        {manualDropdownOpen && (
          <div className="mt-2 max-h-48 overflow-y-auto space-y-1 pr-1 border-t border-slate-100 pt-2 animate-in fade-in">
            {students.map(std => (
              <button
                key={std.id}
                type="button"
                onClick={() => {
                  setScannedStudent(std);
                  setManualDropdownOpen(false);
                }}
                className="w-full text-left p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs text-slate-800 transition-colors"
              >
                <span className="font-semibold">#{String(std.listNumber).padStart(2, '0')} {std.fullName}</span>
                <span className="font-mono text-[10px] text-blue-700 font-bold bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-md">
                  {std.uniqueCode}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* MODAL DE ACCIONES RÁPIDAS (SE ABRE AL ESCANEAR) */}
      {scannedStudent && (
        <QuickActionModal
          student={scannedStudent}
          onClose={() => setScannedStudent(null)}
          onSuccessReturnToScanner={() => {
            setScannedStudent(null);
          }}
        />
      )}

      {/* MODAL RESUMEN FINAL DE ASISTENCIA RÁPIDA */}
      {showRapidSummary && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-sm text-center shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3 border border-emerald-100">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-black text-slate-900 mb-0.5">Asistencia Finalizada</h2>
            <p className="text-xs text-slate-500 mb-4">
              Resumen para {activeCourse?.name} ({students.length} estudiantes)
            </p>

            <div className="grid grid-cols-3 gap-2 bg-slate-50 p-4 rounded-2xl border border-slate-200 mb-3">
              <div>
                <div className="text-xl font-black text-emerald-600">
                  {todayCounts.present + todayCounts.excused}
                </div>
                <div className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">Presentes</div>
              </div>
              <div>
                <div className="text-xl font-black text-rose-600">
                  {todayCounts.absent + todayCounts.unmarked}
                </div>
                <div className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">Ausentes</div>
              </div>
              <div>
                <div className="text-xl font-black text-amber-500">
                  {todayCounts.late}
                </div>
                <div className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">Tardes</div>
              </div>
            </div>

            {todayCounts.unmarked > 0 && (
              <button
                onClick={markUnmarkedAbsent}
                className="w-full mb-3 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-2xl text-xs font-bold active:scale-95 transition-all"
              >
                Registrar {todayCounts.unmarked} sin escanear como ausentes
              </button>
            )}

            <button
              onClick={() => {
                setShowRapidSummary(false);
                setIsRapidMode(false);
              }}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-blue-500/25 active:scale-95 transition-all"
            >
              Aceptar y Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
