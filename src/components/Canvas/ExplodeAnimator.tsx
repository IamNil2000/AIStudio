'use client';

import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { usePartStore } from '@/store/usePartStore';

const LERP_SPEED = 0.04;
// Very small threshold so the lerp reaches 0 before stalling.
// Per-frame change = spread * LERP_SPEED. With 0.0001, stall point ~ 0.0025,
// and the snap-to-target (0.001) fires before that.
const MIN_CHANGE = 0.0001;

export function ExplodeAnimator() {
  const currentSpread = useRef(0);
  const lastAppliedSpread = useRef(0);
  const knownResetVersion = useRef(0);

  useFrame(() => {
    const state = usePartStore.getState();

    // IMPORTANT: Check resetVersion inside useFrame, NOT in a useEffect.
    // Zustand's set() is synchronous but React re-render is deferred.
    // If the next rAF fires before React commits the ExplodeAnimator's
    // re-render, the useEffect hasn't run yet — and the stale internal
    // refs would cause applyExplode to re-explode the freshly-reset parts.
    if (state.resetVersion !== knownResetVersion.current) {
      knownResetVersion.current = state.resetVersion;
      currentSpread.current = 0;
      lastAppliedSpread.current = 0;
    }

    const target = state.explodeTarget;
    const partsCount = Object.keys(state.parts).length;
    if (partsCount === 0) return;

    // Smoothly interpolate current spread toward target
    currentSpread.current += (target - currentSpread.current) * LERP_SPEED;

    // Snap to target if very close
    if (Math.abs(currentSpread.current - target) < 0.001) {
      currentSpread.current = target;
    }

    // Only apply if the spread has changed meaningfully
    const change = Math.abs(currentSpread.current - lastAppliedSpread.current);
    if (change < MIN_CHANGE) return;

    lastAppliedSpread.current = currentSpread.current;
    state.applyExplode(currentSpread.current);
  });

  return null;
}
