import * as THREE from 'three';

export interface Part {
  id: string;
  name: string;
  originalMatrix: THREE.Matrix4;
  currentMatrix: THREE.Matrix4;
  visible: boolean;
  object: THREE.Object3D;
  children?: string[];
}

export interface HistoryEntry {
  parts: Record<string, {
    currentMatrix: number[];
    visible: boolean;
  }>;
}

export type TransformSpace = 'local' | 'world' | 'view';

export interface MeasurePoint {
  partId: string;
  partName: string;
  position: THREE.Vector3;
}

export interface Measurement {
  id: string;
  point1: MeasurePoint;
  point2: MeasurePoint;
  distance: number;
}

/** Minimum handle for OrbitControls target/update operations. */
export interface ControlsHandle {
  target: THREE.Vector3;
  update: () => void;
  object: THREE.Object3D;
  enabled: boolean;
  dispose: () => void;
}

export interface AppState {
  // Data
  parts: Record<string, Part>;
  selectedIds: string[];
  transformSpace: TransformSpace;
  
  // History
  history: HistoryEntry[];
  historyIndex: number;
  
  // UI state
  modelLoaded: boolean;
  modelLoading: boolean;
  modelLoadingProgress: number;
  fileName: string;
  showManual: boolean;
  showSidebar: boolean;
  
  // Explode
  explodeTarget: number;
  modelCenter: { x: number; y: number; z: number } | null;
  
  // Measurement
  measureMode: boolean;
  pendingMeasurePoint: MeasurePoint | null;
  measurements: Measurement[];
  
  // Scene refs
  sceneRef: THREE.Scene | null;
  
  // Loaded model scene (for direct rendering)
  modelScene: THREE.Group | null;
  
  // Actions
  setSceneRef: (scene: THREE.Scene) => void;
  setModelScene: (scene: THREE.Group | null) => void;
  loadModel: (parts: Part[], fileName: string) => void;
  setModelLoading: (loading: boolean, progress?: number) => void;
  selectPart: (id: string, multi?: boolean) => void;
  deselectAll: () => void;
  setTransformSpace: (space: TransformSpace) => void;
  updatePartTransform: (id: string, matrix: THREE.Matrix4) => void;
  updatePartVisibility: (id: string, visible: boolean) => void;
  setShowManual: (show: boolean) => void;
  setShowSidebar: (show: boolean) => void;
  setExplodeTarget: (amount: number) => void;
  toggleExplode: () => void;
  applyExplode: (spread: number) => void;
  setMeasureMode: (mode: boolean) => void;
  addMeasurePoint: (partId: string, position: THREE.Vector3) => void;
  clearMeasurements: () => void;
  removeMeasurement: (id: string) => void;
  duplicateSelected: () => void;
  pushHistory: () => void;
  undo: () => void;
  resetPart: (id: string) => void;
  resetAll: () => void;
  hideSelected: () => void;
  soloPart: (id: string) => void;
  removePart: (id: string) => void;
}
