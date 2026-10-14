import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { OfflineProvider } from './context/OfflineContext';
import { CourseProvider } from './context/CourseContext';
import { ToastProvider } from './context/ToastContext';

import { AppLayout } from './components/layout/AppLayout';
import { HomePage } from './pages/HomePage';
import { ScannerPage } from './pages/ScannerPage';
import { CoursesPage } from './pages/CoursesPage';
import { StudentsPage } from './pages/StudentsPage';
import { StudentDetailPage } from './pages/StudentDetailPage';
import { AttendancePage } from './pages/AttendancePage';
import { ActivitiesPage } from './pages/ActivitiesPage';
import { GradesPage } from './pages/GradesPage';
import { FinalGradesPage } from './pages/FinalGradesPage';
import { BehaviorPage } from './pages/BehaviorPage';
import { QRCardsPage } from './pages/QRCardsPage';
import { DashboardPage } from './pages/DashboardPage';
import { SettingsPage } from './pages/SettingsPage';
import { StudentPortalPage } from './pages/StudentPortalPage';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <OfflineProvider>
          <CourseProvider>
            <ToastProvider>
              <Routes>
                {/* RUTA PÚBLICA PARA ESTUDIANTES Y ACUDIENTES (Sin requerir login docente) */}
                <Route path="/estudiante" element={<StudentPortalPage />} />
                <Route path="/estudiante/:code" element={<StudentPortalPage />} />
                <Route path="/consulta" element={<StudentPortalPage />} />

                {/* RUTAS DEL DOCENTE (Protegidas dentro del AppLayout) */}
                <Route element={<AppLayout />}>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/scanner" element={<ScannerPage />} />
                  <Route path="/courses" element={<CoursesPage />} />
                  <Route path="/students" element={<StudentsPage />} />
                  <Route path="/students/:studentId" element={<StudentDetailPage />} />
                  <Route path="/attendance" element={<AttendancePage />} />
                  <Route path="/attendance/quick-scan" element={<ScannerPage />} />
                  <Route path="/activities" element={<ActivitiesPage />} />
                  <Route path="/grades" element={<GradesPage />} />
                  <Route path="/definitivas" element={<FinalGradesPage />} />
                  <Route path="/final-grades" element={<FinalGradesPage />} />
                  <Route path="/behavior" element={<BehaviorPage />} />
                  <Route path="/qr-cards" element={<QRCardsPage />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Routes>
            </ToastProvider>
          </CourseProvider>
        </OfflineProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
