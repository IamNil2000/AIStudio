import * as THREE from 'three';
import { GLTFLoader } from 'three-stdlib';
import { STLLoader } from 'three-stdlib';
import { OBJLoader } from 'three-stdlib';
import type { Part } from '@/types';

// Monkey-patch deprecated THREE.LoaderUtils.decodeText to silence the r165 deprecation warning.
// three-stdlib loaders (GLTFLoader, OBJLoader, etc.) still use this function internally.
// The warning: "decodedText() has been deprecated with r165 and will be removed with r175."
// In r168+ the property is removed from type declarations but still exists at runtime.
const loaderUtils = THREE.LoaderUtils as { decodeText?: (array: ArrayLike<number>) => string };
if (typeof loaderUtils.decodeText === 'function') {
  loaderUtils.decodeText = (array: ArrayLike<number>): string => {
    if (typeof TextDecoder !== 'undefined') {
      // Uint8Array accepts both Uint8Array and ArrayLike<number> inputs
      const uint8 = array instanceof Uint8Array ? array : new Uint8Array(array);
      return new TextDecoder().decode(uint8);
    }
    // Fallback for environments without TextDecoder
    let s = '';
    for (let i = 0; i < array.length; i++) {
      s += String.fromCharCode(array[i]);
    }
    return s;
  };
}

/**
 * Traverse a THREE.Object3D and extract all Mesh objects as named parts.
 * Preserves hierarchy where possible.
 */
export function extractParts(object: THREE.Object3D, baseName = 'Model'): Part[] {
  const parts: Part[] = [];
  let meshCounter = 0;
  let groupCounter = 0;

  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      meshCounter++;
      const name = child.name || `${baseName}_Part_${meshCounter}`;
      
      // Ensure the mesh has a unique ID
      const id = `part-${name}-${meshCounter}-${Date.now()}`;
      
      // Get world matrix
      child.updateWorldMatrix(true, false);
      const worldMatrix = child.matrixWorld.clone();
      
      parts.push({
        id,
        name,
        originalMatrix: worldMatrix,
        currentMatrix: worldMatrix.clone(),
        visible: true,
        object: child,
      });
    } else if (child instanceof THREE.Group && child.children.length > 0) {
      // Groups with children that aren't just transform parents
      if (child.children.some((c) => c instanceof THREE.Mesh)) {
        groupCounter++;
        const name = child.name || `${baseName}_Group_${groupCounter}`;
        const id = `part-group-${name}-${groupCounter}-${Date.now()}`;
        
        child.updateWorldMatrix(true, false);
        const worldMatrix = child.matrixWorld.clone();
        
        parts.push({
          id,
          name,
          originalMatrix: worldMatrix,
          currentMatrix: worldMatrix.clone(),
          visible: true,
          object: child,
          children: child.children.map((c) => c.name || c.uuid),
        });
      }
    }
  });

  // If no parts found, wrap entire object as one part
  if (parts.length === 0) {
    const id = `part-${baseName}-1`;
    object.updateWorldMatrix(true, false);
    const worldMatrix = object.matrixWorld.clone();
    parts.push({
      id,
      name: baseName,
      originalMatrix: worldMatrix,
      currentMatrix: worldMatrix.clone(),
      visible: true,
      object,
    });
  }

  return parts;
}

/**
 * Load a GLB/GLTF file and extract parts.
 */
export function loadGLB(
  url: string,
  onProgress?: (progress: number) => void
): Promise<{ scene: THREE.Group; parts: Part[] }> {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.load(
      url,
      (gltf) => {
        const scene = gltf.scene;
        scene.updateWorldMatrix(true, true);
        const parts = extractParts(scene, 'GLB');
        resolve({ scene, parts });
      },
      (xhr) => {
        if (onProgress && xhr.total > 0) {
          onProgress(xhr.loaded / xhr.total);
        }
      },
      (error) => reject(error)
    );
  });
}

/**
 * Load an STL file and extract parts.
 */
export function loadSTL(
  url: string,
  onProgress?: (progress: number) => void
): Promise<{ scene: THREE.Group; parts: Part[] }> {
  return new Promise((resolve, reject) => {
    const loader = new STLLoader();
    loader.load(
      url,
      (geometry) => {
        const material = new THREE.MeshStandardMaterial({
          color: 0x888899,
          roughness: 0.6,
          metalness: 0.3,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        // Center the geometry
        geometry.computeBoundingBox();
        const center = new THREE.Vector3();
        if (geometry.boundingBox) {
          geometry.boundingBox.getCenter(center);
        }
        geometry.translate(-center.x, -center.y, -center.z);
        
        const group = new THREE.Group();
        group.add(mesh);
        
        const parts = extractParts(group, 'STL');
        resolve({ scene: group, parts });
      },
      (xhr) => {
        if (onProgress && xhr.total > 0) {
          onProgress(xhr.loaded / xhr.total);
        }
      },
      (error) => reject(error)
    );
  });
}

/**
 * Load an OBJ file (with optional MTL) and extract parts.
 */
export function loadOBJ(
  url: string,
  mtlUrl?: string,
  onProgress?: (progress: number) => void
): Promise<{ scene: THREE.Group; parts: Part[] }> {
  return new Promise((resolve, reject) => {
    const loader = new OBJLoader();
    
    // For simplicity, we load the OBJ directly (MTL would need MTLLoader)
    loader.load(
      url,
      (object) => {
        // Apply default material if none
        object.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            if (!child.material) {
              child.material = new THREE.MeshStandardMaterial({
                color: 0x888899,
                roughness: 0.6,
                metalness: 0.3,
              });
            }
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        
        const parts = extractParts(object, 'OBJ');
        resolve({ scene: object, parts });
      },
      (xhr) => {
        if (onProgress && xhr.total > 0) {
          onProgress(xhr.loaded / xhr.total);
        }
      },
      (error) => reject(error)
    );
  });
}

/**
 * Load a GLB/GLTF model from a URL path (e.g. from the public directory).
 */
export async function loadModelFromUrl(
  url: string,
  onProgress?: (progress: number) => void
): Promise<{ scene: THREE.Group; parts: Part[] }> {
  return loadGLB(url, onProgress);
}

/**
 * Load a model from a File object using the appropriate loader based on extension.
 */
export async function loadModelFromFile(
  file: File,
  onProgress?: (progress: number) => void
): Promise<{ scene: THREE.Group; parts: Part[] }> {
  const url = URL.createObjectURL(file);
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  try {
    let result: { scene: THREE.Group; parts: Part[] };
    
    switch (ext) {
      case 'glb':
      case 'gltf':
        result = await loadGLB(url, onProgress);
        break;
      case 'stl':
        result = await loadSTL(url, onProgress);
        break;
      case 'obj':
        result = await loadOBJ(url, undefined, onProgress);
        break;
      default:
        throw new Error(`Unsupported file format: .${ext}`);
    }

    return result;
  } finally {
    URL.revokeObjectURL(url);
  }
}
