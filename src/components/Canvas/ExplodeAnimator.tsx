'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { usePartStore } from '@/store/usePartStore';

const LERP_SPEED = 0.06;
const MIN_CHANGE = 0.01;

export function ExplodeAnimator() {
  const currentSpread = useRef(0);
  const lastAppliedSpread = useRef(0);

  useFrame(() => {
    const state = usePartStore.getState();
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
