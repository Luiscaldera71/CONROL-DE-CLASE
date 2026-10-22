import React from 'react';

interface AppLogoProps {
  className?: string;
}

/** Logo de AulaControl: birrete (docente) + check de asistencia. */
export const AppLogo: React.FC<AppLogoProps> = ({ className = 'w-20 h-20' }) => (
  <svg viewBox="0 0 512 512" fill="none" className={className} role="img" aria-label="AulaControl">
    <defs>
      <linearGradient id="appLogoBg" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#3b82f6" />
        <stop offset="1" stopColor="#1e3a8a" />
      </linearGradient>
    </defs>
    <rect width="512" height="512" rx="116" fill="url(#appLogoBg)" />
    <path d="M256 112 440 196 256 280 72 196Z" fill="#fff" />
    <path d="M142 246v74c0 34 52 62 114 62s114-28 114-62v-74L256 304Z" fill="#fff" fillOpacity=".9" />
    <path d="M440 196v92" stroke="#bfdbfe" strokeWidth="12" strokeLinecap="round" />
    <circle cx="440" cy="296" r="15" fill="#bfdbfe" />
    <circle cx="356" cy="372" r="68" fill="#10b981" stroke="#fff" strokeWidth="14" />
    <path d="m325 373 23 24 44-50" stroke="#fff" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
