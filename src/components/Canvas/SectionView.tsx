'use client';

import React, { useRef, useMemo, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { usePartStore } from '@/store/usePartStore';

// Create grid helper geometries as constants (no dependencies on state)
const _planeGeom = new THREE.PlaneGeometry(10, 10);
const _gridHelperFront = new THREE.GridHelper(10, 10, '#3b82f6', '#93c5fd');
const _gridHelperSideX = new THREE.GridHelper(10, 10, '#3b82f6', '#93c5fd');
const _gridHelperSideZ = new THREE.GridHelper(10, 10, '#3b82f6', '#93c5fd');

// Pre-apply rotations
_gridHelperSideX.rotation.set(0, 0, -Math.PI / 2);
_gridHelperSideZ.rotation.set(Math.PI / 2, 0, 0);

/**
 * Section view: applies a clipping plane to all meshes to create
 * a cross-section effect, revealing internal geometry.
 *
 * Uses local clipping planes on each material so individual parts
 * can be clipped independently, with a visible cut face.
 */
export function SectionView() {
  const sectionViewEnabled = usePartStore((s) => s.sectionViewEnabled);
  const sectionViewPosition = usePartStore((s) => s.sectionViewPosition);
  const sectionViewAxis = usePartStore((s) => s.sectionViewAxis);
  const { gl } = useThree();
  const initialClippingRef = useRef(false);
  const lastAppliedRef = useRef<{ enabled: boolean; axis: string; position: number } | null>(null);

  // Enable local clipping on the renderer once
  useEffect(() => {
    if (!initialClippingRef.current) {
      gl.localClippingEnabled = true;
      initialClippingRef.current = true;
    }
  }, [gl]);

  // Create the clipping plane based on position and axis
  const clippingPlane = useMemo(() => {
    const normal = new THREE.Vector3();
    switch (sectionViewAxis) {
      case 'x':
        normal.set(1, 0, 0);
        break;
      case 'y':
        normal.set(0, 1, 0);
        break;
      case 'z':
        normal.set(0, 0, 1);
        break;
      default:
        normal.set(0, 1, 0);
    }
    return new THREE.Plane(normal, -sectionViewPosition);
  }, [sectionViewAxis, sectionViewPosition]);

  // Apply section view whenever the relevant state changes
  useEffect(() => {
    const parts = usePartStore.getState().parts;
    const stateKey = { enabled: sectionViewEnabled, axis: sectionViewAxis, position: sectionViewPosition };

    // Skip if nothing changed
    if (
      lastAppliedRef.current &&
      lastAppliedRef.current.enabled === stateKey.enabled &&
      lastAppliedRef.current.axis === stateKey.axis &&
      lastAppliedRef.current.position === stateKey.position
    ) {
      return;
    }
    lastAppliedRef.current = stateKey;

    const planes = sectionViewEnabled ? [clippingPlane] : [];

    for (const part of Object.values(parts)) {
      const obj = part.object;
      if (!obj) continue;

      obj.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const materials = Array.isArray(child.material)
            ? child.material
            : [child.material];

          for (const mat of materials) {
            if (mat) {
              mat.clippingPlanes = planes;
              mat.clipShadows = sectionViewEnabled;
              mat.needsUpdate = true;
            }
          }
        }
      });
    }
  }, [sectionViewEnabled, sectionViewAxis, sectionViewPosition, clippingPlane]);

  // --- All hooks above must be called unconditionally ---

  // Compute visual indicator values (hooks stay before early return)
  const planeRotation = useMemo(() => {
    if (sectionViewAxis === 'x') return new THREE.Euler(0, 0, -Math.PI / 2);
    if (sectionViewAxis === 'z') return new THREE.Euler(Math.PI / 2, 0, 0);
    return new THREE.Euler(0, 0, 0);
  }, [sectionViewAxis]);

  // Select the correct pre-rotated grid helper
  const gridHelper = useMemo(() => {
    if (sectionViewAxis === 'x') return _gridHelperSideX;
    if (sectionViewAxis === 'z') return _gridHelperSideZ;
    return _gridHelperFront;
  }, [sectionViewAxis]);

  // Compute plane position vector (no hooks)
  const axisVec = useMemo(() => {
    switch (sectionViewAxis) {
      case 'x': return new THREE.Vector3(1, 0, 0);
      case 'y': return new THREE.Vector3(0, 1, 0);
      case 'z': return new THREE.Vector3(0, 0, 1);
      default: return new THREE.Vector3(0, 1, 0);
    }
  }, [sectionViewAxis]);

  // If section view is enabled, render a visual indicator plane
  if (!sectionViewEnabled) return null;

  const planePosition = axisVec.clone().multiplyScalar(sectionViewPosition);

  return (
    <group>
      {/* Semi-transparent cut plane visual */}
      <mesh geometry={_planeGeom} position={planePosition} rotation={planeRotation}>
        <meshBasicMaterial
          color="#3b82f6"
          transparent
          opacity={0.08}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Grid lines on the cut plane */}
      <primitive object={gridHelper} position={planePosition} />
    </group>
  );
}
