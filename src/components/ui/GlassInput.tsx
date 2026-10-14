import React, { forwardRef } from 'react';
import { useHapticFeedback } from '../../hooks/useHapticFeedback';

export interface GlassInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export const GlassInput = forwardRef<HTMLInputElement, GlassInputProps>(({
  label,
  error,
  icon,
  fullWidth = true,
  className = '',
  onFocus,
  ...props
}, ref) => {
  const haptics = useHapticFeedback();

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    haptics.light();
    if (onFocus) onFocus(e);
  };

  return (
    <div className={`flex flex-col gap-1.5 ${fullWidth ? 'w-full' : ''}`}>
      {label && (
        <label className="text-xs font-bold text-slate-700 tracking-tight px-1">
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        {icon && (
          <div className="absolute left-3.5 text-slate-400 pointer-events-none shrink-0">
            {icon}
          </div>
        )}

        <input
          ref={ref}
          onFocus={handleFocus}
          className={`
            w-full py-3 px-4 text-xs md:text-sm font-semibold text-slate-900 placeholder:text-slate-400
            bg-white rounded-2xl border border-slate-200
            shadow-sm outline-none transition-all duration-150
            focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20
            ${icon ? 'pl-10' : ''}
            ${error ? 'border-rose-400 bg-rose-50/20 focus:ring-rose-500/15' : ''}
            ${className}
          `}
          {...props}
        />
      </div>

      {error && (
        <span className="text-[11px] font-bold text-rose-600 px-1 animate-in fade-in">
          {error}
        </span>
      )}
    </div>
  );
});

GlassInput.displayName = 'GlassInput';
