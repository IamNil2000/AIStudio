import * as THREE from 'three';

export type PartNodeType = 'mesh' | 'skinned-mesh' | 'instanced-mesh' | 'group' | 'bone' | 'line' | 'points' | 'sprite' | 'unknown';

export interface PartMetadata {
  /** Type of the 3D node */
  nodeType: PartNodeType;
  /** Name of the material applied to this part */
  materialName?: string;
  /** Color of the material (hex string) */
  materialColor?: string;
  /** Vertex count */
  vertexCount?: number;
  /** Face/triangle count */
  faceCount?: number;
  /** Bounding box dimensions */
  boundingBox?: {
    width: number;
    height: number;
    depth: number;
  };
  /** Center position of bounding box */
  boundingBoxCenter?: {
    x: number;
    y: number;
    z: number;
  };
  /** Node path from root (e.g. "Root/Group1/SubGroup/Mesh1") */
  nodePath?: string;
  /** Custom data preserved from the original model */
  userData?: Record<string, unknown>;
}

export interface Part {
  id: string;
  name: string;
  originalMatrix: THREE.Matrix4;
  currentMatrix: THREE.Matrix4;
  visible: boolean;
  object: THREE.Object3D;
  /** IDs of child parts */
  children?: string[];
  /** ID of the parent part */
  parentId?: string;
  /** Rich metadata about the part */
  metadata?: PartMetadata;
  /** CAD-specific engineering information */
  cadInfo?: CadPartInfo;
}

/**
 * CAD-specific engineering information for a part.
 * These fields are populated from the model's userData (custom properties)
 * or can be manually assigned by the user.
 */
export interface CadPartInfo {
  /** Material name (e.g. "Steel", "Aluminum", "Cast Iron") */
  material?: string;
  /** Mass in kg */
  mass?: string;
  /** Engineering purpose/description of the part */
  purpose?: string;
  /** Kinematic constraints (e.g. "Revolute", "Prismatic", "Fixed") */
  constraints?: string[];
  /** Names of connected/adjacent parts */
  connectedTo?: string[];
  /** Part number or identifier */
  partNumber?: string;
  /** Manufacturing method (e.g. "Casting", "Machined", "3D Printed") */
  manufacturingMethod?: string;
  /** Additional properties for extensibility */
  properties?: Record<string, string>;
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
  modelScale: number;
  resetVersion: number;
  
  // Measurement
  measureMode: boolean;
  pendingMeasurePoint: MeasurePoint | null;
  measurements: Measurement[];
  
  // Section View
  sectionViewEnabled: boolean;
  sectionViewPosition: number;
  sectionViewAxis: 'x' | 'y' | 'z';

  // Scene refs
  sceneRef: THREE.Scene | null;
  
  // Loaded model scene (for direct rendering)
  modelScene: THREE.Group | null;
  
  // Animation
  animations: THREE.AnimationClip[];
  animationPlaying: boolean;
  animationMixer: THREE.AnimationMixer | null;
  
  // Actions
  setSceneRef: (scene: THREE.Scene) => void;
  setModelScene: (scene: THREE.Group | null) => void;
  setAnimations: (clips: THREE.AnimationClip[]) => void;
  toggleAnimation: () => void;
  setAnimationPlaying: (playing: boolean) => void;
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
  updatePartMaterial: (id: string, updates: { color?: string; roughness?: number; metalness?: number }) => void;
  setSectionViewEnabled: (enabled: boolean) => void;
  toggleSectionView: () => void;
  setSectionViewPosition: (pos: number) => void;
  setSectionViewAxis: (axis: 'x' | 'y' | 'z') => void;
}
