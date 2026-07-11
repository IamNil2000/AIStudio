'use client';

import React, { useMemo, useRef, useLayoutEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { usePartStore } from '@/store/usePartStore';
import { PartMesh } from './Part';
import type { ControlsHandle } from '@/types';

interface ModelProps {
  controlsRef: React.RefObject<ControlsHandle | null>;
}

export function Model({ controlsRef }: ModelProps) {
  const parts = usePartStore((s) => s.parts);
  const modelLoaded = usePartStore((s) => s.modelLoaded);
  const groupRef = useRef<THREE.Group>(null);
  const { camera: r3fCamera } = useThree();

  // Collect unique object references for rendering
  const renderedParts = useMemo(() => {
    return Object.entries(parts).map(([id, part]) => ({
      id,
      object: part.object,
      visible: part.visible,
    }));
  }, [parts]);

  // Auto-fit camera when model loads.
  // Uses useLayoutEffect so this runs before the first browser paint,
  // preventing a flash of the default camera position.
  useLayoutEffect(() => {
    if (!modelLoaded || Object.keys(parts).length === 0 || !groupRef.current) return;

    const box = new THREE.Box3();
    const tempVec = new THREE.Vector3();

    for (const part of Object.values(parts)) {
      const obj = part.object;
      if (!obj) continue;

      if (obj instanceof THREE.Mesh && obj.geometry) {
        obj.geometry.computeBoundingBox();
        const gBox = obj.geometry.boundingBox;
        if (gBox) {
          for (let cx = 0; cx <= 1; cx++) {
            for (let cy = 0; cy <= 1; cy++) {
              for (let cz = 0; cz <= 1; cz++) {
                tempVec.set(
                  cx ? gBox.max.x : gBox.min.x,
                  cy ? gBox.max.y : gBox.min.y,
                  cz ? gBox.max.z : gBox.min.z
                );
                tempVec.applyMatrix4(part.currentMatrix);
                box.expandByPoint(tempVec);
              }
            }
          }
        }
      } else if (obj instanceof THREE.Group) {
        obj.traverse((child) => {
          if (child instanceof THREE.Mesh && child.geometry) {
            child.geometry.computeBoundingBox();
            const gBox = child.geometry.boundingBox;
            if (gBox) {
              for (let cx = 0; cx <= 1; cx++) {
                for (let cy = 0; cy <= 1; cy++) {
                  for (let cz = 0; cz <= 1; cz++) {
                    tempVec.set(
                      cx ? gBox.max.x : gBox.min.x,
                      cy ? gBox.max.y : gBox.min.y,
                      cz ? gBox.max.z : gBox.min.z
                    );
                    tempVec.applyMatrix4(part.currentMatrix);
                    box.expandByPoint(tempVec);
                  }
                }
              }
            }
          }
        });
      }
    }

    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    // Guard against degenerate bounding boxes
    if (maxDim < 0.001) {
      // Fallback: use a sensible default camera position
      if (r3fCamera instanceof THREE.PerspectiveCamera) {
        r3fCamera.position.set(5, 5, 10);
        r3fCamera.lookAt(0, 0, 0);
      }
      return;
    }

    if (r3fCamera instanceof THREE.PerspectiveCamera) {
      const distance = Math.max(maxDim * 2.5, 0.5);
      r3fCamera.position.set(center.x, center.y + maxDim * 0.5, center.z + distance);
      r3fCamera.lookAt(center);

      // Sync the OrbitControls target so the controls orbit around the model center.
      // IMPORTANT: Do NOT call controls.update() here — that would re-read OrbitControls'
      // stale internal spherical coordinates and reposition the camera, undoing the auto-fit.
      // Instead, just update the target. On the next frame, OrbitControls.update() will
      // read the current camera position and compute fresh spherical coordinates from it.
      if (controlsRef.current?.target) {
        controlsRef.current.target.copy(center);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelLoaded]);

  if (!modelLoaded || Object.keys(parts).length === 0) return null;

  return (
    <group ref={groupRef}>
      {renderedParts.map(({ id, object, visible }) => {
        if (!visible) return null;
        return <PartMesh key={id} partId={id} object={object} />;
      })}
    </group>
  );
}
