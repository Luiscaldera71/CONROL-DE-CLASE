import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Camera,
  Flashlight,
  FlashlightOff,
  SwitchCamera,
  RefreshCw,
  Zap,
  Search,
  CheckCircle,
  AlertCircle,
  Volume2,
  X,
  Users
} from 'lucide-react';
import { useCourse } from '../context/CourseContext';
import { useToast } from '../context/ToastContext';
import { Student } from '../types';
import { cleanQRCode, playFeedbackTone, triggerHapticFeedback } from '../utils/codeGenerator';
import { QuickActionModal } from '../components/qr/QuickActionModal';

export const ScannerPage: React.FC = () => {
  const { students, activeCourse, getStudentByCode, recordAttendance, getTodaySession } = useCourse();
  const { showToast } = useToast();

  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scannedStudent, setScannedStudent] = useState<Student | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  
  // Modo Asistencia Rápida
  const [isRapidMode, setIsRapidMode] = useState(false);
  const [rapidSessionStats, setRapidSessionStats] = useState<{
    present: number;
    absent: number;
    late: number;
    lastStudentName?: string;
  }>({ present: 0, absent: 0, late: 0 });
  const [showRapidSummary, setShowRapidSummary] = useState(false);

  // Manual fallback search
  const [manualCode, setManualCode] = useState('');
  const [manualDropdownOpen, setManualDropdownOpen] = useState(false);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const lastScannedTimeRef = useRef<number>(0);
  const lastScannedCodeRef = useRef<string>('');

  const today = new Date().toISOString().split('T')[0];

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
          qrbox: { width: 260, height: 260 },
          aspectRatio: 1.0
        },
        onScanSuccess,
        () => {} // Ignorar errores de frames continuos
      );

      setIsScanning(true);

      // Chequear soporte de flash/torch
      try {
        const capabilities = (html5QrCodeRef.current as any).getRunningTrackCapabilities();
        if (capabilities && capabilities.torch) {
          setTorchSupported(true);
        }
      } catch {
        // Torch no soportado en este dispositivo
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
      showToast('Tu cámara no soporta control de linterna', 'info');
    }
  };

  const onScanSuccess = (decodedText: string) => {
    const now = Date.now();
    const cleanCode = cleanQRCode(decodedText);

    // Evitar lecturas duplicadas en menos de 1.8 segundos del mismo código
    if (cleanCode === lastScannedCodeRef.current && now - lastScannedTimeRef.current < 1800) {
      return;
    }

    lastScannedTimeRef.current = now;
    lastScannedCodeRef.current = cleanCode;

    // Buscar estudiante en el curso activo
    const found = getStudentByCode(cleanCode);

    if (!found) {
      playFeedbackTone('alert');
      showToast(`Código ${cleanCode} no pertenece a ${activeCourse?.name || 'este curso'}`, 'warning');
      return;
    }

    // Feedback sensorial
    triggerHapticFeedback();

    if (isRapidMode) {
      // MODO ASISTENCIA RÁPIDA: Marca presente de inmediato y continúa
      playFeedbackTone('rapid');
      recordAttendance(today, found.id, 'present', 'qr');
      setRapidSessionStats(prev => ({
        ...prev,
        present: prev.present + 1,
        lastStudentName: found.fullName
      }));
      showToast(`✓ Presente: #${found.listNumber} ${found.fullName}`, 'success');
    } else {
      // MODO NORMAL: Abre modal de opciones
      playFeedbackTone('success');
      setScannedStudent(found);
    }
  };

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

  const finishRapidSession = () => {
    const todaySession = getTodaySession();
    if (todaySession) {
      setRapidSessionStats({
        present: todaySession.summary.present,
        absent: todaySession.summary.absent,
        late: todaySession.summary.late
      });
    }
    setShowRapidSummary(true);
  };

  return (
    <div className="max-w-md mx-auto space-y-4">
      {/* HEADER DE LA PANTALLA */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
            <Camera className="w-5 h-5 text-brand-400" />
            <span>Escáner de Aula</span>
          </h1>
          <p className="text-xs text-slate-400">
            Curso: <strong className="text-slate-200">{activeCourse?.name}</strong> ({students.length} estudiantes)
          </p>
        </div>

        {/* Toggle Modo Rápido */}
        <button
          onClick={() => setIsRapidMode(!isRapidMode)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
            isRapidMode
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
          }`}
        >
          <Zap className={`w-3.5 h-3.5 ${isRapidMode ? 'text-emerald-400' : ''}`} />
          <span>{isRapidMode ? 'Asistencia Rápida ON' : 'Modo Normal'}</span>
        </button>
      </div>

      {/* BANNER INFORMATIVO MODO RÁPIDO */}
      {isRapidMode && (
        <div className="bg-emerald-950/40 border border-emerald-500/30 p-3 rounded-2xl flex items-center justify-between animate-in fade-in duration-150">
          <div>
            <span className="text-xs font-bold text-emerald-300 block">Modo Pase de Lista Continuo</span>
            <span className="text-[11px] text-emerald-200/80">
              {rapidSessionStats.lastStudentName ? `Último: ${rapidSessionStats.lastStudentName}` : 'Apunta a los carnés uno tras otro'}
            </span>
          </div>
          <button
            onClick={finishRapidSession}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md active:scale-95"
          >
            Finalizar Lista
          </button>
        </div>
      )}

      {/* ÁREA DE VISOR DE CÁMARA */}
      <div className="relative bg-black rounded-3xl overflow-hidden aspect-square border-2 border-slate-800 shadow-2xl flex items-center justify-center">
        {/* Contenedor del video HTML5 QR */}
        <div id="qr-reader-container" className="w-full h-full object-cover"></div>

        {/* Recuadro visual animado de enfoque */}
        {isScanning && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-64 h-64 border-2 border-brand-400/80 rounded-3xl relative animate-pulse shadow-[0_0_20px_rgba(99,102,241,0.25)]">
              {/* Esquinas destacadas */}
              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-brand-400 rounded-tl-xl"></div>
              <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-brand-400 rounded-tr-xl"></div>
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-brand-400 rounded-bl-xl"></div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-brand-400 rounded-br-xl"></div>
            </div>
          </div>
        )}

        {/* CONTROLES FLOTANTES SOBRE EL VIDEO */}
        <div className="absolute top-3 right-3 flex items-center gap-2 z-20">
          {torchSupported && (
            <button
              onClick={toggleTorch}
              className={`p-2.5 rounded-full backdrop-blur-md transition-all ${
                torchOn ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-black/50 text-white hover:bg-black/70'
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
            className="p-2.5 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-md"
            title="Reiniciar cámara"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Error o Cámara apagada */}
        {cameraError && (
          <div className="absolute inset-0 bg-slate-950 p-6 flex flex-col items-center justify-center text-center z-10">
            <AlertCircle className="w-10 h-10 text-rose-400 mb-2" />
            <p className="text-xs text-rose-300 mb-3">{cameraError}</p>
            <button
              onClick={startCamera}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold"
            >
              Reintentar Permiso
            </button>
          </div>
        )}
      </div>

      {/* BUSCADOR / FALLBACK MANUAL POR CÓDIGO O NOMBRE */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5">
        <label className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block mb-1.5">
          Búsqueda Rápida Manual (sin cámara)
        </label>
        <form onSubmit={handleManualSearch} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={manualCode}
              onChange={e => setManualCode(e.target.value)}
              placeholder="Escribe código (ej: A7K92P), nombre o #"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
            {manualCode && (
              <button
                type="button"
                onClick={() => setManualCode('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="px-3.5 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold shadow-touch flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Buscar</span>
          </button>
        </form>

        {/* Selector rápido directo de alumnos */}
        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
          <span>O selecciona directo de la lista:</span>
          <button
            type="button"
            onClick={() => setManualDropdownOpen(!manualDropdownOpen)}
            className="text-brand-400 hover:underline font-semibold"
          >
            {manualDropdownOpen ? 'Ocultar lista' : 'Ver 35 alumnos'}
          </button>
        </div>

        {manualDropdownOpen && (
          <div className="mt-2 max-h-48 overflow-y-auto space-y-1 pr-1 border-t border-slate-800 pt-2 animate-in fade-in">
            {students.map(std => (
              <button
                key={std.id}
                type="button"
                onClick={() => {
                  setScannedStudent(std);
                  setManualDropdownOpen(false);
                }}
                className="w-full text-left p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 flex items-center justify-between text-xs text-slate-200 transition-colors"
              >
                <span>#{String(std.listNumber).padStart(2, '0')} {std.fullName}</span>
                <span className="font-mono text-[10px] text-brand-300 font-bold bg-slate-700 px-1.5 py-0.5 rounded">
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
            // Preparar cámara de nuevo
          }}
        />
      )}

      {/* MODAL RESUMEN FINAL DE ASISTENCIA RÁPIDA */}
      {showRapidSummary && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-sm text-center shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-white mb-1">Asistencia Finalizada</h2>
            <p className="text-xs text-slate-400 mb-4">
              Resumen para {activeCourse?.name} ({students.length} estudiantes)
            </p>

            <div className="grid grid-cols-3 gap-2 bg-slate-950/60 p-4 rounded-2xl border border-slate-800 mb-5">
              <div>
                <div className="text-xl font-black text-emerald-400">
                  {rapidSessionStats.present}
                </div>
                <div className="text-[10px] font-semibold text-slate-400 uppercase mt-0.5">Presentes</div>
              </div>
              <div>
                <div className="text-xl font-black text-rose-400">
                  {students.length - rapidSessionStats.present - rapidSessionStats.late}
                </div>
                <div className="text-[10px] font-semibold text-slate-400 uppercase mt-0.5">Ausentes</div>
              </div>
              <div>
                <div className="text-xl font-black text-amber-400">
                  {rapidSessionStats.late}
                </div>
                <div className="text-[10px] font-semibold text-slate-400 uppercase mt-0.5">Tardes</div>
              </div>
            </div>

            <button
              onClick={() => {
                setShowRapidSummary(false);
                setIsRapidMode(false);
              }}
              className="w-full py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-sm font-bold shadow-touch active:scale-95 transition-all"
            >
              Aceptar y Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
