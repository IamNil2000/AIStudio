
// import { useGLTF } from "@react-three/drei";
// import { useEffect, useRef } from "react";

// export default function EngineViewer() {
//   const { scene } = useGLTF("/models/EngineAsm/Engine.gltf");
//   const group = useRef();

//   useEffect(() => {
//     console.log(scene);
//   }, [scene]);

//   return (
//     <group
//       ref={group}
//       rotation={[-Math.PI/2, 0, 0]}
//     >
//       <primitive object={scene} />
//     </group>
//   );
// }

import { useGLTF } from "@react-three/drei";
import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function EngineViewer({ explodeAmount }) {
  const { scene } = useGLTF("/models/Hooke/doublehookejoint.gltf");
  const group = useRef();

  useEffect(() => {
    // Rotate model upright
    scene.rotation.x = -Math.PI / 2;

    // Compute model center
    const box = new THREE.Box3().setFromObject(scene);
    const center = box.getCenter(new THREE.Vector3());

    scene.traverse((child) => {
      if (!child.isMesh) return;

      // Better looking material
      child.material.metalness = 0.15;
      child.material.roughness = 0.55;

      // Save original position once
      if (!child.userData.originalPosition) {
        child.userData.originalPosition = child.position.clone();

        child.userData.direction = child
          .getWorldPosition(new THREE.Vector3())
          .sub(center)
          .normalize();
      }

      // Move according to explodeAmount
      child.position.copy(child.userData.originalPosition);
      child.position.add(
        child.userData.direction.clone().multiplyScalar(explodeAmount)
      );
    });
  }, [scene, explodeAmount]);

  return (
    <group ref={group}>
      <primitive object={scene} />
    </group>
  );
}