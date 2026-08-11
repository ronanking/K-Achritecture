import Image from "next/image";
import type { Plate as PlateData, PlateTone } from "@/lib/projects/types";

/**
 * A plate is a single framed image in the composition — the word a drawing set
 * uses for a sheet, borrowed here because that is what these are.
 *
 * Two things matter more than anything else in this component:
 *
 * 1. The aspect ratio is declared before the file loads, so the layout is
 *    final from first paint and scroll-linked animation never re-measures.
 * 2. When the photograph has not been supplied, the plate is *composed* rather
 *    than faked. No stock photography stands in for K Architecture's work.
 *    What fills the frame instead is a light study — raking light, shadow and
 *    grain, deterministic per plate — so the space reads as art-directed
 *    rather than as a missing asset, and the design around it can actually be
 *    judged. Dropping the real file at the path in the project data replaces
 *    it entirely.
 */

/** Deterministic 0–1 from a string, so a plate always composes the same way. */
function seeded(key: string, salt: number): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

/**
 * Tonal range matters more than tonal accuracy here. A frame that is uniformly
 * dark reads as a void rather than as a room, so even the shadow key carries a
 * genuinely lit passage — the way a photograph of a dim interior always has a
 * window in it somewhere.
 */
const palette: Record<PlateTone, { base: string; lit: string; deep: string }> = {
  shadow: { base: "#2a2621", lit: "#b9ab93", deep: "#0d0c0b" },
  mid: { base: "#5c564a", lit: "#e2d7c1", deep: "#1a1815" },
  light: { base: "#ddd6c8", lit: "#fffdf8", deep: "#8d8474" },
};

/** How hard the light reads, per key. */
const strength: Record<PlateTone, { pool: number; fill: number; shaft: number }> =
  {
    shadow: { pool: 0.82, fill: 0.4, shaft: 0.3 },
    mid: { pool: 0.8, fill: 0.44, shaft: 0.32 },
    light: { pool: 0.9, fill: 0.55, shaft: 0.4 },
  };

function ratioLabel(aspect: number): string {
  const known: [number, string][] = [
    [16 / 9, "16:9"],
    [3 / 2, "3:2"],
    [4 / 3, "4:3"],
    [1, "1:1"],
    [2 / 3, "2:3"],
    [3 / 4, "3:4"],
    [21 / 9, "21:9"],
    [2, "2:1"],
  ];
  const hit = known.find(([r]) => Math.abs(r - aspect) < 0.02);
  return hit ? hit[1] : aspect.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

export interface PlateProps {
  plate: PlateData;
  /** Sheet reference printed on a pending plate, e.g. "KA-02 / P-04". */
  reference?: string;
  /** Responsive sizes hint. Always pass the real measure the plate occupies. */
  sizes?: string;
  priority?: boolean;
  className?: string;
  /** Applied to the <img>/field itself — used by GSAP for scale and parallax. */
  mediaClassName?: string;
  /**
   * Fill the parent instead of holding the declared ratio. Used where the
   * container already has a size, such as a full-viewport hero.
   */
  fill?: boolean;
  /** Rendered above the image, inside the frame. */
  children?: React.ReactNode;
}

export function Plate({
  plate,
  reference,
  sizes = "100vw",
  priority = false,
  className = "",
  mediaClassName = "",
  fill = false,
  children,
}: PlateProps) {
  const tone: PlateTone = plate.tone ?? "shadow";

  return (
    <figure
      className={`relative overflow-hidden ${fill ? "h-full w-full" : ""} ${className}`}
      style={fill ? undefined : { aspectRatio: String(plate.aspect) }}
    >
      {plate.src ? (
        <>
          <div
            aria-hidden
            className="absolute inset-0"
            style={{ backgroundColor: palette[tone].base }}
          />
          <Image
            src={plate.src}
            alt={plate.alt}
            fill
            sizes={sizes}
            priority={priority}
            loading={priority ? undefined : "lazy"}
            className={`object-cover ${mediaClassName}`}
          />
        </>
      ) : (
        <LightStudy
          reference={reference}
          aspect={plate.aspect}
          tone={tone}
          alt={plate.alt}
        />
      )}

      {children}

      {plate.caption ? (
        <figcaption className="sr-only-k">{plate.caption}</figcaption>
      ) : null}
    </figure>
  );
}

/**
 * The composed stand-in: light falling into a dark volume. Two soft pools, one
 * hard shaft cut on an angle, and grain over the top. Every value is derived
 * from the plate's own alt text, so each frame is different and each is stable
 * across renders.
 */
function LightStudy({
  reference,
  aspect,
  tone,
  alt,
}: {
  reference?: string;
  aspect: number;
  tone: PlateTone;
  alt: string;
}) {
  const key = alt || reference || "plate";
  const { base, lit, deep } = palette[tone];
  const force = strength[tone];

  const px = 22 + seeded(key, 1) * 56; // primary light, x
  const py = 12 + seeded(key, 2) * 44; // primary light, y
  const sx = 8 + seeded(key, 3) * 84; // secondary pool, x
  const angle = 96 + seeded(key, 4) * 52; // shaft direction
  const shaft = 26 + seeded(key, 5) * 26; // shaft position
  const width = 7 + seeded(key, 6) * 11; // shaft width

  return (
    <div
      className="absolute inset-0"
      role="img"
      aria-label={`${alt} — photograph to be supplied`}
    >
      {/* Ground */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: `radial-gradient(120% 90% at 50% 108%, ${deep} 0%, ${base} 55%, ${deep} 100%)`,
        }}
      />

      {/* Light pooling into the volume */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: `radial-gradient(64% 80% at ${px}% ${py}%, ${lit} 0%, transparent 66%)`,
          opacity: force.pool,
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: `radial-gradient(52% 46% at ${sx}% 88%, ${lit} 0%, transparent 72%)`,
          opacity: force.fill,
        }}
      />

      {/* The shaft — light through an opening, falling across the floor */}
      <div
        aria-hidden
        className="absolute inset-[-20%]"
        style={{
          background: `linear-gradient(${angle}deg, transparent ${shaft}%, ${lit} ${
            shaft + width * 0.42
          }%, transparent ${shaft + width}%)`,
          opacity: force.shaft,
          filter: "blur(2px)",
        }}
      />

      {/* Grain. Keeps large flat areas from banding and reads as film. */}
      <svg
        aria-hidden
        className="absolute inset-0 h-full w-full"
        style={{ opacity: tone === "light" ? 0.28 : 0.4, mixBlendMode: "overlay" }}
        preserveAspectRatio="none"
      >
        <filter id={`g${Math.round(seeded(key, 7) * 1e6)}`}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.85"
            numOctaves="3"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect
          width="100%"
          height="100%"
          filter={`url(#g${Math.round(seeded(key, 7) * 1e6)})`}
        />
      </svg>

      {/* Vignette, so the frame holds its edges */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(130% 108% at 50% 42%, transparent 52%, rgba(0,0,0,.34) 100%)",
        }}
      />

      {/* The reference stays, small and in the corner — enough to identify the
          sheet, not enough to announce that something is missing. */}
      {reference ? (
        <span
          aria-hidden
          className="note absolute bottom-3 left-3 opacity-25"
          style={{ color: tone === "light" ? "#2b2b29" : "#c7c2b7" }}
        >
          {reference} · {ratioLabel(aspect)}
        </span>
      ) : null}
    </div>
  );
}
