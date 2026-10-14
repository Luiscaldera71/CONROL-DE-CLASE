/**
 * Date and Time utilities configured specifically for Colombia (America/Bogota, UTC-5).
 * Prevents UTC timezone shift errors when dealing with attendance, classes, and notifications.
 */

export const COLOMBIA_TIMEZONE = 'America/Bogota';

/**
 * Returns today's date in Colombia timezone formatted as YYYY-MM-DD.
 */
export const getColombiaDateString = (d: Date = new Date()): string => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: COLOMBIA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(d);
};

// Backwards-compatible alias ensuring all callers use Colombia timezone
export const getLocalDateString = getColombiaDateString;

/**
 * Returns tomorrow's date formatted as YYYY-MM-DD in Colombia timezone.
 */
export const getTomorrowDateString = (d: Date = new Date()): string => {
  // Adding 24 hours to current instant and formatting in Colombia
  const nextDay = new Date(d.getTime() + 24 * 60 * 60 * 1000);
  return getColombiaDateString(nextDay);
};

/**
 * Returns current time in Colombia formatted as HH:mm (24 hours).
 */
export const getColombiaTimeString = (d: Date = new Date()): string => {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: COLOMBIA_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(d);
};

/**
 * Returns the day of the week in Colombia in Spanish (e.g. "Lunes", "Martes", "Miércoles").
 */
export const getColombiaDayName = (d: Date = new Date()): string => {
  const day = new Intl.DateTimeFormat('es-CO', {
    timeZone: COLOMBIA_TIMEZONE,
    weekday: 'long'
  }).format(d);
  return capitalize(day);
};

// Backwards-compatible alias
export const getSpanishDayName = getColombiaDayName;

/**
 * Returns the Spanish day of week for any YYYY-MM-DD date string in Colombia timezone.
 */
export const getDayNameFromDateString = (dateStr: string): string => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  // Setting midday (12:00) avoids any boundary shifts
  const d = new Date(year, month - 1, day, 12, 0, 0);
  return getColombiaDayName(d);
};

/**
 * Returns tomorrow's day of week in Colombia in Spanish (e.g. "Jueves").
 */
export const getTomorrowDayName = (d: Date = new Date()): string => {
  const nextDay = new Date(d.getTime() + 24 * 60 * 60 * 1000);
  return getColombiaDayName(nextDay);
};

/**
 * Formats a date for Colombia header display: e.g. "Miércoles, 14 de octubre de 2026"
 */
export const formatColombiaFullDate = (dateStrOrDate?: string | Date): string => {
  let targetDate: Date;
  if (!dateStrOrDate) {
    targetDate = new Date();
  } else if (typeof dateStrOrDate === 'string') {
    const [y, m, d] = dateStrOrDate.split('-').map(Number);
    targetDate = new Date(y, m - 1, d, 12, 0, 0);
  } else {
    targetDate = dateStrOrDate;
  }

  const str = new Intl.DateTimeFormat('es-CO', {
    timeZone: COLOMBIA_TIMEZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(targetDate);

  return capitalize(str);
};

/**
 * Formats a 24h time string (e.g. "07:30") to 12h format ("7:30 AM")
 */
export const formatTime12h = (time24?: string): string => {
  if (!time24) return '';
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  if (isNaN(h)) return time24;
  const period = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${mStr || '00'} ${period}`;
};

function capitalize(s: string): string {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}
