import React from 'react';
import { useHapticFeedback } from '../../hooks/useHapticFeedback';

export interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'glass' | 'accent' | 'danger' | 'outline' | 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  hapticIntensity?: 'light' | 'medium' | 'success' | 'error';
}

export const GlassButton: React.FC<GlassButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  icon,
  children,
  className = '',
  disabled,
  hapticIntensity = 'light',
  onClick,
  ...props
}) => {
  const haptics = useHapticFeedback();

  const sizeClasses = {
    sm: 'gap-1.5 px-3.5 py-2 text-xs rounded-xl font-bold',
    md: 'gap-2 px-4.5 py-2.5 text-xs font-bold rounded-2xl',
    lg: 'gap-2.5 px-6 py-3.5 text-sm font-bold rounded-2xl',
  }[size];

  const variantClasses = {
    primary: `
      bg-blue-600 hover:bg-blue-700 active:scale-[0.98]
      text-white font-bold border border-blue-600
      shadow-md shadow-blue-500/20
    `,
    glass: `
      bg-white hover:bg-slate-50 active:scale-[0.98]
      text-slate-800 font-bold border border-slate-200
      shadow-sm
    `,
    accent: `
      bg-blue-600 hover:bg-blue-700 active:scale-[0.98]
      text-white font-bold border border-blue-600
      shadow-md shadow-blue-500/25
    `,
    secondary: `
      bg-blue-50 hover:bg-blue-100 active:scale-[0.98]
      text-blue-700 font-bold border border-blue-200
    `,
    danger: `
      bg-rose-600 hover:bg-rose-700 active:scale-[0.98]
      text-white font-bold border border-rose-600
      shadow-md shadow-rose-500/20
    `,
    outline: `
      bg-transparent hover:bg-slate-100 active:scale-[0.98]
      text-slate-700 font-bold border border-slate-300
    `,
  }[variant] || '';

  const widthClass = fullWidth ? 'w-full' : '';
  const disabledClass = disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer';

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled) {
      haptics[hapticIntensity]();
    }
    if (onClick) onClick(e);
  };

  return (
    <button
      disabled={disabled}
      onClick={handleClick}
      className={`
        inline-flex items-center justify-center outline-none select-none transition-all duration-150 touch-manipulation
        ${sizeClasses} ${variantClasses} ${widthClass} ${disabledClass} ${className}
      `}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children && <span>{children}</span>}
    </button>
  );
};
