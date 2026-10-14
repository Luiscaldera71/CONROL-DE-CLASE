import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle2, AlertTriangle, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface ToastItem {
  id: string;
  title?: string;
  description?: string;
  message?: string;
  type?: ToastType;
  actionProps?: {
    children: React.ReactNode;
    onClick?: () => void;
  };
}

interface ToastContextValue {
  toasts: ToastItem[];
  add: (toast: Omit<ToastItem, 'id'> | string) => string;
  showToast: (message: string, type?: ToastType) => void;
  remove: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const remove = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const add = useCallback((toastInput: Omit<ToastItem, 'id'> | string) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newToast: ToastItem = typeof toastInput === 'string'
      ? { id, message: toastInput, type: 'info' }
      : { id, ...toastInput };

    setToasts(prev => [...prev.slice(-3), newToast]); // Limit to max 4 toasts

    setTimeout(() => {
      remove(id);
    }, 4000);

    return id;
  }, [remove]);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    add({ message, type });
  }, [add]);

  return (
    <ToastContext.Provider value={{ toasts, add, showToast, remove }}>
      {children}
    </ToastContext.Provider>
  );
};

export const useToastManager = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToastManager must be used within a ToastProvider');
  }
  return context;
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const Toast: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl shadow-lg border border-slate-200 bg-white text-slate-900 animate-in slide-in-from-bottom duration-200 ${className}`}>
    {children}
  </div>
);

export const ToastTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <h4 className={`text-xs font-bold tracking-tight text-slate-900 ${className}`}>
    {children}
  </h4>
);

export const ToastDescription: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <p className={`mt-0.5 text-xs leading-snug text-slate-600 font-medium ${className}`}>
    {children}
  </p>
);

export const ToastAction: React.FC<{ children: React.ReactNode; onClick?: () => void; className?: string }> = ({ children, onClick, className = '' }) => (
  <button
    type="button"
    onClick={onClick}
    className={`mt-2 inline-flex items-center justify-center rounded-lg px-2.5 py-1 text-xs font-bold text-blue-700 hover:bg-blue-50 border border-blue-200 transition-colors ${className}`}
  >
    {children}
  </button>
);

export const ToastClose: React.FC<{ onClick?: () => void; className?: string }> = ({ onClick, className = '' }) => (
  <button
    type="button"
    onClick={onClick}
    className={`ml-auto flex size-6 items-center justify-center rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors ${className}`}
  >
    <X className="w-3.5 h-3.5" />
    <span className="sr-only">Close</span>
  </button>
);

export const Toaster: React.FC = () => {
  const { toasts, remove } = useToastManager();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed right-4 bottom-20 md:bottom-6 z-50 w-[calc(100vw-2rem)] md:w-96 flex flex-col gap-2.5 pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`
            pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl shadow-lg border
            bg-white border-slate-200 text-slate-900
            animate-in slide-in-from-bottom duration-200
            ${toast.type === 'error' ? 'border-rose-200 bg-rose-50/95' : ''}
            ${toast.type === 'warning' ? 'border-amber-200 bg-amber-50/95' : ''}
            ${toast.type === 'success' ? 'border-emerald-200 bg-emerald-50/95' : ''}
          `}
        >
          <div className="shrink-0 mt-0.5">
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600" />}
            {toast.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-600" />}
            {(!toast.type || toast.type === 'info') && <Info className="w-4 h-4 text-blue-600" />}
          </div>

          <div className="min-w-0 flex-1">
            {toast.title && <ToastTitle>{toast.title}</ToastTitle>}
            {(toast.description || toast.message) && (
              <ToastDescription>{toast.description || toast.message}</ToastDescription>
            )}
            {toast.actionProps && (
              <ToastAction onClick={toast.actionProps.onClick}>
                {toast.actionProps.children}
              </ToastAction>
            )}
          </div>

          <ToastClose onClick={() => remove(toast.id)} />
        </div>
      ))}
    </div>
  );
};
