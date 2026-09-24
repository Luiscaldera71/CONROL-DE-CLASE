import React, { useState } from 'react';
import { Award, Download, Filter, Search, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { useCourse } from '../context/CourseContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { excelService } from '../services/excelService';

export const GradesPage: React.FC = () => {
  const { students, activities, submissions, activeCourse, recordSubmission } = useCourse();
  const { teacherProfile } = useAuth();
  const { showToast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const passingGrade = teacherProfile?.settings?.gradeScale?.passingGrade || 3.0;

  // Filtrado de alumnos
  const filteredStudents = students.filter(s =>
    s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.uniqueCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(s.listNumber) === searchTerm.trim()
  );

  // Estadísticas globales del curso
  const studentAverages = students.map(student => {
    const studentSubs = submissions.filter(s => s.studentId === student.id && s.grade !== null && s.grade !== undefined);
    if (studentSubs.length === 0) return null;
    const avg = studentSubs.reduce((acc, curr) => acc + (curr.grade || 0), 0) / studentSubs.length;
    return parseFloat(avg.toFixed(1));
  }).filter((a): a is number => a !== null);

  const courseAvg = studentAverages.length > 0
    ? (studentAverages.reduce((acc, c) => acc + c, 0) / studentAverages.length).toFixed(1)
    : '—';

  const passingCount = studentAverages.filter(a => a >= passingGrade).length;
  const failingCount = studentAverages.filter(a => a < passingGrade).length;

  const handleExport = () => {
    if (!activeCourse) return;
    excelService.exportGrades(activities, submissions, students, activeCourse.name);
    showToast(`✓ Planilla de notas exportada a Excel`, 'info');
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* CABECERA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <span>Planilla de Calificaciones</span>
          </h1>
          <p className="text-xs text-slate-400">
            Curso <strong className="text-slate-200">{activeCourse?.name}</strong> • Escala 0.0 - 5.0 (Aprobación: {passingGrade.toFixed(1)})
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Exportar Excel</span>
          </button>
        </div>
      </div>

      {/* MÉTRICAS RÁPIDAS DE RENDIMIENTO */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Promedio Curso</span>
          <span className="text-xl font-black text-amber-400">{courseAvg}</span>
        </div>

        <div className="bg-slate-900 border border-emerald-950/40 p-3 rounded-2xl">
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Aprobando (≥ {passingGrade})</span>
          <span className="text-xl font-black text-emerald-400">{passingCount} est.</span>
        </div>

        <div className="bg-slate-900 border border-rose-950/40 p-3 rounded-2xl">
          <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block">Bajo Rendimiento (&lt; {passingGrade})</span>
          <span className="text-xl font-black text-rose-400">{failingCount} est.</span>
        </div>
      </div>

      {/* BUSCADOR */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl px-3 py-2 flex items-center gap-2">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Buscar estudiante por nombre, código o lista..."
          className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
        />
      </div>

      {/* TABLA DE CALIFICACIONES RESPONSIVE CON SCROLL HORIZONTAL */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                <th className="py-3 px-3 w-12 text-center">N°</th>
                <th className="py-3 px-3 min-w-[180px]">Estudiante</th>
                {activities.map(act => (
                  <th key={act.id} className="py-3 px-2 text-center min-w-[90px]" title={act.title}>
                    <div className="line-clamp-1">{act.title.substring(0, 15)}</div>
                    <div className="text-[9px] text-brand-400 font-mono">({act.weightPercentage}%)</div>
                  </th>
                ))}
                <th className="py-3 px-3 text-center min-w-[80px] bg-slate-800/40 text-white">Promedio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredStudents.map(student => {
                const studentSubs = submissions.filter(s => s.studentId === student.id);
                const graded = studentSubs.filter(s => s.grade !== null && s.grade !== undefined);
                const avg = graded.length > 0
                  ? (graded.reduce((acc, curr) => acc + (curr.grade || 0), 0) / graded.length).toFixed(1)
                  : '—';

                const isFailing = avg !== '—' && parseFloat(avg) < passingGrade;

                return (
                  <tr key={student.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-400 text-[11px]">
                      #{String(student.listNumber).padStart(2, '0')}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-white leading-tight">{student.fullName}</div>
                      <div className="font-mono text-[10px] text-brand-400">{student.uniqueCode}</div>
                    </td>

                    {/* Notas por actividad */}
                    {activities.map(act => {
                      const sub = studentSubs.find(s => s.activityId === act.id);
                      const gradeVal = sub?.grade !== null && sub?.grade !== undefined ? sub.grade.toFixed(1) : '';

                      return (
                        <td key={act.id} className="py-2 px-2 text-center">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="5"
                            placeholder="—"
                            value={gradeVal}
                            onChange={e => {
                              const val = e.target.value === '' ? null : parseFloat(e.target.value);
                              recordSubmission(act.id, student.id, val !== null ? 'delivered' : 'pending', val);
                            }}
                            className={`w-14 text-center font-bold py-1 px-1 rounded-lg border text-xs focus:outline-none focus:border-brand-500 ${
                              gradeVal !== '' && parseFloat(gradeVal) < passingGrade
                                ? 'bg-rose-950/40 border-rose-800 text-rose-300'
                                : gradeVal !== ''
                                ? 'bg-slate-800/80 border-slate-700 text-amber-300'
                                : 'bg-slate-900 border-slate-800 text-slate-500'
                            }`}
                          />
                        </td>
                      );
                    })}

                    {/* Promedio Calculado */}
                    <td className="py-2.5 px-3 text-center bg-slate-800/30">
                      <span className={`px-2 py-1 rounded-lg font-black text-xs ${
                        isFailing
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : avg !== '—'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'text-slate-500'
                      }`}>
                        {avg}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
