import React, { useState } from 'react';
import {
  Settings,
  Sliders,
  AlertTriangle,
  GraduationCap,
  Save,
  LogOut,
  Mail,
  School
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCourse } from '../context/CourseContext';
import { useToast } from '../context/ToastContext';

export const SettingsPage: React.FC = () => {
  const { teacherProfile, updateSettings, currentUser, logout } = useAuth();
  const { activeCourse } = useCourse();
  const { showToast } = useToast();

  const currentSettings = teacherProfile?.settings || {
    gradeScale: { min: 0.0, max: 5.0, passingGrade: 3.0 },
    riskThresholds: { minGrade: 3.0, minAttendanceRate: 75, maxUnsubmitted: 3 },
    periods: ['Periodo 1', 'Periodo 2', 'Periodo 3', 'Periodo 4'],
    behaviorCategories: []
  };

  const [minPassingGrade, setMinPassingGrade] = useState<number>(currentSettings.gradeScale.passingGrade);
  const [riskMinGrade, setRiskMinGrade] = useState<number>(currentSettings.riskThresholds.minGrade);
  const [riskMinAttendance, setRiskMinAttendance] = useState<number>(currentSettings.riskThresholds.minAttendanceRate);
  const [riskMaxUnsubmitted, setRiskMaxUnsubmitted] = useState<number>(currentSettings.riskThresholds.maxUnsubmitted);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
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
    });
    showToast('✓ Configuraciones de alerta y escala guardadas', 'success');
  };

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      {/* CABECERA */}
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-brand-400" />
          <span>Configuración del Sistema y Aula</span>
        </h1>
        <p className="text-xs text-slate-400">
          Ajusta los umbrales de alerta temprana, escalas de calificación e información de tu cuenta docente
        </p>
      </div>

      {/* TARJETA DE PERFIL DOCENTE Y CUENTA FIREBASE */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shrink-0">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>{teacherProfile?.displayName || 'Docente'}</span>
              {currentUser && (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">
                  Firebase Firestore Activo
                </span>
              )}
            </h2>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mt-0.5">
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-slate-500" />
                <span>{currentUser?.email || teacherProfile?.email || 'Sin correo registrado'}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <School className="w-3.5 h-3.5 text-slate-500" />
                <span>{teacherProfile?.institution || 'Institución Educativa'}</span>
              </span>
            </div>
          </div>
        </div>

        <div>
          {currentUser && (
            <button
              type="button"
              onClick={() => logout()}
              className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors active:scale-95"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar Sesión</span>
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-4">
        {/* SECCIÓN 1: MOTOR DE ALERTAS Y RIESGO ACADÉMICO */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
            <div>
              <h2 className="text-sm font-bold text-white">Umbrales de Riesgo Académico (Configurables)</h2>
              <p className="text-[11px] text-slate-400">
                El sistema no decide a ciegas; generará alertas explicables según estos límites definidos por ti:
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1">
                Alerta de Nota Mínima
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="5"
                value={riskMinGrade}
                onChange={e => setRiskMinGrade(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 font-bold text-rose-300"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">Alerta si promedio &lt; {riskMinGrade}</span>
            </div>

            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1">
                Asistencia Mínima Requerida (%)
              </label>
              <input
                type="number"
                min="10"
                max="100"
                value={riskMinAttendance}
                onChange={e => setRiskMinAttendance(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 font-bold text-amber-300"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">Alerta si asistencia &lt; {riskMinAttendance}%</span>
            </div>

            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1">
                Máximo de Entregas Pendientes
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={riskMaxUnsubmitted}
                onChange={e => setRiskMaxUnsubmitted(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 font-bold text-indigo-300"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">Alerta si acumula ≥ {riskMaxUnsubmitted} no entregadas</span>
            </div>
          </div>
        </div>

        {/* SECCIÓN 2: ESCALA DE CALIFICACIÓN */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <Sliders className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-sm font-bold text-white">Escala Institucional de Calificación</h2>
              <p className="text-[11px] text-slate-400">Escala numérica activa para el registro de actividades y promedios</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1">
                Nota Mínima de Aprobación
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="5"
                value={minPassingGrade}
                onChange={e => setMinPassingGrade(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 font-bold text-emerald-400"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">Por defecto en Colombia: 3.0</span>
            </div>

            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1">
                Rango de la Escala
              </label>
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl px-3 py-2 text-sm text-slate-300 font-bold">
                0.0 a 5.0 (Sistema Estándar)
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block">Ajustable a escalas 0-10 o 0-100 si es requerido</span>
            </div>
          </div>
        </div>

        {/* BOTÓN GUARDAR AJUSTES */}
        <button
          type="submit"
          className="w-full py-3 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white rounded-xl text-sm font-bold shadow-touch flex items-center justify-center gap-2 active:scale-98 transition-all"
        >
          <Save className="w-4 h-4" />
          <span>Guardar Cambios de Configuración</span>
        </button>
      </form>
    </div>
  );
};
