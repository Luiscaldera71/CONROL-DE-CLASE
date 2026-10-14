import React, { createContext, useContext, useState, useEffect } from 'react';
import { TeacherProfile } from '../types';
import { DEMO_TEACHER } from '../services/mockData';
import { auth, isFirebaseConfigured } from '../services/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { getTeacherProfileFirestore, saveTeacherProfileFirestore } from '../services/firestoreService';

interface AuthContextType {
  currentUser: any;
  teacherProfile: TeacherProfile | null;
  loading: boolean;
  isDemoMode: boolean;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, name: string, institution: string) => Promise<void>;
  logout: () => Promise<void>;
  enableDemoMode: () => void;
  updateSettings: (newSettings: Partial<TeacherProfile['settings']>) => Promise<void>;
  updateProfile: (updates: Partial<Omit<TeacherProfile, 'settings'>> & { settings?: Partial<TeacherProfile['settings']> }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_USER_KEY = 'aulacontrol_logged_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    if (isFirebaseConfigured && auth) {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
          setCurrentUser(user);
          setIsDemoMode(false);
          const savedProfile = await getTeacherProfileFirestore(user.uid);
          if (savedProfile) {
            setTeacherProfile(savedProfile);
          } else {
            const initialProfile: TeacherProfile = {
              uid: user.uid,
              email: user.email || '',
              displayName: user.displayName || 'Docente',
              institution: 'Institución Educativa',
              createdAt: new Date().toISOString(),
              settings: DEMO_TEACHER.settings
            };
            await saveTeacherProfileFirestore(initialProfile);
            setTeacherProfile(initialProfile);
          }
        } else {
          // No hay usuario activo en Firebase
          setCurrentUser(null);
          setTeacherProfile(null);
          setIsDemoMode(false);
        }
        setLoading(false);
      });
      return unsubscribe;
    } else {
      // Modo local/offline sin Firebase obligatorio
      try {
        const savedSession = localStorage.getItem(LOCAL_USER_KEY);
        if (savedSession) {
          const parsed = JSON.parse(savedSession);
          setCurrentUser(parsed.user);
          setTeacherProfile(parsed.profile);
        } else {
          setCurrentUser(null);
          setTeacherProfile(null);
        }
      } catch {
        setCurrentUser(null);
        setTeacherProfile(null);
      }
      setLoading(false);
    }
  }, []);

  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);

  const login = async (email: string, pass: string) => {
    if (isFirebaseConfigured && auth) {
      const res = await signInWithEmailAndPassword(auth, email, pass);
      setCurrentUser(res.user);
      setIsDemoMode(false);
      const profile = await getTeacherProfileFirestore(res.user.uid);
      if (profile) setTeacherProfile(profile);
      setIsAuthModalOpen(false);
    } else {
      const localUser = { uid: `user-${Date.now()}`, email };
      const localProfile: TeacherProfile = {
        uid: localUser.uid,
        email,
        displayName: email.split('@')[0],
        institution: 'Institución Educativa',
        createdAt: new Date().toISOString(),
        settings: DEMO_TEACHER.settings
      };
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify({ user: localUser, profile: localProfile }));
      setCurrentUser(localUser);
      setTeacherProfile(localProfile);
      setIsDemoMode(false);
      setIsAuthModalOpen(false);
    }
  };

  const register = async (email: string, pass: string, name: string, institution: string) => {
    if (isFirebaseConfigured && auth) {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      const newProfile: TeacherProfile = {
        uid: cred.user.uid,
        email,
        displayName: name,
        institution: institution || 'Institución Educativa',
        createdAt: new Date().toISOString(),
        settings: DEMO_TEACHER.settings
      };
      await saveTeacherProfileFirestore(newProfile);
      setCurrentUser(cred.user);
      setTeacherProfile(newProfile);
      setIsDemoMode(false);
      setIsAuthModalOpen(false);
    } else {
      const localUser = { uid: `user-${Date.now()}`, email };
      const localProfile: TeacherProfile = {
        uid: localUser.uid,
        email,
        displayName: name || email.split('@')[0],
        institution: institution || 'Institución Educativa',
        createdAt: new Date().toISOString(),
        settings: DEMO_TEACHER.settings
      };
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify({ user: localUser, profile: localProfile }));
      setCurrentUser(localUser);
      setTeacherProfile(localProfile);
      setIsDemoMode(false);
      setIsAuthModalOpen(false);
    }
  };

  const logout = async () => {
    if (isFirebaseConfigured && auth) {
      await signOut(auth);
    }
    localStorage.removeItem(LOCAL_USER_KEY);
    setCurrentUser(null);
    setTeacherProfile(null);
    setIsDemoMode(false);
  };

  const enableDemoMode = () => {
    setIsDemoMode(true);
    const demoUser = { uid: DEMO_TEACHER.uid, email: DEMO_TEACHER.email };
    setCurrentUser(demoUser);
    setTeacherProfile(DEMO_TEACHER);
    setIsAuthModalOpen(false);
  };

  const updateSettings = async (newSettings: Partial<TeacherProfile['settings']>) => {
    if (!teacherProfile) return;
    const updated = {
      ...teacherProfile,
      settings: {
        ...teacherProfile.settings,
        ...newSettings
      }
    };
    setTeacherProfile(updated);
    if (!isDemoMode && currentUser?.uid && isFirebaseConfigured) {
      await saveTeacherProfileFirestore(updated);
    } else if (currentUser) {
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify({ user: currentUser, profile: updated }));
    }
  };

  const updateProfile = async (
    updates: Partial<Omit<TeacherProfile, 'settings'>> & { settings?: Partial<TeacherProfile['settings']> }
  ) => {
    if (!teacherProfile) return;
    const updated: TeacherProfile = {
      ...teacherProfile,
      ...updates,
      settings: updates.settings
        ? { ...teacherProfile.settings, ...updates.settings }
        : teacherProfile.settings
    };
    setTeacherProfile(updated);
    if (!isDemoMode && currentUser?.uid && isFirebaseConfigured) {
      await saveTeacherProfileFirestore(updated);
    } else if (currentUser) {
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify({ user: currentUser, profile: updated }));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        teacherProfile,
        loading,
        isDemoMode,
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,
        login,
        register,
        logout,
        enableDemoMode,
        updateSettings,
        updateProfile
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
