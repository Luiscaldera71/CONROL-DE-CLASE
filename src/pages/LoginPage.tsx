import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  Mail,
  Lock,
  User,
  School,
  LogIn,
  UserPlus,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  ShieldCheck,
  QrCode,
  Zap,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { AppLogo } from '../components/ui/AppLogo';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, register, enableDemoMode } = useAuth();
  const { showToast } = useToast();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [institution, setInstitution] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(email.trim(), password);
        showToast('✓ Bienvenido a AulaControl', 'success');
      } else {
        if (!name.trim()) throw new Error('Por favor ingresa tu nombre completo');
        if (password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres');
        await register(
          email.trim(),
          password,
          name.trim(),
          institution.trim() || 'Institución Educativa'
        );
        showToast('✓ Cuenta de docente creada exitosamente', 'success');
      }
    } catch (err: any) {
      console.error(err);
      let msg = err.message || 'Error de autenticación';
      if (
        err.code === 'auth/invalid-credential' ||
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/user-not-found'
      ) {
        msg = 'Correo electrónico o contraseña incorrectos.';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'Este correo electrónico ya está registrado. Por favor inicia sesión.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'La contraseña debe tener mínimo 6 caracteres.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'El formato del correo electrónico no es válido.';
      }
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-y-auto bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-950 text-slate-900 flex items-center justify-center p-4 font-sans">
      {/* FONDO DECORATIVO: resplandores, trama de puntos e íconos del aula */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-32 -right-24 w-96 h-96 rounded-full bg-sky-400/25 blur-3xl" />
        <div className="absolute top-1/3 -left-32 w-80 h-80 rounded-full bg-indigo-400/25 blur-3xl" />
        <div className="absolute -bottom-32 right-1/4 w-96 h-96 rounded-full bg-emerald-400/15 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px)',
            backgroundSize: '26px 26px',
            maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
            WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)'
          }}
        />
        <QrCode className="absolute top-[8%] left-[8%] w-16 h-16 text-white/10 -rotate-12" />
        <GraduationCap className="absolute top-[14%] right-[10%] w-20 h-20 text-white/10 rotate-12" />
        <ShieldCheck className="absolute bottom-[12%] left-[12%] w-16 h-16 text-white/10 rotate-6" />
        <Zap className="absolute bottom-[18%] right-[8%] w-14 h-14 text-white/10 -rotate-6" />
      </div>

      <div className="relative w-full max-w-md space-y-6 py-4">
        {/* LOGO Y ENCABEZADO */}
        <div className="text-center space-y-3">
          <AppLogo className="w-24 h-24 mx-auto drop-shadow-[0_12px_28px_rgba(15,23,42,0.45)]" />

          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">
              AulaControl
            </h1>
            <p className="text-xs text-sky-200 font-bold uppercase tracking-widest mt-1">
              Control & Asistencia Docente
            </p>
          </div>

          <p className="text-xs text-blue-100/90 max-w-xs mx-auto leading-relaxed">
            Plataforma moderna para la toma de asistencia QR, control de calificaciones y seguimiento académico.
          </p>
        </div>

        {/* TARJETA BLANCA PULCRA CON BORDES REDONDEADOS */}
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-2xl shadow-blue-950/40 border border-white/60 space-y-5">
          {/* TABS DE SELECCIÓN */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMsg(null);
              }}
              className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 touch-manipulation ${
                mode === 'login'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Iniciar Sesión</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMsg(null);
              }}
              className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 touch-manipulation ${
                mode === 'register'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Crear Cuenta</span>
            </button>
          </div>

          {/* MENSAJE DE ERROR */}
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2.5 text-xs text-rose-700 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span className="font-semibold">{errorMsg}</span>
            </div>
          )}

          {/* FORMULARIO */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5 px-1">
                    Nombre Completo *
                  </label>
                  <div className="relative flex items-center">
                    <User className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none" />
                    <input
                      type="text"
                      required
                      placeholder="Ej: Prof. Carlos Restrepo"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full bg-slate-50/70 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 rounded-2xl pl-11 pr-4 py-3 text-sm outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5 px-1">
                    Institución Educativa
                  </label>
                  <div className="relative flex items-center">
                    <School className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Ej: I.E. San Juan Bautista"
                      value={institution}
                      onChange={e => setInstitution(e.target.value)}
                      className="w-full bg-slate-50/70 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 rounded-2xl pl-11 pr-4 py-3 text-sm outline-none transition-all"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5 px-1">
                Correo Electrónico *
              </label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none" />
                <input
                  type="email"
                  required
                  placeholder="docente@colegio.edu.co"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-slate-50/70 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 rounded-2xl pl-11 pr-4 py-3 text-sm outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5 px-1">
                Contraseña *
              </label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-slate-50/70 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 rounded-2xl pl-11 pr-11 py-3 text-sm outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* BOTÓN PRINCIPAL AZUL ELEVADO */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-2xl text-sm font-bold shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2 touch-manipulation cursor-pointer"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
              ) : mode === 'login' ? (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Ingresar al Sistema</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Crear Mi Cuenta Docente</span>
                </>
              )}
            </button>
          </form>

          {/* ACCESO ESTUDIANTE / ACUDIENTE */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => navigate('/estudiante')}
              className="w-full py-3 px-3.5 bg-blue-50/70 hover:bg-blue-100/70 text-blue-700 rounded-2xl text-xs font-bold border border-blue-200/80 flex items-center justify-between transition-all group active:scale-[0.98]"
            >
              <div className="flex items-center gap-2 text-left">
                <div className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                  <QrCode className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="block font-bold text-slate-900 leading-tight">¿Eres estudiante o acudiente?</span>
                  <span className="text-[10px] text-blue-600 font-medium">Consulta tus notas y carné digital</span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-blue-600 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* CARACTERÍSTICAS DESTACADAS CON SQUIRCLES */}
          <div className="pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-[10px] text-slate-600 font-semibold">
            <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
              <QrCode className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
              <span>Asistencia QR</span>
            </div>
            <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
              <Zap className="w-4 h-4 text-amber-500 mx-auto mb-1" />
              <span>Notas Rápidas</span>
            </div>
            <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
              <ShieldCheck className="w-4 h-4 text-blue-600 mx-auto mb-1" />
              <span>Datos Seguros</span>
            </div>
          </div>
        </div>

        {/* PIE DE PÁGINA */}
        <p className="text-[11px] text-blue-200/80 text-center font-medium">
          AulaControl v2.0 • Diseñado para Alta Velocidad en Móviles y PC
        </p>
      </div>
    </div>
  );
};
