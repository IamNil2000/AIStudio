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
 * Apply a world-space translation offset to a matrix.
 * Unlike freeTranslate (which approximates with pixel deltas),
 * this takes a pre-computed world-space delta vector for
 * pixel-perfect cursor tracking when combined with
 * plane-projected raycasting (used by Shift+drag).
 */
export function translateByWorldOffset(
  matrix: THREE.Matrix4,
  offset: THREE.Vector3
): THREE.Matrix4 {
  const { position, quaternion, scale } = decomposeMatrix(matrix);
  position.add(offset);
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
  // When dragging up (negative dy), angle is negative → top tilts away from camera.
  // When dragging down (positive dy), angle is positive → top tilts toward camera.
  if (Math.abs(deltaY) > 0.5) {
    const right = new THREE.Vector3();
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    right.crossVectors(forward, camera.up).normalize();

    const qX = new THREE.Quaternion().setFromAxisAngle(
      right,
      deltaY * sensitivity
    );
    quaternion.premultiply(qX);
  }

  quaternion.normalize();
  return composeMatrix(position, quaternion, scale);
}

// Pre-allocated vectors for arcball rotation (avoids GC on every mousemove)
const _arcballV1 = new THREE.Vector3();
const _arcballV2 = new THREE.Vector3();
const _arcballAxis = new THREE.Vector3();

/**
 * Project a 2D NDC coordinate onto a virtual trackball sphere.
 * Positions inside the unit circle are mapped onto a hemisphere;
 * positions outside are normalized to the sphere's rim.
 */
function projectOnSphere(x: number, y: number, out: THREE.Vector3): void {
  const r2 = x * x + y * y;
  out.set(x, y, 0);
  if (r2 <= 1) {
    out.z = Math.sqrt(1 - r2);
  } else {
    out.normalize();
  }
}

/**
 * Apply an arcball (trackball) rotation from one normalized device
 * coordinate to another. Maps 2D mouse movement on a virtual sphere
 * to a precise 3D rotation, giving pixel-perfect cursor tracking.
 *
 * Unlike rotateFree (which uses pixel deltas multiplied by a sensitivity
 * factor), this uses the actual 3D positions on a virtual trackball
 * sphere to compute the exact rotation axis and angle.
 *
 * @param matrix - The matrix to rotate
 * @param prevNDC - Previous frame's NDC mouse position
 * @param currNDC - Current frame's NDC mouse position
 */
export function rotateArcball(
  matrix: THREE.Matrix4,
  prevNDC: { x: number; y: number },
  currNDC: { x: number; y: number },
  sensitivity = 4.0
): THREE.Matrix4 {
  const { position, quaternion, scale } = decomposeMatrix(matrix);

  // Project both NDC positions onto the virtual trackball sphere
  projectOnSphere(prevNDC.x, prevNDC.y, _arcballV1);
  projectOnSphere(currNDC.x, currNDC.y, _arcballV2);

  // Rotation axis = cross product of the two sphere vectors
  _arcballAxis.crossVectors(_arcballV1, _arcballV2);

  // Skip if rotation is too small (sub-pixel movement)
  if (_arcballAxis.length() < 0.001) return matrix;

  // Angle = arccos of the dot product (clamped for safety)
  const dot = Math.max(-1, Math.min(1, _arcballV1.dot(_arcballV2)));
  const angle = Math.acos(dot);
  _arcballAxis.normalize();

  // Apply sensitivity multiplier
  // Use premultiply (world space) so screen directions map to world axes:
  // vertical drag → world X tilt, horizontal drag → world Y spin
  const rotQuat = new THREE.Quaternion().setFromAxisAngle(_arcballAxis, angle * sensitivity);
  quaternion.premultiply(rotQuat);
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
