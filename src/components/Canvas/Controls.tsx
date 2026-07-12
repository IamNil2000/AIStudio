'use client';

import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { usePartStore } from '@/store/usePartStore';
import type { Part, ControlsHandle } from '@/types';
// Part transform utilities — commented out: Ctrl+drag/Shift+drag transforms disabled
// import {
//   translateAlongAxis,
//   rotateAroundAxis,
//   rotateFree,
//   translateByWorldOffset,
//   scaleMatrix,
//   nudgeMatrix,
// } from '@/lib/transforms';

interface PartControlsProps {
  controlsRef: React.RefObject<ControlsHandle | null>;
}

export function PartControls({ controlsRef }: PartControlsProps) {
  // Part transform state — disabled per user request
  // const { pushHistory } = usePartStore();

  const { camera, gl } = useThree();
  // Transform interaction refs — all disabled
  // const isDragging = useRef(false);
  // const lastMousePos = useRef({ x: 0, y: 0 });
  // const ctrlKey = useRef(false);
  // const shiftKey = useRef(false);
  // const altKey = useRef(false);
  // const activeAxis = useRef<string | null>(null);
  // const historyPushedRef = useRef(false);
  // const dragStartMouse = useRef({ x: 0, y: 0 });
  // const lastProjectedPoint = useRef(new THREE.Vector3());
  // const dragTranslationPlane = useRef(new THREE.Plane());

  // Keyboard shortcuts: only camera presets, selection, and UI toggles remain active
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const store = usePartStore.getState();
      const currentSelectedIds = store.selectedIds;
      const currentParts = store.parts;

      switch (e.key) {
        case 'Escape':
          if (store.measureMode) {
            store.setMeasureMode(false);
          }
          store.deselectAll();
          break;
        case '?':
        case 'F1':
          e.preventDefault();
          store.setShowManual(true);
          break;
        case 'F':
        case 'f':
          if (currentSelectedIds.length > 0) {
            focusOnSelection(currentSelectedIds, currentParts, camera, controlsRef);
          }
          break;
        case 'Home':
          resetCameraImpl(camera, controlsRef);
          break;
        case 'h':
        case 'H':
          store.hideSelected();
          break;
        case 'z':
        case 'Z':
          if (e.ctrlKey) {
            e.preventDefault();
            store.undo();
          }
          break;
        case '1':
          setCameraPreset('front');
          break;
        case '2':
          setCameraPreset('top');
          break;
        case '3':
          setCameraPreset('right');
          break;
        case '4':
          setCameraPreset('perspective');
          break;
        case '5':
          setCameraPreset('back');
          break;
        case '6':
          setCameraPreset('left');
          break;
        case '7':
          setCameraPreset('bottom');
          break;
        case 'Delete':
        case 'Backspace':
          store.hideSelected();
          break;
        case 's':
        case 'S':
          if (e.ctrlKey) {
            e.preventDefault();
          }
          break;
        case 'c':
        case 'C':
          store.toggleSectionView();
          break;
        case ' ':
          e.preventDefault();
          break;
        case 'Tab':
          if (currentSelectedIds.length > 0) {
            e.preventDefault();
            const ids = Object.keys(currentParts).filter(id => currentParts[id]?.visible);
            const lastSelected = currentSelectedIds[currentSelectedIds.length - 1];
            const currentIdx = ids.indexOf(lastSelected);
            const nextIdx = e.shiftKey
              ? (currentIdx - 1 + ids.length) % ids.length
              : (currentIdx + 1) % ids.length;
            if (ids[nextIdx]) {
              store.selectPart(ids[nextIdx], false);
            }
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mouse handler — no part transforms (only camera orbit through OrbitControls)
  useEffect(() => {
    const canvas = gl.domElement;

    const onContextMenu = (e: Event) => {
      e.preventDefault();
    };

    canvas.addEventListener('contextmenu', onContextMenu);
    return () => canvas.removeEventListener('contextmenu', onContextMenu);
  }, [gl]);

  return null;
}

function focusOnSelection(
  selectedIds: string[],
  parts: Record<string, Part>,
  camera: THREE.Camera,
  controlsRef: React.RefObject<ControlsHandle | null>
) {
  if (selectedIds.length === 0 || !(camera instanceof THREE.PerspectiveCamera)) return;

  const center = new THREE.Vector3();
  let count = 0;

  for (const id of selectedIds) {
    const part = parts[id];
    if (part) {
      const pos = new THREE.Vector3();
      part.currentMatrix.decompose(pos, new THREE.Quaternion(), new THREE.Vector3());
      center.add(pos);
      count++;
    }
  }

  if (count > 0) {
    center.divideScalar(count);
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    const distance = camera.position.distanceTo(center);
    camera.position.copy(center).add(dir.multiplyScalar(-distance));
    camera.lookAt(center);

    if (controlsRef.current?.target) {
      controlsRef.current.target.copy(center);
      controlsRef.current.update();
    }
  }
}

function resetCameraImpl(
  camera: THREE.PerspectiveCamera,
  controlsRef: React.RefObject<ControlsHandle | null>
) {
  camera.position.set(5, 5, 10);
  camera.lookAt(0, 0, 0);
  if (controlsRef.current?.target) {
    controlsRef.current.target.set(0, 0, 0);
    controlsRef.current.update();
  }
}

function setCameraPreset(view: 'front' | 'back' | 'top' | 'bottom' | 'right' | 'left' | 'perspective') {
  window.dispatchEvent(
    new CustomEvent('set-camera-view', { detail: view })
  );
}
