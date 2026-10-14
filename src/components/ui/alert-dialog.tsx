import React, { createContext, useContext, useState, useEffect } from 'react';

/**
 * Liqui Design Glass Alert Dialog Component
 * Replicates https://liqui.design/r/alert-dialog.json benchmark
 * Implements Base UI composition pattern (`render` prop, `nativeButton={false}` for glass buttons).
 */

interface AlertDialogContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const AlertDialogContext = createContext<AlertDialogContextType | undefined>(undefined);

export interface AlertDialogProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export const AlertDialog: React.FC<AlertDialogProps> = ({
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
    <AlertDialogContext.Provider value={{ open: isOpen, setOpen }}>
      {children}
    </AlertDialogContext.Provider>
  );
};

export interface AlertDialogTriggerProps {
  render?: React.ReactElement<any>;
  nativeButton?: boolean;
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const AlertDialogTrigger: React.FC<AlertDialogTriggerProps> = ({
  render,
  children,
  className = '',
  onClick
}) => {
  const context = useContext(AlertDialogContext);
  if (!context) throw new Error('AlertDialogTrigger must be used within an AlertDialog');

  const handleClick = (e: React.MouseEvent) => {
    if (render?.props && typeof (render.props as any).onClick === 'function') {
      (render.props as any).onClick(e);
    }
    context.setOpen(true);
    if (onClick) onClick();
  };

  if (render && React.isValidElement(render)) {
    return React.cloneElement(render, {
      onClick: handleClick
    } as any);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={className}
    >
      {children}
    </button>
  );
};

export interface AlertDialogContentProps {
  children: React.ReactNode;
  className?: string;
}

export const AlertDialogContent: React.FC<AlertDialogContentProps> = ({ children, className = '' }) => {
  const context = useContext(AlertDialogContext);
  if (!context) throw new Error('AlertDialogContent must be used within an AlertDialog');

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
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop scrim with backdrop blur */}
      <div
        onClick={() => setOpen(false)}
        className="fixed inset-0 bg-slate-950/40 backdrop-blur-md transition-opacity duration-200 animate-in fade-in"
      />
      
      {/* Glass popup content */}
      <div
        className={`
          relative z-[201] w-full max-w-md p-6 rounded-3xl
          liquid-glass border border-white/75 border-t-2 border-t-white shadow-2xl
          animate-in zoom-in-95 duration-150 text-slate-900
          ${className}
        `}
      >
        {children}
      </div>
    </div>
  );
};

export interface AlertDialogTitleProps {
  children: React.ReactNode;
  className?: string;
}

export const AlertDialogTitle: React.FC<AlertDialogTitleProps> = ({ children, className = '' }) => {
  return (
    <h2 className={`text-base font-bold tracking-tight text-slate-900 ${className}`}>
      {children}
    </h2>
  );
};

export interface AlertDialogDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export const AlertDialogDescription: React.FC<AlertDialogDescriptionProps> = ({ children, className = '' }) => {
  return (
    <p className={`mt-2 text-[13.5px] leading-relaxed text-slate-600 ${className}`}>
      {children}
    </p>
  );
};

export interface AlertDialogActionsProps {
  children: React.ReactNode;
  className?: string;
}

export const AlertDialogActions: React.FC<AlertDialogActionsProps> = ({ children, className = '' }) => {
  return (
    <div className={`mt-5 flex items-center justify-end gap-2.5 ${className}`}>
      {children}
    </div>
  );
};

export interface AlertDialogCloseProps {
  render?: React.ReactElement<any>;
  nativeButton?: boolean;
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const AlertDialogClose: React.FC<AlertDialogCloseProps> = ({
  render,
  children,
  className = '',
  onClick
}) => {
  const context = useContext(AlertDialogContext);
  if (!context) throw new Error('AlertDialogClose must be used within an AlertDialog');

  const handleClick = (e: React.MouseEvent) => {
    if (render?.props && typeof (render.props as any).onClick === 'function') {
      (render.props as any).onClick(e);
    }
    context.setOpen(false);
    if (onClick) onClick();
  };

  if (render && React.isValidElement(render)) {
    return React.cloneElement(render, {
      onClick: handleClick
    } as any);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={className}
    >
      {children}
    </button>
  );
};
