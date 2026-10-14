import React, { useState, useEffect } from 'react';
import { Layers, Plus, Check, Trash2, Edit2, Users, BookOpen, ChevronRight, X, Clock, Calendar, School } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCourse } from '../context/CourseContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatTime12h } from '../utils/dateUtils';

export const CoursesPage: React.FC = () => {
  const { courses, activeCourse, selectCourse, addCourse, updateCourse, deleteCourse } = useCourse();
  const { teacherProfile } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [gradeLevel, setGradeLevel] = useState('7°');
  const [group, setGroup] = useState('1');
  const [subject, setSubject] = useState('Tecnología e Informática');
  const [institution, setInstitution] = useState(teacherProfile?.institution || 'Institución Educativa');
  const [shift, setShift] = useState('Mañana');
  const [currentPeriod, setCurrentPeriod] = useState('Periodo 1');
  const [scheduleTime, setScheduleTime] = useState('07:00');
  const [scheduleEndTime, setScheduleEndTime] = useState('08:30');
  const [selectedDays, setSelectedDays] = useState<string[]>(['Lunes', 'Miércoles', 'Viernes']);

  const allDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  // Sincronizar automáticamente con el colegio en el que el docente está registrado en modo creación
  useEffect(() => {
    if (modalMode === 'create' && teacherProfile?.institution) {
      setInstitution(teacherProfile.institution);
    }
  }, [teacherProfile?.institution, modalMode]);

  const toggleDay = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleOpenCreateModal = () => {
    setModalMode('create');
    setEditingCourseId(null);
    setName('');
    setGradeLevel('7°');
    setGroup('1');
    setSubject('Tecnología e Informática');
    setInstitution(teacherProfile?.institution || 'Institución Educativa');
    setShift('Mañana');
    setCurrentPeriod('Periodo 1');
    setScheduleTime('07:00');
    setScheduleEndTime('08:30');
    setSelectedDays(['Lunes', 'Miércoles', 'Viernes']);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (course: (typeof courses)[0]) => {
    setModalMode('edit');
    setEditingCourseId(course.id);
    setName(course.name);
    setGradeLevel(course.gradeLevel || '7°');
    setGroup(course.group || '1');
    setSubject(course.subject || 'Tecnología e Informática');
    setInstitution(course.institution || teacherProfile?.institution || 'Institución Educativa');
    setShift(course.shift || 'Mañana');
    setCurrentPeriod(course.currentPeriod || 'Periodo 1');
    setScheduleTime(course.scheduleTime || '07:00');
    setScheduleEndTime(course.scheduleEndTime || '08:30');
    setSelectedDays(
      course.scheduleDays && course.scheduleDays.length > 0
        ? course.scheduleDays
        : ['Lunes', 'Miércoles', 'Viernes']
    );
    setIsModalOpen(true);
  };

  const handleSubmitCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Por favor ingresa el nombre del curso', 'warning');
      return;
    }

    if (!scheduleTime) {
      showToast('Por favor selecciona la hora de inicio de la clase', 'warning');
      return;
    }

    if (!scheduleEndTime) {
      showToast('Por favor selecciona la hora de finalización de la clase', 'warning');
      return;
    }

    if (scheduleTime >= scheduleEndTime) {
      showToast('La hora de inicio debe ser anterior a la hora de fin de la clase', 'warning');
      return;
    }

    const finalInstitution = (institution.trim() || teacherProfile?.institution || 'Institución Educativa').trim();

    if (modalMode === 'create') {
      const newCourse = addCourse({
        name: name.trim(),
        gradeLevel,
        group,
        subject: subject.trim(),
        institution: finalInstitution,
        shift,
        currentPeriod,
        academicYear: new Date().getFullYear(),
        scheduleTime,
        scheduleEndTime,
        scheduleDays: selectedDays
      });
      showToast(`✓ Curso ${newCourse.name} creado exitosamente`, 'success');
    } else if (editingCourseId) {
      updateCourse(editingCourseId, {
        name: name.trim(),
        gradeLevel,
        group,
        subject: subject.trim(),
        institution: finalInstitution,
        shift,
        currentPeriod,
        scheduleTime,
        scheduleEndTime,
        scheduleDays: selectedDays
      });
      showToast(`✓ Curso ${name.trim()} actualizado correctamente`, 'success');
    }

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-12">
      {/* CABECERA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" />
            <span>Gestión de Cursos Asignados</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Administra tus grados, grupos y asignaturas. Selecciona para cambiar de aula activa.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Crear Nuevo Curso</span>
        </button>
      </div>

      {/* LISTADO DE CURSOS */}
      {courses.length === 0 ? (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-8 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-200">
            <Layers className="w-6 h-6" />
          </div>
          <h2 className="text-base font-extrabold text-slate-900">No tienes cursos registrados</h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
            Tu aplicación está vacía y lista. Crea tu primer curso para comenzar a agregar estudiantes y llevar el control del aula.
          </p>
          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Crear mi Primer Curso</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {courses.map(course => {
            const isActive = course.id === activeCourse?.id;

            return (
              <div
                key={course.id}
                className={`p-5 rounded-3xl border transition-all ${
                  isActive
                    ? 'bg-blue-50/50 border-blue-500 shadow-xs ring-2 ring-blue-500/20'
                    : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-xs'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${isActive ? 'bg-blue-600' : 'bg-slate-300'}`}></span>
                    <h3 className="font-extrabold text-base text-slate-900">{course.name}</h3>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isActive && (
                      <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full border border-blue-200">
                        Activo
                      </span>
                    )}
                    <button
                      onClick={() => handleOpenEditModal(course)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Editar información del curso"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1 text-xs text-slate-500 mb-4">
                  <p className="font-bold text-slate-800">{course.subject}</p>
                  <p>{course.institution} • Jornada {course.shift}</p>

                  {(course.scheduleTime || course.scheduleEndTime) && (
                    <div className="flex items-center gap-1.5 text-[11px] text-amber-700 font-semibold pt-1 bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-xl w-fit">
                      <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>
                        {course.scheduleTime ? formatTime12h(course.scheduleTime) : '--:--'}
                        {course.scheduleEndTime ? ` - ${formatTime12h(course.scheduleEndTime)}` : ''}
                      </span>
                      {course.scheduleDays && course.scheduleDays.length > 0 && (
                        <span className="text-slate-500 font-normal">({course.scheduleDays.join(', ')})</span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1 text-[11px]">
                    <span className="bg-slate-100 px-2.5 py-0.5 rounded-md text-slate-700 font-semibold border border-slate-200/80">
                      {course.studentCount || 0} estudiantes
                    </span>
                    <span className="bg-blue-50 px-2.5 py-0.5 rounded-md text-blue-700 font-semibold border border-blue-200/80">
                      {course.currentPeriod}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                  {!isActive ? (
                    <button
                      onClick={() => {
                        selectCourse(course.id);
                        showToast(`✓ Curso ${course.name} seleccionado como activo`, 'info');
                      }}
                      className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80 rounded-xl text-xs font-bold transition-all text-center"
                    >
                      Activar este Curso
                    </button>
                  ) : (
                    <button
                      onClick={() => navigate('/students')}
                      className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all text-center"
                    >
                      Abrir Aula
                    </button>
                  )}

                  <button
                    onClick={() => handleOpenEditModal(course)}
                    className="p-2 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-xl transition-colors"
                    title="Editar información de este curso"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  {courses.length > 1 && (
                    <button
                      onClick={() => {
                        if (window.confirm(`¿Seguro que deseas eliminar el curso ${course.name}?`)) {
                          deleteCourse(course.id);
                        }
                      }}
                      className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-colors"
                      title="Eliminar curso"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL CREAR / EDITAR CURSO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 md:p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200/80 flex items-center justify-center">
                  {modalMode === 'create' ? <Plus className="w-5 h-5" /> : <Edit2 className="w-4 h-4" />}
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">
                    {modalMode === 'create' ? 'Crear Nuevo Curso' : 'Editar Información del Curso'}
                  </h2>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {modalMode === 'create'
                      ? 'Ingresa los datos para registrar un nuevo grado o grupo'
                      : `Modificando los datos de ${name || 'este curso'}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitCourse} className="space-y-3">
              <div>
                <label className="text-xs text-slate-700 font-semibold block mb-1">Nombre del Curso (ej: 8°-2) *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ej: 8°-2 o Grado Décimo"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-medium"
                />
              </div>

              <div>
                <label className="text-xs text-slate-700 font-semibold block mb-1">
                  Institución Educativa / Colegio *
                </label>
                <div className="relative">
                  <School className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={institution}
                    onChange={e => setInstitution(e.target.value)}
                    placeholder="Colegio o Institución donde dictas"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 font-semibold focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>
                {teacherProfile?.institution && (
                  <p className="text-[10px] text-slate-500 mt-1">
                    Colegio del docente: <strong className="text-slate-700 font-semibold">{teacherProfile.institution}</strong>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-700 font-semibold block mb-1">Grado</label>
                  <input
                    type="text"
                    value={gradeLevel}
                    onChange={e => setGradeLevel(e.target.value)}
                    placeholder="8°"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-700 font-semibold block mb-1">Grupo</label>
                  <input
                    type="text"
                    value={group}
                    onChange={e => setGroup(e.target.value)}
                    placeholder="2"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-700 font-semibold block mb-1">Asignatura / Área</label>
                <input
                  type="text"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="Ej: Matemáticas o Tecnología"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-700 font-semibold block mb-1">Jornada</label>
                  <select
                    value={shift}
                    onChange={e => setShift(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                  >
                    <option value="Mañana">Mañana</option>
                    <option value="Tarde">Tarde</option>
                    <option value="Única">Única</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-700 font-semibold block mb-1">Periodo Inicial / Activo</label>
                  <select
                    value={currentPeriod}
                    onChange={e => setCurrentPeriod(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                  >
                    <option value="Periodo 1">Periodo 1</option>
                    <option value="Periodo 2">Periodo 2</option>
                    <option value="Periodo 3">Periodo 3</option>
                    <option value="Periodo 4">Periodo 4</option>
                  </select>
                </div>
              </div>

              {/* SECCIÓN DE HORARIOS Y NOTIFICACIONES */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs text-amber-800 font-bold">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>Horario de la Clase (Inicio y Fin) *</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-700 font-semibold block mb-1">
                      Hora de Inicio *
                    </label>
                    <input
                      type="time"
                      required
                      value={scheduleTime}
                      onChange={e => setScheduleTime(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-blue-500 shadow-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-700 font-semibold block mb-1">
                      Hora de Fin *
                    </label>
                    <input
                      type="time"
                      required
                      value={scheduleEndTime}
                      onChange={e => setScheduleEndTime(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-blue-500 shadow-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-slate-500 font-semibold block mb-1">
                    Días en los que dictas este curso:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {allDays.map(day => {
                      const isSelected = selectedDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDay(day)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                            isSelected
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {day.substring(0, 3)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
                >
                  {modalMode === 'create' ? 'Guardar Curso' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
