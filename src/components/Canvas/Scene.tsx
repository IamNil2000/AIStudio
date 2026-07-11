'use client';

import React, { useRef, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, GizmoHelper, GizmoViewport } from '@react-three/drei';
import * as THREE from 'three';
import { usePartStore } from '@/store/usePartStore';
import { Model } from './Model';
import { AnimationPlayer } from './AnimationPlayer';
import { PartControls } from './Controls';
import { MeasurementLines } from './MeasurementLines';
import { ExplodeAnimator } from './ExplodeAnimator';
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

export function Scene() {
  const modelLoaded = usePartStore((s) => s.modelLoaded);
  const controlsRef = useRef<ControlsHandle>(null!);

  return (
    <div className="w-full h-full">
      <Canvas
        camera={{
          position: [5, 5, 10],
          fov: 45,
          near: 0.1,
          far: 1000,
        }}
        onCreated={({ scene }) => {
          scene.background = new THREE.Color('#f0f0f2');
        }}
        style={{ width: '100%', height: '100%' }}
      >
        {/* Lights always present for consistent scene */}
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 15, 10]} intensity={1.2} />

        {/* OrbitControls with makeDefault so useThree().controls is populated */}
        <OrbitControls makeDefault enableDamping dampingFactor={0.15} />

        {/* Sync the controls instance to our ref */}
        <ControlsRefBridge controlsRef={controlsRef} />

        {modelLoaded && (
          <>
            <Grid
              cellColor="#d4d4d8"
              cellSize={1}
              sectionColor="#c0c0c4"
              sectionSize={5}
              fadeDistance={50}
              infiniteGrid
              position={[0, -0.01, 0]}
            />

            {/* Axis orientation indicator (bottom-right) */}
            <GizmoHelper
              alignment="bottom-right"
              margin={[80, 80]}
            >
              <GizmoViewport
                axisColors={['#ef4444', '#22c55e', '#3b82f6']}
                labelColor="white"
              />
            </GizmoHelper>

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
          </>
        )}
      </Canvas>
    </div>
  );
}
