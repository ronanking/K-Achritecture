/**
 * The mark.
 *
 * A K drawn as three strokes — stem, riser, leg — rather than set as a
 * letterform, so the same geometry that opens the site can be drawn on stroke
 * by stroke. Every stroke is open-ended: nothing here is a closed shape.
 */
export function KMark({
  className = "",
  strokeWidth = 1.6,
  ...rest
}: { className?: string; strokeWidth?: number } & React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 32"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="square"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {/* stem */}
      <path d="M3 1 V31" data-k="stem" pathLength={1} />
      {/* riser */}
      <path d="M21 1 L3 18" data-k="riser" pathLength={1} />
      {/* leg */}
      <path d="M10 11 L21 31" data-k="leg" pathLength={1} />
    </svg>
  );
}
