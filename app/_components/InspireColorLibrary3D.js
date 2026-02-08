"use client";

import { Canvas } from "@react-three/fiber";
import { Environment, OrbitControls } from "@react-three/drei";
import { useMemo } from "react";

const buildSphereLayout = (colors) => {
  const total = colors.length;
  if (!total) {
    return [];
  }
  const columns = Math.ceil(total / 2);
  const spacingX = 1.55;
  const spacingZ = 1.45;
  const xOffset = (columns - 1) * spacingX * 0.5;
  return colors.map((color, index) => {
    const row = Math.floor(index / columns);
    const col = index % columns;
    return {
      color,
      position: [col * spacingX - xOffset, 0, (row - 0.5) * spacingZ],
    };
  });
};

function ColorSpheres({ colors }) {
  const spheres = useMemo(() => buildSphereLayout(colors), [colors]);

  return spheres.map((sphere) => (
    <mesh
      key={`${sphere.color}-${sphere.position[0]}-${sphere.position[2]}`}
      position={sphere.position}
      castShadow
      receiveShadow
    >
      <sphereGeometry args={[0.55, 64, 64]} />
      <meshPhysicalMaterial
        color={sphere.color}
        roughness={0.25}
        metalness={0.1}
        clearcoat={0.85}
        clearcoatRoughness={0.2}
      />
    </mesh>
  ));
}

export default function InspireColorLibrary3D({ colors }) {
  return (
    <div className="inspire-style-library-canvas">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 4.4, 6.2], fov: 44 }}
      >
        <color attach="background" args={["#1e1426"]} />
        <ambientLight intensity={0.55} />
        <directionalLight
          castShadow
          position={[6, 8, 6]}
          intensity={1.1}
          shadow-mapSize={[1024, 1024]}
        />
        <spotLight
          castShadow
          position={[-6, 7, 2]}
          intensity={0.7}
          angle={0.55}
          penumbra={0.4}
        />
        <Environment preset="sunset" />
        <group rotation={[-0.6, -0.4, 0]} position={[0, -0.25, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.7, 0]} receiveShadow>
            <planeGeometry args={[12, 8]} />
            <meshStandardMaterial color="#2a1b37" roughness={0.7} metalness={0.1} />
          </mesh>
          <ColorSpheres colors={colors} />
        </group>
        <OrbitControls
          enablePan
          enableZoom
          enableRotate
          minDistance={3}
          maxDistance={12}
        />
      </Canvas>
    </div>
  );
}