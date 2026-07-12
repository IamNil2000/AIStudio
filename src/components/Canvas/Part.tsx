'use client';

import React, { useRef, useMemo, useState } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { usePartStore } from '@/store/usePartStore';

interface PartMeshProps {
  partId: string;
  object: THREE.Object3D;
  children?: React.ReactNode;
}

/**
 * Send part click data to backend for tracking/analytics.
 */
function sendPartClickToBackend(partId: string, partName: string) {
  const payload = {
    meshUuid: partId,
    partName: partName,
    timestamp: new Date().toISOString(),
  };

  fetch('/api/part-click', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {});

  window.dispatchEvent(
    new CustomEvent('part-selected', { detail: payload })
  );
}

// Pre-allocate vector to avoid GC in useFrame hot path
const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scl = new THREE.Vector3();

export function PartMesh({ partId, object, children }: PartMeshProps) {
  const wrapperRef = useRef<THREE.Group>(null);
  const clickRef = useRef<THREE.Mesh>(null);
  const outlineRef = useRef<THREE.Mesh>(null);
  const glowRingRef = useRef<THREE.Mesh>(null);
  const hoverOutlineRef = useRef<THREE.Mesh>(null);

  const selectedIds = usePartStore((s) => s.selectedIds);
  const parts = usePartStore((s) => s.parts);
  const selectPart = usePartStore((s) => s.selectPart);
  const measureMode = usePartStore((s) => s.measureMode);
  const addMeasurePoint = usePartStore((s) => s.addMeasurePoint);

  const [hovered, setHovered] = useState(false);

  const isSelected = selectedIds.includes(partId);
  const part = parts[partId];
  const isVisible = part?.visible ?? true;

  const hoverOpacity = useRef(0);
  const notifiedRef = useRef(false);

  // Clone geometry once – shared by click, hover, and selection meshes
  const isMesh = object instanceof THREE.Mesh;
  const sharedGeom = useMemo(() => {
    if (!isMesh || !object.geometry) return null;
    return object.geometry.clone();
  }, [isMesh, object]);

  // Reset notification flag when selection state changes
  const prevSelected = useRef(isSelected);
  if (isSelected !== prevSelected.current) {
    notifiedRef.current = false;
    prevSelected.current = isSelected;
  }

  // useFrame: sync wrapper position, handle hover fade, and pulse selection glow
  useFrame(({ clock }) => {
    const state = usePartStore.getState();
    const isExploding = state.explodeTarget > 0.5;

    // Always sync wrapper from current matrix
    const currentPart = state.parts[partId];
    if (currentPart && wrapperRef.current) {
      currentPart.currentMatrix.decompose(_pos, _quat, _scl);
      wrapperRef.current.position.copy(_pos);
      wrapperRef.current.quaternion.copy(_quat);
      wrapperRef.current.scale.copy(_scl);
    }

    // Hover fade — skip during explode for performance
    if (!isExploding) {
      const target = hovered ? 1 : 0;
      hoverOpacity.current += (target - hoverOpacity.current) * 0.2;

      if (hoverOutlineRef.current) {
        const mat = hoverOutlineRef.current.material as THREE.MeshBasicMaterial;
        mat.opacity = hoverOpacity.current * 0.15;
        hoverOutlineRef.current.visible = hoverOpacity.current > 0.01;
      }
    }

    // Pulse selection glow (breathing effect)
    if (isSelected) {
      const pulse = 0.5 + Math.sin(clock.getElapsedTime() * 2.5) * 0.5;
      if (outlineRef.current) {
        const mat = outlineRef.current.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.35 + pulse * 0.35;
      }
      if (glowRingRef.current) {
        const mat = glowRingRef.current.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.08 + pulse * 0.12;
      }
    }
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (measureMode) {
      const pos = new THREE.Vector3();
      if (part) {
        part.currentMatrix.decompose(pos, new THREE.Quaternion(), new THREE.Vector3());
        addMeasurePoint(partId, pos);
      }
    } else {
      selectPart(partId, e.shiftKey);

      if (part && !notifiedRef.current) {
        notifiedRef.current = true;
        sendPartClickToBackend(partId, part.name);
      }
    }
  };

  if (!isVisible || !isMesh || !sharedGeom) return null;

  return (
    <group ref={wrapperRef}>
      {/* --- Visual mesh --- */}
      {object.material ? (
        <mesh geometry={object.geometry} material={object.material} />
      ) : (
        <mesh geometry={object.geometry}>
          <meshStandardMaterial color="#888899" roughness={0.6} metalness={0.3} />
        </mesh>
      )}

      {/* --- Invisible clickable mesh --- */}
      <mesh
        ref={clickRef}
        geometry={sharedGeom}
        visible={true}
        onClick={handleClick}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
          setHovered(true);
        }}
        onPointerOut={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          document.body.style.cursor = 'default';
          setHovered(false);
        }}
      >
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* --- Hover highlight (BackSide glow, amber/golden) --- */}
      <mesh
        ref={hoverOutlineRef}
        geometry={sharedGeom}
        scale={[1.03, 1.03, 1.03]}
        visible={false}
      >
        <meshBasicMaterial
          color="#f59e0b"
          transparent
          opacity={0}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>

      {/* --- Selection highlight group --- */}
      {isSelected && (
        <>
          {/* Emissive glow overlay on the part surface */}
          <mesh geometry={sharedGeom}>
            <meshBasicMaterial
              color="#60a5fa"
              transparent
              opacity={0.2}
              side={THREE.FrontSide}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>

          {/* Primary selection outline (blue) */}
          <mesh ref={outlineRef} geometry={sharedGeom} scale={[1.06, 1.06, 1.06]}>
            <meshBasicMaterial
              color="#3b82f6"
              transparent
              opacity={0.55}
              side={THREE.BackSide}
              depthWrite={false}
            />
          </mesh>

          {/* Soft glow aura */}
          <mesh ref={glowRingRef} geometry={sharedGeom} scale={[1.14, 1.14, 1.14]}>
            <meshBasicMaterial
              color="#3b82f6"
              transparent
              opacity={0.15}
              side={THREE.BackSide}
              depthWrite={false}
            />
          </mesh>
        </>
      )}

      {children}
    </group>
  );
}
