import * as THREE from 'three';

/**
 * Decompose a Matrix4 into position, quaternion, and scale vectors.
 */
export function decomposeMatrix(
  matrix: THREE.Matrix4
): { position: THREE.Vector3; quaternion: THREE.Quaternion; scale: THREE.Vector3 } {
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  matrix.decompose(position, quaternion, scale);
  return { position, quaternion, scale };
}

/**
 * Compose position, quaternion, and scale into a Matrix4.
 */
export function composeMatrix(
  position: THREE.Vector3,
  quaternion: THREE.Quaternion,
  scale: THREE.Vector3
): THREE.Matrix4 {
  return new THREE.Matrix4().compose(position, quaternion, scale);
}

/**
 * Translate a matrix along a given axis by a delta amount.
 * @param matrix - The matrix to translate
 * @param axis - The axis to translate along ('x', 'y', 'z')
 * @param delta - The amount to translate
 * @param space - Transform space ('local', 'world', 'view')
 * @param camera - Camera for view space transforms
 */
export function translateAlongAxis(
  matrix: THREE.Matrix4,
  axis: 'x' | 'y' | 'z',
  delta: number,
  space: 'local' | 'world' | 'view' = 'world',
  camera?: THREE.Camera
): THREE.Matrix4 {
  const { position, quaternion, scale } = decomposeMatrix(matrix);
  const direction = new THREE.Vector3();

  if (space === 'local') {
    // Local space: apply rotation to the axis
    direction[axis] = 1;
    direction.applyQuaternion(quaternion);
  } else if (space === 'view' && camera) {
    // View space: use camera's right/up/forward
    camera.getWorldDirection(direction);
    if (axis === 'x') {
      direction.set(1, 0, 0).applyQuaternion(camera.quaternion);
    } else if (axis === 'y') {
      direction.set(0, 1, 0).applyQuaternion(camera.quaternion);
    } else {
      // z: camera forward direction
      direction.negate();
    }
  } else {
    // World space
    direction[axis] = 1;
  }

  position.add(direction.multiplyScalar(delta));
  return composeMatrix(position, quaternion, scale);
}

/**
 * Rotate a matrix around a given axis by a given angle.
 */
export function rotateAroundAxis(
  matrix: THREE.Matrix4,
  axis: 'x' | 'y' | 'z',
  angle: number,
  space: 'local' | 'world' | 'view' = 'local'
): THREE.Matrix4 {
  const { position, quaternion, scale } = decomposeMatrix(matrix);
  const axisVec = new THREE.Vector3();
  axisVec[axis] = 1;

  if (space === 'world') {
    // Apply world-axis rotation
    const worldQuat = new THREE.Quaternion().setFromAxisAngle(axisVec, angle);
    quaternion.premultiply(worldQuat);
  } else {
    // Local space rotation
    const localQuat = new THREE.Quaternion().setFromAxisAngle(axisVec, angle);
    quaternion.multiply(localQuat);
  }

  quaternion.normalize();
  return composeMatrix(position, quaternion, scale);
}

/**
 * Scale a matrix uniformly or non-uniformly.
 */
export function scaleMatrix(
  matrix: THREE.Matrix4,
  axis: 'x' | 'y' | 'z' | 'uniform',
  factor: number
): THREE.Matrix4 {
  const { position, quaternion, scale } = decomposeMatrix(matrix);

  if (axis === 'uniform') {
    scale.multiplyScalar(factor);
  } else {
    scale[axis] *= factor;
  }

  return composeMatrix(position, quaternion, scale);
}

/**
 * Nudge a matrix by small increments along an axis.
 */
export function nudgeMatrix(
  matrix: THREE.Matrix4,
  axis: 'x' | 'y' | 'z',
  amount: number
): THREE.Matrix4 {
  const { position, quaternion, scale } = decomposeMatrix(matrix);
  const direction = new THREE.Vector3();
  direction[axis] = 1;
  position.add(direction.multiplyScalar(amount));
  return composeMatrix(position, quaternion, scale);
}

/**
 * Free translate in screen/camera plane with camera-distance-aware sensitivity.
 * Maps 2D mouse delta to 3D movement in the camera plane.
 * The sensitivity scales with camera distance so parts at any depth feel consistent.
 *
 * @param matrix - The matrix to translate
 * @param deltaX - Horizontal mouse delta in pixels
 * @param deltaY - Vertical mouse delta in pixels
 * @param camera - The camera used for view orientation
 * @param sensitivity - Base sensitivity factor (default 0.015)
 * @param cameraDistance - Distance from camera to object. If provided, sensitivity
 *   is adjusted proportionally so parts further from camera move faster per pixel.
 */
export function freeTranslate(
  matrix: THREE.Matrix4,
  deltaX: number,
  deltaY: number,
  camera: THREE.Camera,
  sensitivity = 0.015,
  cameraDistance?: number
): THREE.Matrix4 {
  const { position, quaternion, scale } = decomposeMatrix(matrix);

  // Camera-distance-aware sensitivity adjustment
  // Objects further from camera need larger movement to feel consistent on screen.
  // Base calibration: at distance 10, sensitivity = provided value.
  let adjustedSensitivity = sensitivity;
  if (cameraDistance !== undefined && cameraDistance > 0.1) {
    adjustedSensitivity = sensitivity * (cameraDistance / 10);
  }

  // Get camera right and up vectors (in world space)
  const right = new THREE.Vector3();
  const up = new THREE.Vector3();
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  right.crossVectors(forward, camera.up).normalize();
  up.copy(camera.up).normalize();

  // Move in camera plane
  position.add(right.multiplyScalar(deltaX * adjustedSensitivity));
  position.add(up.multiplyScalar(-deltaY * adjustedSensitivity));

  return composeMatrix(position, quaternion, scale);
}

/**
 * Rotate a part naturally by mapping 2D mouse movement to 3D rotation.
 *
 * This uses a "turntable" style rotation:
 * - Horizontal drag  → rotates around world Y axis (spins horizontally)
 * - Vertical drag    → tilts toward/away from the viewer using the camera's
 *                      local right axis as the rotation axis
 * - Diagonal drag    → combines both naturally
 *
 * This feels intuitive because it mirrors how you'd naturally manipulate
 * an object in space — left/right spins it, up/down tilts it.
 *
 * @param matrix - The matrix to rotate
 * @param deltaX - Horizontal mouse delta in pixels
 * @param deltaY - Vertical mouse delta in pixels
 * @param camera - The camera for view orientation
 * @param sensitivity - Rotation sensitivity (default 0.006)
 */
export function rotateFree(
  matrix: THREE.Matrix4,
  deltaX: number,
  deltaY: number,
  camera: THREE.Camera,
  sensitivity = 0.006
): THREE.Matrix4 {
  const { position, quaternion, scale } = decomposeMatrix(matrix);

  // --- Horizontal rotation: spin around world Y axis ---
  if (Math.abs(deltaX) > 0.5) {
    const qY = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      deltaX * sensitivity
    );
    quaternion.premultiply(qY);
  }

  // --- Vertical rotation: tilt around camera's right axis ---
  if (Math.abs(deltaY) > 0.5) {
    const right = new THREE.Vector3();
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    right.crossVectors(forward, camera.up).normalize();

    const qX = new THREE.Quaternion().setFromAxisAngle(
      right,
      -deltaY * sensitivity
    );
    quaternion.premultiply(qX);
  }

  quaternion.normalize();
  return composeMatrix(position, quaternion, scale);
}

/**
 * Serialize a matrix to a JSON-compatible object.
 */
export function serializeMatrix(matrix: THREE.Matrix4): number[] {
  return matrix.toArray();
}

/**
 * Clone a matrix.
 */
export function cloneMatrix(matrix: THREE.Matrix4): THREE.Matrix4 {
  return matrix.clone();
}
