import React, { createContext, useContext, useState, useRef, useEffect } from 'react';

/**
 * Liqui Design Glass Menubar Component
 * Inspired by https://liqui.design/r/menubar.json
 * Features iOS/macOS floating glass capsule bar, trigger pills, popup glass menus, and keyboard shortcuts.
 */

interface MenubarContextType {
  activeMenu: string | null;
  setActiveMenu: (menu: string | null) => void;
}

const MenubarContext = createContext<MenubarContextType | undefined>(undefined);

export interface MenubarProps {
  children: React.ReactNode;
  className?: string;
}

export const Menubar: React.FC<MenubarProps> = ({ children, className = '' }) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <MenubarContext.Provider value={{ activeMenu, setActiveMenu }}>
      <div
        ref={ref}
        className={`
          inline-flex items-center gap-1 p-1 rounded-2xl
          liquid-glass border border-white/75 border-t-2 border-t-white shadow-lg
          ${className}
        `}
      >
        {children}
      </div>
    </MenubarContext.Provider>
  );
};

interface MenubarMenuContextType {
  value: string;
}

const MenubarMenuContext = createContext<MenubarMenuContextType | undefined>(undefined);

export interface MenubarMenuProps {
  value?: string;
  children: React.ReactNode;
}

export const MenubarMenu: React.FC<MenubarMenuProps> = ({ value: providedValue, children }) => {
  const autoValue = useRef(Math.random().toString(36).substring(7)).current;
  const value = providedValue || autoValue;

  return (
    <MenubarMenuContext.Provider value={{ value }}>
      <div className="relative inline-block">{children}</div>
    </MenubarMenuContext.Provider>
  );
};

export interface MenubarTriggerProps {
  children: React.ReactNode;
  className?: string;
}

export const MenubarTrigger: React.FC<MenubarTriggerProps> = ({ children, className = '' }) => {
  const context = useContext(MenubarContext);
  const menuContext = useContext(MenubarMenuContext);

  if (!context || !menuContext) throw new Error('MenubarTrigger must be used within MenubarMenu');

  const { activeMenu, setActiveMenu } = context;
  const { value } = menuContext;
  const isOpen = activeMenu === value;

  return (
    <button
      type="button"
      onClick={() => setActiveMenu(isOpen ? null : value)}
      className={`
        px-3 py-1.5 rounded-xl text-xs font-bold transition-all outline-none cursor-pointer
        ${isOpen
          ? 'bg-indigo-100/90 text-indigo-950 shadow-sm border border-indigo-200/80'
          : 'text-slate-800 hover:bg-white/60 hover:text-slate-900'
        }
        ${className}
      `}
    >
      {children}
    </button>
  );
};

export interface MenubarContentProps {
  children: React.ReactNode;
  className?: string;
}

export const MenubarContent: React.FC<MenubarContentProps> = ({ children, className = '' }) => {
  const context = useContext(MenubarContext);
  const menuContext = useContext(MenubarMenuContext);

  if (!context || !menuContext) throw new Error('MenubarContent must be used within MenubarMenu');

  const { activeMenu } = context;
  const { value } = menuContext;
  const isOpen = activeMenu === value;

  if (!isOpen) return null;

  return (
    <div
      className={`
        absolute top-full left-0 mt-1.5 z-50 p-1.5 rounded-2xl min-w-[180px]
        liquid-glass border border-white/75 border-t-2 border-t-white shadow-2xl
        animate-in fade-in zoom-in-95 duration-150 space-y-0.5
        ${className}
      `}
    >
      {children}
    </div>
  );
};

export interface MenubarItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export const MenubarItem: React.FC<MenubarItemProps> = ({ children, onClick, className = '' }) => {
  const context = useContext(MenubarContext);

  const handleClick = () => {
    if (onClick) onClick();
    if (context) context.setActiveMenu(null);
  };

  return (
    <div
      onClick={handleClick}
      className={`
        flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-800
        hover:bg-white/60 hover:text-slate-900 cursor-pointer transition-all
        ${className}
      `}
    >
      {children}
    </div>
  );
};

export interface MenubarShortcutProps {
  children: React.ReactNode;
  className?: string;
}

export const MenubarShortcut: React.FC<MenubarShortcutProps> = ({ children, className = '' }) => (
  <span className={`font-mono text-[10px] text-slate-500 bg-slate-100/80 px-1.5 py-0.5 rounded-md border border-slate-200/60 ${className}`}>
    {children}
  </span>
);

export const MenubarSeparator: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`h-px bg-white/40 my-1 ${className}`} />
);
