import React from 'react';
import { useHapticFeedback } from '../../hooks/useHapticFeedback';

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  haptic?: boolean;
  hapticIntensity?: 'light' | 'medium' | 'success' | 'error';
  variant?: 'surface' | 'hover' | 'active' | 'modal';
  children: React.ReactNode;
  className?: string;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  interactive = false,
  haptic = true,
  hapticIntensity = 'light',
  variant = 'surface',
  children,
  className = '',
  onClick,
  ...props
}) => {
  const haptics = useHapticFeedback();

  const variantClasses = {
    surface: 'bg-white border border-slate-200/80 shadow-sm',
    hover: 'bg-white border border-slate-200/80 shadow-sm hover:border-blue-300 hover:shadow-md cursor-pointer',
    active: 'bg-blue-50/80 border border-blue-200 text-blue-900',
    modal: 'bg-white border border-slate-200 shadow-xl',
  }[variant];

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (interactive && haptic) {
      haptics[hapticIntensity]();
    }
    if (onClick) onClick(e);
  };

  return (
    <div
      onClick={handleClick}
      className={`
        relative overflow-hidden rounded-3xl p-5 text-slate-900 transition-all duration-200
        ${variantClasses}
        ${interactive ? 'active:scale-[0.985] cursor-pointer touch-manipulation' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
};
