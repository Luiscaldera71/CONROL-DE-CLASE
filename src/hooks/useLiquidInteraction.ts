import React, { useState, useRef, useCallback } from 'react';
import { useHapticFeedback } from './useHapticFeedback';

export interface LiquidRipple {
  id: string;
  x: number;
  y: number;
  size: number;
}

export interface UseLiquidInteractionOptions {
  enableHaptic?: boolean;
  hapticIntensity?: 'light' | 'medium' | 'success' | 'error';
  enableRipple?: boolean;
  enableSpecularGlow?: boolean;
}

export const useLiquidInteraction = (options: UseLiquidInteractionOptions = {}) => {
  const {
    enableHaptic = true,
    hapticIntensity = 'light',
    enableRipple = true,
    enableSpecularGlow = true
  } = options;

  const haptics = useHapticFeedback();
  const [ripples, setRipples] = useState<LiquidRipple[]>([]);
  const [glowPos, setGlowPos] = useState<{ x: number; y: number; active: boolean }>({ x: 50, y: 50, active: false });
  const containerRef = useRef<HTMLDivElement | HTMLButtonElement | null>(null);

  // Mouse Move Pointer Specular Highlight Tracking
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!enableSpecularGlow || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setGlowPos({ x, y, active: true });
  }, [enableSpecularGlow]);

  const handlePointerLeave = useCallback(() => {
    if (!enableSpecularGlow) return;
    setGlowPos(prev => ({ ...prev, active: false }));
  }, [enableSpecularGlow]);

  // Click/Touch Local Liquid Ripple Perturbation
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (enableHaptic) {
      haptics[hapticIntensity]();
    }

    if (!enableRipple || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const size = Math.max(rect.width, rect.height) * 1.5;
    const id = `ripple_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    setRipples(prev => [...prev, { id, x, y, size }]);

    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== id));
    }, 600);
  }, [enableHaptic, enableRipple, haptics, hapticIntensity]);

  return {
    containerRef,
    ripples,
    glowPos,
    handlers: {
      onPointerMove: handlePointerMove,
      onPointerLeave: handlePointerLeave,
      onPointerDown: handlePointerDown,
    }
  };
};
