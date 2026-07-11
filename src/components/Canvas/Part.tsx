'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { usePartStore } from '@/store/usePartStore';

interface PartMeshProps {
  partId: string;
  object: THREE.Object3D;
  children?: React.ReactNode;
}

export function PartMesh({ partId, object, children }: PartMeshProps) {
  const wrapperRef = useRef<THREE.Group>(null);
  const clickRef = useRef<THREE.Mesh>(null);
  const outlineRef = useRef<THREE.Mesh>(null);

  const selectedIds = usePartStore((s) => s.selectedIds);
  const parts = usePartStore((s) => s.parts);
  const selectPart = usePartStore((s) => s.selectPart);
  const measureMode = usePartStore((s) => s.measureMode);
  const addMeasurePoint = usePartStore((s) => s.addMeasurePoint);

  const isSelected = selectedIds.includes(partId);
  const part = parts[partId];
  const isVisible = part?.visible ?? true;

  // Clone geometry for click detection and selection outline
  const isMesh = object instanceof THREE.Mesh;
  const sharedGeom = useMemo(() => {
    if (!isMesh || !object.geometry) return null;
    return object.geometry.clone();
  }, [isMesh, object]);

  // Sync the wrapper group (and children) from the part's current world matrix
  useFrame(() => {
    if (!part || !wrapperRef.current) return;

    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scl = new THREE.Vector3();
    part.currentMatrix.decompose(pos, quat, scl);

    wrapperRef.current.position.copy(pos);
    wrapperRef.current.quaternion.copy(quat);
    wrapperRef.current.scale.copy(scl);
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
    }
  };

  if (!isVisible || !isMesh || !sharedGeom) return null;

  return (
    <group ref={wrapperRef}>
      {/* --- Visual mesh: render the actual 3D geometry with its original material --- */}
      {object.material ? (
        <mesh geometry={object.geometry} material={object.material} />
      ) : (
        <mesh geometry={object.geometry}>
          <meshStandardMaterial color="#888899" roughness={0.6} metalness={0.3} />
        </mesh>
      )}

      {/* --- Invisible clickable mesh for event detection --- */}
      <mesh
        ref={clickRef}
        geometry={sharedGeom}
        visible={true}
        onClick={handleClick}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'default';
        }}
      >
        <meshBasicMaterial
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>

      {/* --- Selection outline (back-face glow) --- */}
      {isSelected && (
        <mesh ref={outlineRef} geometry={sharedGeom} scale={[1.02, 1.02, 1.02]}>
          <meshBasicMaterial
            color="#3b82f6"
            transparent
            opacity={0.25}
            side={THREE.BackSide}
            depthWrite={false}
          />
        </mesh>
      )}

      {children}
    </group>
  );
}
