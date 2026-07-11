'use client';

import React from 'react';
import { Grid, GizmoHelper, GizmoViewport } from '@react-three/drei';
import * as THREE from 'three';

export function SceneGrid() {
  return (
    <Grid
      cellColor="#d4d4d8"
      cellSize={1}
      sectionColor="#c0c0c4"
      sectionSize={5}
      fadeDistance={50}
      infiniteGrid
      position={[0, -0.01, 0]}
    />
  );
}

export function SceneGizmo() {
  return (
    <GizmoHelper
      alignment="bottom-right"
      margin={[80, 80]}
      renderPriority={2}
    >
      <GizmoViewport
        axisColors={['#ef4444', '#22c55e', '#3b82f6']}
        labelColor="#ffffff"
        opacity={0.6}
      />
    </GizmoHelper>
  );
}

export function AxisHelper({ visible = true }: { visible?: boolean }) {
  if (!visible) return null;
  
  return <primitive object={new THREE.AxesHelper(5)} />;
}

export function AxisLine({
  position,
  direction,
  color,
  length = 10,
}: {
  position: THREE.Vector3;
  direction: THREE.Vector3;
  color: string;
  length?: number;
}) {
  const points: [number, number, number][] = [
    [position.x - direction.x * length, position.y - direction.y * length, position.z - direction.z * length],
    [position.x + direction.x * length, position.y + direction.y * length, position.z + direction.z * length],
  ];
  
  return (
    <line>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={2}
          array={new Float32Array(points.flat())}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial color={color} opacity={0.4} transparent />
    </line>
  );
}

export function SoftLights() {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[10, 15, 10]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      <directionalLight position={[-5, 10, -5]} intensity={0.4} />
      <hemisphereLight args={['#d4d4d8', '#80808a', 0.3]} />
    </>
  );
}
