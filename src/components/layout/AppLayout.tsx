import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  GraduationCap,
  Home,
  QrCode,
  Users,
  CalendarCheck2,
  BookOpen,
  Award,
  Sparkles,
  BarChart3,
  Printer,
  FileSpreadsheet,
  Settings,
  Bell,
  Wifi,
  WifiOff,
  RefreshCw,
  LogOut,
  ChevronDown,
  Layers,
  X
} from 'lucide-react';
import { useCourse } from '../../context/CourseContext';
import { useAuth } from '../../context/AuthContext';
import { useOffline } from '../../context/OfflineContext';
import { useToast } from '../../context/ToastContext';
import { AuthModal } from '../auth/AuthModal';
import { LoginPage } from '../../pages/LoginPage';
import { notificationService } from '../../services/notificationService';
import { AppNotification } from '../../types';
import { TabBar, TabBarItem } from '../ui';

export const AppLayout: React.FC = () => {
  const { courses, activeCourse, selectCourse, activities, submissions } = useCourse();
  const { teacherProfile, isDemoMode, logout, openAuthModal, currentUser, loading } = useAuth();
  const { isOnline, pendingCount, syncNow, isSyncing } = useOffline();
  const { showToast } = useToast();
  const [courseDropdownOpen, setCourseDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showPermissionBanner, setShowPermissionBanner] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // Comprobar y pedir permisos de notificación
  React.useEffect(() => {
    notificationService.checkPermission().then(status => {
      const dismissed = localStorage.getItem('aulacontrol_notif_banner_dismissed');
      if ((status === 'prompt' || status === 'default') && !dismissed) {
        setShowPermissionBanner(true);
      }
    });
  }, []);

  const handleEnableNotifications = async () => {
    const granted = await notificationService.requestPermission();
    setShowPermissionBanner(false);
    localStorage.setItem('aulacontrol_notif_banner_dismissed', 'true');
    if (granted) {
      showToast('✓ Notificaciones activadas para recordatorios de clase y entregas', 'success');
      notificationService.sendNativeNotification(
        '🔔 Notificaciones AulaControl Activas',
        'Te avisaremos 24 horas antes de cada clase y al momento de iniciar.'
      );
    } else {
      showToast('Permiso de notificaciones no otorgado', 'warning');
    }
  };

  const handleDismissBanner = () => {
    setShowPermissionBanner(false);
    localStorage.setItem('aulacontrol_notif_banner_dismissed', 'true');
  };

  // Verificación periódica de clases y recordatorios 24h antes
  React.useEffect(() => {
    let isMounted = true;

    const runCheck = async () => {
      if (courses.length > 0) {
        const generated = await notificationService.checkAndGenerateNotifications(
          courses,
          activities,
          submissions
        );
        if (isMounted) {
          setNotifications(generated);
        }
      }
    };

    runCheck();
    const interval = setInterval(runCheck, 60000); // Re-evaluar cada 60 segundos
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [courses, activities, submissions]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAllRead = () => {
    const updated = notificationService.markAllAsRead();
    setNotifications(updated);
  };

  const handleDeleteNotif = (id: string) => {
    const updated = notificationService.deleteNotification(id);
    setNotifications(updated);
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-slate-50 flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-xs font-bold text-slate-500">Cargando AulaControl...</span>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPage />;
  }

  return (
    <div className="flex h-screen w-full bg-[#f5f7fb] text-slate-900 overflow-hidden font-sans relative">
      {/* Global Backdrop when notification drawer is open */}
      {notifDropdownOpen && (
        <div
          onClick={() => setNotifDropdownOpen(false)}
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-xs z-40 animate-in fade-in duration-150 cursor-pointer"
        />
      )}

      {/* ========================================================
          DESKTOP SIDEBAR (Visible on md+)
          Clean, modern AbsenSiswa white sidebar with blue active pills
         ======================================================== */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200/90 shrink-0 shadow-xs z-20">
        {/* Brand */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-500/25 shrink-0">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-black text-base tracking-tight text-slate-900 block leading-tight">
                AulaControl
              </span>
              <span className="block text-[10px] text-blue-600 font-bold tracking-wider uppercase">
                Docente Pro
              </span>
            </div>
          </div>

            <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-bold">
              PRO
            </span>
          </div>

        {/* Course Selector Desktop */}
        <div className="p-3 border-b border-slate-100">
          <label className="text-[11px] text-slate-500 font-bold px-2 block mb-1">
            Curso Activo
          </label>
          <div className="relative">
            <button
              onClick={() => setCourseDropdownOpen(!courseDropdownOpen)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200/80 text-left transition-colors text-xs font-bold text-slate-800"
            >
              <div className="flex items-center gap-2 truncate">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
                <span className="truncate">{activeCourse ? `${activeCourse.name} — ${activeCourse.subject}` : 'Seleccionar curso'}</span>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
            </button>

            {courseDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                {courses.map(course => (
                  <button
                    key={course.id}
                    onClick={() => {
                      selectCourse(course.id);
                      setCourseDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2.5 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${
                      course.id === activeCourse?.id ? 'text-blue-600 font-bold bg-blue-50/70' : 'text-slate-700'
                    }`}
                  >
                    <span>{course.name} ({course.subject})</span>
                    <span className="text-[10px] text-slate-400 font-medium">{course.shift}</span>
                  </button>
                ))}
                <div className="border-t border-slate-100 mt-1 pt-1">
                  <button
                    onClick={() => {
                      setCourseDropdownOpen(false);
                      navigate('/courses');
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs text-blue-600 hover:bg-blue-50 font-bold flex items-center gap-1.5"
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
              `flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`
            }
          >
            <Home className="w-4 h-4" /> Inicio
          </NavLink>

          <NavLink
            to="/scanner"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                  : 'text-blue-700 bg-blue-50/70 hover:bg-blue-100/70'
              }`
            }
          >
            <QrCode className="w-4 h-4 text-blue-600" /> Escanear Estudiante
          </NavLink>

          <NavLink
            to="/students"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`
            }
          >
            <Users className="w-4 h-4" /> Estudiantes
          </NavLink>

          <NavLink
            to="/attendance"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`
            }
          >
            <CalendarCheck2 className="w-4 h-4" /> Asistencia
          </NavLink>

          <NavLink
            to="/activities"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`
            }
          >
            <BookOpen className="w-4 h-4" /> Actividades
          </NavLink>

          <NavLink
            to="/grades"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`
            }
          >
            <Award className="w-4 h-4" /> Calificaciones
          </NavLink>

          <NavLink
            to="/definitivas"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`
            }
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Notas Definitivas
          </NavLink>

          <NavLink
            to="/behavior"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`
            }
          >
            <Sparkles className="w-4 h-4" /> Comportamiento
          </NavLink>

          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`
            }
          >
            <BarChart3 className="w-4 h-4" /> Métricas / Dashboard
          </NavLink>

          <NavLink
            to="/qr-cards"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`
            }
          >
            <QrCode className="w-4 h-4" /> Carnés QR Estudiantes
          </NavLink>

          <a
            href="/estudiante"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold text-blue-700 bg-blue-50/70 hover:bg-blue-100/70 transition-all border border-blue-200/80"
          >
            <span className="flex items-center gap-3">
              <GraduationCap className="w-4 h-4 text-blue-600" /> Portal Estudiante
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-200/80 text-blue-800 uppercase font-extrabold tracking-wider">
              /estudiante
            </span>
          </a>

          <div className="pt-2 border-t border-slate-100">
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`
              }
            >
              <Settings className="w-4 h-4" /> Configuración
            </NavLink>
          </div>
        </nav>

        {/* Footer Sidebar (Profile) */}
        <div className="p-3.5 border-t border-slate-100 bg-slate-50/70">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 truncate pr-2">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                {teacherProfile?.displayName?.[0] || 'D'}
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-slate-800 truncate">{teacherProfile?.displayName || 'Docente'}</p>
                <p className="text-[10px] text-slate-500 truncate">{currentUser?.email || teacherProfile?.institution || 'AulaControl'}</p>
              </div>
            </div>
            <button
              onClick={() => logout()}
              title="Cerrar sesión"
              className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-colors shrink-0 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ========================================================
          MAIN APP CONTAINER (Desktop & Mobile)
         ======================================================== */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* TOP HEADER */}
        <header className="h-16 bg-white border-b border-slate-200/80 flex items-center justify-between px-3 md:px-6 shrink-0 z-30 shadow-xs">
          {/* Left: Mobile Course Selector / Desktop Course Pill */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCourseDropdownOpen(!courseDropdownOpen)}
              className="md:hidden flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-200 text-xs font-bold text-slate-800 active:scale-95 transition-all"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="truncate max-w-[140px]">{activeCourse?.name || 'Cursos'}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            <span className="hidden md:inline-flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>{activeCourse ? `${activeCourse.name} • ${activeCourse.subject} (${activeCourse.currentPeriod})` : 'Sin curso activo'}</span>
            </span>
          </div>

          {/* Right: Actions, Online/Offline, Bell */}
          <div className="flex items-center gap-2">
            {/* Quick settings shortcut */}
            <button
              onClick={() => navigate('/settings')}
              className={`p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 transition-all ${
                location.pathname === '/settings' ? 'bg-blue-50 text-blue-600 border-blue-200' : ''
              }`}
              title="Configuración"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Botón de Cerrar Sesión (Visible en Android y Móvil) */}
            <button
              onClick={() => {
                if (window.confirm('¿Deseas cerrar tu sesión de docente?')) {
                  logout();
                  showToast('Sesión cerrada correctamente', 'info');
                }
              }}
              className="p-2.5 rounded-2xl bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 transition-all active:scale-95 cursor-pointer"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4 text-rose-500" />
            </button>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                className="p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 transition-all relative"
                title="Notificaciones"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] font-black flex items-center justify-center shadow-sm">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Drawer */}
              {notifDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 md:w-96 bg-white border border-slate-200 rounded-3xl p-4 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-blue-600" />
                      <h3 className="font-bold text-xs text-slate-900">Recordatorios y Notificaciones</h3>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-[10px] text-blue-600 hover:text-blue-800 font-bold hover:underline"
                      >
                        Marcar leídas
                      </button>
                    )}
                  </div>

                  <div className="py-2 max-h-80 overflow-y-auto space-y-2 pr-1">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-slate-500 font-medium text-center py-5">
                        No hay notificaciones pendientes.
                      </p>
                    ) : (
                      notifications.map(notif => (
                        <div
                          key={notif.id}
                          className={`p-3 rounded-2xl border transition-all text-xs relative ${
                            notif.type === 'class_reminder'
                              ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                              : 'bg-blue-50/80 border-blue-200 text-blue-900'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-bold text-xs">{notif.title}</h4>
                            <button
                              onClick={() => handleDeleteNotif(notif.id)}
                              className="text-slate-400 hover:text-rose-600 p-0.5"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <p className="text-[11px] mt-1 leading-snug opacity-90">{notif.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Offline Pending sync badge */}
            {pendingCount > 0 && (
              <button
                onClick={syncNow}
                disabled={isSyncing || !isOnline}
                className="flex items-center gap-1.5 bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1.5 rounded-full text-xs font-bold hover:bg-amber-100 transition-all active:scale-95"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{pendingCount}</span>
              </button>
            )}

            {/* Connectivity Pill */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-xs font-bold">
              {isOnline ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-[11px] text-slate-600 hidden sm:inline">Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-[11px] text-amber-700">Offline</span>
                </>
              )}
            </div>

            {/* Mobile Quick Scanner Shortcut Button */}
            <button
              onClick={() => navigate('/scanner')}
              className="md:hidden p-2.5 rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/25 active:scale-95 transition-all"
              title="Escanear QR"
            >
              <QrCode className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Mobile Course Selection Bottom Drawer */}
        {courseDropdownOpen && (
          <div className="md:hidden fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-150">
            <div className="bg-white rounded-t-3xl p-5 shadow-2xl max-h-[75vh] flex flex-col border-t border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-sm text-slate-900">Seleccionar Curso</h3>
                <button
                  onClick={() => setCourseDropdownOpen(false)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-900 px-2.5 py-1 rounded-lg bg-slate-100"
                >
                  Cerrar
                </button>
              </div>

              <div className="py-3 overflow-y-auto space-y-2 flex-1">
                {courses.map(course => (
                  <button
                    key={course.id}
                    onClick={() => {
                      selectCourse(course.id);
                      setCourseDropdownOpen(false);
                    }}
                    className={`w-full text-left p-3.5 rounded-2xl border text-xs flex items-center justify-between transition-colors ${
                      course.id === activeCourse?.id
                        ? 'bg-blue-50 border-blue-200 text-blue-900 font-bold'
                        : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-sm text-slate-900">{course.name}</div>
                      <div className="text-[11px] text-slate-500">{course.subject} • Jornada {course.shift}</div>
                    </div>
                    <span className="text-[11px] bg-slate-100 px-2.5 py-1 rounded-xl text-slate-600 font-bold border border-slate-200">
                      {course.studentCount || 0} est.
                    </span>
                  </button>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-100">
                <button
                  onClick={() => {
                    setCourseDropdownOpen(false);
                    navigate('/courses');
                  }}
                  className="w-full py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-2xl text-xs font-bold text-center border border-blue-200"
                >
                  + Administrar / Crear Nuevos Cursos
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Offline notification banner if offline */}
        {!isOnline && (
          <div className="bg-amber-50 border-b border-amber-200 text-amber-800 px-4 py-2 text-xs flex items-center justify-between shrink-0 font-medium">
            <div className="flex items-center gap-2">
              <WifiOff className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Modo Sin Conexión activo. Tus registros se guardan localmente de forma segura.</span>
            </div>
            {pendingCount > 0 && <span className="font-bold bg-amber-200/80 px-2 py-0.5 rounded-full text-[10px]">{pendingCount} pendientes</span>}
          </div>
        )}

        {/* Notification Permission Request Banner */}
        {showPermissionBanner && (
          <div className="bg-blue-600 text-white px-4 py-2.5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0 shadow-sm animate-in slide-in-from-top duration-200">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-blue-200 shrink-0" />
              <span className="font-medium">
                ¿Deseas recibir avisos de tus clases (24h antes y a la hora de inicio) en tu dispositivo?
              </span>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <button
                onClick={handleEnableNotifications}
                className="px-3 py-1 bg-white hover:bg-blue-50 text-blue-700 font-extrabold rounded-xl text-xs transition-colors shadow-xs"
              >
                Activar Notificaciones
              </button>
              <button
                onClick={handleDismissBanner}
                className="p-1 hover:bg-blue-700 rounded-lg text-blue-200 hover:text-white transition-colors"
                title="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* CONTENT SCROLLABLE AREA */}
        <main className="flex-1 overflow-y-auto pb-24 md:pb-6 p-4 md:p-6 overscroll-contain">
          <Outlet />
        </main>

        {/* ========================================================
            MOBILE BOTTOM TAB BAR (<md)
            Inspired directly by AbsenSiswa mobile reference design
           ======================================================== */}
        <div className="md:hidden fixed bottom-3 left-0 right-0 flex justify-center px-3 z-40 safe-bottom-padding pointer-events-none">
          <div className="pointer-events-auto">
            <TabBar
              value={location.pathname}
              onValueChange={path => navigate(path)}
            >
              <TabBarItem
                value="/"
                icon={<Home className="w-5 h-5" />}
              >
                Inicio
              </TabBarItem>

              <TabBarItem
                value="/students"
                icon={<Users className="w-5 h-5" />}
              >
                Alumnos
              </TabBarItem>

              {/* CENTER QR SCANNER (Primary Blue Elevated Button) */}
              <TabBarItem
                value="/scanner"
                isPrimary={true}
                icon={<QrCode className="w-5 h-5" />}
              >
                Escanear
              </TabBarItem>

              <TabBarItem
                value="/attendance"
                icon={<CalendarCheck2 className="w-5 h-5" />}
              >
                Asistencia
              </TabBarItem>

              <TabBarItem
                value="/activities"
                icon={<BookOpen className="w-5 h-5" />}
              >
                Tareas
              </TabBarItem>
            </TabBar>
          </div>
        </div>
      </div>

      {/* AUTH MODAL */}
      <AuthModal />
    </div>
  );
};
