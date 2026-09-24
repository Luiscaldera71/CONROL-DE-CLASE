import React, { useState, useEffect } from 'react';
import {
  Settings,
  Sliders,
  AlertTriangle,
  GraduationCap,
  Save,
  LogOut,
  Mail,
  School,
  User,
  BookOpen,
  Phone,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCourse } from '../context/CourseContext';
import { useToast } from '../context/ToastContext';

export const SettingsPage: React.FC = () => {
  const { teacherProfile, updateSettings, updateTeacherProfile, currentUser, logout } = useAuth();
  const { courses, updateAllCoursesInstitution } = useCourse();
  const { showToast } = useToast();

  // Estados del perfil del docente e institución
  const [displayName, setDisplayName] = useState(teacherProfile?.displayName || '');
  const [institution, setInstitution] = useState(teacherProfile?.institution || '');
  const [subject, setSubject] = useState(teacherProfile?.subject || '');
  const [phone, setPhone] = useState(teacherProfile?.phone || '');
  const [syncToCourses, setSyncToCourses] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Estados de configuración de notas y riesgo
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

  // Sincronizar campos cuando cargue teacherProfile
  useEffect(() => {
    if (teacherProfile) {
      if (teacherProfile.displayName) setDisplayName(teacherProfile.displayName);
      if (teacherProfile.institution) setInstitution(teacherProfile.institution);
      if (teacherProfile.subject) setSubject(teacherProfile.subject);
      if (teacherProfile.phone) setPhone(teacherProfile.phone);
    }
  }, [teacherProfile]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      showToast('Por favor ingresa tu nombre completo', 'error');
      return;
    }
    if (!institution.trim()) {
      showToast('Por favor ingresa el nombre de la institución educativa', 'error');
      return;
    }

    setIsSavingProfile(true);
    try {
      await updateTeacherProfile({
        displayName: displayName.trim(),
        institution: institution.trim(),
        subject: subject.trim() || undefined,
        phone: phone.trim() || undefined
      });

      if (syncToCourses && courses.length > 0) {
        await updateAllCoursesInstitution(institution.trim());
      }

      showToast('✓ Información del docente e institución guardada en Firestore', 'success');
    } catch (err: any) {
      showToast('Error al actualizar datos: ' + err.message, 'error');
    } finally {
      setIsSavingProfile(false);
    }
  };

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
    <div className="space-y-5 max-w-3xl mx-auto pb-10">
      {/* CABECERA */}
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-brand-400" />
          <span>Configuración del Sistema y Aula</span>
        </h1>
        <p className="text-xs text-slate-400">
          Modifica tu nombre, institución, área de trabajo y umbrales de alerta temprana
        </p>
      </div>

      {/* TARJETA RESUMEN DE CUENTA */}
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
                  Firebase Firestore Conectado
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
                <span>{teacherProfile?.institution || 'Institución sin asignar'}</span>
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

      {/* SECCIÓN NUEVA: EDITAR DATOS DEL DOCENTE E INSTITUCIÓN */}
      <form onSubmit={handleSaveProfile} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <School className="w-5 h-5 text-brand-400" />
            <div>
              <h2 className="text-sm font-bold text-white">Datos del Docente e Institución Educativa</h2>
              <p className="text-[11px] text-slate-400">
                Esta información es la que verán los estudiantes y padres de familia en su portal de consulta
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Nombre Docente */}
          <div>
            <label className="text-xs text-slate-300 font-semibold block mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-brand-400" />
              <span>Nombre Completo del Docente *</span>
            </label>
            <input
              type="text"
              required
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Ej: Lic. Luis Caldera"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors font-medium"
            />
          </div>

          {/* Institución Educativa */}
          <div>
            <label className="text-xs text-slate-300 font-semibold block mb-1 flex items-center gap-1.5">
              <School className="w-3.5 h-3.5 text-indigo-400" />
              <span>Institución Educativa / Colegio *</span>
            </label>
            <input
              type="text"
              required
              value={institution}
              onChange={e => setInstitution(e.target.value)}
              placeholder="Ej: I.E. San José de la Montaña"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors font-medium"
            />
          </div>

          {/* Área / Asignatura Principal */}
          <div>
            <label className="text-xs text-slate-300 font-semibold block mb-1 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
              <span>Área / Asignatura Principal</span>
            </label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Ej: Tecnología e Informática, Matemáticas..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors font-medium"
            />
          </div>

          {/* Teléfono / WhatsApp opcional */}
          <div>
            <label className="text-xs text-slate-300 font-semibold block mb-1 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-amber-400" />
              <span>Teléfono de Contacto Institucional (Opcional)</span>
            </label>
            <input
              type="text"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="Ej: +57 300 123 4567"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors font-medium"
            />
          </div>
        </div>

        {/* Opción de sincronizar con todos los cursos */}
        {courses.length > 0 && (
          <div className="pt-2">
            <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-300 bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
              <input
                type="checkbox"
                checked={syncToCourses}
                onChange={e => setSyncToCourses(e.target.checked)}
                className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 bg-slate-700 border-slate-600"
              />
              <span>
                Actualizar automáticamente el nombre de esta institución en todos mis cursos ({courses.length} cursos registrados)
              </span>
            </label>
          </div>
        )}

        <button
          type="submit"
          disabled={isSavingProfile}
          className="w-full py-3 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white rounded-xl text-sm font-bold shadow-touch flex items-center justify-center gap-2 active:scale-98 transition-all disabled:opacity-50"
        >
          {isSavingProfile ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Actualizando en Firebase...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Guardar Datos del Docente y Colegio</span>
            </>
          )}
        </button>
      </form>

      {/* SECCIÓN CONFIGURACIONES ACADÉMICAS */}
      <form onSubmit={handleSaveSettings} className="space-y-4">
        {/* MOTOR DE ALERTAS Y RIESGO ACADÉMICO */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
            <div>
              <h2 className="text-sm font-bold text-white">Umbrales de Riesgo Académico (Configurables)</h2>
              <p className="text-[11px] text-slate-400">
                El sistema generará alertas de atención prioritaria según estos límites:
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

        {/* ESCALA DE CALIFICACIÓN */}
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
          className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 rounded-xl text-sm font-bold shadow-touch flex items-center justify-center gap-2 active:scale-98 transition-all"
        >
          <Save className="w-4 h-4" />
          <span>Guardar Umbrales y Escala</span>
        </button>
      </form>
    </div>
  );
};

export default SettingsPage;
