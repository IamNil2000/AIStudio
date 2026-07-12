'use client';

import React, { useMemo, useRef, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { usePartStore } from '@/store/usePartStore';
import { PartMesh } from './Part';
import { AnimatedScene } from './AnimationPlayer';
import type { ControlsHandle } from '@/types';

interface ModelProps {
  controlsRef: React.RefObject<ControlsHandle | null>;
}

export function Model({ controlsRef }: ModelProps) {
  const parts = usePartStore((s) => s.parts);
  const modelLoaded = usePartStore((s) => s.modelLoaded);
  const modelScene = usePartStore((s) => s.modelScene);
  const animationPlaying = usePartStore((s) => s.animationPlaying);
  const hasAnimations = usePartStore((s) => s.animations.length > 0);
  const groupRef = useRef<THREE.Group>(null);
  const { camera: r3fCamera, size: viewportSize } = useThree();

  // Collect unique object references for rendering
  const renderedParts = useMemo(() => {
    return Object.entries(parts).map(([id, part]) => ({
      id,
      object: part.object,
      visible: part.visible,
    }));
  }, [parts]);

  // Auto-fit camera when model loads.
  // Uses useEffect (not useLayoutEffect) so Three.js has time to initialize
  // scene matrices and the viewport size before we compute positions.
  useEffect(() => {
    if (!modelLoaded || !modelScene || Object.keys(parts).length === 0) return;

    // Use the model scene for the most reliable bounding box.
    // Box3.setFromObject() traverses the entire scene graph and correctly
    // accounts for all transforms — much more robust than manual part iteration.
    const scene = modelScene;

    // Update world matrices so bounding box is correct
    scene.updateWorldMatrix(true, true);

    const box = new THREE.Box3().setFromObject(scene);
    if (box.isEmpty() || !(r3fCamera instanceof THREE.PerspectiveCamera)) {
      // Fallback
      r3fCamera.position.set(5, 5, 10);
      r3fCamera.lookAt(0, 0, 0);
      if (controlsRef.current?.target) {
        controlsRef.current.target.set(0, 0, 0);
      }
      return;
    }

    const center = box.getCenter(new THREE.Vector3());

    // Compute distance using the bounding sphere and FOV.
    // This is the standard Three.js formula for fitting an object in the viewport.
    const sphere = new THREE.Sphere();
    box.getBoundingSphere(sphere);
    const radius = Math.max(sphere.radius, 0.001);

    const vFov = (r3fCamera.fov * Math.PI) / 180;
    const aspect = viewportSize.width / viewportSize.height;

    // Distance to fit vertically: radius / sin(vFov/2)
    // Distance to fit horizontally: radius / sin(atan(tan(vFov/2) * aspect))
    const distV = radius / Math.sin(vFov / 2);
    const distH = radius / Math.sin(Math.atan(Math.tan(vFov / 2) * aspect));
    // Use the larger distance to ensure the sphere fits BOTH dimensions
    const distance = Math.max(distV, distH) * 1.3; // 30% padding

    // Position camera at a 3/4 perspective: slightly above center, back by distance
    const yOffset = Math.max(radius * 0.4, 0.5);
    r3fCamera.position.set(center.x, center.y + yOffset, center.z + distance);
    r3fCamera.lookAt(center);

    // Sync the OrbitControls target so the controls orbit around the model center.
    // Do NOT call controls.update() here — OrbitControls would re-read its stale
    // internal spherical coordinates and reposition the camera, undoing the auto-fit.
    if (controlsRef.current?.target) {
      controlsRef.current.target.copy(center);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelLoaded, modelScene]);

  if (!modelLoaded || Object.keys(parts).length === 0) return null;

  // When animation is playing and the model has animation data,
  // render the original animated scene instead of individual parts
  if (animationPlaying && hasAnimations) {
    return (
      <group ref={groupRef}>
        <AnimatedScene />
      </group>
    );
  }

  return (
    <group ref={groupRef}>
      {renderedParts.map(({ id, object, visible }) => {
        if (!visible) return null;
        return <PartMesh key={id} partId={id} object={object} />;
      })}
    </group>
  );
}
