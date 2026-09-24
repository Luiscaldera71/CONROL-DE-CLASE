import React, { createContext, useContext, useState, useEffect } from 'react';
import { TeacherProfile, TeacherSettings } from '../types';
import { auth, isFirebaseConfigured } from '../services/firebase';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  User
} from 'firebase/auth';
import { getTeacherProfileFirestore, saveTeacherProfileFirestore } from '../services/firestoreService';
import { offlineStorage } from '../services/offlineStorage';

export const DEFAULT_TEACHER_SETTINGS: TeacherSettings = {
  gradeScale: {
    min: 0.0,
    max: 5.0,
    passingGrade: 3.0
  },
  riskThresholds: {
    minGrade: 3.0,
    minAttendanceRate: 75,
    maxUnsubmitted: 3
  },
  periods: ['Periodo 1', 'Periodo 2', 'Periodo 3', 'Periodo 4'],
  behaviorCategories: [
    { id: 'warning', label: 'Llamado de Atención', type: 'negative' },
    { id: 'non_compliance', label: 'Incumplimiento', type: 'negative' },
    { id: 'positive', label: 'Aporte Destacado', type: 'positive' },
    { id: 'recognition', label: 'Reconocimiento', type: 'positive' }
  ]
};

interface AuthContextType {
  currentUser: User | null;
  teacherProfile: TeacherProfile | null;
  loading: boolean;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, name: string, institution: string, subject?: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  updateSettings: (newSettings: Partial<TeacherProfile['settings']>) => Promise<void>;
  updateTeacherProfile: (updates: {
    displayName?: string;
    institution?: string;
    subject?: string;
    phone?: string;
  }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Restaurar usuario previo de almacenamiento local para permitir entrada 100% offline sin esperas
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    return offlineStorage.getLocal<any>('cached_auth_user', null);
  });
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(() =>
    offlineStorage.getLocal<TeacherProfile | null>('teacher_profile', null)
  );
  // Si ya tenemos un usuario en caché, NUNCA bloquear con pantalla de carga
  const [loading, setLoading] = useState<boolean>(() => {
    const cached = offlineStorage.getLocal<any>('cached_auth_user', null);
    return !cached;
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Timeout de seguridad: Si no hay conexión o tarda, quitar pantalla de carga en máximo 1.2 segundos
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isFirebaseConfigured && auth) {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
          const authUserObj = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName
          } as any;
          setCurrentUser(authUserObj);
          offlineStorage.saveLocal('cached_auth_user', authUserObj);
          setLoading(false);

          try {
            let savedProfile = await getTeacherProfileFirestore(user.uid);
            if (!savedProfile) {
              const cached = offlineStorage.getLocal<TeacherProfile | null>('teacher_profile', null);
              if (cached && cached.uid === user.uid) {
                savedProfile = cached;
              } else {
                const initialProfile: TeacherProfile = {
                  uid: user.uid,
                  email: user.email || '',
                  displayName: user.displayName || 'Docente',
                  institution: 'Institución Educativa',
                  createdAt: new Date().toISOString(),
                  settings: DEFAULT_TEACHER_SETTINGS
                };
                saveTeacherProfileFirestore(initialProfile);
                savedProfile = initialProfile;
              }
            }
            setTeacherProfile(savedProfile);
            offlineStorage.saveLocal('teacher_profile', savedProfile);
          } catch (err) {
            console.warn('Error cargando perfil docente de Firestore (usando caché offline):', err);
          }
        } else {
          // Solo si estamos conectados con internet confirmamos el cierre de sesión en Firebase
          if (navigator.onLine) {
            setCurrentUser(null);
            setTeacherProfile(null);
            offlineStorage.saveLocal('cached_auth_user', null);
            offlineStorage.saveLocal('teacher_profile', null);
          }
          setLoading(false);
        }
      });
      return unsubscribe;
    } else {
      setLoading(false);
    }
  }, []);

  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);

  const login = async (email: string, pass: string) => {
    if (!auth) throw new Error('Firebase Auth no está disponible.');
    const res = await signInWithEmailAndPassword(auth, email.trim(), pass);
    const authUserObj = {
      uid: res.user.uid,
      email: res.user.email,
      displayName: res.user.displayName
    } as any;
    setCurrentUser(authUserObj);
    offlineStorage.saveLocal('cached_auth_user', authUserObj);

    let profile = await getTeacherProfileFirestore(res.user.uid);
    if (!profile) {
      profile = {
        uid: res.user.uid,
        email: res.user.email || email.trim(),
        displayName: res.user.displayName || 'Docente',
        institution: 'Institución Educativa',
        createdAt: new Date().toISOString(),
        settings: DEFAULT_TEACHER_SETTINGS
      };
      await saveTeacherProfileFirestore(profile);
    }
    setTeacherProfile(profile);
    offlineStorage.saveLocal('teacher_profile', profile);
    setIsAuthModalOpen(false);
  };

  const register = async (email: string, pass: string, name: string, institution: string, subject?: string) => {
    if (!auth) throw new Error('Firebase Auth no está disponible.');
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);

    try {
      await updateProfile(cred.user, { displayName: name.trim() });
    } catch (e) {
      console.warn('No se pudo actualizar displayName en Auth:', e);
    }

    const authUserObj = {
      uid: cred.user.uid,
      email: cred.user.email,
      displayName: name.trim()
    } as any;
    setCurrentUser(authUserObj);
    offlineStorage.saveLocal('cached_auth_user', authUserObj);

    const newProfile: TeacherProfile = {
      uid: cred.user.uid,
      email: email.trim(),
      displayName: name.trim(),
      institution: institution.trim() || 'Institución Educativa',
      subject: subject?.trim() || undefined,
      createdAt: new Date().toISOString(),
      settings: DEFAULT_TEACHER_SETTINGS
    };

    await saveTeacherProfileFirestore(newProfile);
    setTeacherProfile(newProfile);
    offlineStorage.saveLocal('teacher_profile', newProfile);
    setIsAuthModalOpen(false);
  };

  const resetPassword = async (email: string) => {
    if (!auth) throw new Error('Firebase no está configurado para envío de correos.');
    await sendPasswordResetEmail(auth, email.trim());
  };

  const logout = async () => {
    offlineStorage.saveLocal('cached_auth_user', null);
    offlineStorage.saveLocal('teacher_profile', null);
    setCurrentUser(null);
    setTeacherProfile(null);
    if (auth) {
      try {
        await signOut(auth);
      } catch (err) {
        console.error('Error al cerrar sesión:', err);
      }
    }
  };

  const updateSettings = async (newSettings: Partial<TeacherProfile['settings']>) => {
    if (!teacherProfile || !currentUser?.uid) return;
    const updated = {
      ...teacherProfile,
      settings: {
        ...teacherProfile.settings,
        ...newSettings
      }
    };
    setTeacherProfile(updated);
    await saveTeacherProfileFirestore(updated);
  };

  const updateTeacherProfile = async (updates: {
    displayName?: string;
    institution?: string;
    subject?: string;
    phone?: string;
  }) => {
    if (!teacherProfile || !currentUser?.uid) return;
    const updated: TeacherProfile = {
      ...teacherProfile,
      ...updates
    };
    setTeacherProfile(updated);
    offlineStorage.saveLocal('teacher_profile', updated);

    if (updates.displayName && auth?.currentUser) {
      try {
        await updateProfile(auth.currentUser, { displayName: updates.displayName });
        const updatedAuthUser = {
          ...currentUser,
          displayName: updates.displayName
        };
        setCurrentUser(updatedAuthUser);
        offlineStorage.saveLocal('cached_auth_user', updatedAuthUser);
      } catch (e) {
        console.warn('Error al actualizar displayName en Auth:', e);
      }
    }

    await saveTeacherProfileFirestore(updated);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        teacherProfile,
        loading,
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,
        login,
        register,
        resetPassword,
        logout,
        updateSettings,
        updateTeacherProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe ser usado dentro de AuthProvider');
  return context;
};
