import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import {
  Users,
  Search,
  UserPlus,
  FileSpreadsheet,
  Download,
  QrCode,
  ChevronRight,
  Printer,
  Sparkles,
  Award,
  CheckCircle,
  X,
  Phone,
  Edit2,
  Trash2,
  Share2
} from 'lucide-react';
import { useCourse } from '../context/CourseContext';
import { useToast } from '../context/ToastContext';
import { excelService } from '../services/excelService';
import { Student } from '../types';
import { StudentImportModal } from '../components/students/StudentImportModal';

export const StudentsPage: React.FC = () => {
  const { students, activeCourse, addStudent, updateStudent, deleteStudent, clearCourseStudents } = useCourse();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isNewStudentModalOpen, setIsNewStudentModalOpen] = useState(false);
  const [selectedQRStudent, setSelectedQRStudent] = useState<Student | null>(null);

  // Nuevo estudiante form state
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentDoc, setNewStudentDoc] = useState('');

  // Filtrado reactivo en tiempo real
  const filteredStudents = students.filter(s => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      s.fullName.toLowerCase().includes(term) ||
      s.uniqueCode.toLowerCase().includes(term) ||
      String(s.listNumber) === term ||
      (s.documentNumber && s.documentNumber.includes(term))
    );
  });

  const handleCreateStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim() || !activeCourse) return;
    const maxListNum = students.reduce((max, s) => Math.max(max, s.listNumber), 0);
    const created = addStudent({
      courseId: activeCourse.id,
      listNumber: maxListNum + 1,
      fullName: newStudentName.trim(),
      documentNumber: newStudentDoc.trim() || undefined
    });

    showToast(`✓ Estudiante #${created.listNumber} ${created.fullName} creado con código ${created.uniqueCode}`, 'success');
    setNewStudentName('');
    setNewStudentDoc('');
    setIsNewStudentModalOpen(false);
  };

  const handleExport = () => {
    if (!activeCourse) return;
    excelService.exportStudents(students, activeCourse.name);
    showToast(`✓ Archivo Excel generado para ${activeCourse.name}`, 'info');
  };

  const handleClearAllStudents = async () => {
    if (!activeCourse || students.length === 0) return;
    const confirmed = window.confirm(
      `¿Deseas eliminar definitivamente los ${students.length} estudiantes de ${activeCourse.name} de Firebase Firestore?\n\nEsto limpiará la base de datos para que quede vacía y lista para importar tu archivo Excel.`
    );
    if (!confirmed) return;
    try {
      const deleted = await clearCourseStudents(activeCourse.id);
      showToast(`✓ Se eliminaron ${deleted} estudiantes de Firebase Firestore`, 'info');
    } catch (err: any) {
      showToast('Error al vaciar estudiantes: ' + err.message, 'error');
    }
  };

  const handleDeleteSingleStudent = async (student: Student) => {
    const confirmed = window.confirm(`¿Eliminar a "${student.fullName}" definitivamente de Firebase?`);
    if (!confirmed) return;
    try {
      await deleteStudent(student.id);
      showToast(`✓ ${student.fullName} eliminado de la base de datos`, 'info');
    } catch (err: any) {
      showToast('Error al eliminar estudiante: ' + err.message, 'error');
    }
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* ENCABEZADO Y ACCIONES PRINCIPALES */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-400" />
            <span>Listado de Estudiantes</span>
          </h1>
          <p className="text-xs text-slate-400">
            Curso <strong className="text-slate-200">{activeCourse?.name}</strong> • {students.length} estudiantes registrados
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-bold active:scale-95 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Importar Excel/CSV</span>
          </button>

          <button
            onClick={() => setIsNewStudentModalOpen(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold shadow-touch active:scale-95 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>Nuevo Estudiante</span>
          </button>

          <button
            onClick={() => {
              const url = `${window.location.origin}/estudiante`;
              navigator.clipboard.writeText(url);
              showToast('✓ Enlace del Portal de Estudiantes copiado al portapapeles', 'info');
            }}
            title="Copiar enlace del portal estudiantil para compartir con acudientes y alumnos"
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 rounded-xl text-xs font-bold active:scale-95 transition-all"
          >
            <Share2 className="w-4 h-4 text-indigo-400" />
            <span>Portal Estudiantes</span>
          </button>

          <button
            onClick={handleExport}
            title="Exportar a Excel"
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 text-xs"
          >
            <Download className="w-4 h-4" />
          </button>

          {students.length > 0 && (
            <button
              onClick={handleClearAllStudents}
              title="Vaciar y eliminar todos los estudiantes de este curso en Firestore"
              className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/30 text-xs flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline text-[11px] font-semibold">Vaciar Curso</span>
            </button>
          )}
        </div>
      </div>

      {/* BARRA DE BÚSQUEDA TÁCTIL */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Buscar por nombre, código único (ej: A7K92P), número de lista o documento..."
          className="w-full bg-slate-900 border border-slate-800 focus:border-brand-500 rounded-2xl pl-10 pr-9 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ESTADO VACÍO */}
      {students.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 text-center max-w-md mx-auto my-8">
          <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h2 className="text-base font-bold text-white mb-1">No tienes estudiantes todavía</h2>
          <p className="text-xs text-slate-400 mb-5">
            Carga tu lista desde un archivo Excel o añade manualmente los alumnos para generar sus carnés y códigos QR.
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="py-2.5 px-4 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold shadow-touch flex items-center justify-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Importar listado desde Excel</span>
            </button>
            <button
              onClick={() => setIsNewStudentModalOpen(true)}
              className="py-2 px-4 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
            >
              Crear estudiante manual
            </button>
          </div>
        </div>
      ) : (
        /* LISTADO DE TARJETAS TÁCTILES */
        <div className="space-y-2">
          {filteredStudents.length === 0 ? (
            <div className="p-6 text-center text-slate-400 bg-slate-900 rounded-2xl border border-slate-800">
              No se encontraron estudiantes para "{searchTerm}".
            </div>
          ) : (
            filteredStudents.map(student => (
              <div
                key={student.id}
                className="bg-slate-900/90 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-3.5 flex items-center justify-between gap-3 transition-colors"
              >
                {/* Info Estudiante */}
                <div
                  onClick={() => navigate(`/students/${student.id}`)}
                  className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                >
                  <span className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                    #{String(student.listNumber).padStart(2, '0')}
                  </span>
                  <div className="truncate">
                    <h3 className="font-bold text-sm text-white truncate hover:text-brand-300 transition-colors">
                      {student.fullName}
                    </h3>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span className="font-mono bg-brand-500/10 text-brand-300 px-1.5 py-0.2 rounded font-semibold border border-brand-500/20">
                        {student.uniqueCode}
                      </span>
                      {student.documentNumber && <span>Doc: {student.documentNumber}</span>}
                    </div>
                  </div>
                </div>

                {/* Acciones Rápidas */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Botón QR */}
                  <button
                    onClick={() => setSelectedQRStudent(student)}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-colors"
                    title="Ver QR"
                  >
                    <QrCode className="w-4 h-4 text-brand-400" />
                  </button>

                  {/* Ver Perfil */}
                  <button
                    onClick={() => navigate(`/students/${student.id}`)}
                    className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors"
                    title="Ver detalles"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>

                  {/* Eliminar estudiante */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSingleStudent(student);
                    }}
                    className="p-2 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 rounded-xl transition-colors"
                    title="Eliminar de Firebase"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* MODAL VER QR INDIVIDUAL */}
      {selectedQRStudent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-xs text-center shadow-2xl">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-400">Carné Digital</span>
              <button
                onClick={() => setSelectedQRStudent(null)}
                className="text-slate-400 hover:text-white p-1 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-white p-4 rounded-2xl inline-block shadow-inner mb-3">
              <QRCodeSVG
                value={`AC:${selectedQRStudent.uniqueCode}`}
                size={180}
                level="M"
                includeMargin={false}
              />
            </div>

            <div className="font-mono text-xl font-black text-brand-400 tracking-wider mb-1">
              {selectedQRStudent.uniqueCode}
            </div>

            <div className="font-bold text-white text-sm mb-0.5">
              #{String(selectedQRStudent.listNumber).padStart(2, '0')} {selectedQRStudent.fullName}
            </div>
            <div className="text-xs text-slate-400 mb-4">{activeCourse?.name} • {activeCourse?.subject}</div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setSelectedQRStudent(null);
                  navigate(`/students/${selectedQRStudent.id}`);
                }}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 rounded-xl"
              >
                Ver Perfil
              </button>
              <button
                onClick={() => {
                  setSelectedQRStudent(null);
                  navigate('/qr-cards');
                }}
                className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-500 text-xs font-bold text-white rounded-xl"
              >
                Imprimir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CREAR NUEVO ESTUDIANTE */}
      {isNewStudentModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h2 className="text-base font-bold text-white">Nuevo Estudiante</h2>
              <button
                onClick={() => setIsNewStudentModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-full bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateStudent} className="space-y-3.5">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={newStudentName}
                  onChange={e => setNewStudentName(e.target.value)}
                  placeholder="Ej: Daniel Alejandro Mora"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">
                  Documento de Identidad (Opcional)
                </label>
                <input
                  type="text"
                  value={newStudentDoc}
                  onChange={e => setNewStudentDoc(e.target.value)}
                  placeholder="Ej: 1098456789"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewStudentModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold shadow-touch active:scale-95 transition-all"
                >
                  Guardar Estudiante
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL IMPORTAR ARCHIVO */}
      {isImportModalOpen && (
        <StudentImportModal onClose={() => setIsImportModalOpen(false)} />
      )}
    </div>
  );
};
