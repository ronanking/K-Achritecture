import { axonometric } from "@/lib/massing/axonometric";
import type { MassingVolume } from "@/lib/projects/types";

/**
 * The massing, drawn flat.
 *
 * This is the drawing that always exists. It is plain SVG, projected on the
 * server from the same volume data the WebGL model uses, so the diagram is
 * present before any JavaScript runs, on a machine with no WebGL, and inside
 * the first paint. The model fades in over the top of it when it is ready;
 * until then, and for anyone who never gets it, this is the figure — not a
 * spinner and not a gap in the page.
 *
 * Three tones, one per visible face, the way a set of massing studies is
 * hatched: the top plane takes the light, the return is mid, the face toward
 * you is darkest. The only other line is the storey — the unit the whole model
 * is measured in, so drawing it is describing the data, not the building.
 */

const FACE = {
  top: "#9d9a90",
  right: "#62615a",
  front: "#3d3c37",
} as const;

export function MassingFigure({
  volumes,
  active,
  className = "",
}: {
  volumes: MassingVolume[];
  /** Isolated volume. Everything else drops back. */
  active?: string | null;
  className?: string;
}) {
  const drawing = axonometric(volumes);

  return (
    <svg
      aria-hidden
      viewBox={drawing.viewBox}
      preserveAspectRatio="xMidYMid meet"
      className={className}
      style={{ overflow: "visible" }}
    >
      {drawing.items.map(({ volume, facets, silhouette, storeys }) => {
        const dim = active != null && active !== volume.id;
        const lit = active === volume.id;
        const open = volume.open === true;

        return (
          <g
            key={volume.id}
            style={{
              opacity: dim ? 0.22 : 1,
              transition: "opacity 600ms var(--ease-datum)",
            }}
          >
            {facets.map((f) => (
              <polygon
                key={f.face}
                points={f.points}
                fill={FACE[f.face]}
                fillOpacity={open ? 0.34 : 1}
              />
            ))}
            {storeys.map((points, i) => (
              <polyline
                key={i}
                points={points}
                fill="none"
                stroke={lit ? "var(--color-oxide)" : "var(--color-linen)"}
                strokeOpacity={lit ? 0.5 : 0.16}
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            ))}
            <polygon
              points={silhouette}
              fill="none"
              stroke={lit ? "var(--color-oxide)" : "var(--color-linen)"}
              strokeOpacity={lit ? 1 : 0.4}
              strokeWidth={1}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              style={{ transition: "stroke 400ms var(--ease-set)" }}
            />
          </g>
        );
      })}
    </svg>
  );
}
