"use client";

import { useRef, useState } from "react";
import { gsap, useGSAP } from "@/lib/animation/gsap";

/**
 * A pointer that only speaks when it has something to say.
 *
 * There is no permanent blob following the mouse. The marker appears solely
 * over elements that carry `data-cursor="<label>"` — project plates and index
 * rows, where the image lives somewhere other than the thing being pointed at
 * and the affordance genuinely needs stating.
 *
 * Two delegated listeners for the whole document, and position is written
 * straight to the transform by GSAP. React state changes only when the label
 * changes, which is a handful of times per session.
 */
export function Cursor() {
  const ref = useRef<HTMLDivElement>(null);
  const [label, setLabel] = useState<string | null>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;

      const fine = window.matchMedia("(pointer: fine)");
      const still = window.matchMedia("(prefers-reduced-motion: reduce)");
      if (!fine.matches || still.matches) return;

      const x = gsap.quickTo(el, "x", { duration: 0.32, ease: "power3.out" });
      const y = gsap.quickTo(el, "y", { duration: 0.32, ease: "power3.out" });

      let shown = false;
      const show = (on: boolean) => {
        if (on === shown) return;
        shown = on;
        gsap.to(el, {
          scale: on ? 1 : 0.4,
          opacity: on ? 1 : 0,
          duration: 0.34,
          ease: "power3.out",
        });
      };

      const onMove = (e: PointerEvent) => {
        x(e.clientX);
        y(e.clientY);
        const hit = (e.target as HTMLElement | null)?.closest?.(
          "[data-cursor]",
        ) as HTMLElement | null;
        const next = hit?.dataset.cursor ?? null;
        setLabel((prev) => (prev === next ? prev : next));
        show(!!next);
      };

      const onLeave = () => {
        setLabel(null);
        show(false);
      };

      window.addEventListener("pointermove", onMove, { passive: true });
      document.addEventListener("pointerleave", onLeave);
      return () => {
        window.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerleave", onLeave);
      };
    },
    { scope: ref },
  );

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[80] hidden -translate-x-1/2 -translate-y-1/2 opacity-0 md:block"
      style={{ willChange: "transform" }}
    >
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-paper/95 text-ink">
        <span className="note" style={{ letterSpacing: "0.16em" }}>
          {label}
        </span>
      </div>
    </div>
  );
}
