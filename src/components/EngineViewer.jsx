
// import { useGLTF } from "@react-three/drei";
// import { useEffect } from "react";
// import { Group } from "three/examples/jsm/libs/tween.module.js";

// export default function EngineViewer() {
//   const { scene } = useGLTF("models/EngineAsm/Engine.gltf");

//   useEffect(() => {
//     console.log(scene);
//   }, [scene]);

//   return <primitive object={scene} />;
  
// }



import { useGLTF } from "@react-three/drei";
import { useEffect, useRef } from "react";

export default function EngineViewer() {
  const { scene } = useGLTF("/models/EngineAsm/Engine.gltf");
  const group = useRef();

  useEffect(() => {
    console.log(scene);
  }, [scene]);

  return (
    <group
      ref={group}
      rotation={[-Math.PI/2, 0, 0]}
    >
      <primitive object={scene} />
    </group>
  );
}