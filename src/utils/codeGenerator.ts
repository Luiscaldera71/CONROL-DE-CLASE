// Generador de códigos alfanuméricos seguros y no ambiguos (omite 0, O, 1, I)
const CHARSET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export function generateStudentCode(existingCodes?: Set<string>): string {
  let code = '';
  let attempts = 0;
  
  do {
    code = '';
    for (let i = 0; i < 6; i++) {
      const randomIndex = Math.floor(Math.random() * CHARSET.length);
      code += CHARSET[randomIndex];
    }
    attempts++;
  } while (existingCodes && existingCodes.has(code) && attempts < 100);

  return code;
}

export const DEFAULT_PORTAL_DOMAIN = 'https://controldeclase.vercel.app';

/**
 * Obtiene la URL completa del Portal del Estudiante para incrustar en el código QR.
 * Cuando un estudiante o acudiente escanea con la cámara nativa de su celular,
 * el teléfono abrirá directamente esta dirección web cargando sus notas y asistencias.
 */
export function getStudentPortalUrl(uniqueCode: string): string {
  const clean = uniqueCode.trim().toUpperCase();
  
  // 1. Revisar si el docente configuró un dominio web personalizado en localStorage
  let baseUrl = '';
  try {
    baseUrl = localStorage.getItem('aulacontrol_custom_portal_url') || '';
  } catch {
    // ignorar error de acceso a storage
  }

  // 2. Por defecto siempre usar https://controldeclase.vercel.app
  if (!baseUrl.trim()) {
    baseUrl = DEFAULT_PORTAL_DOMAIN;
  }

  // Quitar barra final si la tiene
  baseUrl = baseUrl.trim().replace(/\/+$/, '');

  return `${baseUrl}/estudiante?codigo=${encodeURIComponent(clean)}`;
}

/**
 * Limpia y extrae el código único del estudiante desde cualquier formato de QR:
 * - URL completa: https://miapp.com/estudiante?codigo=A7K92P
 * - URL en path: https://miapp.com/estudiante/A7K92P
 * - Prefijo clásico: AC:A7K92P
 * - Código directo: A7K92P
 */
export function cleanQRCode(rawPayload: string): string {
  if (!rawPayload) return '';
  let text = String(rawPayload).trim();

  // Decodificar si viene con codificación de URI (ej: %2F, %3F, %3D)
  try {
    text = decodeURIComponent(text);
  } catch {
    // Si falla, continuar con text
  }

  // Quitar comillas o espacios envolventes accidentales
  text = text.replace(/^["'`]|["'`]$/g, '').trim();

  // 1. Si contiene el parámetro ?codigo=, &codigo=, #codigo= o ?code=, &code=, #code=
  const paramMatch = text.match(/[?&#](?:codigo|code)=([A-Za-z0-9_-]+)/i);
  if (paramMatch && paramMatch[1]) {
    return paramMatch[1].trim().toUpperCase();
  }

  // 2. Si viene en la ruta como /estudiante/CODIGO o /consulta/CODIGO o /student/CODIGO
  const pathMatch = text.match(/\/(?:estudiante|consulta|student)\/([A-Za-z0-9_-]+)/i);
  if (pathMatch && pathMatch[1]) {
    return pathMatch[1].trim().toUpperCase();
  }

  // 3. Si contiene un enlace web (Vercel, controldeclase, localhost o cualquier URL http/https)
  if (
    text.toLowerCase().includes('vercel.app') ||
    text.toLowerCase().includes('controldeclase') ||
    text.toLowerCase().startsWith('http://') ||
    text.toLowerCase().startsWith('https://') ||
    text.toLowerCase().includes('://')
  ) {
    try {
      const urlToParse = text.startsWith('http') ? text : `https://${text}`;
      const urlObj = new URL(urlToParse);

      // Buscar en search params
      const codeFromSearch = urlObj.searchParams.get('codigo') || urlObj.searchParams.get('code');
      if (codeFromSearch) {
        return codeFromSearch.trim().toUpperCase();
      }

      // Buscar en hash si existe (#/estudiante?codigo=...)
      if (urlObj.hash) {
        const hashMatch = urlObj.hash.match(/[?&#](?:codigo|code)=([A-Za-z0-9_-]+)/i);
        if (hashMatch && hashMatch[1]) {
          return hashMatch[1].trim().toUpperCase();
        }
        const hashPathMatch = urlObj.hash.match(/\/(?:estudiante|consulta|student)\/([A-Za-z0-9_-]+)/i);
        if (hashPathMatch && hashPathMatch[1]) {
          return hashPathMatch[1].trim().toUpperCase();
        }
      }

      // Buscar último segmento del pathname
      const parts = urlObj.pathname.split('/').filter(Boolean);
      const last = parts[parts.length - 1];
      if (last && !['estudiante', 'consulta', 'student', 'index.html', ''].includes(last.toLowerCase())) {
        return last.trim().toUpperCase();
      }
      return '';
    } catch {
      const fallbackMatch = text.match(/(?:codigo|code)=([A-Za-z0-9_-]+)/i);
      if (fallbackMatch && fallbackMatch[1]) {
        return fallbackMatch[1].trim().toUpperCase();
      }
      return '';
    }
  }

  // 4. Si viene con prefijo clásico AC: (ej: AC:A7K92P)
  let upper = text.toUpperCase();
  if (upper.startsWith('AC:')) {
    upper = upper.substring(3).trim();
  }

  return upper.trim();
}

// Audio Feedback con Web Audio API (ligero, sin descargar archivos externos)
export function playFeedbackTone(type: 'success' | 'alert' | 'rapid'): void {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else if (type === 'rapid') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(987.77, ctx.currentTime); // B5
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch {
    // Silencioso si el navegador bloquea audio antes de interacción
  }
}

export function triggerHapticFeedback(): void {
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate(80);
    } catch {
      // Ignorar si no está permitido
    }
  }
}
