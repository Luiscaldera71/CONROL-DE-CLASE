import React from 'react';
import {
  ToastProvider as LiquiToastProvider,
  Toaster,
  useToastManager,
  useToast as useLiquiToast,
  ToastType,
  ToastItem
} from '../components/ui/toast';

export type { ToastType, ToastItem };

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <LiquiToastProvider>
      {children}
      <Toaster />
    </LiquiToastProvider>
  );
};

export const useToast = () => {
  const manager = useLiquiToast();
  return {
    showToast: (message: string, type?: ToastType) => manager.showToast(message, type),
    add: manager.add,
    toasts: manager.toasts,
    remove: manager.remove
  };
};
