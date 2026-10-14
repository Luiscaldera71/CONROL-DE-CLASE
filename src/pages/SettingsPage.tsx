import React, { useState } from 'react';
import {
  Settings,
  Shield,
  Sliders,
  AlertTriangle,
  GraduationCap,
  Save,
  RotateCcw,
  Sparkles,
  Database,
  User,
  School,
  Bell,
  CheckCircle2,
  Lock,
  Volume2,
  LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCourse } from '../context/CourseContext';
import { useToast } from '../context/ToastContext';
import { notificationService } from '../services/notificationService';

export const SettingsPage: React.FC = () => {
  const { teacherProfile, updateSettings, updateProfile, currentUser, logout } = useAuth();
  const { clearAllData, resetToDemoData, activeCourse } = useCourse();
  const { showToast } = useToast();

  const currentSettings = teacherProfile?.settings || {
    gradeScale: { min: 0.0, max: 5.0, passingGrade: 3.0 },
    riskThresholds: { minGrade: 3.0, minAttendanceRate: 75, maxUnsubmitted: 3 },
    periods: ['Periodo 1', 'Periodo 2', 'Periodo 3', 'Periodo 4'],
    behaviorCategories: []
  };

  // Estados de Perfil
  const [displayName, setDisplayName] = useState(teacherProfile?.displayName || 'Docente Pro');
  const [institution, setInstitution] = useState(teacherProfile?.institution || 'Institución Educativa');

  // Estados de Umbrales de Alertas
  const [minPassingGrade, setMinPassingGrade] = useState<number>(currentSettings.gradeScale.passingGrade);
  const [riskMinGrade, setRiskMinGrade] = useState<number>(currentSettings.riskThresholds.minGrade);
  const [riskMinAttendance, setRiskMinAttendance] = useState<number>(currentSettings.riskThresholds.minAttendanceRate);
  const [riskMaxUnsubmitted, setRiskMaxUnsubmitted] = useState<number>(currentSettings.riskThresholds.maxUnsubmitted);

  // Estado de Permiso de Notificaciones (Android / Web)
  const [notifPermission, setNotifPermission] = useState<string>('prompt');

  React.useEffect(() => {
    notificationService.checkPermission().then(status => {
      setNotifPermission(status);
    });
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfile({
      displayName: displayName.trim(),
      institution: institution.trim(),
      settings: {
        gradeScale: {
          min: 0.0,
          max: 5.0,
          passingGrade: Number(minPassingGrade)
        },
        riskThresholds: {
          minGrade: Number(riskMinGrade),
          minAttendanceRate: Number(riskMinAttendance),
          maxUnsubmitted: Number(riskMaxUnsubmitted)
        }
      }
    });
    showToast('✓ Configuraciones de perfil, alerta y escala guardadas', 'success');
  };

  const handleRequestNotifPermission = async () => {
    const granted = await notificationService.requestPermission();
    const current = await notificationService.checkPermission();
    setNotifPermission(current);

    if (granted) {
      showToast('✓ Notificaciones activadas en tu dispositivo', 'success');
      notificationService.sendNativeNotification(
        '🔔 Notificaciones AulaControl Activas',
        'Recibirás alertas en tu celular 24 horas antes de clase y a la hora de iniciar.'
      );
    } else {
      showToast('Permiso de notificaciones denegado o no otorgado', 'warning');
    }
  };

  const handleClearData = () => {
    if (window.confirm('¿Estás seguro de eliminar TODOS los datos demo (cursos, alumnos, asistencias) para empezar desde cero?')) {
      clearAllData();
      showToast('✓ Se han eliminado todos los datos demo. Tu aplicación está vacía y lista.', 'info');
    }
  };

  const handleResetDemo = () => {
    if (window.confirm('¿Deseas restaurar los 35 estudiantes de demostración y sus notas de prueba?')) {
      resetToDemoData();
      showToast('✓ Datos de demostración restablecidos', 'info');
    }
  };

  return (
    <div className="space-y-5 max-w-4xl mx-auto pb-12">
      {/* CABECERA */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600" />
            <span>Configuración del Sistema y Aula</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Personaliza tu perfil docente, umbrales de riesgo académico, horarios y notificaciones nativas (Web & Android).
          </p>
        </div>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-4">
        {/* SECCIÓN 1: PERFIL DOCENTE E INSTITUCIÓN */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 md:p-6 space-y-4 shadow-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Perfil del Docente e Institución</h2>
              <p className="text-[11px] text-slate-500 font-medium">Datos visibles en informes, exportaciones Excel y carnés QR</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="text-xs text-slate-700 font-semibold block mb-1">Nombre Completo del Docente</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="Prof. Nombre Apellido"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 font-semibold focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-700 font-semibold block mb-1">Institución Educativa</label>
              <div className="relative">
                <School className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={institution}
                  onChange={e => setInstitution(e.target.value)}
                  placeholder="Colegio o Escuela"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 font-semibold focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>
            </div>
          </div>

          <div className="pt-1 text-[11px] text-slate-500 flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
            <span>Correo Activo de la Cuenta: <strong className="text-slate-800">{currentUser?.email || teacherProfile?.email || 'Docente'}</strong></span>
            <span className="text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">Sesión Activa</span>
          </div>
        </div>

        {/* SECCIÓN 2: NOTIFICACIONES NATIVAS Y RECORDATORIOS */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 md:p-6 space-y-4 shadow-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Notificaciones Nativas y Alertas (Android & Web)</h2>
              <p className="text-[11px] text-slate-500 font-medium">Notificaciones de inicio de clase y recordatorios 1 día antes de actividades</p>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <span>🔔 Status Notificaciones del Sistema:</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  notifPermission === 'granted'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  {notifPermission === 'granted' ? 'ACTIVADAS ✓' : notifPermission === 'denied' ? 'BLOQUEADAS ✕' : 'PENDIENTES'}
                </span>
              </h4>
              <p className="text-[11px] text-slate-500 mt-1 font-medium">
                Recibirás avisos a la hora de tus clases y alertas 24h antes del vencimiento de tareas con tus estudiantes.
              </p>
            </div>

            <button
              type="button"
              onClick={handleRequestNotifPermission}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shrink-0 shadow-xs transition-all"
            >
              Activar Notificaciones Nativas
            </button>
          </div>
        </div>

        {/* SECCIÓN 3: MOTOR DE ALERTAS Y RIESGO ACADÉMICO */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 md:p-6 space-y-4 shadow-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Umbrales de Riesgo Académico (Configurables)</h2>
              <p className="text-[11px] text-slate-500 font-medium">
                El sistema generará alertas tempranas según los límites que definas aquí:
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="text-xs text-slate-700 font-semibold block mb-1">
                Alerta de Nota Mínima
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="5"
                value={riskMinGrade}
                onChange={e => setRiskMinGrade(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-rose-600 font-bold focus:outline-none focus:border-blue-500 focus:bg-white"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Alerta si promedio &lt; {riskMinGrade}</span>
            </div>

            <div>
              <label className="text-xs text-slate-700 font-semibold block mb-1">
                Asistencia Mínima Requerida (%)
              </label>
              <input
                type="number"
                min="10"
                max="100"
                value={riskMinAttendance}
                onChange={e => setRiskMinAttendance(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-amber-600 font-bold focus:outline-none focus:border-blue-500 focus:bg-white"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Alerta si asistencia &lt; {riskMinAttendance}%</span>
            </div>

            <div>
              <label className="text-xs text-slate-700 font-semibold block mb-1">
                Máximo de Entregas Pendientes
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={riskMaxUnsubmitted}
                onChange={e => setRiskMaxUnsubmitted(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-blue-600 font-bold focus:outline-none focus:border-blue-500 focus:bg-white"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Alerta si acumula ≥ {riskMaxUnsubmitted} no entregadas</span>
            </div>
          </div>
        </div>

        {/* SECCIÓN 4: ESCALA DE CALIFICACIÓN */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 md:p-6 space-y-4 shadow-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Escala Institucional de Calificación</h2>
              <p className="text-[11px] text-slate-500 font-medium">Escala numérica activa para el registro de actividades y promedios</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="text-xs text-slate-700 font-semibold block mb-1">
                Nota Mínima de Aprobación
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="5"
                value={minPassingGrade}
                onChange={e => setMinPassingGrade(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-emerald-600 font-bold focus:outline-none focus:border-blue-500 focus:bg-white"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Por defecto en Colombia: 3.0</span>
            </div>

            <div>
              <label className="text-xs text-slate-700 font-semibold block mb-1">
                Rango de la Escala
              </label>
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-bold">
                0.0 a 5.0 (Sistema Estándar)
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Escala oficial de evaluación docente</span>
            </div>
          </div>
        </div>

        {/* BOTÓN GUARDAR AJUSTES */}
        <button
          type="submit"
          className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-sm font-bold shadow-xs flex items-center justify-center gap-2 transition-all"
        >
          <Save className="w-4 h-4" />
          <span>Guardar Cambios de Configuración</span>
        </button>
      </form>

      {/* SECCIÓN 5: GESTIÓN Y LIMPIEZA DE DATOS */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 md:p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Gestión del Estado y Datos de la Aplicación</h3>
            <p className="text-[11px] text-slate-500 font-medium">Elimina los datos de prueba para empezar de cero con tus propios cursos y estudiantes</p>
          </div>
        </div>

        <div className="max-w-md">
          {/* Botón Principal: Vaciar Datos */}
          <div className="bg-rose-50/50 border border-rose-200 p-4 rounded-2xl flex flex-col justify-between space-y-3">
            <div>
              <h4 className="text-xs font-bold text-rose-700 flex items-center gap-1.5">
                <span>✕</span> Limpiar y Empezar de Cero
              </h4>
              <p className="text-[11px] text-slate-600 mt-1">
                Borra todos los datos locales de la aplicación (cursos, alumnos, asistencias y notas) para dejar tu aula completamente limpia.
              </p>
            </div>
            <button
              type="button"
              onClick={handleClearData}
              className="w-full py-2.5 bg-white border border-rose-300 hover:bg-rose-50 text-rose-700 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              Eliminar Todos los Datos Locales
            </button>
          </div>
        </div>
      </div>

      {/* CUENTA Y CERRAR SESIÓN (ESPECIALMENTE ACCESIBLE PARA ANDROID Y MÓVILES) */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 md:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-black text-lg flex items-center justify-center shrink-0 shadow-md shadow-blue-500/25">
            {teacherProfile?.displayName?.[0] || 'D'}
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 leading-tight">
              {teacherProfile?.displayName || 'Docente'}
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {currentUser?.email || teacherProfile?.institution || 'Cuenta Activa'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            if (window.confirm('¿Estás seguro de que deseas cerrar tu sesión en este dispositivo?')) {
              logout();
              showToast('Sesión cerrada correctamente', 'info');
            }
          }}
          className="px-5 py-3 rounded-2xl bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-700 border border-rose-200 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
        >
          <LogOut className="w-4 h-4 text-rose-600" />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </div>
  );
};
