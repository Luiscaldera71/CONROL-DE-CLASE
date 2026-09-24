import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Variables de entorno de Firebase con credenciales del proyecto activo
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBAyXyjV1Qw849_b6QZOQG3as0kmAhUd_0',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'control-de-clase-15c33.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'control-de-clase-15c33',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'control-de-clase-15c33.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '231892105556',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:231892105556:web:069e554d2839effa14b0c1'
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && 
  firebaseConfig.projectId
);

let app: any;
let auth: any;
let db: any;
let storage: any;

try {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  try {
    db = initializeFirestore(app, {
      ignoreUndefinedProperties: true,
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    });
  } catch {
    db = getFirestore(app);
  }
  storage = getStorage(app);
} catch (error) {
  console.warn('Firebase inicializado en modo simulado/local:', error);
}

export { app, auth, db, storage };
