import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Home,
  QrCode,
  Users,
  BookOpen,
  BarChart3,
  CalendarCheck2,
  Award,
  Sparkles,
  Settings,
  Printer,
  ChevronDown,
  Wifi,
  WifiOff,
  RefreshCw,
  LogOut,
  Layers,
  GraduationCap
} from 'lucide-react';
import { useCourse } from '../../context/CourseContext';
import { useAuth } from '../../context/AuthContext';
import { useOffline } from '../../context/OfflineContext';
import { AuthModal } from '../auth/AuthModal';
import { AuthPage } from '../../pages/AuthPage';

export const AppLayout: React.FC = () => {
  const { courses, activeCourse, selectCourse } = useCourse();
  const { teacherProfile, logout, currentUser, loading } = useAuth();
  const { isOnline, pendingCount, syncNow, isSyncing } = useOffline();
  const [courseDropdownOpen, setCourseDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Solo mostrar pantalla de carga si no tenemos una sesión previa en caché y aún está verificando
  if (loading && !currentUser) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950 text-white font-sans">
        <div className="flex flex-col items-center gap-4 text-center px-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-xl shadow-brand-500/30 animate-pulse">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <div className="absolute -inset-1 rounded-2xl bg-brand-500/20 blur-sm -z-10 animate-ping" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">AulaControl</h2>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-2 justify-center">
              <span className="w-3 h-3 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
              <span>Iniciando AulaControl...</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Si no hay usuario autenticado -> Mostrar pantalla de Registro / Login de docentes
  if (!currentUser) {
    return <AuthPage />;
  }

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* SIDEBAR DESKTOP / TABLET (visible on md+) */}
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-800 bg-slate-900/90 backdrop-blur-md shrink-0">
        {/* Brand */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-brand-400 flex items-center justify-center shadow-touch">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-base tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                AulaControl
              </span>
              <span className="block text-[10px] text-brand-400 font-semibold tracking-wider uppercase">
                Docente Pro
              </span>
            </div>
          </div>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>FIRESTORE</span>
          </span>
        </div>

        {/* Selector de Curso Desktop */}
        <div className="p-3 border-b border-slate-800/60">
          <label className="text-[11px] text-slate-400 font-medium px-2 block mb-1">Curso Activo</label>
          <div className="relative">
            <button
              onClick={() => setCourseDropdownOpen(!courseDropdownOpen)}
              className="w-full flex items-center justify-between px-3 py-2 bg-slate-800/80 hover:bg-slate-800 rounded-xl border border-slate-700/70 text-left transition-colors text-sm font-semibold text-white"
            >
              <div className="flex items-center gap-2 truncate">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0"></span>
                <span className="truncate">{activeCourse ? `${activeCourse.name} — ${activeCourse.subject}` : 'Seleccionar curso'}</span>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
            </button>

            {courseDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95 duration-150">
                {courses.map(course => (
                  <button
                    key={course.id}
                    onClick={() => {
                      selectCourse(course.id);
                      setCourseDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-700/70 transition-colors ${
                      course.id === activeCourse?.id ? 'text-brand-400 font-bold bg-slate-700/40' : 'text-slate-300'
                    }`}
                  >
                    <span>{course.name} ({course.subject})</span>
                    <span className="text-[10px] text-slate-400">{course.shift}</span>
                  </button>
                ))}
                <div className="border-t border-slate-700/80 mt-1 pt-1">
                  <button
                    onClick={() => {
                      setCourseDropdownOpen(false);
                      navigate('/courses');
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-brand-300 hover:bg-brand-500/10 font-medium flex items-center gap-1.5"
                  >
                    <Layers className="w-3.5 h-3.5" /> Administrar Cursos
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Desktop */}
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive ? 'bg-indigo-600 text-white shadow-touch' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`
            }
          >
            <Home className="w-4 h-4" /> Inicio
          </NavLink>

          <NavLink
            to="/scanner"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                isActive ? 'bg-indigo-600 text-white shadow-touch' : 'text-brand-300 bg-brand-500/10 hover:bg-brand-500/20'
              }`
            }
          >
            <QrCode className="w-4 h-4 text-brand-400" /> Escanear Estudiante
          </NavLink>

          <NavLink
            to="/students"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive ? 'bg-indigo-600 text-white shadow-touch' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`
            }
          >
            <Users className="w-4 h-4" /> Estudiantes
          </NavLink>

          <NavLink
            to="/attendance"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive ? 'bg-indigo-600 text-white shadow-touch' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`
            }
          >
            <CalendarCheck2 className="w-4 h-4" /> Asistencia
          </NavLink>

          <NavLink
            to="/activities"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive ? 'bg-indigo-600 text-white shadow-touch' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`
            }
          >
            <BookOpen className="w-4 h-4" /> Actividades
          </NavLink>

          <NavLink
            to="/grades"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive ? 'bg-indigo-600 text-white shadow-touch' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`
            }
          >
            <Award className="w-4 h-4" /> Calificaciones
          </NavLink>

          <NavLink
            to="/behavior"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive ? 'bg-indigo-600 text-white shadow-touch' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`
            }
          >
            <Sparkles className="w-4 h-4" /> Comportamiento
          </NavLink>

          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive ? 'bg-indigo-600 text-white shadow-touch' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`
            }
          >
            <BarChart3 className="w-4 h-4" /> Dashboard
          </NavLink>

          <NavLink
            to="/qr-cards"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive ? 'bg-indigo-600 text-white shadow-touch' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`
            }
          >
            <Printer className="w-4 h-4" /> Imprimir Carnés QR
          </NavLink>

          <div className="pt-2 border-t border-slate-800/80">
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive ? 'bg-indigo-600 text-white shadow-touch' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`
              }
            >
              <Settings className="w-4 h-4" /> Configuración
            </NavLink>
          </div>
        </nav>

        {/* Footer Sidebar */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-900/50">
          <div className="flex items-center justify-between">
            <div className="truncate pr-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
                <p className="text-xs font-semibold text-white truncate">{teacherProfile?.displayName || 'Docente'}</p>
              </div>
              <p className="text-[10px] text-slate-400 truncate">{currentUser?.email || teacherProfile?.institution}</p>
            </div>
            <button
              onClick={() => logout()}
              title="Cerrar sesión"
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-rose-400 transition-colors shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* TOP HEADER (Mobile & Desktop) */}
        <header className="h-14 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md flex items-center justify-between px-3 md:px-6 shrink-0 z-30">
          {/* Logo / Selector móvil */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCourseDropdownOpen(!courseDropdownOpen)}
              className="md:hidden flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 rounded-xl border border-slate-700/80 text-xs font-bold text-white active:scale-95 transition-all"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="truncate max-w-[130px]">{activeCourse?.name || 'Cursos'}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            <span className="hidden md:inline-block text-xs text-slate-400 font-medium">
              {activeCourse ? `${activeCourse.name} • ${activeCourse.subject} • ${activeCourse.currentPeriod}` : ''}
            </span>
          </div>

          {/* Estado de Red & Sincronización */}
          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <button
                onClick={syncNow}
                disabled={isSyncing || !isOnline}
                className="flex items-center gap-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-full text-xs font-semibold hover:bg-amber-500/30 transition-all active:scale-95"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{pendingCount} pendientes</span>
              </button>
            )}

            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs">
              {isOnline ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[11px] text-slate-300 hidden sm:inline">Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[11px] text-amber-300">Offline</span>
                </>
              )}
            </div>

            {/* Mobile Scanner Shortcut in Header */}
            <button
              onClick={() => navigate('/scanner')}
              className="md:hidden p-2 rounded-xl bg-brand-600 text-white shadow-touch active:scale-95 transition-all"
              title="Escanear QR"
            >
              <QrCode className="w-4 h-4" />
            </button>

            {/* Direct Settings Shortcut in Header */}
            <button
              onClick={() => navigate('/settings')}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 active:scale-95 transition-all flex items-center gap-1.5"
              title="Configuración del Docente y Colegio"
            >
              <Settings className="w-4 h-4 text-brand-400" />
              <span className="hidden lg:inline text-xs font-semibold">Configuración</span>
            </button>
          </div>
        </header>

        {/* Dropdown Móvil de Selección de Curso */}
        {courseDropdownOpen && (
          <div className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col justify-end p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="font-bold text-sm text-white">Seleccionar Curso</h3>
                <button
                  onClick={() => setCourseDropdownOpen(false)}
                  className="text-xs text-slate-400 hover:text-white px-2 py-1"
                >
                  Cerrar
                </button>
              </div>
              <div className="py-2 overflow-y-auto space-y-1.5 flex-1">
                {courses.map(course => (
                  <button
                    key={course.id}
                    onClick={() => {
                      selectCourse(course.id);
                      setCourseDropdownOpen(false);
                    }}
                    className={`w-full text-left p-3 rounded-xl border text-sm flex items-center justify-between transition-colors ${
                      course.id === activeCourse?.id
                        ? 'bg-brand-600/20 border-brand-500/50 text-brand-300 font-bold'
                        : 'bg-slate-800/60 border-slate-700/60 text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-white">{course.name}</div>
                      <div className="text-xs text-slate-400">{course.subject} • Jornada {course.shift}</div>
                    </div>
                    <span className="text-xs bg-slate-700/50 px-2 py-1 rounded-lg text-slate-300">
                      {course.studentCount || 0} est.
                    </span>
                  </button>
                ))}
              </div>
              <div className="pt-2 border-t border-slate-800">
                <button
                  onClick={() => {
                    setCourseDropdownOpen(false);
                    navigate('/courses');
                  }}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-brand-300 rounded-xl text-xs font-bold text-center"
                >
                  + Administrar / Crear Nuevos Cursos
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Offline notification banner if truly offline */}
        {!isOnline && (
          <div className="bg-amber-500/15 border-b border-amber-500/30 text-amber-200 px-4 py-2 text-xs flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Modo Sin Conexión activo. Tus registros se guardan localmente de forma segura.</span>
            </div>
            {pendingCount > 0 && <span className="font-bold">{pendingCount} en cola</span>}
          </div>
        )}

        {/* CONTENT SCROLLABLE AREA */}
        <main className="flex-1 overflow-y-auto pb-24 md:pb-6 p-3 md:p-6 overscroll-contain">
          <Outlet />
        </main>

        {/* MOBILE BOTTOM NAVIGATION BAR (Visible on mobile only, <md) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 flex items-center justify-around px-2 z-40">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 py-1 transition-all ${
                isActive ? 'text-brand-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`
            }
          >
            <Home className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Inicio</span>
          </NavLink>

          <NavLink
            to="/students"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 py-1 transition-all ${
                isActive ? 'text-brand-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`
            }
          >
            <Users className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Estudiantes</span>
          </NavLink>

          {/* Elevated High-Priority Scan Button */}
          <div className="flex-1 flex justify-center -mt-6">
            <button
              onClick={() => navigate('/scanner')}
              className={`w-14 h-14 rounded-full bg-gradient-to-tr from-brand-600 via-indigo-500 to-indigo-400 text-white flex flex-col items-center justify-center shadow-lg border-4 border-slate-950 active:scale-90 transition-transform ${
                location.pathname === '/scanner' ? 'ring-2 ring-brand-400' : ''
              }`}
              title="Escanear Estudiante"
            >
              <QrCode className="w-6 h-6" />
              <span className="text-[9px] font-black uppercase tracking-wider">Escanear</span>
            </button>
          </div>

          <NavLink
            to="/activities"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 py-1 transition-all ${
                isActive ? 'text-brand-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`
            }
          >
            <BookOpen className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Actividades</span>
          </NavLink>

          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 py-1 transition-all ${
                isActive ? 'text-brand-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`
            }
          >
            <BarChart3 className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Dashboard</span>
          </NavLink>
        </nav>
      </div>

      {/* MODAL DE AUTENTICACIÓN / REGISTRO FIREBASE */}
      <AuthModal />
    </div>
  );
};
