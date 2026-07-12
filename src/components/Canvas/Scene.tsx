'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import {
  OrbitControls,
  Grid,
} from '@react-three/drei';
import * as THREE from 'three';
import { usePartStore } from '@/store/usePartStore';
import { Model } from './Model';
import { AnimationPlayer } from './AnimationPlayer';
import { PartControls } from './Controls';
import { MeasurementLines } from './MeasurementLines';
import { ExplodeAnimator } from './ExplodeAnimator';
import { SectionView } from './SectionView';
import { DetailedPartModal } from '@/components/UI/DetailedPartModal';
import type { ControlsHandle } from '@/types';

/**
 * Bridge component: reads the OrbitControls instance registered via makeDefault
 * and exposes it through the ref so sibling components (Model, PartControls)
 * can sync camera target and focus operations.
 */
function ControlsRefBridge({
  controlsRef,
}: {
  controlsRef: React.MutableRefObject<ControlsHandle | null>;
}) {
  const { controls } = useThree();

  useEffect(() => {
    if (controls) {
      controlsRef.current = controls as unknown as ControlsHandle;
    }
  }, [controls, controlsRef]);

  return null;
}

/**
 * Listens for camera preset events dispatched from keyboard shortcuts.
 */
function CameraPresetListener({
  controlsRef,
}: {
  controlsRef: React.MutableRefObject<ControlsHandle | null>;
}) {
  const { camera } = useThree();

  const setCameraView = useCallback(
    (view: 'front' | 'back' | 'top' | 'bottom' | 'right' | 'left' | 'perspective') => {
      if (!(camera instanceof THREE.PerspectiveCamera)) return;

      const distance = camera.position.length();
      const target = controlsRef.current?.target || new THREE.Vector3(0, 0, 0);

      const views: Record<string, THREE.Vector3> = {
        front: new THREE.Vector3(0, 0, distance),
        back: new THREE.Vector3(0, 0, -distance),
        top: new THREE.Vector3(0, distance, 0),
        bottom: new THREE.Vector3(0, -distance, 0),
        right: new THREE.Vector3(distance, 0, 0),
        left: new THREE.Vector3(-distance, 0, 0),
        perspective: new THREE.Vector3(distance * 0.5, distance * 0.5, distance),
      };

      const pos = views[view] || views.perspective;
      camera.position.copy(pos);
      camera.lookAt(target);

      if (controlsRef.current) {
        controlsRef.current.target.copy(target);
        controlsRef.current.update();
      }
    },
    [camera, controlsRef]
  );

  // Listen for camera preset events
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (typeof detail === 'string') {
        setCameraView(detail as 'front' | 'back' | 'top' | 'bottom' | 'right' | 'left' | 'perspective');
      }
    };
    window.addEventListener('set-camera-view', handler);
    return () => window.removeEventListener('set-camera-view', handler);
  }, [setCameraView]);

  return null;
}

export function Scene() {
  const modelLoaded = usePartStore((s) => s.modelLoaded);
  const explodeTarget = usePartStore((s) => s.explodeTarget);
  const selectedIds = usePartStore((s) => s.selectedIds);
  const isExploding = explodeTarget > 0.5;
  const controlsRef = useRef<ControlsHandle>(null!);

  return (
    <div className="w-full h-full relative">
      {/* Part detail modal — top-right corner of the canvas viewport */}
      {modelLoaded && selectedIds.length === 1 && (
        <DetailedPartModal partId={selectedIds[0]} />
      )}

      <Canvas
        dpr={[0.4, 1.5]}
        camera={{
          position: [5, 5, 10],
          fov: 45,
          near: 0.1,
          far: 8000,
        }}
        onCreated={({ scene, gl }) => {
          scene.background = new THREE.Color('#e8e8ec');

          // Simple tone mapping
          gl.toneMapping = THREE.LinearToneMapping;
          gl.toneMappingExposure = 1.0;

          // Shadows disabled for performance during animation
          gl.shadowMap.enabled = false;
        }}
        onPointerMissed={() => {
          // Clicking on empty canvas space deselects any selected part
          usePartStore.getState().deselectAll();
        }}
        style={{ width: '100%', height: '100%' }}
        gl={{
          antialias: false,
          alpha: false,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
      >
        {/* Key light (no shadows for performance) */}
        <directionalLight
          position={[10, 15, 10]}
          intensity={1.8}
        />

        {/* Fill light: cool ambient fill from opposite side */}
        <directionalLight position={[-8, 5, -8]} intensity={0.5} color="#a0c4ff" />

        {/* Hemisphere light */}
        <hemisphereLight
          args={['#d4d4ff', '#808080', 0.4]}
        />

        {/* OrbitControls with smooth damping */}
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.1}
          minPolarAngle={0}
          maxPolarAngle={Math.PI}
        />

        {/* Sync the controls instance to our ref */}
        <ControlsRefBridge controlsRef={controlsRef} />

        {/* Camera preset event listener */}
        <CameraPresetListener controlsRef={controlsRef} />

        {modelLoaded && (
          <>
            {/* Ground grid (hidden during explode for performance) */}
            {!isExploding && (
              <Grid
                cellColor="#d4d4d8"
                cellSize={2}
                sectionColor="#c0c0c4"
                sectionSize={10}
                args={[30, 30]}
                fadeDistance={20}
                position={[0, -0.01, 0]}
              />
            )}

            {/* Gizmo removed for performance */}

            {/* Renders each part individually with clickable selection */}
            <Model controlsRef={controlsRef} />

            {/* GLTF animation player */}
            <AnimationPlayer />

            {/* Keyboard and mouse controls for transforming selected parts */}
            <PartControls controlsRef={controlsRef} />

            {/* Visual measurement lines between parts */}
            <MeasurementLines />

            {/* Smooth explode/reassemble animation */}
            <ExplodeAnimator />

            {/* Section view / clipping plane */}
            <SectionView />
          </>
        )}
      </Canvas>
    </div>
  );
}
