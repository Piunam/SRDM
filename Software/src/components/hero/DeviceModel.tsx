"use client";

import {
  Component,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  Html,
  Line,
  RoundedBox,
} from "@react-three/drei";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { siteConfig } from "@/lib/site-config";
import { HERO } from "./hero-config";
import { COPY } from "./hero-copy";
import { frameLayout } from "./hero-layout";
import { clamp01, heroState, onHeroFrame } from "./hero-state";

const C = HERO.colors;
const TEAL = new THREE.Color(C.cy);
const FAULT = new THREE.Color(C.fault);
const FOV = 28;
const BOX = new THREE.Vector3(1.6, 1.0, 0.8); // enclosure size, world units

type Props = { stlUrl?: string; mobile?: boolean };

export default function DeviceModel({ stlUrl, mobile = false }: Props) {
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, mobile ? HERO.signal.mobileMaxDpr : HERO.signal.maxDpr]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      camera={{ position: [0, 0, 12], fov: FOV, near: 0.1, far: 100 }}
      style={{ background: "transparent" }}
      aria-hidden="true"
    >
      <Invalidator />
      <EnvBoundary>
        <Suspense fallback={null}>
          <Environment preset="studio" environmentIntensity={0.25} />
        </Suspense>
      </EnvBoundary>
      <ambientLight intensity={0.15} />
      <Device mobile={mobile} stlUrl={stlUrl} />
      <Headset mobile={mobile} />
    </Canvas>
  );
}

// The studio HDRI is fetched from a CDN; if that fails the rig lights still work.
class EnvBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

// Render on demand, driven by the shared hero frame loop.
function Invalidator() {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => onHeroFrame(() => invalidate()), [invalidate]);
  return null;
}

/** Maps frame-grid pixels to the z = 0 world plane for the current viewport. */
function useStageMap(mobile: boolean) {
  const size = useThree((s) => s.size);
  return useMemo(() => {
    const { width: W, height: H } = size;
    const L = frameLayout(W, H, mobile);
    const ppu = L.device.width / BOX.x; // px per world unit
    const dist = H / (2 * Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * ppu);
    const toWorld = (px: number, py: number) =>
      new THREE.Vector3((px - W / 2) / ppu, -(py - H / 2) / ppu, 0);
    return { L, ppu, dist, toWorld, W, H };
  }, [size, mobile]);
}

/* ---------------------------------------------------------------- labels */

type TextLine = {
  text: string;
  size: number;
  weight?: number;
  color: string;
  gap?: number;
};

function makeLabel(
  lines: TextLine[],
  w: number,
  h: number,
  align: CanvasTextAlign = "left",
) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  const mono =
    getComputedStyle(document.body)
      .getPropertyValue("--font-geist-mono")
      .trim() || "monospace";
  ctx.textAlign = align;
  ctx.textBaseline = "top";
  let y = 0;
  for (const l of lines) {
    ctx.font = `${l.weight ?? 500} ${l.size}px ${mono}, monospace`;
    ctx.fillStyle = l.color;
    ctx.fillText(l.text, align === "center" ? w / 2 : 0, y);
    y += l.size * 1.25 + (l.gap ?? 0);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/* ---------------------------------------------------------------- device */

function Device({ mobile, stlUrl }: { mobile: boolean; stlUrl?: string }) {
  const anchor = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const rim = useRef<THREE.SpotLight>(null);
  const { camera } = useThree();
  const map = useStageMap(mobile);
  const corners = useMemo(
    () =>
      [-1, 1].flatMap((x) =>
        [-1, 1].flatMap((y) =>
          [-1, 1].map(
            (z) =>
              new THREE.Vector3(
                (x * BOX.x) / 2,
                (y * BOX.y) / 2,
                (z * BOX.z) / 2,
              ),
          ),
        ),
      ),
    [],
  );
  const tmp = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    if (rim.current && body.current) rim.current.target = body.current;
  }, []);

  useFrame(() => {
    const s = heroState;
    const a = anchor.current!;
    const b = body.current!;
    camera.position.set(0, 0, map.dist);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();

    a.visible = s.devA > 0.001;
    const p = map.toWorld(
      map.L.device.x + (1 - s.devIn) * map.W * 0.6,
      map.L.device.y,
    );
    a.position.copy(p);
    // On phones the close-up stays gentle so the device keeps to the stage zone.
    a.scale.setScalar(mobile ? 1 + (s.devScale - 1) * 0.1 : s.devScale);
    const tilt = mobile ? s.tilt * 0.4 : s.tilt;
    b.rotation.set(0.22 + tilt * 0.45, -0.42 + tilt * 0.12, 0);

    // Project the enclosure's bounds so the signal canvas can pass behind it.
    if (!a.visible) {
      s.deviceRect = null;
      return;
    }
    a.updateWorldMatrix(true, true);
    let l = Infinity;
    let t = Infinity;
    let r = -Infinity;
    let bt = -Infinity;
    for (const c of corners) {
      tmp.copy(c).applyMatrix4(b.matrixWorld).project(camera);
      const x = ((tmp.x + 1) / 2) * map.W;
      const y = ((1 - tmp.y) / 2) * map.H;
      l = Math.min(l, x);
      r = Math.max(r, x);
      t = Math.min(t, y);
      bt = Math.max(bt, y);
    }
    s.deviceRect = { l, t, r, b: bt };
  });

  return (
    <group ref={anchor}>
      {/* three-point rig: key top-left, cool fill, narrow rim from behind */}
      <directionalLight position={[-5, 4, 4]} intensity={1.5} />
      <directionalLight
        position={[5, 0.5, 4]}
        intensity={0.45}
        color="#BFD4FF"
      />
      <spotLight
        ref={rim}
        position={[0.5, 0.6, -4]}
        angle={0.25}
        penumbra={0.5}
        intensity={25}
        color="#DDEFF2"
      />
      <group ref={body}>
        <Suspense fallback={<Enclosure />}>
          {stlUrl ? <StlEnclosure url={stlUrl} /> : <Enclosure />}
        </Suspense>
        <WireCage />
        <Pcb />
        <RefMic segments={mobile ? 10 : 24} />
      </group>
      <ContactShadows
        position={[0, -0.62, 0]}
        scale={3.4}
        opacity={0.35}
        blur={2.5}
        far={1.2}
        resolution={256}
        color="#000000"
      />
    </group>
  );
}

/** A clean lattice on the six faces of a box — no triangle diagonals. */
function cageGeometry(w: number, h: number, d: number, step: number) {
  const p: number[] = [];
  const axis = (len: number) => {
    const n = Math.max(1, Math.round(len / step));
    return Array.from({ length: n + 1 }, (_, i) => -len / 2 + (i * len) / n);
  };
  const [hw, hh, hd] = [w / 2, h / 2, d / 2];
  const xs = axis(w);
  const ys = axis(h);
  const zs = axis(d);
  for (const z of [-hd, hd]) {
    for (const y of ys) p.push(-hw, y, z, hw, y, z);
    for (const x of xs) p.push(x, -hh, z, x, hh, z);
  }
  for (const x of [-hw, hw]) {
    for (const y of ys) p.push(x, y, -hd, x, y, hd);
    for (const z of zs) p.push(x, -hh, z, x, hh, z);
  }
  for (const y of [-hh, hh]) {
    for (const x of xs) p.push(x, y, -hd, x, y, hd);
    for (const z of zs) p.push(-hw, y, z, hw, y, z);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
  return g;
}

// Act 3 x-ray: as the lid fades, the enclosure reads as a teal wire cage.
function WireCage() {
  const grid = useRef<THREE.LineBasicMaterial>(null);
  const edge = useRef<THREE.LineBasicMaterial>(null);
  const group = useRef<THREE.Group>(null);
  const geo = useMemo(
    () => cageGeometry(BOX.x + 0.02, BOX.y + 0.02, BOX.z + 0.02, 0.2),
    [],
  );
  const edges = useMemo(
    () =>
      new THREE.EdgesGeometry(
        new THREE.BoxGeometry(BOX.x + 0.02, BOX.y + 0.02, BOX.z + 0.02),
      ),
    [],
  );
  useFrame(() => {
    const a = 1 - heroState.lid;
    group.current!.visible = a > 0.01;
    if (grid.current) grid.current.opacity = a * 0.22;
    if (edge.current) edge.current.opacity = a * 0.5;
  });
  return (
    <group ref={group}>
      <lineSegments geometry={geo}>
        <lineBasicMaterial
          ref={grid}
          color={C.cy}
          transparent
          opacity={0}
          depthWrite={false}
        />
      </lineSegments>
      <lineSegments geometry={edges}>
        <lineBasicMaterial
          ref={edge}
          color={C.cy}
          transparent
          opacity={0}
          depthWrite={false}
        />
      </lineSegments>
    </group>
  );
}

function EnclosureMaterial({ name }: { name?: string }) {
  return (
    <meshPhysicalMaterial
      name={name}
      color={C.enclosure}
      metalness={0.2}
      roughness={0.55}
      clearcoat={0.1}
      clearcoatRoughness={0.7}
      envMapIntensity={0.6}
      transparent={name === "lid"}
    />
  );
}

// Lid materials are named "lid" and fade for the Act 3 look inside.
function useLidFade(ref: React.RefObject<THREE.Object3D | null>) {
  useFrame(() => {
    const o = heroState.lid;
    ref.current?.traverse((obj) => {
      const m = (obj as THREE.Mesh).material as THREE.Material | undefined;
      if (m?.name !== "lid") return;
      m.opacity = o;
      m.depthWrite = o > 0.9;
    });
  });
}

function Enclosure() {
  const lid = useRef<THREE.Group>(null);
  useLidFade(lid);
  const decal = useMemo(
    () =>
      makeLabel(
        [
          {
            text: siteConfig.name,
            size: 30,
            weight: 600,
            color: "rgba(159,176,191,.55)",
            gap: 6,
          },
          {
            text: HERO.hardware.enclosureMarking,
            size: 22,
            color: "rgba(159,176,191,.4)",
          },
        ],
        512,
        128,
      ),
    [],
  );
  const lidY = 0.212 + 0.14;
  const dark = <meshStandardMaterial color="#07090B" roughness={0.9} />;

  return (
    <group>
      {/* base */}
      <RoundedBox
        args={[1.6, 0.7, 0.8]}
        radius={0.05}
        smoothness={6}
        position={[0, -0.15, 0]}
      >
        <EnclosureMaterial />
      </RoundedBox>
      {/* gasket groove */}
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[1.604, 0.012, 0.804]} />
        {dark}
      </mesh>
      {/* 0.6 mm parting line between base and lid */}
      <mesh position={[0, 0.206, 0]}>
        <boxGeometry args={[1.57, 0.012, 0.77]} />
        {dark}
      </mesh>
      {/* engraved front panel */}
      <mesh position={[-0.2, -0.24, 0.401]}>
        <planeGeometry args={[0.9, 0.225]} />
        <meshBasicMaterial map={decal} transparent toneMapped={false} />
      </mesh>
      {/* cable gland (reference mic exits here) */}
      <group position={[-0.8, -0.2, 0.12]} rotation={[0, 0, Math.PI / 2]}>
        <mesh position={[0, 0.025, 0]}>
          <cylinderGeometry args={[0.075, 0.075, 0.05, 6]} />
          <meshStandardMaterial color="#20272F" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.08, 0]}>
          <cylinderGeometry args={[0.045, 0.06, 0.07, 20]} />
          <meshStandardMaterial color="#1A1F25" roughness={0.7} />
        </mesh>
      </group>

      <group ref={lid} position={[0, lidY, 0]}>
        <RoundedBox args={[1.6, 0.28, 0.8]} radius={0.05} smoothness={6}>
          <EnclosureMaterial name="lid" />
        </RoundedBox>
        {[-0.68, 0.68].flatMap((x) =>
          [-0.3, 0.3].map((z) => (
            <group key={`${x}${z}`} position={[x, 0.14, z]}>
              <mesh position={[0, 0.001, 0]}>
                <cylinderGeometry args={[0.042, 0.042, 0.004, 20]} />
                <meshStandardMaterial
                  name="lid"
                  color="#07090B"
                  roughness={0.9}
                  transparent
                />
              </mesh>
              <mesh position={[0, -0.002, 0]}>
                <cylinderGeometry args={[0.027, 0.027, 0.006, 16]} />
                <meshStandardMaterial
                  name="lid"
                  color="#3A434C"
                  metalness={0.8}
                  roughness={0.35}
                  transparent
                />
              </mesh>
            </group>
          )),
        )}
        <Led />
      </group>
    </group>
  );
}

function StlEnclosure({ url }: { url: string }) {
  const geom = useLoader(STLLoader, url);
  const ref = useRef<THREE.Mesh>(null);
  useLidFade(ref);
  const { geometry, scale } = useMemo(() => {
    const g = geom.clone();
    g.center();
    g.computeVertexNormals();
    g.computeBoundingBox();
    const size = new THREE.Vector3();
    g.boundingBox!.getSize(size);
    return { geometry: g, scale: BOX.x / Math.max(size.x, size.y, size.z) };
  }, [geom]);
  return (
    <mesh ref={ref} geometry={geometry} scale={scale}>
      <EnclosureMaterial name="lid" />
    </mesh>
  );
}

// Emissive capsule inset in the lid front: red while noise is present, teal once clean.
function Led() {
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(() => {
    const m = mat.current;
    if (!m) return;
    m.emissive.copy(FAULT).lerp(TEAL, heroState.led);
    m.color.copy(m.emissive);
  });
  return (
    <group position={[0.6, 0, 0.398]}>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[0.013, 0.05, 4, 12]} />
        <meshStandardMaterial
          ref={mat}
          emissive={C.fault}
          emissiveIntensity={1.4}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, 0, -0.004]}>
        <boxGeometry args={[0.1, 0.045, 0.01]} />
        <meshStandardMaterial color="#07090B" roughness={0.9} />
      </mesh>
    </group>
  );
}

function Pcb() {
  const group = useRef<THREE.Group>(null);
  const label = useMemo(() => {
    const lines: TextLine[] = [
      { text: "NXP", size: 64, weight: 700, color: "#B8C4CF" },
      { text: "MCU", size: 40, color: "#8A97A3" },
    ];
    if (HERO.hardware.partNumber)
      lines.push({
        text: HERO.hardware.partNumber,
        size: 28,
        color: "#8A97A3",
      });
    return makeLabel(lines, 256, 256, "center");
  }, []);
  useFrame(() => {
    group.current!.visible = heroState.lid < 0.98;
  });
  const y = 0.225;
  const pins = 7;
  return (
    <group ref={group} position={[0, y, 0]}>
      <mesh>
        <boxGeometry args={[1.4, 0.025, 0.66]} />
        <meshStandardMaterial color={C.pcb} roughness={0.7} />
      </mesh>
      {/* QFN package with pins on four sides and a printed label */}
      <group position={[0.1, 0.03, 0]}>
        <mesh>
          <boxGeometry args={[0.24, 0.035, 0.24]} />
          <meshStandardMaterial color="#111418" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.0181, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.2, 0.2]} />
          <meshBasicMaterial map={label} transparent toneMapped={false} />
        </mesh>
        {[0, 1, 2, 3].flatMap((side) =>
          Array.from({ length: pins }, (_, i) => {
            const o = -0.09 + (i * 0.18) / (pins - 1);
            const e = 0.126;
            const pos: [number, number, number] =
              side === 0
                ? [o, -0.012, e]
                : side === 1
                  ? [o, -0.012, -e]
                  : side === 2
                    ? [e, -0.012, o]
                    : [-e, -0.012, o];
            return (
              <mesh
                key={`${side}-${i}`}
                position={pos}
                rotation={[0, side > 1 ? Math.PI / 2 : 0, 0]}
              >
                <boxGeometry args={[0.012, 0.008, 0.02]} />
                <meshStandardMaterial
                  color="#C9CED3"
                  metalness={0.9}
                  roughness={0.3}
                />
              </mesh>
            );
          }),
        )}
      </group>
      {/* two rows of passives */}
      {[-0.2, 0.2].flatMap((z) =>
        Array.from({ length: 7 }, (_, i) => (
          <mesh key={`${z}-${i}`} position={[0.35 + i * 0.05, 0.022, z]}>
            <boxGeometry args={[0.03, 0.018, 0.016]} />
            <meshStandardMaterial color="#6E5F48" roughness={0.6} />
          </mesh>
        )),
      )}
      {/* mic connector */}
      <mesh position={[-0.55, 0.035, 0.12]}>
        <boxGeometry args={[0.12, 0.045, 0.08]} />
        <meshStandardMaterial color="#D9D8D0" roughness={0.5} />
      </mesh>
    </group>
  );
}

function RefMic({ segments }: { segments: number }) {
  const cable = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.92, -0.2, 0.12),
      new THREE.Vector3(-1.04, -0.3, 0.18),
      new THREE.Vector3(-1.12, -0.46, 0.3),
      new THREE.Vector3(-1.25, -0.49, 0.42),
      new THREE.Vector3(-1.36, -0.49, 0.46),
    ]);
    return new THREE.TubeGeometry(curve, segments, 0.014, 8, false);
  }, [segments]);
  return (
    <group>
      <mesh geometry={cable}>
        <meshStandardMaterial color="#0E1216" roughness={0.8} />
      </mesh>
      <group position={[-1.47, -0.455, 0.48]} rotation={[0, 0.3, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.04, 0.045, 0.2, 20]} />
          <meshStandardMaterial
            color={C.enclosure}
            metalness={0.3}
            roughness={0.5}
          />
        </mesh>
        <mesh position={[-0.13, 0, 0]} scale={[1.3, 1, 1]}>
          <sphereGeometry args={[0.05, 16, 12]} />
          <meshStandardMaterial color="#0B0E11" roughness={1} />
        </mesh>
      </group>
    </group>
  );
}

/* --------------------------------------------------------------- headset */

function roundedRectShape(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + r, -h / 2);
  s.lineTo(w / 2 - r, -h / 2);
  s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  s.lineTo(w / 2, h / 2 - r);
  s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  s.lineTo(-w / 2 + r, h / 2);
  s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  s.lineTo(-w / 2, -h / 2 + r);
  s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  return s;
}

function Headset({ mobile }: { mobile: boolean }) {
  const group = useRef<THREE.Group>(null);
  const label = useRef<HTMLDivElement>(null);
  const lineRef = useRef<{
    material: THREE.Material & { opacity: number; dashOffset?: number };
  } | null>(null);
  const map = useStageMap(mobile);

  const band = useMemo(() => {
    const pts = Array.from({ length: 17 }, (_, i) => {
      const a = Math.PI - (i / 16) * Math.PI;
      return new THREE.Vector3(Math.cos(a) * 0.5, Math.sin(a) * 0.52 + 0.02, 0);
    });
    const path = new THREE.CatmullRomCurve3(pts);
    return {
      shell: new THREE.ExtrudeGeometry(roundedRectShape(0.034, 0.11, 0.012), {
        steps: 48,
        bevelEnabled: false,
        extrudePath: path,
      }),
      pad: new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(
          pts.slice(4, 13).map((p) => p.clone().multiplyScalar(0.93)),
        ),
        24,
        0.03,
        8,
      ),
    };
  }, []);
  const boom = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.58, -0.12, 0.08),
      new THREE.Vector3(-0.56, -0.38, 0.3),
      new THREE.Vector3(-0.3, -0.56, 0.44),
    ]);
    return new THREE.TubeGeometry(curve, 24, 0.013, 8, false);
  }, []);

  const scale = 0.8;
  const pos = map.toWorld(map.L.headset.x, map.L.headset.y);
  const arc = useMemo(() => {
    const tip = new THREE.Vector3(-0.3, -0.56, 0.44)
      .multiplyScalar(scale)
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.55)
      .add(pos);
    const dev = map
      .toWorld(map.L.device.x, map.L.device.y)
      .add(new THREE.Vector3(-0.55, 0.5, 0));
    const mid = tip
      .clone()
      .lerp(dev, 0.5)
      .add(new THREE.Vector3(0, 0.55, 0));
    return new THREE.QuadraticBezierCurve3(tip, mid, dev).getPoints(40);
  }, [map, pos]);

  useFrame(() => {
    const s = heroState;
    const g = group.current!;
    g.visible = s.headset > 0.01;
    g.position.set(pos.x, pos.y - (1 - s.headset) * 0.4, pos.z);
    g.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.Material | undefined;
      if (m) m.opacity = s.headset;
    });
    if (lineRef.current) lineRef.current.material.opacity = s.link * 0.8;
    if (label.current) label.current.style.opacity = String(clamp01(s.link));
  });

  const matte = (
    <meshStandardMaterial
      color={C.headset}
      roughness={0.85}
      metalness={0.05}
      transparent
    />
  );
  const cushion = (
    <meshStandardMaterial color="#0C0F12" roughness={1} transparent />
  );

  return (
    <>
      <group ref={group} rotation={[0.1, 0.55, 0]} scale={scale}>
        <mesh geometry={band.shell}>{matte}</mesh>
        <mesh geometry={band.pad}>{cushion}</mesh>
        {[-1, 1].map((side) => (
          <group
            key={side}
            position={[side * 0.55, -0.1, 0]}
            scale={[1, 1.25, 1]}
          >
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.15, 0.15, 0.09, 32]} />
              {matte}
            </mesh>
            <mesh
              position={[-side * 0.055, 0, 0]}
              rotation={[0, Math.PI / 2, 0]}
            >
              <torusGeometry args={[0.125, 0.035, 12, 32]} />
              {cushion}
            </mesh>
            {side === 1 && (
              <mesh position={[0.047, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
                <torusGeometry args={[0.11, 0.006, 8, 48]} />
                <meshStandardMaterial
                  color={C.cy}
                  roughness={0.5}
                  transparent
                />
              </mesh>
            )}
          </group>
        ))}
        <mesh geometry={boom}>{matte}</mesh>
        <mesh position={[-0.3, -0.56, 0.44]} scale={[1, 1, 1.35]}>
          <sphereGeometry args={[0.042, 16, 12]} />
          {cushion}
        </mesh>
      </group>
      <Line
        ref={lineRef as never}
        points={arc}
        color={C.cy}
        lineWidth={1}
        dashed
        dashSize={0.1}
        gapSize={0.08}
        transparent
        opacity={0}
      />
      <Html position={arc[20].toArray()} center zIndexRange={[20, 0]}>
        <div
          ref={label}
          className={`pointer-events-none -translate-y-12 whitespace-nowrap text-center ${mobile ? "" : "translate-x-[96px]"}`}
          style={{ opacity: 0 }}
        >
          <div className="mono-label text-cy">{COPY.link}</div>
          {!mobile && (
            <div className="mono-label mt-1 text-dim">
              frame {HERO.readout.frameMs} ms · latency {HERO.readout.latencyMs}{" "}
              ms
            </div>
          )}
        </div>
      </Html>
    </>
  );
}
