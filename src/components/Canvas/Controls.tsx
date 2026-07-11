'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { usePartStore } from '@/store/usePartStore';
import type { Part, ControlsHandle } from '@/types';
import {
  translateAlongAxis,
  rotateAroundAxis,
  rotateArcball,
  translateByWorldOffset,
  scaleMatrix,
  nudgeMatrix,
} from '@/lib/transforms';

interface PartControlsProps {
  controlsRef: React.RefObject<ControlsHandle | null>;
}

export function PartControls({ controlsRef }: PartControlsProps) {
  const {
    pushHistory,
  } = usePartStore();

  const { camera, gl } = useThree();
  const isDragging = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const ctrlKey = useRef(false);
  const shiftKey = useRef(false);
  const altKey = useRef(false);
  const activeAxis = useRef<string | null>(null);
  const historyPushedRef = useRef(false);

  // Shift+drag plane-projected translation state
  const dragStartMouse = useRef({ x: 0, y: 0 });
  const lastProjectedPoint = useRef(new THREE.Vector3());
  const dragTranslationPlane = useRef(new THREE.Plane());

  // Ctrl+drag arcball rotation state
  const lastArcballNDC = useRef({ x: 0, y: 0 });

  // Track modifier keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      ctrlKey.current = e.ctrlKey;
      shiftKey.current = e.shiftKey;
      altKey.current = e.altKey;

      const store = usePartStore.getState();
      const currentSelectedIds = store.selectedIds;
      const currentParts = store.parts;
      const currentTransformSpace = store.transformSpace;

      // Global shortcuts
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
        case 'e':
        case 'E':
          store.toggleExplode();
          break;
        case 'h':
        case 'H':
          store.hideSelected();
          break;
        case 't':
        case 'T':
          const spaces: Array<'local' | 'world' | 'view'> = ['local', 'world', 'view'];
          const currentIdx = spaces.indexOf(currentTransformSpace);
          store.setTransformSpace(spaces[(currentIdx + 1) % spaces.length]);
          break;
        case 'r':
        case 'R':
          if (e.ctrlKey) {
            e.preventDefault();
            if (currentSelectedIds.length > 0) {
              currentSelectedIds.forEach((id) => store.resetPart(id));
            } else {
              store.resetAll();
            }
          }
          break;
        case 'z':
        case 'Z':
          if (e.ctrlKey) {
            e.preventDefault();
            store.undo();
          }
          break;
        case '1':
          setOrthographicView('front');
          break;
        case '2':
          setOrthographicView('top');
          break;
        case '3':
          setOrthographicView('right');
          break;
        case 'Delete':
        case 'Backspace':
          store.hideSelected();
          break;
        case 'ArrowUp':
          if (currentSelectedIds.length > 0) {
            transformSelected((matrix) => nudgeMatrix(matrix, 'y', shiftKey.current ? 1 : 0.1));
          }
          break;
        case 'ArrowDown':
          if (currentSelectedIds.length > 0) {
            transformSelected((matrix) => nudgeMatrix(matrix, 'y', shiftKey.current ? -1 : -0.1));
          }
          break;
        case 'ArrowLeft':
          if (currentSelectedIds.length > 0) {
            transformSelected((matrix) => nudgeMatrix(matrix, 'x', shiftKey.current ? -1 : -0.1));
          }
          break;
        case 'ArrowRight':
          if (currentSelectedIds.length > 0) {
            transformSelected((matrix) => nudgeMatrix(matrix, 'x', shiftKey.current ? 1 : 0.1));
          }
          break;
        case 'PageUp':
          if (currentSelectedIds.length > 0) {
            transformSelected((matrix) => nudgeMatrix(matrix, 'z', shiftKey.current ? 1 : 0.1));
          }
          break;
        case 'PageDown':
          if (currentSelectedIds.length > 0) {
            transformSelected((matrix) => nudgeMatrix(matrix, 'z', shiftKey.current ? -1 : -0.1));
          }
          break;
        case 'd':
        case 'D':
          if (e.ctrlKey) {
            e.preventDefault();
            store.duplicateSelected();
          }
          break;
        case 's':
        case 'S':
          if (e.ctrlKey) {
            e.preventDefault();
            saveTransformJSON(currentParts);
          }
          break;
        case ' ':
          e.preventDefault();
          break;
        case 'Tab':
          if (currentSelectedIds.length > 0) {
            e.preventDefault();
            const ids = Object.keys(currentParts).filter(id => currentParts[id]?.visible);
            const lastSelected = currentSelectedIds[currentSelectedIds.length - 1];
            const currentIdxSelection = ids.indexOf(lastSelected);
            const nextIdx = e.shiftKey
              ? (currentIdxSelection - 1 + ids.length) % ids.length
              : (currentIdxSelection + 1) % ids.length;
            if (ids[nextIdx]) {
              store.selectPart(ids[nextIdx], false);
            }
          }
          break;
      }

      if (['x', 'y', 'z', 'X', 'Y', 'Z'].includes(e.key)) {
        activeAxis.current = e.key.toLowerCase();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      ctrlKey.current = e.ctrlKey;
      shiftKey.current = e.shiftKey;
      altKey.current = e.altKey;

      if (['x', 'y', 'z', 'X', 'Y', 'Z'].includes(e.key)) {
        activeAxis.current = null;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helper: transform all selected parts
  const transformSelected = useCallback(
    (transformFn: (matrix: THREE.Matrix4) => THREE.Matrix4) => {
      // Push history only once per drag operation, not per pixel
      if (!historyPushedRef.current) {
        pushHistory();
        historyPushedRef.current = true;
      }
      const state = usePartStore.getState();
      for (const id of state.selectedIds) {
        const part = state.parts[id];
        if (part) {
          const newMatrix = transformFn(part.currentMatrix.clone());
          state.updatePartTransform(id, newMatrix);
        }
      }
    },
    [pushHistory]
  );

  // Handle mouse events for part manipulation
  useEffect(() => {
    const canvas = gl.domElement;

    // Pre-allocated temp objects for plane projection (avoids GC on every mousemove)
    const _raycaster = new THREE.Raycaster();
    const _ndcVec2 = new THREE.Vector2();

    /**
     * Project a screen-space mouse position onto a 3D plane and store the
     * intersection point in the provided `out` vector.
     * Used by Shift+drag for pixel-perfect cursor tracking.
     */
    function projectMouseToPlane(
      clientX: number,
      clientY: number,
      cam: THREE.Camera,
      canvasEl: HTMLCanvasElement,
      plane: THREE.Plane,
      out: THREE.Vector3
    ): void {
      const rect = canvasEl.getBoundingClientRect();
      _ndcVec2.set(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1
      );
      _raycaster.setFromCamera(_ndcVec2, cam);
      _raycaster.ray.intersectPlane(plane, out);
    }

    const onMouseDown = (e: MouseEvent) => {
      // Only activate part manipulation on right-click (button === 2)
      // or when modifier keys are held (Ctrl, Shift, Alt).
      // Left-click without modifiers should orbit the camera (OrbitControls).
      if (!ctrlKey.current && !shiftKey.current && !altKey.current && e.button === 0) {
        // Ensure OrbitControls is enabled for normal camera orbit
        if (controlsRef.current) {
          controlsRef.current.enabled = true;
        }
        isDragging.current = false;
        return;
      }
      if (usePartStore.getState().selectedIds.length === 0) return;

      // Disable OrbitControls while we manipulate parts with modifiers
      // so the camera doesn't orbit unintentionally alongside part rotation.
      if (controlsRef.current) {
        controlsRef.current.enabled = false;
      }

      isDragging.current = true;
      historyPushedRef.current = false;

      if (shiftKey.current) {
        // Capture drag start position and compute the 3D translation plane
        // at the object's depth, perpendicular to camera view direction.
        // This enables pixel-perfect cursor tracking via plane-projected raycasting.
        dragStartMouse.current = { x: e.clientX, y: e.clientY };

        const state = usePartStore.getState();
        const avgPos = new THREE.Vector3();
        let count = 0;
        for (const id of state.selectedIds) {
          const part = state.parts[id];
          if (part) {
            const pos = new THREE.Vector3();
            part.currentMatrix.decompose(pos, new THREE.Quaternion(), new THREE.Vector3());
            avgPos.add(pos);
            count++;
          }
        }
        if (count > 0) avgPos.divideScalar(count);

        const cameraDir = new THREE.Vector3();
        camera.getWorldDirection(cameraDir);
        dragTranslationPlane.current.setFromNormalAndCoplanarPoint(cameraDir, avgPos);

        // Pre-compute the initial projected point so we can track incremental deltas
        projectMouseToPlane(
          e.clientX, e.clientY,
          camera, canvas,
          dragTranslationPlane.current,
          lastProjectedPoint.current
        );
      }

      if (ctrlKey.current && !shiftKey.current && !activeAxis.current) {
        // For free rotation (no axis lock), capture the initial NDC position
        // so the arcball can track incremental mouse deltas in normalized space.
        const rect = canvas.getBoundingClientRect();
        lastArcballNDC.current = {
          x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
          y: -((e.clientY - rect.top) / rect.height) * 2 + 1,
        };
      }
    };

    // Pre-allocated temp objects for plane projection (avoids GC on every mousemove)
    const _currentProjected = new THREE.Vector3();
    const _worldDelta = new THREE.Vector3();

    // Pre-allocated temp objects for getCameraDistance to avoid GC on every mousemove
    const _camPos = new THREE.Vector3();
    const _partPos = new THREE.Vector3();
    const _partQuat = new THREE.Quaternion();
    const _partScale = new THREE.Vector3();

    /**
     * Compute average camera distance to all selected parts.
     * Used to adjust translation/rotation sensitivity so interactions
     * feel consistent regardless of how far the parts are from the camera.
     */
    function getCameraDistance(): number {
      camera.getWorldPosition(_camPos);
      const state = usePartStore.getState();
      let totalDist = 0;
      let count = 0;
      for (const id of state.selectedIds) {
        const part = state.parts[id];
        if (part) {
          part.currentMatrix.decompose(_partPos, _partQuat, _partScale);
          totalDist += _camPos.distanceTo(_partPos);
          count++;
        }
      }
      return count > 0 ? totalDist / count : 10;
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || usePartStore.getState().selectedIds.length === 0) return;

      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      lastMousePos.current = { x: e.clientX, y: e.clientY };

      const state = usePartStore.getState();
      const currentTransformSpace = state.transformSpace;
      const camDistance = getCameraDistance();

      if (ctrlKey.current && shiftKey.current) {
        // --- Ctrl+Shift+drag: Scale ---
        const scaleFactor = 1 + dy * 0.008;
        const axis = activeAxis.current as 'x' | 'y' | 'z' | null;
        transformSelected((matrix) =>
          scaleMatrix(matrix, axis || 'uniform', scaleFactor)
        );
      } else if (ctrlKey.current) {
        // --- Ctrl+drag: Rotation ---
        if (activeAxis.current) {
          // Axis-constrained rotation with distance-aware sensitivity
          const angle = dx * 0.015 * (camDistance / 10);
          transformSelected((matrix) =>
            rotateAroundAxis(
              matrix,
              activeAxis.current as 'x' | 'y' | 'z',
              angle,
              currentTransformSpace
            )
          );
        } else {
          // Free rotation using arcball (trackball) for pixel-perfect cursor tracking.
          // Projects the mouse onto a virtual 3D sphere and computes the exact
          // rotation from the previous position to the current position.
          const rect = canvas.getBoundingClientRect();
          const currNDC = {
            x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
            y: -((e.clientY - rect.top) / rect.height) * 2 + 1,
          };

          // Compute incremental arcball rotation from last frame's NDC
          // Sensitivity 1.8x for responsive but controlled feel
          transformSelected((matrix) =>
            rotateArcball(matrix, lastArcballNDC.current, currNDC, 1.8)
          );

          // Store current NDC for next frame's delta
          lastArcballNDC.current = currNDC;
        }
      } else if (shiftKey.current) {
        // --- Shift+drag: Plane-projected translate (pixel-perfect cursor tracking) ---
        if (camera) {
          projectMouseToPlane(
            e.clientX, e.clientY,
            camera, canvas,
            dragTranslationPlane.current,
            _currentProjected
          );

          // Compute incremental world-space delta from last frame
          _worldDelta
            .copy(_currentProjected)
            .sub(lastProjectedPoint.current);

          // Skip sub-pixel deltas to avoid noise
          if (_worldDelta.length() > 0.001) {
            lastProjectedPoint.current.copy(_currentProjected);
            transformSelected((matrix) =>
              translateByWorldOffset(matrix, _worldDelta)
            );
          }
        }
      } else if (activeAxis.current) {
        // --- Axis-constrained translate ---
        const delta = (dx + dy) * 0.02 * (camDistance / 10);
        transformSelected((matrix) =>
          translateAlongAxis(
            matrix,
            activeAxis.current as 'x' | 'y' | 'z',
            delta,
            currentTransformSpace
          )
        );
      }
    };

    const onMouseUp = () => {
      isDragging.current = false;
      // Re-enable OrbitControls after part manipulation ends
      if (controlsRef.current) {
        controlsRef.current.enabled = true;
      }
    };

    const onWheel = (e: WheelEvent) => {
      const state = usePartStore.getState();
      if (altKey.current && state.selectedIds.length > 0) {
        e.preventDefault();
        // Disable OrbitControls during Alt+wheel part translation too
        if (controlsRef.current) {
          controlsRef.current.enabled = false;
        }
        // transformSelected handles history push via historyPushedRef
        transformSelected((matrix) =>
          translateAlongAxis(matrix, 'y', -e.deltaY * 0.01, state.transformSpace)
        );
      }
    };

    const onContextMenu = (e: Event) => {
      e.preventDefault();
    };

    canvas.addEventListener('pointerdown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('contextmenu', onContextMenu);

    return () => {
      canvas.removeEventListener('pointerdown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('contextmenu', onContextMenu);
    };
  }, [camera, gl, transformSelected, pushHistory]);

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

    // Also sync OrbitControls target
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

function saveTransformJSON(parts: Record<string, Part>) {
  const data: Record<string, { matrix: number[]; visible: boolean }> = {};
  for (const [id, part] of Object.entries(parts)) {
    data[id] = {
      matrix: part.currentMatrix.toArray(),
      visible: part.visible,
    };
  }

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'partforge-transforms.json';
  a.click();
  URL.revokeObjectURL(url);
}

function setOrthographicView(view: 'front' | 'top' | 'right') {
  window.dispatchEvent(
    new CustomEvent('set-camera-view', { detail: view })
  );
}
