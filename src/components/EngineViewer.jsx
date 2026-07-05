
import { useGLTF } from "@react-three/drei";
import { useEffect } from "react";

export default function EngineViewer() {
  const { scene } = useGLTF("models/EngineAsm/Engine.gltf");

  useEffect(() => {
    console.log(scene);
  }, [scene]);

  return <primitive object={scene} />;
}