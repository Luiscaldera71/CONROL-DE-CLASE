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
                {/* RUTAS PÚBLICAS PARA ESTUDIANTES Y FAMILIAS (Acceso por link o escaneo QR) */}
                <Route path="/estudiante" element={<StudentPortalPage />} />
                <Route path="/estudiante/:code" element={<StudentPortalPage />} />
                <Route path="/portal-estudiante" element={<StudentPortalPage />} />

                {/* RUTAS PRIVADAS DEL DOCENTE */}
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
