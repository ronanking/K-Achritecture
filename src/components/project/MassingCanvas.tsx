"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import {
  VIEW_DIRECTION,
  offsetForCentre,
  projectedFrame,
} from "@/lib/massing/axonometric";
import type { MassingVolume } from "@/lib/projects/types";

/**
 * The massing model, turnable.
 *
 * The geometry is a card model built in Blender by tools/massing, from the
 * same volume data the flat drawing projects — bevelled arrises, a floor line
 * scored at every storey, a base plate, and ambient occlusion baked per
 * object. Direct light is not baked: it is added here, so the scored lines
 * shade from their own normals and stay crisp at any zoom instead of smearing
 * into whatever a texture could hold.
 *
 * Everything else is deliberately restrained:
 *
 *   · frameloop="demand" — the loop is idle unless something is moving. A
 *     model sitting still on a page costs nothing.
 *   · No zoom, on either pointer type. A canvas that eats the scroll wheel on
 *     a scroll-driven site is a trap, not a feature.
 *   · No auto-rotate. A building that spins is a product shot; this is a
 *     study model, and it holds still until somebody turns it.
 *   · Oxide marks the isolated volume and nothing else, which is the one rule
 *     the accent colour has anywhere on this site.
 */

export type ViewPreset = "axonometric" | "elevation" | "plan" | "free";

export const MODEL_URL = "/models/the-corso-massing.glb";

/**
 * Direction the camera sits in, per named view. Normalised on use.
 *
 * The axonometric is the flat drawing's own view, taken from the projection
 * library, so the model opens on exactly the frame it faded in over.
 */
const DIRECTION: Record<Exclude<ViewPreset, "free">, THREE.Vector3> = {
  axonometric: new THREE.Vector3(...VIEW_DIRECTION),
  elevation: new THREE.Vector3(0, 0.16, 1),
  plan: new THREE.Vector3(0.02, 1, 0.06),
};

const RADIUS = 60;

const COLOUR = {
  /** A drawn edge, for a volume that is present. Reads against pale card. */
  edge: "#2f2d29",
  /** A ghost's edge. Reads against the black stage, where a dark line cannot. */
  ghost: "#c7c2b7",
  active: "#9b4e28",
} as const;

export interface MassingCanvasProps {
  volumes: MassingVolume[];
  /** Isolated volume, or null for the whole model. */
  active: string | null;
  /** Volume under the pointer, in either the model or the list. */
  hovered: string | null;
  preset: ViewPreset;
  reduced: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  /** Fired the moment the viewer takes the camera themselves. */
  onFreeLook: () => void;
  onReady?: () => void;
}

export default function MassingCanvas(props: MassingCanvasProps) {
  const start = useMemo(
    () => DIRECTION.axonometric.clone().normalize().multiplyScalar(RADIUS),
    [],
  );

  return (
    <Canvas
      frameloop="demand"
      orthographic
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      camera={{ position: start.toArray(), zoom: 20, near: 0.1, far: 400 }}
      style={{ width: "100%", height: "100%" }}
      // No tone mapping. A filmic curve is for photographs of the world; this
      // is a card model under a studio light, and rolling its highlights off
      // only takes the arrises with them.
      flat
    >
      {/* Direct light only. The ambient term carries the baked occlusion. */}
      <ambientLight intensity={0.75} />
      <directionalLight position={[9, 15, 11]} intensity={1.15} />
      <directionalLight position={[-11, 5, -9]} intensity={0.28} />

      <View preset={props.preset} reduced={props.reduced} />
      <Controls onFreeLook={props.onFreeLook} />

      {/* Nothing stands in for the model while it loads. The flat drawing is
          still underneath, and it is a better wait than a spinner. */}
      <Suspense fallback={null}>
        <Model {...props} />
      </Suspense>
    </Canvas>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * The card model, and the framing that comes with it.
 *
 * The model's extent is only knowable once it has loaded — it carries a base
 * plate the volume data says nothing about — so the fit is measured from the
 * loaded geometry rather than guessed from the volumes.
 */
function Model({
  volumes,
  active,
  hovered,
  reduced,
  onHover,
  onSelect,
  onReady,
}: MassingCanvasProps) {
  const gltf = useLoader(GLTFLoader, MODEL_URL);

  const nodes = useMemo(() => {
    const found = new Map<string, THREE.Mesh>();
    gltf.scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh && child.name.startsWith("massing_")) {
        found.set(child.name.slice("massing_".length), child as THREE.Mesh);
      }
    });
    return found;
  }, [gltf]);

  const frame = useMemo(() => {
    const box = new THREE.Box3().setFromObject(gltf.scene);
    return projectedFrame(
      [box.min.x, box.min.y, box.min.z],
      [box.max.x, box.max.y, box.max.z],
    );
  }, [gltf]);

  const offset = useMemo(
    () => offsetForCentre(frame.cx, frame.cy),
    [frame.cx, frame.cy],
  );

  useEffect(() => {
    onReady?.();
  }, [onReady]);

  const base = nodes.get("base");

  return (
    <>
      <Fit width={frame.width} height={frame.height} />

      <group position={offset}>
        {base ? (
          <Piece
            node={base}
            state={active ? "recessed" : "normal"}
            reduced={reduced}
          />
        ) : null}

        {volumes.map((v) => {
          const node = nodes.get(v.id);
          if (!node) return null;
          const state: PieceState =
            active === null
              ? hovered === v.id
                ? "hover"
                : "normal"
              : active === v.id
                ? "isolated"
                : "recessed";
          return (
            <Piece
              key={v.id}
              node={node}
              state={state}
              reduced={reduced}
              onHover={() => onHover(v.id)}
              onLeave={() => onHover(null)}
              onSelect={() => onSelect(v.id)}
            >
              <Silhouette volume={v} state={state} reduced={reduced} />
            </Piece>
          );
        })}
      </group>
    </>
  );
}

/* -------------------------------------------------------------------------- */

type PieceState = "normal" | "hover" | "isolated" | "recessed";

/** Fill opacity per state. Colour is the model's own; only presence changes. */
function fillFor(state: PieceState): number {
  return state === "recessed" ? 0.12 : 1;
}

/** Edge opacity and colour per state. Oxide marks the isolated volume. */
function edgeFor(state: PieceState) {
  switch (state) {
    case "recessed":
      return { opacity: 0.2, colour: COLOUR.ghost };
    case "isolated":
      return { opacity: 1, colour: COLOUR.active };
    case "hover":
      return { opacity: 0.85, colour: COLOUR.active };
    default:
      return { opacity: 0.32, colour: COLOUR.edge };
  }
}

function Piece({
  node,
  state,
  reduced,
  onHover,
  onLeave,
  onSelect,
  children,
}: {
  node: THREE.Mesh;
  state: PieceState;
  reduced: boolean;
  onHover?: () => void;
  onLeave?: () => void;
  onSelect?: () => void;
  children?: React.ReactNode;
}) {
  const invalidate = useThree((s) => s.invalidate);

  // The loader's material is read for its settings but never used directly:
  // it is shared between every mesh that references it in the file, and this
  // component is about to start animating opacity. Declaring our own here
  // means react-three-fiber owns its lifetime and disposes it with the mesh.
  const source = node.material as THREE.MeshStandardMaterial;
  const material = useRef<THREE.MeshStandardMaterial>(null);

  const target = fillFor(state);

  useEffect(() => {
    const m = material.current;
    if (reduced && m) {
      m.opacity = target;
      m.depthWrite = target > 0.9;
    }
    invalidate();
  }, [reduced, target, invalidate]);

  useFrame((_, delta) => {
    if (reduced) return;
    const m = material.current;
    if (!m) return;
    const d = target - m.opacity;
    if (Math.abs(d) < 0.003) return;
    m.opacity += d * (1 - Math.exp(-9 * Math.min(delta, 0.1)));
    // Ghosted volumes must not write depth or they punch holes in the one you
    // are actually looking at.
    m.depthWrite = m.opacity > 0.9;
    invalidate();
  });

  return (
    <mesh
      geometry={node.geometry}
      onPointerOver={
        onHover
          ? (e) => {
              e.stopPropagation();
              onHover();
            }
          : undefined
      }
      onPointerOut={onLeave}
      onClick={
        onSelect
          ? (e) => {
              e.stopPropagation();
              onSelect();
            }
          : undefined
      }
    >
      <meshStandardMaterial
        ref={material}
        color={source.color}
        roughness={source.roughness}
        metalness={source.metalness}
        aoMap={source.aoMap}
        aoMapIntensity={1}
        transparent
        opacity={1}
      />
      {children}
    </mesh>
  );
}

/**
 * The volume's outline, drawn over the card.
 *
 * Taken from the volume data rather than from the model's edges: the card has
 * bevelled arrises and eighteen scored floor lines, and tracing all of that
 * would bury the one line that carries meaning. This is the box the project
 * data describes, and it is the only thing that ever turns oxide.
 */
function Silhouette({
  volume,
  state,
  reduced,
}: {
  volume: MassingVolume;
  state: PieceState;
  reduced: boolean;
}) {
  const line = useRef<THREE.LineBasicMaterial>(null);
  const invalidate = useThree((s) => s.invalidate);
  const [w, h, d] = volume.size;

  // EdgesGeometry copies what it needs, so the box it is derived from can go
  // straight back. Both are disposed with the component.
  const edges = useMemo(() => {
    const box = new THREE.BoxGeometry(w, h, d);
    const geometry = new THREE.EdgesGeometry(box);
    box.dispose();
    return geometry;
  }, [w, h, d]);
  useEffect(() => () => edges.dispose(), [edges]);

  const target = edgeFor(state);
  const goal = useMemo(() => new THREE.Color(target.colour), [target.colour]);

  useEffect(() => {
    if (reduced && line.current) {
      line.current.opacity = target.opacity;
      line.current.color.set(target.colour);
    }
    invalidate();
  }, [reduced, target.opacity, target.colour, invalidate]);

  useFrame((_, delta) => {
    if (reduced) return;
    const l = line.current;
    if (!l) return;
    const k = 1 - Math.exp(-9 * Math.min(delta, 0.1));
    const d0 = target.opacity - l.opacity;
    const shifted = l.color.getHex() !== goal.getHex();
    l.opacity += d0 * k;
    l.color.lerp(goal, k);
    if (Math.abs(d0) > 0.003 || shifted) invalidate();
  });

  return (
    <lineSegments
      geometry={edges}
      position={volume.position}
      raycast={() => null}
    >
      <lineBasicMaterial
        ref={line}
        color={COLOUR.edge}
        transparent
        opacity={0.3}
        depthWrite={false}
      />
    </lineSegments>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * Fits the drawing to the stage. Orthographic, so this is purely zoom.
 *
 * The stage measures the fit and asks for a frame; the frame applies it. Doing
 * it that way round keeps the camera out of the effect body, and means a
 * resize costs exactly one render rather than a stream of them.
 */
function Fit({ width, height }: { width: number; height: number }) {
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  const zoom = useRef(1);

  useEffect(() => {
    zoom.current = Math.min(size.width / width, size.height / height) * 0.97;
    invalidate();
  }, [size.width, size.height, width, height, invalidate]);

  useFrame(({ camera }) => {
    const cam = camera as THREE.OrthographicCamera;
    if (cam.zoom === zoom.current) return;
    cam.zoom = zoom.current;
    cam.updateProjectionMatrix();
  }, -1);

  return null;
}

/**
 * Named views.
 *
 * The camera eases toward the chosen direction and stops requesting frames the
 * moment it arrives. Under reduced motion it simply arrives. As soon as the
 * viewer takes hold of the model the preset is dropped, so the two never fight
 * over the camera.
 */
function View({ preset, reduced }: { preset: ViewPreset; reduced: boolean }) {
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);

  const goal = useMemo(() => {
    if (preset === "free") return null;
    return DIRECTION[preset].clone().normalize().multiplyScalar(RADIUS);
  }, [preset]);

  useEffect(() => {
    if (!goal) return;
    if (reduced) {
      camera.position.copy(goal);
      camera.lookAt(0, 0, 0);
    }
    invalidate();
  }, [goal, reduced, camera, invalidate]);

  useFrame((_, delta) => {
    if (!goal || reduced) return;
    if (camera.position.distanceToSquared(goal) < 0.004) {
      camera.position.copy(goal);
      camera.lookAt(0, 0, 0);
      return;
    }
    camera.position.lerp(goal, 1 - Math.exp(-6 * Math.min(delta, 0.1)));
    camera.lookAt(0, 0, 0);
    invalidate();
  });

  return null;
}

/**
 * Orbit, and nothing else.
 *
 * Damping is on, which needs frames while it settles — but OrbitControls only
 * announces a change when the camera genuinely moved, so binding invalidate to
 * that event gives a loop that winds itself down instead of running forever.
 *
 * OrbitControls writes `touch-action: none` onto the canvas the moment it
 * connects, which would hand every vertical swipe on a phone to the model
 * rather than to the page. That inline style is overruled in globals.css: the
 * browser keeps vertical, the model gets lateral.
 */
function Controls({ onFreeLook }: { onFreeLook: () => void }) {
  const camera = useThree((s) => s.camera);
  const domElement = useThree((s) => s.gl.domElement);
  const invalidate = useThree((s) => s.invalidate);
  const controls = useRef<OrbitControls | null>(null);

  useEffect(() => {
    const orbit = new OrbitControls(camera, domElement);
    orbit.enablePan = false;
    orbit.enableZoom = false;
    orbit.enableDamping = true;
    orbit.dampingFactor = 0.08;
    orbit.rotateSpeed = 0.62;
    orbit.minPolarAngle = 0;
    orbit.maxPolarAngle = Math.PI / 2 - 0.02;

    const onChange = () => invalidate();
    orbit.addEventListener("change", onChange);
    orbit.addEventListener("start", onFreeLook);
    controls.current = orbit;

    return () => {
      orbit.removeEventListener("change", onChange);
      orbit.removeEventListener("start", onFreeLook);
      orbit.dispose();
      controls.current = null;
    };
  }, [camera, domElement, invalidate, onFreeLook]);

  // Priority stays at zero. A positive render priority hands the render loop
  // to the component and stops react-three-fiber drawing at all, which is a
  // very quiet way to end up looking at a frozen frame. Order comes from mount
  // order instead: View is above this in the tree, so it moves the camera
  // first and the controls read the result.
  useFrame(() => controls.current?.update());

  return null;
}
