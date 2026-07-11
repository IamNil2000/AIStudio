import * as THREE from 'three';

// R3F JSX intrinsic elements
declare global {
  namespace JSX {
    interface IntrinsicElements {
      primitive: {
        object: THREE.Object3D;
        ref?: React.Ref<THREE.Object3D>;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onClick?: (e: any) => void;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onPointerOver?: (e: any) => void;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onPointerOut?: (e: any) => void;
        matrixAutoUpdate?: boolean;
        children?: React.ReactNode;
        [key: string]: unknown;
      };
      mesh: {
        ref?: React.Ref<THREE.Mesh>;
        geometry?: THREE.BufferGeometry;
        material?: THREE.Material | THREE.Material[];
        matrixAutoUpdate?: boolean;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onClick?: (e: any) => void;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onPointerOver?: (e: any) => void;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onPointerOut?: (e: any) => void;
        children?: React.ReactNode;
        [key: string]: unknown;
      };
      line: {
        ref?: React.Ref<THREE.Line>;
        geometry?: THREE.BufferGeometry;
        material?: THREE.Material | THREE.Material[];
        children?: React.ReactNode;
        [key: string]: unknown;
      };
      lineSegments: {
        ref?: React.Ref<THREE.LineSegments>;
        geometry?: THREE.BufferGeometry;
        material?: THREE.Material | THREE.Material[];
        children?: React.ReactNode;
        [key: string]: unknown;
      };
      bufferGeometry: {
        ref?: React.Ref<THREE.BufferGeometry>;
        children?: React.ReactNode;
        [key: string]: unknown;
      };
      lineBasicMaterial: {
        color?: string;
        opacity?: number;
        transparent?: boolean;
        [key: string]: unknown;
      };
      lineDashedMaterial: {
        color?: string;
        dashSize?: number;
        gapSize?: number;
        linewidth?: number;
        transparent?: boolean;
        opacity?: number;
        [key: string]: unknown;
      };
      bufferAttribute: {
        attach?: string;
        count?: number;
        array?: Float32Array;
        itemSize?: number;
        [key: string]: unknown;
      };
      group: {
        ref?: React.Ref<THREE.Group>;
        children?: React.ReactNode;
        [key: string]: unknown;
      };
      ambientLight: {
        intensity?: number;
        [key: string]: unknown;
      };
      directionalLight: {
        position?: [number, number, number];
        intensity?: number;
        castShadow?: boolean;
        'shadow-mapSize-width'?: number;
        'shadow-mapSize-height'?: number;
        'shadow-camera-far'?: number;
        'shadow-camera-left'?: number;
        'shadow-camera-right'?: number;
        'shadow-camera-top'?: number;
        'shadow-camera-bottom'?: number;
        [key: string]: unknown;
      };
      hemisphereLight: {
        args?: [string, string, number];
        [key: string]: unknown;
      };
      meshBasicMaterial: {
        color?: string;
        opacity?: number;
        transparent?: boolean;
        side?: number;
        depthWrite?: boolean;
        [key: string]: unknown;
      };
      boxGeometry: {
        args?: [number, number, number];
        [key: string]: unknown;
      };
      sphereGeometry: {
        args?: [number, number, number];
        [key: string]: unknown;
      };
      meshStandardMaterial: {
        color?: string;
        [key: string]: unknown;
      };
    }
  }
}

declare module '@react-three/fiber' {
  // ThreeEvent type
  interface ThreeEvent<TEvent = MouseEvent> {
    nativeEvent: TEvent;
    stopped: boolean;
    stopPropagation: () => void;
    target: THREE.Object3D;
    sourceEvent: TEvent;
    delta: number;
    intersection: THREE.Intersection;
    object: THREE.Object3D;
    eventObject: THREE.Object3D;
    unprojectedPoint: THREE.Vector3;
    pointer: THREE.Vector2;
    ray: THREE.Ray;
    camera: THREE.Camera;
    ctrlKey: boolean;
    metaKey: boolean;
    shiftKey: boolean;
    altKey: boolean;
    button: number;
    buttons: number;
    clientX: number;
    clientY: number;
    pageX: number;
    pageY: number;
    screenX: number;
    screenY: number;
    movementX: number;
    movementY: number;
  }

  // RootState
  interface RootState {
    gl: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    raycaster: THREE.Raycaster;
    pointer: THREE.Vector2;
    clock: THREE.Clock;
    viewport: {
      width: number;
      height: number;
      dpr: number;
      initialDpr: number;
      factor: number;
      distance: number;
      aspect: number;
    };
    size: { width: number; height: number; left: number; top: number; updateStyle?: boolean };
    mouse: THREE.Vector2;
    frameloop: 'always' | 'demand' | 'never';
    invalidate: () => void;
    advance: (timestamp: number, runGlobalEffects?: boolean) => void;
    set: (state: Partial<RootState>) => void;
    get: () => RootState;
    setSize: (width: number, height: number, updateStyle?: boolean, top?: number, left?: number) => void;
    setFrameloop: (frameloop: 'always' | 'demand' | 'never') => void;
    controls?: {
      target: THREE.Vector3;
      update: () => void;
      object: THREE.Object3D;
      enabled: boolean;
      dispose: () => void;
    };
    internal: {
      active: boolean;
      priority: number;
      frames: number;
      subscribers: unknown[];
      captured: Map<number, unknown>;
    };
  }

  // Canvas props
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface CanvasProps {
    children?: React.ReactNode;
    shadows?: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    camera?: Record<string, any>;
    dpr?: [number, number] | number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gl?: Record<string, any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    style?: Record<string, any>;
    className?: string;
    onCreated?: (state: RootState) => void;
    [key: string]: unknown;
  }

  export function useThree<T = RootState>(selector?: (state: RootState) => T): T;

  export function useFrame(
    callback: (state: RootState, delta: number, frame?: THREE.XRFrame) => void,
    renderPriority?: number
  ): null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function useLoader<T>(loader: new () => { load: (...args: unknown[]) => T }, url: string, extensions?: (loader: any) => void, onProgress?: (progress: { loaded: number; total: number }) => void): T;

  export const Canvas: React.ForwardRefExoticComponent<
    CanvasProps & React.RefAttributes<HTMLCanvasElement>
  >;

  export function createPortal(
    children: React.ReactNode,
    container: THREE.Object3D,
    state?: Partial<RootState>
  ): React.ReactNode;
}

declare module '@react-three/drei' {
  import * as React from 'react';

  interface OrbitControlsProps {
    ref?: React.Ref<unknown>;
    makeDefault?: boolean;
    enableDamping?: boolean;
    dampingFactor?: number;
    maxDistance?: number;
    minDistance?: number;
    [key: string]: unknown;
  }

  interface GridProps {
    cellColor?: string;
    cellSize?: number;
    sectionColor?: string;
    sectionSize?: number;
    fadeDistance?: number;
    infiniteGrid?: boolean;
    position?: [number, number, number];
    [key: string]: unknown;
  }

  interface GizmoHelperProps {
    alignment?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    margin?: [number, number];
    renderPriority?: number;
    [key: string]: unknown;
  }

  interface GizmoViewportProps {
    axisColors?: [string, string, string];
    labelColor?: string;
    opacity?: number;
    [key: string]: unknown;
  }

  export const OrbitControls: React.ForwardRefExoticComponent<
    OrbitControlsProps & React.RefAttributes<typeof OrbitControls>
  >;

  export const Grid: React.FC<GridProps>;
  export const GizmoHelper: React.FC<GizmoHelperProps>;
  export const GizmoViewport: React.FC<GizmoViewportProps>;
}

declare module 'three-stdlib' {
  import * as THREE from 'three';

  export class GLTFLoader {
    load(
      url: string,
      onLoad: (gltf: { scene: THREE.Group }) => void,
      onProgress?: (xhr: { loaded: number; total: number }) => void,
      onError?: (error: unknown) => void
    ): void;
    parse(
      data: ArrayBuffer | string,
      path: string,
      onLoad: (gltf: { scene: THREE.Group }) => void,
      onError?: (error: unknown) => void
    ): void;
  }

  export class STLLoader {
    load(
      url: string,
      onLoad: (geometry: THREE.BufferGeometry) => void,
      onProgress?: (xhr: { loaded: number; total: number }) => void,
      onError?: (error: unknown) => void
    ): void;
    parse(data: ArrayBuffer | string): THREE.BufferGeometry;
  }

  export class OBJLoader {
    load(
      url: string,
      onLoad: (object: THREE.Group) => void,
      onProgress?: (xhr: { loaded: number; total: number }) => void,
      onError?: (error: unknown) => void
    ): void;
    parse(data: string): THREE.Group;
  }
}
