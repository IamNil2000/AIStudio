import { useState } from "react";
import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  Grid,
  GizmoHelper,
  GizmoViewport,
} from "@react-three/drei";

import EngineViewer from "./components/EngineViewer";
import ExplodeControls from "./components/ExplodeControls";

function App() {
  // Explosion state
  const [explodeAmount, setExplodeAmount] = useState(0);

  return (
    <>
      {/* UI Controls */}
      <ExplodeControls
        explodeAmount={explodeAmount}
        setExplodeAmount={setExplodeAmount}
      />

      {/* 3D Canvas */}
      <Canvas
        style={{
          width: "100vw",
          height: "100vh",
        }}
        camera={{
          position: [1, 1, 1],
          fov: 45,
        }}
        shadows
      >
        {/* Lights */}
        <ambientLight intensity={1.5} />

        <directionalLight
          position={[5, 5, 5]}
          intensity={3}
          castShadow
        />

        {/* Ground */}
        <Grid
          infiniteGrid
          cellSize={1.5}
          sectionSize={5}
          fadeDistance={30}
        />

        {/* Engine */}
        <EngineViewer explodeAmount={explodeAmount} />

        {/* Camera Controls */}
        <OrbitControls />

        {/* Axis Helper */}
        <GizmoHelper
          alignment="bottom-right"
          margin={[80, 80]}
        >
          <GizmoViewport />
        </GizmoHelper>
      </Canvas>
    </>
  );
}

export default App;