import type { MassingVolume } from "@/lib/projects/types";

/**
 * Axonometric projection of a massing model.
 *
 * The same volume data drives two renderers: this one, which draws a flat
 * axonometric in SVG on the server, and the WebGL model, which lets you turn
 * it. The SVG is the one that always exists — no JavaScript, no WebGL, no
 * hydration required — so the drawing is never conditional on a GPU.
 *
 * Both take their default view from VIEW_DIRECTION below, so the flat drawing
 * and the model's opening frame are the same view of the same thing.
 */

/**
 * Where the viewer stands, as a direction from the model.
 *
 * Not the textbook 30° isometric, and deliberately so. Isometric foreshortens
 * the two horizontal axes equally, which closes any gap narrower than the
 * volumes either side of it — and on a project whose entire idea is the gap
 * between two towers, that is the one thing the drawing must not do. Standing
 * more in front than to the side keeps the split open.
 */
export const VIEW_DIRECTION: readonly [number, number, number] = [0.42, 0.5, 1];

/**
 * The projection, derived from that direction.
 *
 * Orthographic, y up, screen y down. Nothing here is hand-tuned: the two
 * screen axes fall out of the view direction and world up, which is why the
 * SVG and the WebGL model agree without either knowing about the other.
 */
function basis() {
  const [dx, dy, dz] = VIEW_DIRECTION;
  const length = Math.hypot(dx, dy, dz);
  const nx = dx / length;
  const ny = dy / length;
  const nz = dz / length;
  const flat = Math.hypot(nx, nz);

  return {
    // screen x
    ax: nz / flat,
    az: -nx / flat,
    // screen y, measured downward
    bx: (ny * nx) / flat,
    by: -flat,
    bz: (ny * nz) / flat,
  };
}

const B = basis();

/** World point to sheet point. */
export function project(x: number, y: number, z: number): [number, number] {
  return [B.ax * x + B.az * z, B.bx * x + B.by * y + B.bz * z];
}

export interface Bounds {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  z0: number;
  z1: number;
}

export function bounds(v: MassingVolume): Bounds {
  const [w, h, d] = v.size;
  const [px, py, pz] = v.position;
  return {
    x0: px - w / 2,
    x1: px + w / 2,
    y0: py - h / 2,
    y1: py + h / 2,
    z0: pz - d / 2,
    z1: pz + d / 2,
  };
}

/**
 * The storey lines of a volume.
 *
 * Not decoration and not a facade: the unit of this model is the storey, so
 * these are the model's own gridlines made visible. A volume only gets them if
 * it is tall enough for the count to mean something.
 */
export function levels(v: MassingVolume): number[] {
  const b = bounds(v);
  if (b.y1 - b.y0 < 2) return [];
  const out: number[] = [];
  for (let y = Math.ceil(b.y0 + 0.999); y < b.y1 - 0.001; y += 1) out.push(y);
  return out;
}

/**
 * Painter's order.
 *
 * Sorting boxes by their distance from the viewer is the obvious approach and
 * it is wrong: a wide flat podium can be further away than a deck yet still
 * cover it on the sheet. What actually decides the order is separation — box A
 * is behind box B when A finishes before B starts along any one of the three
 * axes running away from the viewer. That gives a partial order, resolved here
 * by topological sort. Volumes that genuinely intersect — the terrace runs
 * into both towers — have no separating axis and no edge between them; those
 * are settled by depth, and either answer is defensible, because the two
 * really do occupy the same space.
 */
export function drawOrder(volumes: MassingVolume[]): MassingVolume[] {
  const boxes = volumes.map(bounds);
  const n = volumes.length;
  const depth = volumes.map((v) => v.position[0] + v.position[1] + v.position[2]);

  const after: number[][] = Array.from({ length: n }, () => []);
  const indegree = new Array<number>(n).fill(0);

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const a = boxes[i];
      const b = boxes[j];
      if (a.x1 <= b.x0 || a.y1 <= b.y0 || a.z1 <= b.z0) {
        after[i].push(j);
        indegree[j]++;
      }
    }
  }

  const done = new Array<boolean>(n).fill(false);
  const order: MassingVolume[] = [];

  for (let step = 0; step < n; step++) {
    let pick = -1;
    for (let i = 0; i < n; i++) {
      if (done[i] || indegree[i] > 0) continue;
      if (pick === -1 || depth[i] < depth[pick]) pick = i;
    }
    // A cycle can only come from mutually intersecting volumes. Take the
    // furthest of what is left rather than giving up on the drawing.
    if (pick === -1) {
      for (let i = 0; i < n; i++) {
        if (done[i]) continue;
        if (pick === -1 || depth[i] < depth[pick]) pick = i;
      }
    }
    done[pick] = true;
    indegree[pick] = -1;
    for (const j of after[pick]) indegree[j]--;
    order.push(volumes[pick]);
  }

  return order;
}

export interface Facet {
  /** top, right and front are the three faces this viewer can see. */
  face: "top" | "right" | "front";
  points: string;
}

export interface ProjectedVolume {
  volume: MassingVolume;
  facets: Facet[];
  /** Outline of the whole box — the hairline that reads as the edge. */
  silhouette: string;
  /** One polyline per storey, across the two visible vertical faces. */
  storeys: string[];
}

export interface Axonometric {
  items: ProjectedVolume[];
  viewBox: string;
  /** Sheet width and height, in the projection's own units. */
  width: number;
  height: number;
  /** Centre of the projected drawing, used to frame the model in both renderers. */
  cx: number;
  cy: number;
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function poly(pts: [number, number][]): string {
  return pts.map(([x, y]) => `${round(x)},${round(y)}`).join(" ");
}

export function axonometric(
  volumes: MassingVolume[],
  padding = 1.2,
): Axonometric {
  const ordered = drawOrder(volumes);

  const items: ProjectedVolume[] = ordered.map((volume) => {
    const b = bounds(volume);
    const P = project;

    const top: [number, number][] = [
      P(b.x0, b.y1, b.z0),
      P(b.x1, b.y1, b.z0),
      P(b.x1, b.y1, b.z1),
      P(b.x0, b.y1, b.z1),
    ];
    const right: [number, number][] = [
      P(b.x1, b.y1, b.z0),
      P(b.x1, b.y1, b.z1),
      P(b.x1, b.y0, b.z1),
      P(b.x1, b.y0, b.z0),
    ];
    const front: [number, number][] = [
      P(b.x0, b.y1, b.z1),
      P(b.x1, b.y1, b.z1),
      P(b.x1, b.y0, b.z1),
      P(b.x0, b.y0, b.z1),
    ];

    // The six-sided outline the three visible faces share.
    const silhouette: [number, number][] = [
      P(b.x0, b.y1, b.z0),
      P(b.x1, b.y1, b.z0),
      P(b.x1, b.y0, b.z0),
      P(b.x1, b.y0, b.z1),
      P(b.x0, b.y0, b.z1),
      P(b.x0, b.y1, b.z1),
    ];

    const storeys = levels(volume).map((y) =>
      poly([P(b.x0, y, b.z1), P(b.x1, y, b.z1), P(b.x1, y, b.z0)]),
    );

    return {
      volume,
      facets: [
        { face: "top", points: poly(top) },
        { face: "right", points: poly(right) },
        { face: "front", points: poly(front) },
      ],
      silhouette: poly(silhouette),
      storeys,
    };
  });

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const v of volumes) {
    const b = bounds(v);
    for (const x of [b.x0, b.x1]) {
      for (const y of [b.y0, b.y1]) {
        for (const z of [b.z0, b.z1]) {
          const [sx, sy] = project(x, y, z);
          minX = Math.min(minX, sx);
          maxX = Math.max(maxX, sx);
          minY = Math.min(minY, sy);
          maxY = Math.max(maxY, sy);
        }
      }
    }
  }

  const width = maxX - minX + padding * 2;
  const height = maxY - minY + padding * 2;

  return {
    items,
    width: round(width),
    height: round(height),
    cx: round((minX + maxX) / 2),
    cy: round((minY + maxY) / 2),
    viewBox: `${round(minX - padding)} ${round(minY - padding)} ${round(
      width,
    )} ${round(height)}`,
  };
}

/**
 * Translation that puts the centre of the axonometric drawing on the origin.
 *
 * The projection is linear, so this is solvable rather than approximate: hold
 * the model's own ground centre on the screen centre by inverting the two
 * screen axes. Orbiting away from the default view shifts the framing a
 * little, which is what happens when you walk around a model.
 */
export function centringOffset(
  volumes: MassingVolume[],
): [number, number, number] {
  const { cx, cy } = axonometric(volumes);
  // Solve project(t) = (-cx, -cy) with tz chosen so the pair is determined.
  // ax·tx + az·tz = -cx and bx·tx + by·ty + bz·tz = -cy, taking tz = 0.
  const tx = -cx / B.ax;
  const ty = (-cy - B.bx * tx) / B.by;
  return [tx, ty, 0];
}

/** Centre and extent of the whole model, used to frame both renderers. */
export function extent(volumes: MassingVolume[]) {
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  let z0 = Infinity;
  let z1 = -Infinity;
  for (const v of volumes) {
    const b = bounds(v);
    x0 = Math.min(x0, b.x0);
    x1 = Math.max(x1, b.x1);
    y0 = Math.min(y0, b.y0);
    y1 = Math.max(y1, b.y1);
    z0 = Math.min(z0, b.z0);
    z1 = Math.max(z1, b.z1);
  }
  return {
    centre: [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2] as [
      number,
      number,
      number,
    ],
    size: [x1 - x0, y1 - y0, z1 - z0] as [number, number, number],
    ground: y0,
  };
}
