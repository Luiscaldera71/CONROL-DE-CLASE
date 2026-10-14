import React from 'react';
import { useHapticFeedback } from '../../hooks/useHapticFeedback';

export interface GlassSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export const GlassSwitch: React.FC<GlassSwitchProps> = ({
  checked,
  onChange,
  label,
  disabled = false,
  className = ''
}) => {
  const haptics = useHapticFeedback();

  const handleToggle = () => {
    if (disabled) return;
    haptics.medium();
    onChange(!checked);
  };

  return (
    <label
      onClick={handleToggle}
      className={`
        inline-flex items-center gap-3 select-none cursor-pointer
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
    >
      <div
        className={`
          relative w-12 h-6 rounded-full transition-all duration-300 p-0.5 border
          ${checked
            ? 'bg-blue-600 border-blue-600 shadow-xs'
            : 'bg-slate-200 border-slate-300'
          }
        `}
      >
        <div
          className={`
            w-5 h-5 rounded-full bg-white shadow-xs
            transform transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
            ${checked ? 'translate-x-6' : 'translate-x-0'}
          `}
        />
      </div>

      {label && (
        <span className="text-xs font-bold text-slate-800">
          {label}
        </span>
      )}
    </label>
  );
};
