import * as THREE from 'three';
import { GLTFLoader } from 'three-stdlib';
import { STLLoader } from 'three-stdlib';
import { OBJLoader } from 'three-stdlib';
import type { Part, PartMetadata, PartNodeType, CadPartInfo } from '@/types';

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
 * Recursively extract all parts from a THREE.Object3D, preserving the
 * full hierarchy and collecting rich metadata (geometry stats, materials,
 * bounding box, node path, etc.).
 *
 * - Groups at every level become structural nodes in the Part tree.
 * - InstancedMesh instances are extracted as individual parts.
 * - Lines, Points, Bones, and Sprites are all captured.
 * - Falls back to a single root part when nothing is found.
 */
export function extractParts(
  object: THREE.Object3D,
  baseName = 'Model'
): Part[] {
  const allParts: Part[] = [];
  let meshCounter = 0;
  let groupCounter = 0;
  let boneCounter = 0;
  let lineCounter = 0;
  let pointsCounter = 0;
  let spriteCounter = 0;
  let instanceCounter = 0;
  let unknownCounter = 0;

  // Track path segments for nodePath
  const pathStack: string[] = [];

  /**
   * Determine the node type string for a given THREE.Object3D child.
   */
  function getNodeType(child: THREE.Object3D): PartNodeType {
    if (child instanceof THREE.InstancedMesh) return 'instanced-mesh';
    if (child instanceof THREE.SkinnedMesh) return 'skinned-mesh';
    if (child instanceof THREE.Mesh) return 'mesh';
    if (child instanceof THREE.Bone) return 'bone';
    if (child instanceof THREE.Group) return 'group';
    if (child instanceof THREE.LineSegments || child instanceof THREE.LineLoop || child instanceof THREE.Line) return 'line';
    if (child instanceof THREE.Points) return 'points';
    if (child instanceof THREE.Sprite) return 'sprite';
    return 'unknown';
  }

  /**
   * Collect metadata from a child node.
   */
  /**
   * Extract CAD-specific information from the node's userData.
   * GLTF/GLB files often embed custom properties like "cad_material",
   * "mass", "purpose", etc. in userData. We also support a flattened
   * key naming convention for compatibility with various CAD export tools.
   */
  function extractCadInfo(userData: Record<string, unknown>): CadPartInfo | undefined {
    if (!userData || Object.keys(userData).length === 0) return undefined;

    const cad: CadPartInfo = {};
    let hasData = false;

    // Helper to get string value from userData by key
    const getStr = (...keys: string[]): string | undefined => {
      for (const key of keys) {
        const val = userData[key];
        if (typeof val === 'string' && val.trim()) return val.trim();
        if (typeof val === 'number') return String(val);
      }
      return undefined;
    };

    // Helper to get string array from userData
    const getArr = (...keys: string[]): string[] | undefined => {
      for (const key of keys) {
        const val = userData[key];
        if (Array.isArray(val) && val.length > 0) {
          const strings = val.filter((v): v is string => typeof v === 'string');
          if (strings.length > 0) return strings;
        }
        // Also support comma-separated string
        if (typeof val === 'string' && val.trim()) {
          return val.split(',').map((s) => s.trim()).filter(Boolean);
        }
      }
      return undefined;
    };

    // Material
    const material = getStr(
      'cad_material', 'material', 'Material', 'MATERIAL',
      'cadMaterial', 'CAD_material'
    );
    if (material) {
      cad.material = material;
      hasData = true;
    }

    // Mass
    const mass = getStr(
      'cad_mass', 'mass', 'Mass', 'MASS', 'weight', 'Weight',
      'cadMass', 'CAD_mass'
    );
    if (mass) {
      // Append unit if not present
      cad.mass = /\b(kg|g|lb|oz)\b/i.test(mass) ? mass : `${mass} kg`;
      hasData = true;
    }

    // Purpose / description
    const purpose = getStr(
      'cad_purpose', 'purpose', 'Purpose', 'PURPOSE',
      'description', 'Description', 'description', 'DESCRIPTION',
      'cadPurpose', 'CAD_purpose', 'function', 'Function'
    );
    if (purpose) {
      cad.purpose = purpose;
      hasData = true;
    }

    // Constraints
    const constraints = getArr(
      'cad_constraints', 'constraints', 'Constraints', 'CONSTRAINTS',
      'cadConstraints', 'CAD_constraints', 'joint', 'Joint', 'JOINT'
    );
    if (constraints) {
      cad.constraints = constraints;
      hasData = true;
    }

    // Connected to
    const connectedTo = getArr(
      'cad_connected', 'connected_to', 'connectedTo', 'ConnectedTo',
      'CONNECTED_TO', 'cadConnected', 'CAD_connected',
      'connections', 'Connections'
    );
    if (connectedTo) {
      cad.connectedTo = connectedTo;
      hasData = true;
    }

    // Part number
    const partNumber = getStr(
      'cad_part_number', 'part_number', 'partNumber', 'PartNumber',
      'PART_NUMBER', 'cadPartNumber', 'CAD_part_number',
      'part_no', 'partNo', 'PartNo'
    );
    if (partNumber) {
      cad.partNumber = partNumber;
      hasData = true;
    }

    // Manufacturing method
    const manufacturingMethod = getStr(
      'cad_manufacturing', 'manufacturing', 'Manufacturing',
      'MANUFACTURING', 'cadManufacturing', 'CAD_manufacturing',
      'process', 'Process'
    );
    if (manufacturingMethod) {
      cad.manufacturingMethod = manufacturingMethod;
      hasData = true;
    }

    // Collect any remaining custom properties not already captured
    const capturedKeys = new Set([
      'cad_material', 'material', 'Material', 'MATERIAL', 'cadMaterial', 'CAD_material',
      'cad_mass', 'mass', 'Mass', 'MASS', 'weight', 'Weight', 'cadMass', 'CAD_mass',
      'cad_purpose', 'purpose', 'Purpose', 'PURPOSE', 'description', 'Description',
      'DESCRIPTION', 'cadPurpose', 'CAD_purpose', 'function', 'Function',
      'cad_constraints', 'constraints', 'Constraints', 'CONSTRAINTS',
      'cadConstraints', 'CAD_constraints', 'joint', 'Joint', 'JOINT',
      'cad_connected', 'connected_to', 'connectedTo', 'ConnectedTo',
      'CONNECTED_TO', 'cadConnected', 'CAD_connected', 'connections', 'Connections',
      'cad_part_number', 'part_number', 'partNumber', 'PartNumber',
      'PART_NUMBER', 'cadPartNumber', 'CAD_part_number', 'part_no', 'partNo', 'PartNo',
      'cad_manufacturing', 'manufacturing', 'Manufacturing',
      'MANUFACTURING', 'cadManufacturing', 'CAD_manufacturing', 'process', 'Process',
    ]);

    const extraProps: Record<string, string> = {};
    for (const [key, val] of Object.entries(userData)) {
      if (!capturedKeys.has(key) && (typeof val === 'string' || typeof val === 'number')) {
        extraProps[key] = String(val);
      }
    }
    if (Object.keys(extraProps).length > 0) {
      cad.properties = extraProps;
      hasData = true;
    }

    return hasData ? cad : undefined;
  }

  function collectMetadata(
    child: THREE.Object3D,
    nodeType: PartNodeType,
    path: string
  ): { metadata: PartMetadata; cadInfo?: CadPartInfo } {
    const meta: PartMetadata = {
      nodeType,
      nodePath: path,
      userData: child.userData ?? undefined,
    };

    // Extract CAD info from userData
    const cadInfo = child.userData ? extractCadInfo(child.userData as Record<string, unknown>) : undefined;

    // Material info
    if (child instanceof THREE.Mesh || child instanceof THREE.SkinnedMesh || child instanceof THREE.InstancedMesh) {
      const mat = Array.isArray(child.material) ? child.material[0] : child.material;
      if (mat) {
        meta.materialName = mat.name || undefined;
        if ('color' in mat) {
          const c = (mat as THREE.MeshStandardMaterial).color;
          meta.materialColor = c ? '#' + c.getHexString() : undefined;
        }
      }
    }

    // Geometry stats
    if (child instanceof THREE.Mesh || child instanceof THREE.SkinnedMesh || child instanceof THREE.InstancedMesh) {
      const geom = child.geometry;
      if (geom) {
        const pos = geom.getAttribute('position');
        if (pos) {
          meta.vertexCount = pos.count;
        }
        const idx = geom.index;
        if (idx) {
          meta.faceCount = idx.count / 3;
        } else if (pos) {
          meta.faceCount = pos.count / 3;
        }

        // Bounding box
        geom.computeBoundingBox();
        if (geom.boundingBox) {
          const bSize = new THREE.Vector3();
          geom.boundingBox.getSize(bSize);
          meta.boundingBox = {
            width: parseFloat(bSize.x.toFixed(4)),
            height: parseFloat(bSize.y.toFixed(4)),
            depth: parseFloat(bSize.z.toFixed(4)),
          };
          const bCenter = new THREE.Vector3();
          geom.boundingBox.getCenter(bCenter);
          meta.boundingBoxCenter = {
            x: parseFloat(bCenter.x.toFixed(4)),
            y: parseFloat(bCenter.y.toFixed(4)),
            z: parseFloat(bCenter.z.toFixed(4)),
          };
        }
      }
    }

    return { metadata: meta, cadInfo };
  }

  /**
   * Recursive DFS that extracts each node as a Part and wires up
   * parentId / children references.
   */
  function dfs(
    child: THREE.Object3D,
    parentId: string | undefined,
    depth: number
  ): void {
    // Build node path
    const nodeName = child.name || child.type + '_' + (child.id || Math.random().toString(36).slice(2, 8));
    pathStack.push(nodeName);
    const nodePath = pathStack.join('/');

    const nodeType = getNodeType(child);

    // Determine if we should skip this node (only traverse through it but don't create a part)
    // We skip root-level helpers/cameras but capture everything else
    const isSkippable =
      child instanceof THREE.Scene ||
      child instanceof THREE.PerspectiveCamera ||
      child instanceof THREE.OrthographicCamera ||
      child instanceof THREE.AxesHelper ||
      child instanceof THREE.GridHelper ||
      child instanceof THREE.ArrowHelper ||
      child instanceof THREE.CameraHelper;

    if (!isSkippable) {
      let counter = 0;
      switch (nodeType) {
        case 'mesh':
        case 'skinned-mesh':
          meshCounter++;
          counter = meshCounter;
          break;
        case 'instanced-mesh':
          instanceCounter++;
          counter = instanceCounter;
          break;
        case 'group':
          groupCounter++;
          counter = groupCounter;
          break;
        case 'bone':
          boneCounter++;
          counter = boneCounter;
          break;
        case 'line':
          lineCounter++;
          counter = lineCounter;
          break;
        case 'points':
          pointsCounter++;
          counter = pointsCounter;
          break;
        case 'sprite':
          spriteCounter++;
          counter = spriteCounter;
          break;
        default:
          unknownCounter++;
          counter = unknownCounter;
      }

      const name = child.name || `${baseName}_${nodeType}_${counter}`;
      const id = `part-${name}-${nodeType}-${counter}-${Date.now()}`;

      // World matrix
      child.updateWorldMatrix(true, false);
      const worldMatrix = child.matrixWorld.clone();

      const { metadata, cadInfo } = collectMetadata(child, nodeType, nodePath);

      // For instanced meshes, we'll extract each instance below
      // For now, create the structural part
      const part: Part = {
        id,
        name,
        originalMatrix: worldMatrix,
        currentMatrix: worldMatrix.clone(),
        visible: true,
        object: child,
        parentId,
        metadata,
        cadInfo,
        children: [],
      };

      allParts.push(part);

      // If this is an InstancedMesh, extract each instance as a sub-part
      if (child instanceof THREE.InstancedMesh) {
        const dummy = new THREE.Object3D();
        const instanceMat = Array.isArray(child.material) ? child.material[0] : child.material;

        for (let i = 0; i < child.count; i++) {
          child.getMatrixAt(i, dummy.matrix);
          dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);

          const instanceName = `${name}_instance_${i}`;
          const instanceId = `part-instance-${instanceName}-${i}-${Date.now()}`;
          const instancePath = `${nodePath}/${instanceName}`;

          // For each instance, create a proxy mesh that references the same geometry
          const instanceGeom = child.geometry.clone();
          const instanceMesh = new THREE.Mesh(instanceGeom, instanceMat.clone());
          instanceMesh.name = instanceName;
          instanceMesh.position.copy(dummy.position);
          instanceMesh.quaternion.copy(dummy.quaternion);
          instanceMesh.scale.copy(dummy.scale);
          instanceMesh.castShadow = child.castShadow;
          instanceMesh.receiveShadow = child.receiveShadow;

          // Compute per-instance metadata
          instanceMesh.updateWorldMatrix(true, false);
          const instanceWorldMatrix = instanceMesh.matrixWorld.clone();

          const instanceResult = collectMetadata(child, 'mesh', instancePath);
          const instanceMeta: PartMetadata = {
            ...instanceResult.metadata,
            nodeType: 'mesh',
            nodePath: instancePath,
          };

          const instancePart: Part = {
            id: instanceId,
            name: instanceName,
            originalMatrix: instanceWorldMatrix,
            currentMatrix: instanceWorldMatrix.clone(),
            visible: true,
            object: instanceMesh,
            parentId: id,
            metadata: instanceMeta,
            cadInfo: instanceResult.cadInfo,
          };

          allParts.push(instancePart);
          part.children!.push(instanceId);
        }
      }

      // Recurse into children and collect their IDs
      const childIds: string[] = [];
      for (const c of child.children) {
        const prevCount = allParts.length;
        dfs(c, id, depth + 1);
        // All new parts added during dfs are children of this node
        if (allParts.length > prevCount) {
          const newParts = allParts.slice(prevCount);
          for (const np of newParts) {
            childIds.push(np.id);
          }
        }
      }

      // Update children list for this part
      part.children = [...(part.children || []), ...childIds];
    } else {
      // Skippable node: still traverse children but don't create a part
      for (const c of child.children) {
        dfs(c, parentId, depth + 1);
      }
    }

    pathStack.pop();
  }

  dfs(object, undefined, 0);

  // If no parts found at all, wrap the entire object as one part
  if (allParts.length === 0) {
    const id = `part-${baseName}-1`;
    object.updateWorldMatrix(true, false);
    const worldMatrix = object.matrixWorld.clone();
    const metadata: PartMetadata = {
      nodeType: 'group',
      nodePath: baseName,
    };
    allParts.push({
      id,
      name: baseName,
      originalMatrix: worldMatrix,
      currentMatrix: worldMatrix.clone(),
      visible: true,
      object,
      metadata,
    });
  }

  return allParts;
}

/**
 * Load a GLB/GLTF file and extract parts.
 */
export function loadGLB(
  url: string,
  onProgress?: (progress: number) => void
): Promise<{ scene: THREE.Group; parts: Part[]; animations: THREE.AnimationClip[] }> {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.load(
      url,
      (gltf) => {
        const gltfResult = gltf as { scene: THREE.Group; animations: THREE.AnimationClip[] };
        const scene = gltfResult.scene;
        scene.updateWorldMatrix(true, true);
        const parts = extractParts(scene, 'GLB');
        resolve({ scene, parts, animations: gltfResult.animations || [] });
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
): Promise<{ scene: THREE.Group; parts: Part[]; animations: THREE.AnimationClip[] }> {
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
        resolve({ scene: group, parts, animations: [] });
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
): Promise<{ scene: THREE.Group; parts: Part[]; animations: THREE.AnimationClip[] }> {
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
        resolve({ scene: object, parts, animations: [] });
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
): Promise<{ scene: THREE.Group; parts: Part[]; animations: THREE.AnimationClip[] }> {
  return loadGLB(url, onProgress);
}

/**
 * Load a model from a File object using the appropriate loader based on extension.
 */
export async function loadModelFromFile(
  file: File,
  onProgress?: (progress: number) => void
): Promise<{ scene: THREE.Group; parts: Part[]; animations: THREE.AnimationClip[] }> {
  const url = URL.createObjectURL(file);
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  try {
    let result: { scene: THREE.Group; parts: Part[]; animations: THREE.AnimationClip[] };
    
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
