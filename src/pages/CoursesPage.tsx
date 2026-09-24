import React, { useState } from 'react';
import { Layers, Plus, Check, Trash2, Edit2, Users, BookOpen, ChevronRight, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCourse } from '../context/CourseContext';
import { useToast } from '../context/ToastContext';

export const CoursesPage: React.FC = () => {
  const { courses, activeCourse, selectCourse, addCourse, deleteCourse } = useCourse();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [gradeLevel, setGradeLevel] = useState('7°');
  const [group, setGroup] = useState('1');
  const [subject, setSubject] = useState('Tecnología e Informática');
  const [institution, setInstitution] = useState('Colegio Integrado San Juan Bautista');
  const [shift, setShift] = useState('Mañana');
  const [currentPeriod, setCurrentPeriod] = useState('Periodo 1');

  const handleCreateCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newCourse = addCourse({
      name: name.trim(),
      gradeLevel,
      group,
      subject: subject.trim(),
      institution: institution.trim(),
      shift,
      currentPeriod,
      academicYear: 2026
    });

    showToast(`✓ Curso ${newCourse.name} creado exitosamente`, 'success');
    setName('');
    setIsModalOpen(false);
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
          onClick={() => setIsModalOpen(true)}
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

                {isActive && (
                  <span className="text-[10px] bg-brand-500/20 text-brand-300 font-bold px-2 py-0.5 rounded-full border border-brand-500/40">
                    Activo
                  </span>
                )}
              </div>

              <div className="space-y-1 text-xs text-slate-400 mb-4">
                <p className="font-medium text-slate-300">{course.subject}</p>
                <p>{course.institution} • Jornada {course.shift}</p>
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
                  placeholder="Ej: Matemáticas o Tecnología"
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
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">Periodo Inicial</label>
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

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold shadow-touch active:scale-95 transition-all"
                >
                  Guardar Curso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
