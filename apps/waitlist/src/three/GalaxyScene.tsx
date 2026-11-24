/**
 * "Tool galaxy" for the AI tool finder (three.js / R3F / drei).
 * 30 tools of the guide orbit an AI core, clustered by category. When the
 * in-browser model ranks tools, the matches light up, their links pulse and
 * the galaxy turns so the best match faces you. Drag to explore.
 */
import { Html, PresentationControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { logo } from "../config";
import type { Category, Tool } from "../ai/finder";

type Props = {
  tools: Tool[];
  categories: Category[];
  ranked: number[]; // tool ids, best first
  thinking: boolean;
  active: boolean;
  reduced: boolean;
  lowPower: boolean;
  onSelect: (id: number) => void;
};

function fibonacciSphere(n: number, r: number, offset = 0): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - ((i + 0.5) / n) * 2;
    const rad = Math.sqrt(1 - y * y);
    const th = golden * i + offset;
    pts.push(new THREE.Vector3(Math.cos(th) * rad * r, y * r * 0.82, Math.sin(th) * rad * r));
  }
  return pts;
}

function useLayout(tools: Tool[], categories: Category[]) {
  return useMemo(() => {
    const centers = fibonacciSphere(categories.length, 2.25, 0.6);
    const byCat = new Map<number, Tool[]>();
    tools.forEach(t => byCat.set(t.cat, [...(byCat.get(t.cat) ?? []), t]));
    const pos = new Map<number, THREE.Vector3>();
    const catCenter = new Map<number, THREE.Vector3>();
    categories.forEach((c, ci) => {
      const center = centers[ci];
      catCenter.set(c.id, center);
      const members = byCat.get(c.id) ?? [];
      const local = members.length === 1 ? [new THREE.Vector3()] : fibonacciSphere(members.length, 0.5 + members.length * 0.035, ci);
      members.forEach((t, i) => pos.set(t.id, center.clone().add(local[i])));
    });
    return { pos, catCenter };
  }, [tools, categories]);
}

/* ------------------------------------------------------------ core -- */
function Core({ thinking }: { thinking: boolean }) {
  const outer = useRef<THREE.LineSegments>(null);
  const inner = useRef<THREE.Mesh>(null);
  const geo = useMemo(() => new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.62, 1)), []);
  const heat = useRef(0);
  useFrame((s, dt) => {
    heat.current = THREE.MathUtils.lerp(heat.current, thinking ? 1 : 0, 0.08);
    const t = s.clock.elapsedTime;
    if (outer.current) {
      outer.current.rotation.y += dt * (0.25 + heat.current * 2.2);
      outer.current.rotation.x += dt * 0.11;
    }
    if (inner.current) {
      const k = 1 + Math.sin(t * (2 + heat.current * 8)) * (0.04 + heat.current * 0.08);
      inner.current.scale.setScalar(k);
      (inner.current.material as THREE.MeshBasicMaterial).color.setRGB(1.6 + heat.current, 1.25 + heat.current * 0.6, 0.15);
    }
  });
  return (
    <group>
      <lineSegments ref={outer} geometry={geo}>
        <lineBasicMaterial color={new THREE.Color(0.35, 0.7, 1.6)} transparent opacity={0.75} toneMapped={false} />
      </lineSegments>
      <mesh ref={inner}>
        <icosahedronGeometry args={[0.24, 3]} />
        <meshBasicMaterial color={new THREE.Color(1.6, 1.25, 0.15)} toneMapped={false} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------- links + nodes -- */
const linkVertex = /* glsl */ `
  attribute float aT;
  attribute float aHi;
  attribute vec3 aColor;
  varying float vT;
  varying float vHi;
  varying vec3 vColor;
  void main() {
    vT = aT; vHi = aHi; vColor = aColor;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const linkFragment = /* glsl */ `
  uniform float uTime;
  varying float vT;
  varying float vHi;
  varying vec3 vColor;
  void main() {
    float pulse = smoothstep(0.12, 0.0, abs(fract(vT - uTime * 0.7) - 0.5) - 0.38);
    float base = 0.08 + 0.12 * vT;
    float a = mix(base, 0.55 + pulse * 0.9, vHi);
    vec3 c = mix(vColor * 0.7, vColor * (1.6 + pulse * 2.0), vHi);
    gl_FragColor = vec4(c, a);
    #include <colorspace_fragment>
  }
`;

function Galaxy({ tools, categories, ranked, thinking, reduced, onSelect }: Omit<Props, "active" | "lowPower">) {
  const { pos, catCenter } = useLayout(tools, categories);
  const colors = useMemo(() => new Map(categories.map(c => [c.id, new THREE.Color(c.color)])), [categories]);
  const group = useRef<THREE.Group>(null);
  const nodes = useRef<THREE.InstancedMesh>(null);
  const linkMat = useRef<THREE.ShaderMaterial>(null);
  const [hover, setHover] = useState<number | null>(null);
  const target = useRef(new THREE.Quaternion());
  const hi = useRef(new Float32Array(tools.length));
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const { gl } = useThree();
  const compact = useThree(st => st.size.width) < 520; // phones: no category labels

  // links: core -> every tool (2 verts per segment)
  const linkGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const p = new Float32Array(tools.length * 6);
    const t = new Float32Array(tools.length * 2);
    const h = new Float32Array(tools.length * 2);
    const c = new Float32Array(tools.length * 6);
    tools.forEach((tool, i) => {
      const v = pos.get(tool.id)!;
      p.set([0, 0, 0, v.x, v.y, v.z], i * 6);
      t.set([0, 1], i * 2);
      const col = colors.get(tool.cat)!;
      c.set([col.r, col.g, col.b, col.r, col.g, col.b], i * 6);
    });
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    g.setAttribute("aT", new THREE.BufferAttribute(t, 1));
    g.setAttribute("aHi", new THREE.BufferAttribute(h, 1));
    g.setAttribute("aColor", new THREE.BufferAttribute(c, 3));
    return g;
  }, [tools, pos, colors]);

  useEffect(() => {
    if (!nodes.current) return;
    tools.forEach((t, i) => nodes.current!.setColorAt(i, colors.get(t.cat)!.clone().multiplyScalar(1.25)));
    nodes.current.instanceColor!.needsUpdate = true;
  }, [tools, colors]);

  // rotate so the best match faces the camera
  useEffect(() => {
    const best = ranked[0];
    if (best == null) return;
    const v = pos.get(best)!.clone().normalize();
    target.current.setFromUnitVectors(v, new THREE.Vector3(0.15, 0.1, 1).normalize());
  }, [ranked, pos]);

  useEffect(() => {
    gl.domElement.style.cursor = hover != null ? "pointer" : "grab";
  }, [hover, gl]);

  useFrame((s, dt) => {
    const g = group.current;
    if (!g) return;
    if (ranked.length) g.quaternion.slerp(target.current, reduced ? 1 : 0.045);
    else if (!reduced) g.rotation.y += dt * 0.12;

    const t = s.clock.elapsedTime;
    const attr = linkGeo.getAttribute("aHi") as THREE.BufferAttribute;
    tools.forEach((tool, i) => {
      const rank = ranked.indexOf(tool.id);
      const goal = rank === 0 ? 1 : rank > 0 ? 0.65 : hover === tool.id ? 0.5 : 0;
      hi.current[i] = THREE.MathUtils.lerp(hi.current[i], goal, 0.1);
      attr.setX(i * 2, hi.current[i]);
      attr.setX(i * 2 + 1, hi.current[i]);
      const v = pos.get(tool.id)!;
      const wobble = reduced ? 0 : Math.sin(t * 1.3 + i) * 0.03;
      dummy.position.set(v.x, v.y + wobble, v.z);
      dummy.scale.setScalar(1 + hi.current[i] * 1.05);
      dummy.updateMatrix();
      nodes.current?.setMatrixAt(i, dummy.matrix);
    });
    attr.needsUpdate = true;
    if (nodes.current) nodes.current.instanceMatrix.needsUpdate = true;
    if (linkMat.current) linkMat.current.uniforms.uTime.value = t;
  });

  const labels = ranked.slice(0, 3);

  return (
    <group ref={group}>
      <Core thinking={thinking} />
      <lineSegments geometry={linkGeo}>
        <shaderMaterial
          ref={linkMat}
          vertexShader={linkVertex}
          fragmentShader={linkFragment}
          uniforms={{ uTime: { value: 0 } }}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </lineSegments>
      <instancedMesh
        ref={nodes}
        args={[undefined, undefined, tools.length]}
        onPointerMove={e => (e.stopPropagation(), setHover(tools[e.instanceId ?? -1]?.id ?? null))}
        onPointerOut={() => setHover(null)}
        onClick={e => (e.stopPropagation(), e.instanceId != null && onSelect(tools[e.instanceId].id))}
      >
        <sphereGeometry args={[0.085, 20, 20]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>

      {!compact && categories.map(c => (
        <Html key={c.id} position={catCenter.get(c.id)!.clone().multiplyScalar(1.32)} center zIndexRange={[10, 0]}>
          <span
            className="pointer-events-none whitespace-nowrap rounded-full border px-2 py-0.5 text-[10.5px] font-semibold opacity-80"
            style={{ color: c.color, borderColor: `${c.color}44`, background: "rgba(5,8,15,.6)" }}
          >
            {c.name}
          </span>
        </Html>
      ))}

      {tools.map(t => {
        const r = labels.indexOf(t.id);
        if (r < 0 && hover !== t.id) return null;
        return (
          <Html key={t.id} position={pos.get(t.id)!} center zIndexRange={[20, 10]} style={{ pointerEvents: "none" }}>
            <span
              dir="ltr"
              className="ltr pointer-events-none flex -translate-y-6 items-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-1 text-[12px] font-bold shadow-lg"
              style={{
                background: r === 0 ? "#ffd400" : "rgba(13,20,36,.92)",
                color: r === 0 ? "#05080f" : "#f8fafc",
                border: r === 0 ? "none" : "1px solid rgba(255,255,255,.16)",
              }}
            >
              <img src={logo(t.id)} alt="" width={18} height={18} className="h-[18px] w-[18px] rounded-[5px]" />
              {r >= 0 && <span className="opacity-70">#{r + 1}</span>}
              {t.name}
            </span>
          </Html>
        );
      })}
    </group>
  );
}

/** Pull the camera back on narrow (portrait) canvases so labels stay inside. */
function ResponsiveCamera() {
  const { camera, size } = useThree();
  useEffect(() => {
    const aspect = size.width / size.height;
    camera.position.z = size.width < 520 ? 11.8 : aspect < 1 ? 11 : aspect < 1.25 ? 9.8 : 8.6;
    camera.lookAt(0, 0, 0);
  }, [camera, size]);
  return null;
}

function Stars({ count }: { count: number }) {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const p = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(4.5 + Math.random() * 4);
      p.set([v.x, v.y, v.z], i * 3);
    }
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    return g;
  }, [count]);
  return (
    <points geometry={geo}>
      <pointsMaterial size={0.025} color="#8fb6ff" transparent opacity={0.55} depthWrite={false} sizeAttenuation />
    </points>
  );
}

export default function GalaxyScene({ active, lowPower, ...props }: Props) {
  return (
    <Canvas
      dpr={[1, lowPower ? 1.5 : 2]}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      camera={{ position: [0, 0.5, 8.6], fov: 40 }}
      frameloop={active ? "always" : "never"}
      onCreated={({ gl, camera }) => {
        gl.setClearColor("#070c17", 1);
        gl.toneMapping = THREE.NoToneMapping;
        camera.lookAt(0, 0, 0);
      }}
    >
      <ResponsiveCamera />
      <Stars count={lowPower ? 250 : 600} />
      <PresentationControls
        global={false}
        cursor={false}
        snap={false}
        speed={1.4}
        rotation={[0, 0, 0]}
        polar={[-0.5, 0.5]}
        azimuth={[-Infinity, Infinity]}
      >
        <Galaxy {...props} />
      </PresentationControls>
      {!lowPower && (
        <EffectComposer multisampling={0}>
          <Bloom mipmapBlur intensity={0.85} luminanceThreshold={1.0} luminanceSmoothing={0.1} />
        </EffectComposer>
      )}
    </Canvas>
  );
}
