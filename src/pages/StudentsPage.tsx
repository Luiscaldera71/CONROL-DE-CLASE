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
  Edit2
} from 'lucide-react';
import { useCourse } from '../context/CourseContext';
import { useToast } from '../context/ToastContext';
import { excelService } from '../services/excelService';
import { Student } from '../types';
import { StudentImportModal } from '../components/students/StudentImportModal';

export const StudentsPage: React.FC = () => {
  const { students, activeCourse, addStudent, updateStudent, deleteStudent } = useCourse();
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

  const handleDownloadTemplate = () => {
    excelService.downloadStudentTemplate(activeCourse?.name, activeCourse);
    showToast('✓ Descargando formato oficial de estudiantes (.xlsx)', 'success');
  };

  const handleExport = () => {
    if (!activeCourse) return;
    excelService.exportStudents(students, activeCourse.name, activeCourse);
    showToast(`✓ Listado de estudiantes exportado a Excel con diseño profesional`, 'success');
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* ENCABEZADO Y ACCIONES PRINCIPALES (Estilo AbsenSiswa) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <span>Listado de Estudiantes</span>
          </h1>
          <p className="text-xs text-slate-500">
            Curso: <strong className="text-slate-800">{activeCourse?.name}</strong> • {students.length} estudiantes registrados
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleDownloadTemplate}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-2xl text-xs font-bold active:scale-95 transition-all shadow-xs"
            title="Descargar formato oficial en Excel para que llenes con tus alumnos y lo subas"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Descargar Formato</span>
          </button>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold active:scale-95 transition-all shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Subir Excel</span>
          </button>

          <button
            onClick={() => setIsNewStudentModalOpen(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-blue-500/25 active:scale-95 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>Nuevo Estudiante</span>
          </button>

          <button
            onClick={handleExport}
            title="Exportar listado actual a Excel"
            className="p-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-2xl border border-slate-200 text-xs shadow-xs"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* BARRA DE BÚSQUEDA TÁCTIL */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Buscar por nombre, código único (ej: A7K92P), número de lista o documento..."
          className="w-full bg-white rounded-2xl border border-slate-200 pl-11 pr-10 py-3 text-xs md:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 shadow-xs transition-colors"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ESTADO VACÍO */}
      {students.length === 0 ? (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-8 text-center max-w-md mx-auto my-8 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
            <Users className="w-7 h-7" />
          </div>
          <h2 className="text-base font-bold text-slate-900 mb-1">No tienes estudiantes todavía</h2>
          <p className="text-xs text-slate-500 mb-5 leading-relaxed">
            Carga tu lista desde un archivo Excel o añade manualmente los alumnos para generar sus carnés y códigos QR.
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-blue-500/25 flex items-center justify-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Importar listado desde Excel</span>
            </button>
            <button
              onClick={() => setIsNewStudentModalOpen(true)}
              className="py-2.5 px-4 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-2xl text-xs font-bold border border-slate-200"
            >
              Crear estudiante manual
            </button>
          </div>
        </div>
      ) : (
        /* LISTADO DE TARJETAS TÁCTILES */
        <div className="space-y-2">
          {filteredStudents.length === 0 ? (
            <div className="p-8 text-center text-slate-500 bg-white border border-slate-200 rounded-3xl">
              No se encontraron estudiantes para "{searchTerm}".
            </div>
          ) : (
            filteredStudents.map(student => (
              <div
                key={student.id}
                className="bg-white border border-slate-200/90 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-xs hover:border-blue-300 transition-all"
              >
                {/* Info Estudiante */}
                <div
                  onClick={() => navigate(`/students/${student.id}`)}
                  className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                >
                  <span className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0 border border-blue-100">
                    #{String(student.listNumber).padStart(2, '0')}
                  </span>
                  <div className="truncate">
                    <h3 className="font-bold text-sm text-slate-900 truncate hover:text-blue-600 transition-colors">
                      {student.fullName}
                    </h3>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span className="font-mono bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded-md font-bold border border-blue-200">
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
                    className="p-2 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-xl border border-slate-200 transition-colors"
                    title="Ver QR"
                  >
                    <QrCode className="w-4 h-4" />
                  </button>

                  {/* Ver Perfil */}
                  <button
                    onClick={() => navigate(`/students/${student.id}`)}
                    className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-xl transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* MODAL VER QR INDIVIDUAL */}
      {selectedQRStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-xs text-center shadow-2xl">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-500">Carné Digital</span>
              <button
                onClick={() => setSelectedQRStudent(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-white p-4 rounded-2xl inline-block border border-slate-100 shadow-sm mb-3">
              <QRCodeSVG
                value={`AC:${selectedQRStudent.uniqueCode}`}
                size={180}
                level="M"
                includeMargin={false}
              />
            </div>

            <div className="font-mono text-xl font-black text-blue-600 tracking-wider mb-1">
              {selectedQRStudent.uniqueCode}
            </div>

            <div className="font-bold text-slate-900 text-sm mb-0.5">
              #{String(selectedQRStudent.listNumber).padStart(2, '0')} {selectedQRStudent.fullName}
            </div>
            <div className="text-xs text-slate-400 mb-4">{activeCourse?.name} • {activeCourse?.subject}</div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setSelectedQRStudent(null);
                  navigate(`/students/${selectedQRStudent.id}`);
                }}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 rounded-xl"
              >
                Ver Perfil
              </button>
              <button
                onClick={() => {
                  setSelectedQRStudent(null);
                  navigate('/qr-cards');
                }}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white rounded-xl shadow-sm"
              >
                Imprimir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CREAR NUEVO ESTUDIANTE */}
      {isNewStudentModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-base font-black text-slate-900">Nuevo Estudiante</h2>
              <button
                onClick={() => setIsNewStudentModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateStudent} className="space-y-4">
              <div>
                <label className="text-xs text-slate-700 font-bold block mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={newStudentName}
                  onChange={e => setNewStudentName(e.target.value)}
                  placeholder="Ej: Daniel Alejandro Mora"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-3 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-700 font-bold block mb-1">
                  Documento de Identidad (Opcional)
                </label>
                <input
                  type="text"
                  value={newStudentDoc}
                  onChange={e => setNewStudentDoc(e.target.value)}
                  placeholder="Ej: 1098456789"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-3 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewStudentModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-blue-500/25 active:scale-95 transition-all"
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
