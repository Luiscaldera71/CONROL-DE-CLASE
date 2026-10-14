import React, { createContext, useContext, useState, useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Liqui Design Glass Dialog / Modal Component
 * Inspired by https://liqui.design/r/dialog.json
 * Replicates the exact Liqui Design Aurora glass modal benchmark with backdrop blur lens, specular white top glare, and action button layouts.
 */

interface DialogContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export interface DialogProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export const Dialog: React.FC<DialogProps> = ({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  children
}) => {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;

  const setOpen = (next: boolean) => {
    if (!isControlled) setInternalOpen(next);
    if (onOpenChange) onOpenChange(next);
  };

  return (
    <DialogContext.Provider value={{ open: isOpen, setOpen }}>
      {children}
    </DialogContext.Provider>
  );
};

export interface DialogTriggerProps {
  nativeButton?: boolean;
  render?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const DialogTrigger: React.FC<DialogTriggerProps> = ({
  render,
  children,
  className = '',
  onClick
}) => {
  const context = useContext(DialogContext);
  if (!context) throw new Error('DialogTrigger must be used within a Dialog');

  const handleClick = () => {
    context.setOpen(true);
    if (onClick) onClick();
  };

  if (render && React.isValidElement(render)) {
    return React.cloneElement(render as React.ReactElement<any>, {
      onClick: handleClick
    });
  }

  return (
    <span onClick={handleClick} className={`inline-block cursor-pointer ${className}`}>
      {children}
    </span>
  );
};

export interface DialogContentProps {
  children: React.ReactNode;
  className?: string;
}

export const DialogContent: React.FC<DialogContentProps> = ({ children, className = '' }) => {
  const context = useContext(DialogContext);
  if (!context) throw new Error('DialogContent must be used within a Dialog');

  const { open, setOpen } = context;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div
        className={`
          relative w-full max-w-md p-6 rounded-3xl
          liquid-glass border border-white/75 border-t-2 border-t-white shadow-2xl
          space-y-4 animate-in zoom-in-95 duration-150
          ${className}
        `}
      >
        {children}
      </div>
    </div>
  );
};

export interface DialogDismissProps {
  className?: string;
}

export const DialogDismiss: React.FC<DialogDismissProps> = ({ className = '' }) => {
  const context = useContext(DialogContext);
  if (!context) throw new Error('DialogDismiss must be used within a Dialog');

  return (
    <button
      type="button"
      onClick={() => context.setOpen(false)}
      className={`
        absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-900
        hover:bg-white/50 transition-all cursor-pointer outline-none
        ${className}
      `}
      aria-label="Cerrar modal"
    >
      <X className="w-4 h-4" />
    </button>
  );
};

export interface DialogTitleProps {
  children: React.ReactNode;
  className?: string;
}

export const DialogTitle: React.FC<DialogTitleProps> = ({ children, className = '' }) => (
  <h2 className={`text-lg font-bold text-slate-900 tracking-tight ${className}`}>{children}</h2>
);

export interface DialogDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export const DialogDescription: React.FC<DialogDescriptionProps> = ({ children, className = '' }) => (
  <p className={`text-xs text-slate-600 leading-relaxed ${className}`}>{children}</p>
);

export interface DialogActionsProps {
  children: React.ReactNode;
  className?: string;
}

export const DialogActions: React.FC<DialogActionsProps> = ({ children, className = '' }) => (
  <div className={`pt-2 flex items-center justify-end gap-2.5 ${className}`}>{children}</div>
);

export interface DialogCloseProps {
  nativeButton?: boolean;
  render?: React.ReactNode;
  children?: React.ReactNode;
  onClick?: () => void;
}

export const DialogClose: React.FC<DialogCloseProps> = ({ render, children, onClick }) => {
  const context = useContext(DialogContext);
  if (!context) throw new Error('DialogClose must be used within a Dialog');

  const handleClick = () => {
    if (onClick) onClick();
    context.setOpen(false);
  };

  if (render && React.isValidElement(render)) {
    return React.cloneElement(render as React.ReactElement<any>, {
      onClick: handleClick
    });
  }

  return (
    <span onClick={handleClick} className="inline-block cursor-pointer">
      {children}
    </span>
  );
};
