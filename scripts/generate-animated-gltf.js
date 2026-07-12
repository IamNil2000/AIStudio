/**
 * Generates a simple animated GLB file for testing the animation playback feature.
 * Creates a scene with a gear-like shape that has a continuous rotation animation.
 *
 * Usage: node scripts/generate-animated-gltf.js
 */

const fs = require('fs');
const path = require('path');
const THREE = require('three');
const { GLTFExporter } = require('three-stdlib');

// Create a simple gear/cog shape with animated rotation
function createAnimatedModel() {
  const scene = new THREE.Scene();

  // --- Central hub ---
  const hubGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.15, 16);
  const hubMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, metalness: 0.4, roughness: 0.5 });
  const hub = new THREE.Mesh(hubGeo, hubMat);
  hub.position.y = 0;
  hub.name = 'Hub';
  scene.add(hub);

  // --- Spokes (8 arms radiating outward) ---
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const armGeo = new THREE.BoxGeometry(0.5, 0.08, 0.08);
    const armMat = new THREE.MeshStandardMaterial({
      color: i % 2 === 0 ? 0xef4444 : 0x22c55e,
      metalness: 0.3,
      roughness: 0.6,
    });
    const arm = new THREE.Mesh(armGeo, armMat);
    arm.position.set(Math.cos(angle) * 0.4, 0, Math.sin(angle) * 0.4);
    arm.rotation.y = -angle;
    arm.name = `Spoke_${i}`;
    scene.add(arm);
  }

  // --- Outer ring segments ---
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const toothGeo = new THREE.BoxGeometry(0.12, 0.2, 0.12);
    const toothMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.5,
      roughness: 0.4,
    });
    const tooth = new THREE.Mesh(toothGeo, toothMat);
    tooth.position.set(Math.cos(angle) * 0.7, 0, Math.sin(angle) * 0.7);
    tooth.lookAt(0, 0, 0);
    tooth.name = `Tooth_${i}`;
    scene.add(tooth);
  }

  // --- Pedestal ---
  const pedGeo = new THREE.CylinderGeometry(0.8, 0.9, 0.1, 24);
  const pedMat = new THREE.MeshStandardMaterial({ color: 0x6b7280, metalness: 0.6, roughness: 0.3 });
  const ped = new THREE.Mesh(pedGeo, pedMat);
  ped.position.y = -0.15;
  ped.name = 'Pedestal';
  scene.add(ped);

  // --- Animation: rotate the entire assembly (except pedestal) ---
  // Create a pivot group for everything that should animate
  const pivot = new THREE.Group();
  pivot.name = 'RotatingAssembly';

  // Move children from scene to pivot
  const childrenToMove = scene.children.filter(c => c.name !== 'Pedestal');
  for (const child of childrenToMove) {
    scene.remove(child);
    pivot.add(child);
  }
  scene.add(pivot);

  // Define rotation animation on the pivot group
  const times = [0, 2, 4]; // Keyframes at 0s, 2s, 4s (full rotation cycle)
  const values = [
    0, 0, 0,           // Frame 0: no rotation
    0, Math.PI, 0,     // Frame 1: 180° around Y
    0, Math.PI * 2, 0, // Frame 2: 360° around Y (back to start)
  ];

  const rotTrack = new THREE.VectorKeyframeTrack(
    '.rotation[euler]',
    times,
    values
  );

  const clip = new THREE.AnimationClip('Rotate', 4, [rotTrack]);

  return { scene, clip };
}

async function main() {
  const { scene, clip } = createAnimatedModel();

  // Set up basic lighting for a nice preview
  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
  dirLight.position.set(5, 10, 7);
  scene.add(dirLight);
  const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
  dirLight2.position.set(-5, -5, -5);
  scene.add(dirLight2);

  // Export to GLB with animation
  const exporter = new GLTFExporter();

  const options = {
    binary: true,
    animations: [clip],
    includeCustomExtensions: false,
  };

  exporter.parse(
    scene,
    (result) => {
      // result is an ArrayBuffer for binary export
      const buffer = Buffer.from(result);
      const outputPath = path.join(__dirname, '..', 'public', 'models', 'test-animated.glb');
      fs.writeFileSync(outputPath, buffer);
      console.log(`✅ Created animated GLB at: ${outputPath}`);
      console.log(`   File size: ${(buffer.length / 1024).toFixed(1)} KB`);
      console.log(`   Animation: "${clip.name}" (${clip.duration}s, ${clip.tracks.length} track(s))`);
    },
    (error) => {
      console.error('❌ Export failed:', error);
      process.exit(1);
    },
    options
  );
}

main().catch(console.error);
