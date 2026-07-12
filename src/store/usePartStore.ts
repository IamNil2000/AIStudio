'use client';

import { create } from 'zustand';
import * as THREE from 'three';
import type { AppState, Part, HistoryEntry, TransformSpace, MeasurePoint, Measurement } from '@/types';

function serializeParts(parts: Record<string, Part>): Record<string, { currentMatrix: number[]; visible: boolean }> {
  const serialized: Record<string, { currentMatrix: number[]; visible: boolean }> = {};
  for (const [id, part] of Object.entries(parts)) {
    serialized[id] = {
      currentMatrix: part.currentMatrix.toArray(),
      visible: part.visible,
    };
  }
  return serialized;
}

function deserializeParts(
  serialized: Record<string, { currentMatrix: number[]; visible: boolean }>,
  currentParts: Record<string, Part>
): void {
  for (const [id, data] of Object.entries(serialized)) {
    const part = currentParts[id];
    if (part) {
      part.currentMatrix.fromArray(data.currentMatrix);
      part.visible = data.visible;
    }
  }
}

let measurementCounter = 0;
let duplicateCounter = 0;

function computeModelCenter(parts: Record<string, Part>): { x: number; y: number; z: number } {
  const center = new THREE.Vector3();
  let count = 0;
  for (const part of Object.values(parts)) {
    const pos = new THREE.Vector3();
    part.originalMatrix.decompose(pos, new THREE.Quaternion(), new THREE.Vector3());
    center.add(pos);
    count++;
  }
  if (count > 0) center.divideScalar(count);
  return { x: center.x, y: center.y, z: center.z };
}

/**
 * Compute the model's radius — the max distance from center to any part.
 * This is used to normalize explode distance so it scales with model size.
 */
function computeModelRadius(parts: Record<string, Part>, center: { x: number; y: number; z: number }): number {
  const cx = center.x, cy = center.y, cz = center.z;
  let maxDist = 0;
  const pos = new THREE.Vector3();
  for (const part of Object.values(parts)) {
    part.originalMatrix.decompose(pos, new THREE.Quaternion(), new THREE.Vector3());
    const dx = pos.x - cx, dy = pos.y - cy, dz = pos.z - cz;
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (d > maxDist) maxDist = d;
  }
  // Ensure a minimum scale so tiny models still explode visibly
  return Math.max(maxDist, 0.5);
}

// Pre-allocated temporaries for applyExplode hot loop (avoids GC)
const _explodePos = new THREE.Vector3();
const _explodeQuat = new THREE.Quaternion();
const _explodeScl = new THREE.Vector3();
const _explodeDir = new THREE.Vector3();
const _explodeMat = new THREE.Matrix4();
const _explodeCenter = new THREE.Vector3();

export const usePartStore = create<AppState>((set, get) => ({
  // Initial state
  parts: {},
  selectedIds: [],
  transformSpace: 'local' as TransformSpace,
  history: [],
  historyIndex: -1,
  modelLoaded: false,
  modelLoading: false,
  modelLoadingProgress: 0,
  fileName: '',
  showManual: false,
  showSidebar: true,
  explodeTarget: 0,
  modelCenter: null,
  modelScale: 1,
  resetVersion: 0,
  measureMode: false,
  pendingMeasurePoint: null,
  measurements: [],
  sceneRef: null,
  modelScene: null,

  // Section View
  sectionViewEnabled: false,
  sectionViewPosition: 0,
  sectionViewAxis: 'y' as 'x' | 'y' | 'z',

  // Animation
  animations: [] as THREE.AnimationClip[],
  animationPlaying: false,
  animationMixer: null as THREE.AnimationMixer | null,

  setSceneRef: (scene: THREE.Scene) => set({ sceneRef: scene }),

  setModelScene: (scene: THREE.Group | null) => set({ modelScene: scene }),

  setAnimations: (clips: THREE.AnimationClip[]) => set({ animations: clips }),

  // Section View actions
  setSectionViewEnabled: (enabled: boolean) => set({ sectionViewEnabled: enabled }),

  toggleSectionView: () => {
    const state = get();
    set({ sectionViewEnabled: !state.sectionViewEnabled });
  },

  setSectionViewPosition: (pos: number) => set({ sectionViewPosition: pos }),

  setSectionViewAxis: (axis: 'x' | 'y' | 'z') => set({ sectionViewAxis: axis }),

  toggleAnimation: () => {
    const state = get();
    set({ animationPlaying: !state.animationPlaying });
  },

  setAnimationPlaying: (playing: boolean) => set({ animationPlaying: playing }),

  setModelLoading: (loading: boolean, progress = 0) => set({
    modelLoading: loading,
    modelLoadingProgress: progress,
  }),

  loadModel: (parts: Part[], fileName: string) => {
    const partsMap: Record<string, Part> = {};
    for (const part of parts) {
      partsMap[part.id] = part;
    }
    const entry: HistoryEntry = { parts: serializeParts(partsMap) };
    // Compute model center and radius for proportional explode
    const center = computeModelCenter(partsMap);
    const radius = computeModelRadius(partsMap, center);
    set({
      parts: partsMap,
      selectedIds: [],
      modelLoaded: true,
      modelLoading: false,
      modelLoadingProgress: 1,
      fileName,
      history: [entry],
      historyIndex: 0,
      measurements: [],
      pendingMeasurePoint: null,
      measureMode: false,
      explodeTarget: 0,
      modelCenter: center,
      modelScale: radius,
      sectionViewEnabled: false,
      sectionViewPosition: 0,
      sectionViewAxis: 'y',
    });
  },

  selectPart: (id: string, multi = false) => {
    const state = get();
    if (multi) {
      const isSelected = state.selectedIds.includes(id);
      set({
        selectedIds: isSelected
          ? state.selectedIds.filter((sid) => sid !== id)
          : [...state.selectedIds, id],
      });
    } else {
      set({ selectedIds: [id] });
    }
  },

  deselectAll: () => set({ selectedIds: [] }),

  setTransformSpace: (space: TransformSpace) => set({ transformSpace: space }),

  updatePartTransform: (id: string, matrix: THREE.Matrix4) => {
    const state = get();
    const part = state.parts[id];
    if (!part) return;
    part.currentMatrix.copy(matrix);
    set({ parts: { ...state.parts } });
  },

  updatePartVisibility: (id: string, visible: boolean) => {
    const state = get();
    const part = state.parts[id];
    if (!part) return;
    part.visible = visible;
    set({ parts: { ...state.parts } });
  },

  setShowManual: (show: boolean) => set({ showManual: show }),
  setShowSidebar: (show: boolean) => set({ showSidebar: show }),

  // --- Explode actions ---

  setExplodeTarget: (amount: number) => {
    const clamped = Math.max(0, Math.min(15, amount));
    set({ explodeTarget: clamped });
  },

  toggleExplode: () => {
    const state = get();
    // Toggle between 0 and a moderate value (10 out of 15)
    const newTarget = state.explodeTarget > 0.5 ? 0 : 10;
    set({ explodeTarget: newTarget });
  },

  applyExplode: (spread: number) => {
    const state = get();
    // IMPORTANT: Do NOT spread parts — same reference keeps UI components
    // (Sidebar, PartTree, etc.) from re-rendering during explode animation.
    // PartMeshes read latest matrix values via useFrame + getState().
    const parts = state.parts;
    const ids = Object.keys(parts);
    if (ids.length === 0) return;

    // Use cached center and scale (computed at load time)
    const centerResult = state.modelCenter;
    const cx = centerResult!.x;
    const cy = centerResult!.y;
    const cz = centerResult!.z;

    const modelScale = state.modelScale;
    // Normalize spread by model size so explode is proportional
    const normalizedSpread = spread * modelScale * 0.04;

    // Set center from cached values (pre-allocated vector, no GC)
    _explodeCenter.set(cx, cy, cz);

    for (const part of Object.values(parts)) {
      part.originalMatrix.decompose(_explodePos, _explodeQuat, _explodeScl);

      // Direction from center to part (pre-allocated)
      _explodeDir.copy(_explodePos).sub(_explodeCenter);
      if (_explodeDir.length() < 0.001) {
        _explodeDir.set(0, 1, 0);
      }
      _explodeDir.normalize();

      _explodePos.add(_explodeDir.multiplyScalar(normalizedSpread));

      // Compose and store (reuse pre-allocated matrix)
      _explodeMat.compose(_explodePos, _explodeQuat, _explodeScl);
      part.currentMatrix.copy(_explodeMat);
      part.visible = true;
    }
    // Same parts reference — Zustand's Object.is check prevents UI re-renders
    set({ parts });
  },

  // --- End explode actions ---

  // --- Measurement actions ---

  setMeasureMode: (mode: boolean) => {
    if (!mode) {
      // Exiting measure mode: clear pending point
      set({ measureMode: false, pendingMeasurePoint: null });
    } else {
      set({ measureMode: true, pendingMeasurePoint: null });
    }
  },

  addMeasurePoint: (partId: string, position: THREE.Vector3) => {
    const state = get();
    const part = state.parts[partId];
    if (!part) return;

    const point: MeasurePoint = {
      partId,
      partName: part.name || partId,
      position: position.clone(),
    };

    if (state.pendingMeasurePoint) {
      // Complete the measurement
      const distance = state.pendingMeasurePoint.position.distanceTo(point.position);
      const measurement: Measurement = {
        id: `measure-${++measurementCounter}`,
        point1: state.pendingMeasurePoint,
        point2: point,
        distance: Math.round(distance * 1000) / 1000, // 3 decimal places
      };
      set({
        measurements: [...state.measurements, measurement],
        pendingMeasurePoint: null,
      });
    } else {
      // First point
      set({ pendingMeasurePoint: point });
    }
  },

  clearMeasurements: () => {
    set({ measurements: [], pendingMeasurePoint: null });
  },

  removeMeasurement: (id: string) => {
    const state = get();
    set({
      measurements: state.measurements.filter((m) => m.id !== id),
    });
  },

  // --- End explode actions ---

  // --- Duplicate action ---

  duplicateSelected: () => {
    const state = get();
    if (state.selectedIds.length === 0) return;

    const newParts = { ...state.parts };
    const newSelectedIds: string[] = [];

    for (const id of state.selectedIds) {
      const original = state.parts[id];
      if (!original || !(original.object instanceof THREE.Mesh)) continue;

      const mesh = original.object;
      duplicateCounter++;

      // Clone geometry and material
      const newGeometry = mesh.geometry.clone();
      const newMaterial = Array.isArray(mesh.material)
        ? mesh.material.map((m) => m.clone())
        : mesh.material.clone();

      // Create new mesh
      const newMesh = new THREE.Mesh(newGeometry, newMaterial);
      newMesh.name = `${mesh.name || original.name} (copy)`;
      newMesh.castShadow = mesh.castShadow;
      newMesh.receiveShadow = mesh.receiveShadow;

      // Offset position (1.5 units along positive X)
      const pos = new THREE.Vector3();
      const quat = new THREE.Quaternion();
      const scale = new THREE.Vector3();
      original.currentMatrix.decompose(pos, quat, scale);
      pos.x += 1.5;

      const newMatrix = new THREE.Matrix4().compose(pos, quat, scale);
      const newId = `${id}-copy-${duplicateCounter}-${Date.now()}`;

      const newPart: Part = {
        id: newId,
        name: `${original.name} (copy)`,
        originalMatrix: newMatrix.clone(),
        currentMatrix: newMatrix.clone(),
        visible: true,
        object: newMesh,
      };

      newParts[newId] = newPart;
      newSelectedIds.push(newId);
    }

    if (newSelectedIds.length > 0) {
      // Push history before the change
      const entry: HistoryEntry = { parts: serializeParts(state.parts) };
      const newHistory = [...state.history.slice(0, state.historyIndex + 1), entry];
      if (newHistory.length > 50) newHistory.shift();

      set({
        parts: newParts,
        selectedIds: newSelectedIds,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      });
    }
  },

  // --- End duplicate action ---

  pushHistory: () => {
    const state = get();
    const entry: HistoryEntry = { parts: serializeParts(state.parts) };
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push(entry);
    if (newHistory.length > 50) newHistory.shift();
    set({ history: newHistory, historyIndex: newHistory.length - 1 });
  },

  undo: () => {
    const state = get();
    if (state.historyIndex <= 0) return;
    const newIndex = state.historyIndex - 1;
    const entry = state.history[newIndex];
    if (!entry) return;
    const currentParts = { ...state.parts };
    deserializeParts(entry.parts, currentParts);
    set({ parts: currentParts, historyIndex: newIndex });
  },

  resetPart: (id: string) => {
    const state = get();
    const part = state.parts[id];
    if (!part) return;
    part.currentMatrix.copy(part.originalMatrix);
    part.visible = true;
    set({ parts: { ...state.parts } });
  },

  resetAll: () => {
    const state = get();
    const parts = { ...state.parts };
    // Make all parts visible (don't reset matrices — ExplodeAnimator
    // will smoothly lerp parts back to original positions via applyExplode)
    for (const part of Object.values(parts)) {
      part.visible = true;
    }
    set({
      parts,
      selectedIds: [],
      // Setting explodeTarget to 0 triggers the ExplodeAnimator to lerp
      // from the current spread back to 0, giving a smooth transition.
      // We do NOT increment resetVersion so the animator keeps its refs.
      explodeTarget: 0,
    });
  },

  hideSelected: () => {
    const state = get();
    const parts = { ...state.parts };
    for (const id of state.selectedIds) {
      if (parts[id]) {
        parts[id].visible = false;
      }
    }
    set({ parts, selectedIds: [] });
  },

  soloPart: (id: string) => {
    const state = get();
    const parts = { ...state.parts };
    for (const [pid, part] of Object.entries(parts)) {
      part.visible = pid === id;
    }
    set({ parts });
  },

  removePart: (id: string) => {
    const state = get();
    const parts = { ...state.parts };
    delete parts[id];
    const selectedIds = state.selectedIds.filter((sid) => sid !== id);
    set({ parts, selectedIds });
  },

  // --- Material editor ---

  updatePartMaterial: (id: string, updates: { color?: string; roughness?: number; metalness?: number }) => {
    const state = get();
    const part = state.parts[id];
    if (!part) return;

    const obj = part.object;
    if (!(obj instanceof THREE.Mesh || obj instanceof THREE.SkinnedMesh || obj instanceof THREE.InstancedMesh)) return;

    const material = Array.isArray(obj.material) ? obj.material[0] : obj.material;
    if (!material) return;

    if (updates.color !== undefined) {
      material.color.set(updates.color);
      // Update metadata for PartDetails display
      if (part.metadata) {
        part.metadata.materialColor = updates.color;
      }
    }
    if (updates.roughness !== undefined && 'roughness' in material) {
      (material as THREE.MeshStandardMaterial).roughness = updates.roughness;
    }
    if (updates.metalness !== undefined && 'metalness' in material) {
      (material as THREE.MeshStandardMaterial).metalness = updates.metalness;
    }

    material.needsUpdate = true;

    // Trigger re-render
    set({ parts: { ...state.parts } });
  },
}));
