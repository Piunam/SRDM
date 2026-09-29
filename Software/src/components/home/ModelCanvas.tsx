"use client";

import { Suspense, useEffect, useMemo } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

/**
 * Material and 3-point rig copied by value from the hero device so both objects
 * read as the same product. Deliberately duplicated — nothing here imports from
 * src/components/hero, which is frozen.
 */
const ENCLOSURE = {
  color: "#9CA3AB",
  metalness: 0.2,
  roughness: 0.55,
  clearcoat: 0.1,
  clearcoatRoughness: 0.7,
  envMapIntensity: 0.6,
} as const;
const LIGHTS = {
  ambient: 0.15,
  key: { position: [-5, 4, 4] as const, intensity: 1.5 },
  fill: { position: [5, 0.5, 4] as const, intensity: 0.45, color: "#BFD4FF" },
  rim: { position: [0.5, 0.6, -4] as const, angle: 0.25, penumbra: 0.5, intensity: 25, color: "#DDEFF2" },
};
const CY = "#2DD4C8";

/** Longest edge of the loaded mesh, in world units — matches the hero enclosure. */
const TARGET_SIZE = 1.6;
const AUTO_ROTATE_RAD_S = 0.4;
// three.js advances autoRotate by 2π/60 × autoRotateSpeed radians per second.
const AUTO_ROTATE_SPEED = (AUTO_ROTATE_RAD_S * 60) / (2 * Math.PI);

export type ModelCanvasProps = {
  url: string;
  wireframe: boolean;
  autoRotate: boolean;
  onInteract: () => void;
  label: string;
};

function Model({ url, wireframe }: { url: string; wireframe: boolean }) {
  const source = useLoader(STLLoader, url);
  const { geometry, scale } = useMemo(() => {
    const g = source.clone();
    g.center();
    g.computeVertexNormals();
    g.computeBoundingBox();
    const size = new THREE.Vector3();
    g.boundingBox?.getSize(size);
    const longest = Math.max(size.x, size.y, size.z) || 1;
    return { geometry: g, scale: TARGET_SIZE / longest };
  }, [source]);

  return (
    <mesh geometry={geometry} scale={scale} castShadow>
      {wireframe ? (
        <meshBasicMaterial color={CY} wireframe transparent opacity={0.35} />
      ) : (
        <meshPhysicalMaterial {...ENCLOSURE} />
      )}
    </mesh>
  );
}

/** frameloop="demand" renders nothing on its own; keep asking while we animate. */
function DemandLoop({ active }: { active: boolean }) {
  const invalidate = useThree((s) => s.invalidate);
  useFrame(() => {
    if (active) invalidate();
  });
  useEffect(() => {
    invalidate();
  }, [active, invalidate]);
  return null;
}

export default function ModelCanvas({ url, wireframe, autoRotate, onInteract, label }: ModelCanvasProps) {
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      camera={{ position: [0, 0.7, 4.4], fov: 28, near: 0.1, far: 100 }}
      style={{ background: "transparent" }}
      role="img"
      aria-label={label}
    >
      <DemandLoop active={autoRotate} />
      <ambientLight intensity={LIGHTS.ambient} />
      <directionalLight position={LIGHTS.key.position} intensity={LIGHTS.key.intensity} />
      <directionalLight position={LIGHTS.fill.position} intensity={LIGHTS.fill.intensity} color={LIGHTS.fill.color} />
      <spotLight
        position={LIGHTS.rim.position}
        angle={LIGHTS.rim.angle}
        penumbra={LIGHTS.rim.penumbra}
        intensity={LIGHTS.rim.intensity}
        color={LIGHTS.rim.color}
      />
      <Suspense fallback={null}>
        <Model url={url} wireframe={wireframe} />
      </Suspense>
      <ContactShadows position={[0, -0.95, 0]} scale={4} opacity={0.35} blur={2.5} far={1.4} resolution={256} color="#000000" />
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        enableZoom={false}
        enablePan={false}
        minPolarAngle={Math.PI * 0.2}
        maxPolarAngle={Math.PI * 0.72}
        autoRotate={autoRotate}
        autoRotateSpeed={AUTO_ROTATE_SPEED}
        onStart={onInteract}
      />
    </Canvas>
  );
}
