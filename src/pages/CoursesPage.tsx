import React, { useState, useEffect } from 'react';
import { Layers, Plus, Check, Trash2, Edit2, Users, BookOpen, ChevronRight, X, School } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCourse } from '../context/CourseContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Course } from '../types';

export const CoursesPage: React.FC = () => {
  const { courses, activeCourse, selectCourse, addCourse, updateCourse, deleteCourse } = useCourse();
  const { teacherProfile } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Modal de Crear Curso
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [gradeLevel, setGradeLevel] = useState('7°');
  const [group, setGroup] = useState('1');
  const [subject, setSubject] = useState(teacherProfile?.subject || 'Tecnología e Informática');
  const [institution, setInstitution] = useState(teacherProfile?.institution || '');
  const [shift, setShift] = useState('Mañana');
  const [currentPeriod, setCurrentPeriod] = useState('Periodo 1');

  // Modal de Editar Curso
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editName, setEditName] = useState('');
  const [editGradeLevel, setEditGradeLevel] = useState('');
  const [editGroup, setEditGroup] = useState('');
  const [editSubject, setEditSubject] = useState('');
  const [editInstitution, setEditInstitution] = useState('');
  const [editShift, setEditShift] = useState('Mañana');
  const [editCurrentPeriod, setEditCurrentPeriod] = useState('Periodo 1');

  // Actualizar institución por defecto al abrir modal si cambió en el perfil
  useEffect(() => {
    if (teacherProfile?.institution && !institution) {
      setInstitution(teacherProfile.institution);
    }
    if (teacherProfile?.subject && !subject) {
      setSubject(teacherProfile.subject);
    }
  }, [teacherProfile]);

  const handleCreateCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newCourse = addCourse({
      name: name.trim(),
      gradeLevel,
      group,
      subject: subject.trim(),
      institution: institution.trim() || teacherProfile?.institution || 'Institución Educativa',
      shift,
      currentPeriod,
      academicYear: 2026
    });

    showToast(`✓ Curso ${newCourse.name} creado exitosamente`, 'success');
    setName('');
    setIsModalOpen(false);
  };

  const handleOpenEdit = (course: Course) => {
    setEditingCourse(course);
    setEditName(course.name);
    setEditGradeLevel(course.gradeLevel || '');
    setEditGroup(course.group || '');
    setEditSubject(course.subject || '');
    setEditInstitution(course.institution || teacherProfile?.institution || '');
    setEditShift(course.shift || 'Mañana');
    setEditCurrentPeriod(course.currentPeriod || 'Periodo 1');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourse || !editName.trim()) return;

    updateCourse(editingCourse.id, {
      name: editName.trim(),
      gradeLevel: editGradeLevel.trim(),
      group: editGroup.trim(),
      subject: editSubject.trim(),
      institution: editInstitution.trim() || teacherProfile?.institution || 'Institución Educativa',
      shift: editShift,
      currentPeriod: editCurrentPeriod
    });

    showToast(`✓ Curso "${editName}" actualizado correctamente`, 'success');
    setEditingCourse(null);
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* CABECERA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-brand-400" />
            <span>Gestión de Cursos Asignados</span>
          </h1>
          <p className="text-xs text-slate-400">
            Administra tus grados, grupos y asignaturas. Selecciona para cambiar de aula activa.
          </p>
        </div>

        <button
          onClick={() => {
            setInstitution(teacherProfile?.institution || '');
            setSubject(teacherProfile?.subject || 'Tecnología e Informática');
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold shadow-touch active:scale-95 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Crear Nuevo Curso</span>
        </button>
      </div>

      {/* LISTADO DE CURSOS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {courses.map(course => {
          const isActive = course.id === activeCourse?.id;

          return (
            <div
              key={course.id}
              className={`p-4 rounded-3xl border transition-all ${
                isActive
                  ? 'bg-slate-900 border-brand-500/80 shadow-lg ring-1 ring-brand-500/40'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-slate-600'}`}></span>
                  <h3 className="font-bold text-base text-white">{course.name}</h3>
                </div>

                <div className="flex items-center gap-1">
                  {isActive && (
                    <span className="text-[10px] bg-brand-500/20 text-brand-300 font-bold px-2 py-0.5 rounded-full border border-brand-500/40">
                      Activo
                    </span>
                  )}
                  <button
                    onClick={() => handleOpenEdit(course)}
                    className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-colors"
                    title="Editar datos del curso"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-1 text-xs text-slate-400 mb-4">
                <p className="font-medium text-slate-300">{course.subject}</p>
                <p className="truncate text-slate-400">
                  {course.institution} • Jornada {course.shift}
                </p>
                <div className="flex items-center gap-3 pt-1 text-[11px]">
                  <span className="bg-slate-800 px-2 py-0.5 rounded-md text-slate-300 font-semibold">
                    {course.studentCount || 0} estudiantes
                  </span>
                  <span className="bg-slate-800 px-2 py-0.5 rounded-md text-brand-300 font-semibold">
                    {course.currentPeriod}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                {!isActive ? (
                  <button
                    onClick={() => {
                      selectCourse(course.id);
                      showToast(`✓ Curso ${course.name} seleccionado como activo`, 'info');
                    }}
                    className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all text-center"
                  >
                    Activar este Curso
                  </button>
                ) : (
                  <button
                    onClick={() => navigate('/students')}
                    className="flex-1 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold shadow-touch transition-all text-center"
                  >
                    Abrir Aula
                  </button>
                )}

                {courses.length > 1 && (
                  <button
                    onClick={() => {
                      if (window.confirm(`¿Seguro que deseas eliminar el curso ${course.name}?`)) {
                        deleteCourse(course.id);
                      }
                    }}
                    className="p-2 hover:bg-rose-950/40 text-slate-500 hover:text-rose-400 rounded-xl transition-colors"
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

      {/* ESTADO VACÍO SI NO HAY CURSOS */}
      {courses.length === 0 && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 text-center space-y-3">
          <Layers className="w-12 h-12 text-brand-400/60 mx-auto" />
          <h3 className="font-bold text-white text-base">Aún no tienes cursos creados en tu cuenta</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Comienza creando tu primera materia o grado para registrar a tus estudiantes, pasar asistencia y calificar.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold shadow-touch inline-flex items-center gap-2 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Crear mi Primer Curso</span>
          </button>
        </div>
      )}

      {/* MODAL CREAR CURSO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h2 className="text-base font-bold text-white">Crear Nuevo Curso</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 text-slate-400 hover:text-white rounded-full bg-slate-800">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCourse} className="space-y-3">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">Nombre del Curso (ej: 8°-2) *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ej: 8°-2 o Grado Décimo"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">Grado</label>
                  <input
                    type="text"
                    value={gradeLevel}
                    onChange={e => setGradeLevel(e.target.value)}
                    placeholder="8°"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">Grupo</label>
                  <input
                    type="text"
                    value={group}
                    onChange={e => setGroup(e.target.value)}
                    placeholder="2"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">Asignatura / Área</label>
                <input
                  type="text"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="Ej: Tecnología e Informática"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">Institución Educativa</label>
                <input
                  type="text"
                  value={institution}
                  onChange={e => setInstitution(e.target.value)}
                  placeholder="Ej: I.E. San José"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">Jornada</label>
                  <select
                    value={shift}
                    onChange={e => setShift(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                  >
                    <option value="Mañana">Mañana</option>
                    <option value="Tarde">Tarde</option>
                    <option value="Única">Única</option>
                    <option value="Nocturna">Nocturna</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">Periodo Actual</label>
                  <select
                    value={currentPeriod}
                    onChange={e => setCurrentPeriod(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                  >
                    <option value="Periodo 1">Periodo 1</option>
                    <option value="Periodo 2">Periodo 2</option>
                    <option value="Periodo 3">Periodo 3</option>
                    <option value="Periodo 4">Periodo 4</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold text-sm shadow-touch transition-all active:scale-95"
                >
                  Crear Curso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR CURSO */}
      {editingCourse && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-brand-400" />
                <span>Editar Curso: {editingCourse.name}</span>
              </h2>
              <button onClick={() => setEditingCourse(null)} className="p-1.5 text-slate-400 hover:text-white rounded-full bg-slate-800">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">Nombre del Curso *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="Ej: 8°-2 o Grado Décimo"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">Grado</label>
                  <input
                    type="text"
                    value={editGradeLevel}
                    onChange={e => setEditGradeLevel(e.target.value)}
                    placeholder="8°"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">Grupo</label>
                  <input
                    type="text"
                    value={editGroup}
                    onChange={e => setEditGroup(e.target.value)}
                    placeholder="2"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">Asignatura / Área</label>
                <input
                  type="text"
                  value={editSubject}
                  onChange={e => setEditSubject(e.target.value)}
                  placeholder="Ej: Tecnología e Informática"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">Institución Educativa</label>
                <input
                  type="text"
                  value={editInstitution}
                  onChange={e => setEditInstitution(e.target.value)}
                  placeholder="Ej: I.E. San José"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">Jornada</label>
                  <select
                    value={editShift}
                    onChange={e => setEditShift(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                  >
                    <option value="Mañana">Mañana</option>
                    <option value="Tarde">Tarde</option>
                    <option value="Única">Única</option>
                    <option value="Nocturna">Nocturna</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">Periodo Actual</label>
                  <select
                    value={editCurrentPeriod}
                    onChange={e => setEditCurrentPeriod(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                  >
                    <option value="Periodo 1">Periodo 1</option>
                    <option value="Periodo 2">Periodo 2</option>
                    <option value="Periodo 3">Periodo 3</option>
                    <option value="Periodo 4">Periodo 4</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingCourse(null)}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-sm transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold text-sm shadow-touch transition-all active:scale-95"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoursesPage;
