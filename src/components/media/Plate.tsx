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
 * 2. When the photograph has not been supplied, the plate is *drawn* rather
 *    than faked. No stock photography stands in for K Architecture's work.
 *    A measured field holds the exact space the photograph will occupy, so
 *    dropping the real file at the path in the project data is the entire
 *    handover.
 */

const toneField: Record<PlateTone, string> = {
  shadow:
    "linear-gradient(158deg, #171716 0%, #0e0e0d 42%, #1d1c1a 78%, #101010 100%)",
  mid: "linear-gradient(158deg, #4a4842 0%, #33322d 46%, #56544c 82%, #3b3ا39 100%)".replace(
    "3b3ا39",
    "3b3a36",
  ),
  light:
    "linear-gradient(158deg, #d9d4c9 0%, #efebe4 44%, #c9c4b7 80%, #e4e0d7 100%)",
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
      {/* The tonal field sits under everything. When a photograph exists it
          becomes the loading colour; when one does not, it is the plate. */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ backgroundImage: toneField[tone] }}
      />

      {plate.src ? (
        <Image
          src={plate.src}
          alt={plate.alt}
          fill
          sizes={sizes}
          priority={priority}
          loading={priority ? undefined : "lazy"}
          className={`object-cover ${mediaClassName}`}
        />
      ) : (
        <PendingField
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
 * The drawn stand-in. Registration marks, a sheet reference and the reserved
 * ratio — the notation a printed plate carries before the image is struck.
 */
function PendingField({
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
  const onLight = tone === "light";
  const line = onLight ? "#2b2b29" : "#c7c2b7";

  return (
    <div
      className="absolute inset-0"
      style={{ color: line }}
      role="img"
      aria-label={`${alt} — photograph to be supplied`}
    >
      {/* Drafting film: a fine grid at the threshold of visibility. */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.16]"
        style={{
          backgroundImage: `linear-gradient(to right, ${line} 1px, transparent 1px), linear-gradient(to bottom, ${line} 1px, transparent 1px)`,
          backgroundSize: "clamp(48px, 8vw, 96px) clamp(48px, 8vw, 96px)",
          maskImage:
            "radial-gradient(120% 100% at 50% 40%, #000 20%, transparent 78%)",
          WebkitMaskImage:
            "radial-gradient(120% 100% at 50% 40%, #000 20%, transparent 78%)",
        }}
      />

      {/* Registration marks, one to each corner. */}
      <svg
        aria-hidden
        className="absolute inset-0 h-full w-full opacity-40"
        preserveAspectRatio="none"
      >
        <g stroke={line} strokeWidth="1" fill="none">
          <path d="M0 24 H24 M24 0 V24" />
          <path d="M100% 24 H calc(100% - 24)" />
        </g>
      </svg>
      <Corner className="left-3 top-3" />
      <Corner className="right-3 top-3 rotate-90" />
      <Corner className="right-3 bottom-3 rotate-180" />
      <Corner className="bottom-3 left-3 -rotate-90" />

      <div className="absolute inset-0 flex items-center justify-center">
        <span
          aria-hidden
          className="note opacity-45"
          style={{ letterSpacing: "0.3em" }}
        >
          {reference ?? "Plate"}
        </span>
      </div>

      <div className="note absolute inset-x-3 bottom-3 flex items-end justify-between opacity-45">
        <span aria-hidden>Photograph to be supplied</span>
        <span aria-hidden>{ratioLabel(aspect)}</span>
      </div>
    </div>
  );
}

function Corner({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      className={`absolute h-4 w-4 opacity-55 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      vectorEffect="non-scaling-stroke"
    >
      <path d="M0 8 V0 H8" />
    </svg>
  );
}
