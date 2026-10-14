import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

/**
 * Liqui Design Glass Select Component
 * Inspired by https://liqui.design/r/select.json
 * Features glass trigger lens, specular top rim, liquid popup card, and smooth selection state.
 */

interface SelectContextType {
  value: string;
  onValueChange: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  placeholder?: string;
  displayLabel: string;
  setDisplayLabel: (label: string) => void;
}

const SelectContext = createContext<SelectContextType | undefined>(undefined);

export interface SelectProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}

export const Select: React.FC<SelectProps> = ({
  value: controlledValue,
  defaultValue = '',
  onValueChange,
  children
}) => {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [displayLabel, setDisplayLabel] = useState('');

  const isControlled = controlledValue !== undefined;
  const currentValue = isControlled ? controlledValue : internalValue;

  const handleValueChange = (val: string) => {
    if (!isControlled) {
      setInternalValue(val);
    }
    if (onValueChange) {
      onValueChange(val);
    }
    setOpen(false);
  };

  return (
    <SelectContext.Provider
      value={{
        value: currentValue,
        onValueChange: handleValueChange,
        open,
        setOpen,
        displayLabel,
        setDisplayLabel
      }}
    >
      <div className="relative inline-block w-full">{children}</div>
    </SelectContext.Provider>
  );
};

export interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
  children?: React.ReactNode;
}

export const SelectTrigger: React.FC<SelectTriggerProps> = ({
  className = '',
  children,
  ...props
}) => {
  const context = useContext(SelectContext);
  if (!context) throw new Error('SelectTrigger must be used within a Select');

  const { open, setOpen } = context;

  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      className={`
        w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-2xl text-xs font-semibold
        bg-white/45 hover:bg-white/70 text-slate-900 backdrop-blur-xl -webkit-backdrop-filter-blur-xl
        border border-white/75 border-t-2 border-t-white
        shadow-[0_8px_20px_-4px_rgba(15,23,42,0.1),inset_0_1.5px_2px_0_rgba(255,255,255,0.95)]
        active:scale-[0.98] transition-all outline-none cursor-pointer
        ${className}
      `}
      {...props}
    >
      <span className="truncate">{children}</span>
      <ChevronDown className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
    </button>
  );
};

export interface SelectValueProps {
  placeholder?: string;
  className?: string;
}

export const SelectValue: React.FC<SelectValueProps> = ({ placeholder = 'Seleccionar...', className = '' }) => {
  const context = useContext(SelectContext);
  if (!context) throw new Error('SelectValue must be used within a Select');

  const { value, displayLabel } = context;

  return (
    <span className={`truncate ${!value && !displayLabel ? 'text-slate-400' : 'text-slate-900'} ${className}`}>
      {displayLabel || value || placeholder}
    </span>
  );
};

export interface SelectContentProps {
  children: React.ReactNode;
  className?: string;
}

export const SelectContent: React.FC<SelectContentProps> = ({ children, className = '' }) => {
  const context = useContext(SelectContext);
  if (!context) throw new Error('SelectContent must be used within a Select');

  const { open, setOpen } = context;
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className={`
        absolute top-full left-0 right-0 mt-1.5 z-50 p-1.5 rounded-2xl
        liquid-glass border border-white/75 border-t-2 border-t-white shadow-2xl
        max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-150 space-y-0.5
        ${className}
      `}
    >
      {children}
    </div>
  );
};

export interface SelectItemProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export const SelectItem: React.FC<SelectItemProps> = ({ value: itemValue, children, className = '' }) => {
  const context = useContext(SelectContext);
  if (!context) throw new Error('SelectItem must be used within a Select');

  const { value, onValueChange, setDisplayLabel } = context;
  const isSelected = value === itemValue;

  const labelText = typeof children === 'string' ? children : String(itemValue);

  useEffect(() => {
    if (isSelected) {
      setDisplayLabel(labelText);
    }
  }, [isSelected, labelText, setDisplayLabel]);

  return (
    <div
      onClick={() => {
        setDisplayLabel(labelText);
        onValueChange(itemValue);
      }}
      className={`
        flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all
        ${isSelected
          ? 'bg-indigo-100/80 text-indigo-950 font-bold border border-indigo-200/80 shadow-sm'
          : 'hover:bg-white/60 text-slate-800'
        }
        ${className}
      `}
    >
      <span className="truncate">{children}</span>
      {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
    </div>
  );
};

export const SelectGroup: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`space-y-0.5 ${className}`}>{children}</div>
);

export const SelectGroupLabel: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider ${className}`}>{children}</div>
);

export const SelectSeparator: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`h-px bg-white/40 my-1 ${className}`} />
);
