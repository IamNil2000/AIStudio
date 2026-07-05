import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid, GizmoHelper, GizmoViewport } from "@react-three/drei";
import EngineViewer from "./components/EngineViewer";

function App() {
  return (
    <Canvas
      style={{width: "100vw", height: "100vh"}}
      camera={{
          position: [1,1,1],
          fov: 45,
      }}
    >
      {/* Light */}
      <ambientLight intensity={1.5} />
      <directionalLight position={[5, 5, 5]} intensity={3} />

      {/* Ground Grid */}
      <Grid
        infiniteGrid
        cellSize={1.5}
        sectionSize={5}
        fadeDistance={30}
      />

      {/* Cube */}
      <mesh>
        <EngineViewer/>
        {/* <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="orange" /> */}
      </mesh>

      {/* Mouse Controls */}
      <OrbitControls />

      {/* Axis Helper */}
      <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
        <GizmoViewport />
      </GizmoHelper>
    </Canvas>
  );
}

export default App;