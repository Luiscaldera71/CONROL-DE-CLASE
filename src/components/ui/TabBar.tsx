import React, { useState } from 'react';
import { useHapticFeedback } from '../../hooks/useHapticFeedback';

export interface TabBarProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  children: React.ReactNode;
}

export interface TabBarItemProps {
  value: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  badge?: number | boolean;
  badgeLabel?: string;
  isPrimary?: boolean;
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
}

export interface TabBarSearchProps {
  icon: React.ReactNode;
  children: React.ReactNode;
  placeholder?: string;
  query?: string;
  onQueryChange?: (query: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

export const TabBarItem: React.FC<TabBarItemProps> = () => null;
export const TabBarSearch: React.FC<TabBarSearchProps> = () => null;

export const TabBar: React.FC<TabBarProps> = ({
  value,
  onValueChange,
  className = '',
  children
}) => {
  const [internalSearchOpen, setInternalSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const haptics = useHapticFeedback();

  const childrenArray = React.Children.toArray(children);
  const items: any[] = [];
  let searchElement: any = null;

  childrenArray.forEach(child => {
    if (React.isValidElement(child)) {
      if ((child.type as any) === TabBarSearch) {
        searchElement = child;
      } else {
        items.push(child);
      }
    }
  });

  const searchProps = searchElement ? (searchElement.props as TabBarSearchProps) : null;
  const isSearchOpen = searchProps?.open ?? internalSearchOpen;

  const handleSearchOpen = (next: boolean) => {
    haptics.light();
    if (searchProps?.onOpenChange) {
      searchProps.onOpenChange(next);
    } else {
      setInternalSearchOpen(next);
    }
  };

  const handleQueryChange = (val: string) => {
    if (searchProps?.onQueryChange) {
      searchProps.onQueryChange(val);
    } else {
      setSearchQuery(val);
    }
  };

  const currentQuery = searchProps?.query ?? searchQuery;

  return (
    <div className={`relative inline-flex max-w-full items-center gap-2 select-none z-50 ${className}`}>
      {/* Floating Modern Pill Container */}
      <div className="relative flex items-center p-1.5 bg-white/95 backdrop-blur-md rounded-full border border-slate-200/90 shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
        {items.map(item => {
          const itemProps = item.props as TabBarItemProps;
          const isActive = itemProps.value === value;
          const { value: itemValue, icon, children: itemLabel, badge, badgeLabel, isPrimary, disabled, onClick } = itemProps;

          return (
            <button
              key={itemValue}
              type="button"
              disabled={disabled}
              onClick={() => {
                haptics.light();
                onValueChange(itemValue);
                if (onClick) onClick();
              }}
              className={`
                relative min-w-[58px] sm:min-w-[68px] px-3.5 rounded-full flex flex-col items-center justify-center gap-0.5
                transition-all duration-150 outline-none active:scale-[0.95] touch-manipulation select-none
                ${isPrimary
                  ? 'h-[48px] -mt-3.5 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/35 border-2 border-white font-black'
                  : isActive
                    ? 'h-[42px] bg-blue-50 text-blue-600 font-bold border border-blue-200/80 shadow-xs'
                    : 'h-[42px] text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }
                ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {/* Icon & Badge */}
              <div className="relative flex items-center justify-center">
                <span className={`transition-transform duration-150 ${isActive || isPrimary ? 'scale-105' : ''}`}>
                  {icon}
                </span>

                {badge !== undefined && badge !== false && (
                  <span
                    aria-label={badgeLabel ?? (badge === true ? 'tiene actualizaciones' : `${badge} nuevos`)}
                    className="absolute -top-1 -right-2.5 h-4 min-w-[16px] px-1 bg-rose-500 text-white font-black text-[9px] leading-none rounded-full flex items-center justify-center border border-white shadow-sm"
                  >
                    {badge === true ? '' : badge > 99 ? '99+' : badge}
                  </span>
                )}
              </div>

              {/* Label */}
              <span className={`text-[10px] leading-none whitespace-nowrap tracking-tight ${isPrimary ? 'text-white font-bold' : isActive ? 'text-blue-600 font-bold' : 'text-slate-500 font-medium'}`}>
                {itemLabel}
              </span>
            </button>
          );
        })}
      </div>

      {/* Floating Search Trigger Button */}
      {searchProps && !isSearchOpen && (
        <div className="relative p-1.5 bg-white rounded-full border border-slate-200 shadow-md">
          <button
            type="button"
            onClick={() => handleSearchOpen(true)}
            className="w-[42px] h-[42px] rounded-full flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all duration-150 active:scale-[0.95]"
            title={String(searchProps.children)}
          >
            {searchProps.icon}
          </button>
        </div>
      )}

      {/* Expandable Glass Search Field */}
      {searchProps && isSearchOpen && (
        <div className="absolute inset-0 z-50 flex items-center p-1.5 bg-white rounded-full border border-slate-200 shadow-xl animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center gap-2 w-full px-2">
            <span className="text-slate-400 shrink-0">
              {searchProps.icon}
            </span>
            <input
              type="search"
              autoFocus
              value={currentQuery}
              onChange={e => handleQueryChange(e.target.value)}
              placeholder={searchProps.placeholder ?? 'Buscar...'}
              onKeyDown={e => {
                if (e.key === 'Escape') handleSearchOpen(false);
              }}
              className="flex-1 min-w-0 bg-transparent text-xs font-semibold text-slate-900 placeholder:text-slate-400 outline-none border-none"
            />
            <button
              type="button"
              onClick={() => handleSearchOpen(false)}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 px-2 py-1 rounded-full transition-colors shrink-0"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
