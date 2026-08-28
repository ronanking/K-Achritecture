"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import {
  VIEW_DIRECTION,
  axonometric,
  centringOffset,
  extent,
  levels,
} from "@/lib/massing/axonometric";
import type { MassingVolume } from "@/lib/projects/types";

/**
 * The massing model, turnable.
 *
 * The same volumes as the flat drawing, in a WebGL context that you can walk
 * around. Everything here is deliberately restrained:
 *
 *   · frameloop="demand" — the loop is idle unless something is actually
 *     moving. A model sitting still on a page costs nothing.
 *   · No zoom, on either pointer type. A canvas that eats the scroll wheel on
 *     a scroll-driven site is a trap, not a feature.
 *   · No auto-rotate. A building that spins is a product shot; this is a
 *     diagram, and it holds still until somebody turns it.
 *   · Oxide marks the isolated volume and nothing else, which is the one rule
 *     the accent colour has anywhere on this site.
 */

export type ViewPreset = "axonometric" | "elevation" | "plan" | "free";

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
  solid: "#8f8c83",
  open: "#d9d3c5",
  edge: "#c7c2b7",
  active: "#9b4e28",
  grid: "#c7c2b7",
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

export default function MassingCanvas({
  volumes,
  active,
  hovered,
  preset,
  reduced,
  onHover,
  onSelect,
  onFreeLook,
  onReady,
}: MassingCanvasProps) {
  const drawing = useMemo(() => axonometric(volumes), [volumes]);
  const offset = useMemo(() => centringOffset(volumes), [volumes]);
  const ground = useMemo(() => extent(volumes).ground, [volumes]);

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
      onCreated={onReady}
      style={{ width: "100%", height: "100%" }}
    >
      <ambientLight intensity={1.15} />
      <directionalLight position={[9, 15, 11]} intensity={2.3} />
      <directionalLight position={[-11, 5, -9]} intensity={0.55} />

      <Fit width={drawing.width} height={drawing.height} />
      <View preset={preset} reduced={reduced} />
      <Controls onFreeLook={onFreeLook} />

      <group position={offset}>
        <SettingOut volumes={volumes} ground={ground} />

        {volumes.map((v) => (
          <Volume
            key={v.id}
            volume={v}
            state={
              active === null
                ? hovered === v.id
                  ? "hover"
                  : "normal"
                : active === v.id
                  ? "isolated"
                  : "recessed"
            }
            reduced={reduced}
            onHover={onHover}
            onSelect={onSelect}
          />
        ))}
      </group>
    </Canvas>
  );
}

/* -------------------------------------------------------------------------- */

type VolumeState = "normal" | "hover" | "isolated" | "recessed";

/** Fill, edge, storey line and colour, per state and per volume kind. */
function appearance(state: VolumeState, open: boolean) {
  const base = open ? 0.44 : 1;
  switch (state) {
    case "recessed":
      return {
        fill: base * 0.16,
        edge: 0.22,
        storey: 0.05,
        colour: COLOUR.edge,
      };
    case "isolated":
      return { fill: base, edge: 1, storey: 0.5, colour: COLOUR.active };
    case "hover":
      return { fill: base, edge: 0.9, storey: 0.42, colour: COLOUR.active };
    default:
      return { fill: base, edge: 0.45, storey: 0.16, colour: COLOUR.edge };
  }
}

function Volume({
  volume,
  state,
  reduced,
  onHover,
  onSelect,
}: {
  volume: MassingVolume;
  state: VolumeState;
  reduced: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}) {
  const open = volume.open === true;
  const fill = useRef<THREE.MeshLambertMaterial>(null);
  const line = useRef<THREE.LineBasicMaterial>(null);
  const storeyLine = useRef<THREE.LineBasicMaterial>(null);
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

  // The storey lines, in local space. Four segments per level, so they hold up
  // from any angle rather than only from the drawing's own.
  const storeys = useMemo(() => {
    const ys = levels(volume).map((y) => y - volume.position[1]);
    if (!ys.length) return null;
    const x = w / 2;
    const z = d / 2;
    const points: number[] = [];
    for (const y of ys) {
      points.push(-x, y, -z, x, y, -z);
      points.push(x, y, -z, x, y, z);
      points.push(x, y, z, -x, y, z);
      points.push(-x, y, z, -x, y, -z);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(points, 3),
    );
    return geometry;
  }, [volume, w, d]);
  useEffect(() => () => storeys?.dispose(), [storeys]);

  const target = appearance(state, open);
  const goal = useMemo(() => new THREE.Color(target.colour), [target.colour]);

  useEffect(() => {
    if (!reduced) {
      invalidate();
      return;
    }
    // Reduced motion: no easing, the state is simply the state.
    if (fill.current) fill.current.opacity = target.fill;
    if (line.current) {
      line.current.opacity = target.edge;
      line.current.color.set(target.colour);
    }
    if (storeyLine.current) {
      storeyLine.current.opacity = target.storey;
      storeyLine.current.color.set(target.colour);
    }
    invalidate();
  }, [
    reduced,
    target.fill,
    target.edge,
    target.storey,
    target.colour,
    invalidate,
  ]);

  useFrame((_, delta) => {
    if (reduced) return;
    const f = fill.current;
    const l = line.current;
    if (!f || !l) return;

    // Framerate-independent. A fixed per-frame fraction eases at whatever
    // speed the machine happens to run at, which is how the same transition
    // ends up instant on one laptop and slow on another.
    const k = 1 - Math.exp(-9 * Math.min(delta, 0.1));
    const s = storeyLine.current;
    const df = target.fill - f.opacity;
    const de = target.edge - l.opacity;
    const ds = s ? target.storey - s.opacity : 0;
    const dc = l.color.getHex() === goal.getHex() ? 0 : 1;

    f.opacity += df * k;
    l.opacity += de * k;
    l.color.lerp(goal, k);
    if (s) {
      s.opacity += ds * k;
      s.color.lerp(goal, k);
    }

    // Ghosted volumes must not write depth or they punch holes in the one you
    // are actually looking at.
    f.depthWrite = f.opacity > 0.9;

    if (
      Math.abs(df) > 0.003 ||
      Math.abs(de) > 0.003 ||
      Math.abs(ds) > 0.003 ||
      dc
    )
      invalidate();
  }, 0);

  return (
    <group position={volume.position}>
      <mesh
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(volume.id);
        }}
        onPointerOut={() => onHover(null)}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(volume.id);
        }}
      >
        <boxGeometry args={[w, h, d]} />
        <meshLambertMaterial
          ref={fill}
          color={open ? COLOUR.open : COLOUR.solid}
          transparent
          opacity={open ? 0.44 : 1}
        />
      </mesh>

      <lineSegments geometry={edges} raycast={() => null}>
        <lineBasicMaterial
          ref={line}
          color={COLOUR.edge}
          transparent
          opacity={0.45}
          depthWrite={false}
        />
      </lineSegments>

      {storeys ? (
        <lineSegments geometry={storeys} raycast={() => null}>
          <lineBasicMaterial
            ref={storeyLine}
            color={COLOUR.edge}
            transparent
            opacity={0.16}
            depthWrite={false}
          />
        </lineSegments>
      ) : null}
    </group>
  );
}

/**
 * The setting-out: a grid at ground level, and the footprint of each mass laid
 * flat on it. The footprints do the work a shadow map would do — they say
 * where the building meets the ground — for the price of a few flat planes and
 * no second render pass. The light elements are left out of it; a terrace does
 * not cast the shadow of a building.
 */
function SettingOut({
  volumes,
  ground,
}: {
  volumes: MassingVolume[];
  ground: number;
}) {
  const grid = useMemo(() => {
    const half = 22;
    const step = 2;
    const points: number[] = [];
    for (let i = -half; i <= half; i += step) {
      points.push(-half, 0, i, half, 0, i);
      points.push(i, 0, -half, i, 0, half);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(points, 3),
    );
    return geometry;
  }, []);
  useEffect(() => () => grid.dispose(), [grid]);

  return (
    <group>
      <lineSegments
        geometry={grid}
        position={[0, ground, 0]}
        raycast={() => null}
      >
        <lineBasicMaterial
          color={COLOUR.grid}
          transparent
          opacity={0.09}
          depthWrite={false}
        />
      </lineSegments>

      {volumes
        .filter((v) => v.open !== true)
        .map((v) => (
          <mesh
            key={v.id}
            position={[v.position[0], ground + 0.01, v.position[2]]}
            rotation={[-Math.PI / 2, 0, 0]}
            raycast={() => null}
            renderOrder={-1}
          >
            <planeGeometry args={[v.size[0], v.size[2]]} />
            <meshBasicMaterial
              color="#000000"
              transparent
              opacity={0.42}
              depthWrite={false}
            />
          </mesh>
        ))}
    </group>
  );
}

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
    zoom.current = Math.min(size.width / width, size.height / height);
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
