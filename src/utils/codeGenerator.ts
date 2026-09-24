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

export function cleanQRCode(rawPayload: string): string {
  if (!rawPayload) return '';
  const trimmed = rawPayload.trim().toUpperCase();
  // Si viene con prefijo seguro "AC:" o similar
  if (trimmed.startsWith('AC:')) {
    return trimmed.substring(3).trim();
  }
  return trimmed;
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
