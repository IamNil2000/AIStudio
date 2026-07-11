'use client';

import React, { useMemo } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { usePartStore } from '@/store/usePartStore';

export function MeasurementLines() {
  const measurements = usePartStore((s) => s.measurements);
  const pendingMeasurePoint = usePartStore((s) => s.pendingMeasurePoint);
  const parts = usePartStore((s) => s.parts);

  // Recalculate positions from current part transforms
  const lineData = useMemo(() => {
    const lines: Array<{
      id: string;
      start: THREE.Vector3;
      end: THREE.Vector3;
      distance: number;
      isPending: boolean;
    }> = [];

    for (const m of measurements) {
      const part1 = parts[m.point1.partId];
      const part2 = parts[m.point2.partId];
      if (!part1 || !part2) continue;

      // Get current world positions from part matrices
      const pos1 = new THREE.Vector3();
      const pos2 = new THREE.Vector3();
      part1.currentMatrix.decompose(pos1, new THREE.Quaternion(), new THREE.Vector3());
      part2.currentMatrix.decompose(pos2, new THREE.Quaternion(), new THREE.Vector3());

      // Use current part positions (updates if parts are moved)
      const currentDist = pos1.distanceTo(pos2);

      lines.push({
        id: m.id,
        start: pos1.clone(),
        end: pos2.clone(),
        distance: currentDist,
        isPending: false,
      });
    }

    // Pending measurement (first point selected, awaiting second)
    if (pendingMeasurePoint) {
      const pendingPart = parts[pendingMeasurePoint.partId];
      if (pendingPart) {
        const pos = new THREE.Vector3();
        pendingPart.currentMatrix.decompose(pos, new THREE.Quaternion(), new THREE.Vector3());
        lines.push({
          id: 'pending',
          start: pos.clone(),
          end: pendingMeasurePoint.position.clone(),
          distance: 0,
          isPending: true,
        });
      }
    }

    return lines;
  }, [measurements, pendingMeasurePoint, parts]);

  return (
    <>
      {lineData.map((line) => (
        <MeasurementLine key={line.id} {...line} />
      ))}
    </>
  );
}

function MeasurementLine({
  id,
  start,
  end,
  distance,
  isPending,
}: {
  id: string;
  start: THREE.Vector3;
  end: THREE.Vector3;
  distance: number;
  isPending: boolean;
}) {
  const removeMeasurement = usePartStore((s) => s.removeMeasurement);

  const midpoint = useMemo(() => {
    return new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  }, [start, end]);

  // Create line object imperatively
  const lineObj = useMemo(() => {
    const points = [start.clone(), end.clone()];
    const geom = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineDashedMaterial({
      color: isPending ? '#f59e0b' : '#3b82f6',
      dashSize: 0.15,
      gapSize: 0.1,
      transparent: true,
      opacity: isPending ? 0.6 : 0.9,
    });
    const line = new THREE.Line(geom, mat);
    line.computeLineDistances();
    return line;
  }, [start, end, isPending]);

  return (
    <group>
      {/* Dashed line rendered via primitive */}
      <primitive object={lineObj} />

      {/* Endpoint dots */}
      <mesh position={start}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshBasicMaterial color={isPending ? '#f59e0b' : '#3b82f6'} />
      </mesh>
      <mesh position={end}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshBasicMaterial color={isPending ? '#f59e0b' : '#3b82f6'} />
      </mesh>

      {/* Distance label */}
      {!isPending && (
        <Html
          position={midpoint}
          center
          style={{
            pointerEvents: 'auto',
            userSelect: 'none',
          }}
        >
          <div
            onPointerDown={(e) => e.stopPropagation()}
            className="relative group"
          >
            <div className="px-2 py-0.5 bg-white/90 backdrop-blur-sm border border-[#e2e2e6] rounded shadow-sm text-xs font-mono text-[#1a1a1c] whitespace-nowrap">
              {distance.toFixed(2)} units
            </div>
            {/* Delete button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeMeasurement(id);
              }}
              className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-red-400 hover:bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="white" strokeWidth="1.5">
                <path d="M2 2l4 4M6 2l-4 4" />
              </svg>
            </button>
          </div>
        </Html>
      )}

      {/* Pending indicator label */}
      {isPending && (
        <Html position={midpoint} center>
          <div className="px-2 py-0.5 bg-amber-50 border border-amber-200 rounded shadow-sm text-[10px] text-amber-700 whitespace-nowrap">
            Click second part...
          </div>
        </Html>
      )}
    </group>
  );
}
