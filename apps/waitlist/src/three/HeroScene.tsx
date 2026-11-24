/**
 * Hero 3D scene (three.js via @react-three/fiber + drei).
 * Particles passing in front of the body fade to 15% so they never read as
 * "dots on the shirt".
 *
 * The real photo is NEVER drawn or deformed here: it stays a normal <img>
 * underneath, pixel for pixel. This transparent canvas sits on top and adds:
 *  - floating neon-glass tiles (like the cover of the 30-tools guide),
 *  - a ring of light particles orbiting the body,
 *  - a one-time light "scan" sweeping up the silhouette.
 * The Depth-Anything-V2 depth map (ml/depth_portrait.py) is used only for an
 * INVISIBLE occluder: particles and tiles that pass behind the body are hidden
 * by its real depth, so they wrap around him instead of floating on top.
 */
import { Float, RoundedBox } from "@react-three/drei";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

/* ----------------------------------------------------------- pointer -- */
const pointer = { x: 0, y: 0, active: false };
function usePagePointer() {
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
      pointer.active = true;
    };
    // Android exposes device tilt without a permission prompt.
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      pointer.x = THREE.MathUtils.clamp(e.gamma / 45, -1, 1);
      pointer.y = THREE.MathUtils.clamp((e.beta - 50) / 60, -1, 1);
      pointer.active = true;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("deviceorientation", onTilt, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("deviceorientation", onTilt);
    };
  }, []);
}

/* -------------------------------------------- portrait (invisible) ---- */
/** Size of the photo slot in world units at z = 0 (canvas = 1.5w x 1.3h of the photo). */
function usePhotoRect(aspect: number) {
  const viewport = useThree(s => s.viewport);
  const h = viewport.height / 1.3;
  return { w: h * aspect, h };
}

const occluderVertex = /* glsl */ `
  uniform sampler2D uDepth;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 p = position;
    p.z += (texture2D(uDepth, uv).r - 0.45) * 0.9;   // real body depth (never rendered)
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;
const occluderFragment = /* glsl */ `
  uniform sampler2D uMap;
  varying vec2 vUv;
  void main() {
    float a = texture2D(uMap, vUv).a * smoothstep(0.0, 0.2, vUv.y);
    if (a < 0.5) discard;
    gl_FragColor = vec4(0.0);
  }
`;

/** Writes the body's depth into the z-buffer only (colorWrite off). */
function DepthOccluder({ map, depth, aspect }: { map: THREE.Texture; depth: THREE.Texture; aspect: number }) {
  const { w, h } = usePhotoRect(aspect);
  const uniforms = useMemo(() => ({ uMap: { value: map }, uDepth: { value: depth } }), [map, depth]);
  return (
    <mesh renderOrder={-1}>
      <planeGeometry args={[w, h, 90, Math.round(90 / aspect)]} />
      <shaderMaterial vertexShader={occluderVertex} fragmentShader={occluderFragment} uniforms={uniforms} colorWrite={false} />
    </mesh>
  );
}

const scanFragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform sampler2D uDepth;
  uniform float uReveal;
  varying vec2 vUv;
  void main() {
    float a = texture2D(uMap, vUv).a * smoothstep(0.0, 0.2, vUv.y);
    float line = uReveal * 1.3 - 0.15;
    float band = smoothstep(0.035, 0.0, abs(vUv.y - line));
    float glow = band * (0.55 + 0.45 * texture2D(uDepth, vUv).r);  // follows the body's relief
    vec3 col = vec3(1.0, 0.82, 0.15) * glow;
    gl_FragColor = vec4(col, glow * a * 0.85);
    #include <colorspace_fragment>
  }
`;

/** A thin light line that sweeps up over the silhouette once (photo untouched). */
function ScanLine({ map, depth, aspect, onDone }: { map: THREE.Texture; depth: THREE.Texture; aspect: number; onDone: () => void }) {
  const { w, h } = usePhotoRect(aspect);
  const mat = useRef<THREE.ShaderMaterial>(null);
  const t0 = useRef<number | null>(null);
  const done = useRef(false);
  const uniforms = useMemo(() => ({ uMap: { value: map }, uDepth: { value: depth }, uReveal: { value: 0 } }), [map, depth]);
  useFrame(state => {
    if (!mat.current || done.current) return;
    if (t0.current === null) t0.current = state.clock.elapsedTime + 0.9;
    const t = THREE.MathUtils.clamp((state.clock.elapsedTime - t0.current) / 2.2, 0, 1);
    mat.current.uniforms.uReveal.value = t * t * (3 - 2 * t);
    if (t >= 1) {
      done.current = true;
      onDone();
    }
  });
  return (
    <mesh position={[0, 0, 0.01]} renderOrder={10}>
      <planeGeometry args={[w, h]} />
      <shaderMaterial
        ref={mat}
        vertexShader={`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`}
        fragmentShader={scanFragment}
        uniforms={uniforms}
        transparent
        depthTest={false}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  );
}

function Scene({
  mapUrl,
  depthUrl,
  aspect,
  reduced,
  lowPower,
  coarse,
  onReady,
}: {
  mapUrl: string;
  depthUrl: string;
  aspect: number;
  reduced: boolean;
  lowPower: boolean;
  coarse: boolean;
  onReady: () => void;
}) {
  const [map, depth] = useLoader(THREE.TextureLoader, [mapUrl, depthUrl]);
  const [scanning, setScanning] = useState(!reduced);
  useMemo(() => {
    depth.colorSpace = THREE.NoColorSpace;
    depth.minFilter = depth.magFilter = THREE.LinearFilter;
  }, [depth]);
  useEffect(() => {
    const id = requestAnimationFrame(() => onReady());
    return () => cancelAnimationFrame(id);
  }, [onReady]);
  return (
    <>
      <DepthOccluder map={map} depth={depth} aspect={aspect} />
      {scanning && <ScanLine map={map} depth={depth} aspect={aspect} onDone={() => setScanning(false)} />}
      <Rig reduced={reduced} coarse={coarse}>
        <GlassTiles count={lowPower ? 8 : 12} />
        <DataRing count={lowPower ? 360 : 700} map={map} aspect={aspect} />
      </Rig>
    </>
  );
}

/* ---------------------------------------------------- neon glass tiles -- */
const glassVertex = /* glsl */ `
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;
const glassFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uGlow;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2);
    vec3 body = vec3(0.03, 0.07, 0.18);
    vec3 col = mix(body, uColor * uGlow, f);
    gl_FragColor = vec4(col, 0.35 + f * 0.65);
    #include <colorspace_fragment>
  }
`;

type TileSpec = { pos: [number, number, number]; rot: [number, number, number]; size: number; yellow: boolean };

function makeTiles(count: number): TileSpec[] {
  // deterministic layout around the portrait, kept away from the face
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const tiles: TileSpec[] = [];
  for (let i = 0; i < count; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const x = side * (1.05 + rnd() * 0.5);
    const y = -1.1 + (i / count) * 2.6 + (rnd() - 0.5) * 0.3;
    const z = -0.9 + rnd() * 1.5;
    tiles.push({
      pos: [x, y, z],
      rot: [rnd() * Math.PI, rnd() * Math.PI, rnd() * Math.PI],
      size: 0.2 + rnd() * 0.2,
      yellow: rnd() > 0.55,
    });
  }
  return tiles;
}

function GlassTiles({ count }: { count: number }) {
  const tiles = useMemo(() => makeTiles(count), [count]);
  const mats = useMemo(() => {
    const make = (color: string, glow: number) =>
      new THREE.ShaderMaterial({
        vertexShader: glassVertex,
        fragmentShader: glassFragment,
        uniforms: { uColor: { value: new THREE.Color(color) }, uGlow: { value: glow } },
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      });
    return { yellow: make("#ffd400", 1.25), blue: make("#4aa8ff", 1.15) };
  }, []);
  useEffect(() => () => Object.values(mats).forEach(m => m.dispose()), [mats]);

  return (
    <group>
      {tiles.map((t, i) => (
        <Float key={i} speed={1 + (i % 3) * 0.35} rotationIntensity={0.9} floatIntensity={0.6}>
          <RoundedBox
            args={[t.size, t.size, t.size * 0.28]}
            radius={t.size * 0.12}
            smoothness={3}
            position={t.pos}
            rotation={t.rot}
            material={t.yellow ? mats.yellow : mats.blue}
          />
        </Float>
      ))}
    </group>
  );
}

/* ------------------------------------------------------- data particles -- */
const particleVertex = /* glsl */ `
  attribute float aSeed;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform vec2 uRect;    // photo size at z = 0
  uniform float uCamZ;
  varying float vSeed;
  varying vec2 vPhotoUv;
  void main() {
    vSeed = aSeed;
    float a = position.x + uTime * (0.12 + aSeed * 0.18);
    float r = position.y;
    vec3 p = vec3(cos(a) * r, position.z + sin(uTime * 0.6 + aSeed * 6.28) * 0.04, sin(a) * r * 0.55);
    vec4 world = modelMatrix * vec4(p, 1.0);
    vPhotoUv = world.xy * (uCamZ / (uCamZ - world.z)) / uRect + 0.5;   // where it lands on the photo
    vec4 mv = viewMatrix * world;
    gl_Position = projectionMatrix * mv;
    gl_PointSize = (2.0 + aSeed * 3.5) * uPixelRatio * (4.0 / -mv.z);
  }
`;
const particleFragment = /* glsl */ `
  uniform sampler2D uMap;
  varying float vSeed;
  varying vec2 vPhotoUv;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    vec2 inside = step(vec2(0.0), vPhotoUv) * step(vPhotoUv, vec2(1.0));
    a *= 1.0 - 0.85 * texture2D(uMap, vPhotoUv).a * inside.x * inside.y;  // never "dots on the shirt"
    vec3 c = mix(vec3(0.35, 0.72, 1.0), vec3(1.0, 0.85, 0.1), step(0.78, vSeed));
    gl_FragColor = vec4(c, a * 0.8);
    #include <colorspace_fragment>
  }
`;

function DataRing({ count, map, aspect }: { count: number; map: THREE.Texture; aspect: number }) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const dpr = useThree(s => s.viewport.dpr);
  const { w, h } = usePhotoRect(aspect);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = Math.random() * Math.PI * 2; // angle
      pos[i * 3 + 1] = 1.05 + Math.random() * 0.55; // radius - wider than the shoulders
      pos[i * 3 + 2] = -0.45 + (Math.random() - 0.5) * 0.3; // height (waist)
      seed[i] = Math.random();
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    return g;
  }, [count]);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPixelRatio: { value: dpr },
      uMap: { value: map },
      uRect: { value: new THREE.Vector2(w, h) },
      uCamZ: { value: 6 },
    }),
    [dpr, map, w, h],
  );
  useFrame((_, dt) => {
    if (mat.current) mat.current.uniforms.uTime.value += dt;
  });
  return (
    <points geometry={geo} rotation={[0.1, 0, -0.06]}>
      <shaderMaterial
        ref={mat}
        vertexShader={particleVertex}
        fragmentShader={particleFragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </points>
  );
}

/* --------------------------------------------------------------- rig -- */
/** Only the decorations move with the pointer; the photo never rotates. */
function Rig({ children, reduced, coarse }: { children: React.ReactNode; reduced: boolean; coarse: boolean }) {
  const g = useRef<THREE.Group>(null);
  usePagePointer();
  useFrame(state => {
    if (!g.current || reduced) return;
    const t = state.clock.elapsedTime;
    const tx = pointer.active ? pointer.x * 0.35 : coarse ? Math.sin(t * 0.45) * 0.2 : 0;
    const ty = pointer.active ? pointer.y * 0.12 : 0;
    g.current.rotation.y = THREE.MathUtils.lerp(g.current.rotation.y, tx, 0.05);
    g.current.rotation.x = THREE.MathUtils.lerp(g.current.rotation.x, ty, 0.05);
  });
  return <group ref={g}>{children}</group>;
}

/* ------------------------------------------------------------- scene -- */
export default function HeroScene({
  map,
  depth,
  aspect,
  active,
  reduced,
  lowPower,
  onReady,
}: {
  map: string;
  depth: string;
  aspect: number;
  active: boolean;
  reduced: boolean;
  lowPower: boolean;
  onReady: () => void;
}) {
  const coarse = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
  return (
    <Canvas
      dpr={[1, lowPower ? 1.5 : 2]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      camera={{ position: [0, 0, 6], fov: 34 }}
      frameloop={active ? "always" : "never"}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
        gl.toneMapping = THREE.NoToneMapping;
      }}
      style={{ pointerEvents: "none" }}
      aria-hidden="true"
    >
      <Suspense fallback={null}>
        <Scene
          mapUrl={map}
          depthUrl={depth}
          aspect={aspect}
          reduced={reduced}
          lowPower={lowPower}
          coarse={coarse}
          onReady={onReady}
        />
      </Suspense>
    </Canvas>
  );
}
