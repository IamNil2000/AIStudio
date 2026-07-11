'use client';

import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { usePartStore } from '@/store/usePartStore';

/**
 * Handles GLTF animation playback using THREE.AnimationMixer.
 * - Creates and manages the AnimationMixer on the model's scene
 * - Uses useFrame to advance the mixer each frame
 * - Starts/stops the animation based on store's animationPlaying state
 */
export function AnimationPlayer() {
  const modelScene = usePartStore((s) => s.modelScene);
  const animations = usePartStore((s) => s.animations);
  const animationPlaying = usePartStore((s) => s.animationPlaying);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const actionRef = useRef<THREE.AnimationAction | null>(null);

  // Set up the mixer when the scene or animations change
  useEffect(() => {
    if (!modelScene || !animations || animations.length === 0) {
      mixerRef.current = null;
      actionRef.current = null;
      return;
    }

    // Create mixer for the original scene
    const mixer = new THREE.AnimationMixer(modelScene);
    mixerRef.current = mixer;

    // Play all animation clips (or the first one)
    const action = mixer.clipAction(animations[0]);
    actionRef.current = action;

    // If we're already in playing state, start the action
    if (usePartStore.getState().animationPlaying) {
      action.play();
    }

    return () => {
      // Clean up: stop all actions and dispose mixer
      mixer.stopAllAction();
      mixer.uncacheRoot(modelScene);
      mixerRef.current = null;
      actionRef.current = null;
    };
  }, [modelScene, animations]);

  // Start/stop animation when playing state changes
  useEffect(() => {
    const action = actionRef.current;
    if (!action) return;

    if (animationPlaying) {
      // Reset to beginning and play
      action.stop();
      action.play();
    } else {
      action.stop();
    }
  }, [animationPlaying]);

  // Advance the mixer each frame
  useFrame((_, delta) => {
    const mixer = mixerRef.current;
    if (mixer && usePartStore.getState().animationPlaying) {
      mixer.update(delta);
    }
  });

  // This component doesn't render anything visually
  return null;
}

/**
 * Renders the animated scene alongside (or instead of) individual parts.
 * Used by Model.tsx when animation is active.
 */
export function AnimatedScene() {
  const modelScene = usePartStore((s) => s.modelScene);
  const animationPlaying = usePartStore((s) => s.animationPlaying);
  const animCount = usePartStore((s) => s.animations.length);

  // Only render the scene when animation is playing and we have animations
  if (!modelScene || !animationPlaying || animCount === 0) return null;

  return <primitive object={modelScene} />;
}
