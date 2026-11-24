/**
 * Hero 3D scene (three.js via @react-three/fiber + drei + postprocessing).
 *
 *  - Portrait: the real cut-out photo on a dense plane, displaced by the depth
 *    map Depth-Anything-V2 produced (ml/depth_portrait.py). Colours are output
 *    untouched; only geometry moves, so the face is never altered.
 *  - Intro: the portrait first appears as a blue depth "hologram"; a scan line
 *    sweeps up and reveals the real photo.
 *  - Floating neon-glass tiles echo the cover of the 30-tools guide.
 *  - A ring of light particles orbits like data around the model.
 *  - Desktop gets a selective Bloom pass (only HDR > 1 glows; the photo never does).
 */
import { Float, RoundedBox } from "@react-three/drei";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { Suspense, useEffect, useMemo, useRef } from "react";
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
      pointer.x = THREE.MathUtils.clamp(e.gamma / 30, -1, 1);
      pointer.y = THREE.MathUtils.clamp((e.beta - 45) / 40, -1, 1);
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

/* ---------------------------------------------------------- portrait -- */
const portraitVertex = /* glsl */ `
  uniform sampler2D uDepth;
  uniform float uDepthScale;
  uniform float uReveal;
  uniform float uTime;
  varying vec2 vUv;
  varying float vDepth;
  void main() {
    vUv = uv;
    float d = texture2D(uDepth, uv).r;
    vDepth = d;
    vec3 p = position;
    p.z += (d - 0.55) * uDepthScale;
    // before the scan passes, the hologram breathes slightly
    float pending = step(uReveal * 1.25 - 0.12, uv.y);
    p.z += pending * sin(uv.y * 40.0 + uTime * 3.0) * 0.015;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const portraitFragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uReveal;
  uniform float uTime;
  varying vec2 vUv;
  varying float vDepth;
  void main() {
    vec4 tex = texture2D(uMap, vUv);
    float line = uReveal * 1.25 - 0.12;
    float shown = smoothstep(line + 0.004, line - 0.004, vUv.y);
    float scan = smoothstep(0.03, 0.0, abs(vUv.y - line)) * step(uReveal, 0.999);

    // hologram: depth-shaded blue with horizontal scan lines
    float lines = 0.55 + 0.45 * sin(vUv.y * 420.0 - uTime * 6.0);
    vec3 holo = vec3(0.08, 0.32, 1.0) * (0.25 + vDepth * 1.1) * lines;

    vec3 col = mix(holo, tex.rgb, shown) + vec3(1.0, 0.78, 0.1) * scan * 2.6;
    float alpha = tex.a * mix(0.75, 1.0, shown);
    alpha *= smoothstep(0.0, 0.2, vUv.y);          // soft fade at the bottom, like the original
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(col, alpha);
    #include <colorspace_fragment>
  }
`;

function Portrait({
  map,
  depth,
  aspect,
  reduced,
  segments,
  onReady,
}: {
  map: string;
  depth: string;
  aspect: number;
  reduced: boolean;
  segments: number;
  onReady: () => void;
}) {
  const [tex, dep] = useLoader(THREE.TextureLoader, [map, depth]);
  const viewport = useThree(s => s.viewport);
  const mat = useRef<THREE.ShaderMaterial>(null);
  const started = useRef<number | null>(null);

  useMemo(() => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    dep.colorSpace = THREE.NoColorSpace;
    dep.minFilter = dep.magFilter = THREE.LinearFilter;
  }, [tex, dep]);

  const uniforms = useMemo(
    () => ({
      uMap: { value: tex },
      uDepth: { value: dep },
      uDepthScale: { value: 1.15 },
      uReveal: { value: reduced ? 1 : 0 },
      uTime: { value: 0 },
    }),
    [tex, dep, reduced],
  );

  // The canvas is 1.5x wider / 1.3x taller than the photo slot (see Hero).
  const h = viewport.height / 1.3;
  const w = h * aspect;

  useEffect(() => {
    const id = requestAnimationFrame(() => onReady());
    return () => cancelAnimationFrame(id);
  }, [onReady]);

  useFrame((state, dt) => {
    if (!mat.current) return;
    const u = mat.current.uniforms;
    u.uTime.value += dt;
    if (started.current === null) started.current = state.clock.elapsedTime + 1.1; // after the canvas fade-in
    const t = THREE.MathUtils.clamp((state.clock.elapsedTime - started.current) / 2.6, 0, 1);
    u.uReveal.value = reduced ? 1 : t * t * (3 - 2 * t); // smoothstep: slow start, slow end
  });

  return (
    <mesh position={[0, -viewport.height * 0.02, 0]}>
      <planeGeometry args={[w, h, segments, Math.round(segments / aspect)]} />
      <shaderMaterial
        ref={mat}
        vertexShader={portraitVertex}
        fragmentShader={portraitFragment}
        uniforms={uniforms}
        transparent
        toneMapped={false}
      />
    </mesh>
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
    float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.4);
    vec3 body = vec3(0.02, 0.05, 0.13);
    vec3 col = mix(body, uColor * uGlow, f);
    gl_FragColor = vec4(col, 0.22 + f * 0.78);
    #include <colorspace_fragment>
  }
`;

type TileSpec = { pos: [number, number, number]; rot: [number, number, number]; size: number; yellow: boolean };

function makeTiles(count: number): TileSpec[] {
  // deterministic pseudo-random layout around the portrait (never over the face)
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const tiles: TileSpec[] = [];
  for (let i = 0; i < count; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const x = side * (0.95 + rnd() * 0.55);
    const y = -1.15 + (i / count) * 2.7 + (rnd() - 0.5) * 0.35;
    const z = -0.9 + rnd() * 1.5;
    tiles.push({
      pos: [x, y, z],
      rot: [rnd() * Math.PI, rnd() * Math.PI, rnd() * Math.PI],
      size: 0.2 + rnd() * 0.22,
      yellow: rnd() > 0.55,
    });
  }
  return tiles;
}

function GlassTiles({ count, scale }: { count: number; scale: number }) {
  const tiles = useMemo(() => makeTiles(count), [count]);
  const mats = useMemo(
    () => ({
      yellow: new THREE.ShaderMaterial({
        vertexShader: glassVertex,
        fragmentShader: glassFragment,
        uniforms: { uColor: { value: new THREE.Color("#ffd400") }, uGlow: { value: 2.2 } },
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      }),
      blue: new THREE.ShaderMaterial({
        vertexShader: glassVertex,
        fragmentShader: glassFragment,
        uniforms: { uColor: { value: new THREE.Color("#3b9bff") }, uGlow: { value: 2.0 } },
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      }),
    }),
    [],
  );
  useEffect(() => () => Object.values(mats).forEach(m => m.dispose()), [mats]);

  return (
    <group scale={scale}>
      {tiles.map((t, i) => (
        <Float key={i} speed={1 + (i % 3) * 0.35} rotationIntensity={0.9} floatIntensity={0.7}>
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
  varying float vSeed;
  void main() {
    vSeed = aSeed;
    float a = position.x + uTime * (0.12 + aSeed * 0.18);
    float r = position.y;
    vec3 p = vec3(cos(a) * r, position.z + sin(uTime * 0.6 + aSeed * 6.28) * 0.04, sin(a) * r * 0.42);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = (2.0 + aSeed * 4.0) * uPixelRatio * (4.0 / -mv.z);
  }
`;
const particleFragment = /* glsl */ `
  varying float vSeed;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    vec3 c = mix(vec3(0.25, 0.65, 1.0), vec3(1.0, 0.83, 0.0), step(0.78, vSeed));
    gl_FragColor = vec4(c * 1.8, a * 0.7);
    #include <colorspace_fragment>
  }
`;

function DataRing({ count }: { count: number }) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const dpr = useThree(s => s.viewport.dpr);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = Math.random() * Math.PI * 2; // angle
      pos[i * 3 + 1] = 0.95 + Math.random() * 0.6; // radius
      pos[i * 3 + 2] = -0.35 + (Math.random() - 0.5) * 0.35; // height (chest)
      seed[i] = Math.random();
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    return g;
  }, [count]);
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uPixelRatio: { value: dpr } }), [dpr]);
  useFrame((_, dt) => {
    if (mat.current) mat.current.uniforms.uTime.value += dt;
  });
  return (
    <points geometry={geo} rotation={[0.12, 0, -0.08]}>
      <shaderMaterial
        ref={mat}
        vertexShader={particleVertex}
        fragmentShader={particleFragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}

/* --------------------------------------------------------------- rig -- */
function Rig({ children, reduced, coarse }: { children: React.ReactNode; reduced: boolean; coarse: boolean }) {
  const g = useRef<THREE.Group>(null);
  usePagePointer();
  useFrame(state => {
    if (!g.current || reduced) return;
    const t = state.clock.elapsedTime;
    const tx = pointer.active ? pointer.x * 0.32 : coarse ? Math.sin(t * 0.45) * 0.16 : 0;
    const ty = pointer.active ? pointer.y * 0.12 : coarse ? Math.sin(t * 0.3) * 0.04 : 0;
    g.current.rotation.y = THREE.MathUtils.lerp(g.current.rotation.y, tx, 0.06);
    g.current.rotation.x = THREE.MathUtils.lerp(g.current.rotation.x, ty, 0.06);
  });
  return <group ref={g}>{children}</group>;
}

function BackGlow() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        toneMapped: false,
        blending: THREE.AdditiveBlending,
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          varying vec2 vUv;
          void main() {
            float d = length(vUv - vec2(0.5, 0.5));
            float a = pow(smoothstep(0.5, 0.0, d), 1.6);
            gl_FragColor = vec4(vec3(0.09, 0.3, 0.95) * a * 0.75, 1.0);
            #include <colorspace_fragment>
          }
        `,
      }),
    [],
  );
  return (
    <mesh position={[0, 0.05, -1.4]} material={mat}>
      <planeGeometry args={[3.9, 4.4]} />
    </mesh>
  );
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
      gl={{ antialias: !lowPower, alpha: false, powerPreference: "high-performance" }}
      camera={{ position: [0, 0, 6], fov: 34 }}
      frameloop={active ? "always" : "never"}
      onCreated={({ gl }) => {
        gl.setClearColor("#05080f", 1);
        gl.toneMapping = THREE.NoToneMapping;
      }}
      aria-hidden="true"
    >
      <Suspense fallback={null}>
        <BackGlow />
        <Rig reduced={reduced} coarse={coarse}>
          <Portrait
            map={map}
            depth={depth}
            aspect={aspect}
            reduced={reduced}
            segments={lowPower ? 110 : 170}
            onReady={onReady}
          />
          <GlassTiles count={lowPower ? 8 : 12} scale={1} />
          <DataRing count={lowPower ? 380 : 800} />
        </Rig>
      </Suspense>
      {!lowPower && (
        <EffectComposer multisampling={0}>
          <Bloom mipmapBlur intensity={0.9} luminanceThreshold={1.05} luminanceSmoothing={0.05} />
        </EffectComposer>
      )}
    </Canvas>
  );
}
