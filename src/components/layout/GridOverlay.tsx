"use client";

import { useEffect, useState } from "react";

const EVENT = "k:grid";

/**
 * The setting-out grid, made visible.
 *
 * Architects check their work against the grid. This lets anyone else do the
 * same — press G, or use the control in the title block. It is not decoration
 * and it is not a toy: it is the actual structure every page is composed on,
 * and the site is willing to be measured against it.
 */
export function GridOverlay() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    const toggle = () => setOn((v) => !v);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "g" && e.key !== "G") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      // Never steal the key from someone who is typing.
      if (
        t &&
        (t.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))
      )
        return;
      toggle();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener(EVENT, toggle);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(EVENT, toggle);
    };
  }, []);

  if (!on) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[60] mix-blend-difference"
    >
      <div className="frame h-full">
        <div className="bays h-full">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="h-full bg-oxide/25 max-md:nth-[n+7]:hidden"
              style={{ opacity: 0.5 }}
            />
          ))}
        </div>
      </div>
      <div className="absolute inset-x-0 top-[var(--nav-h)] h-px bg-oxide/60" />
      <div className="note absolute bottom-3 left-3 text-oxide">
        Setting-out grid
      </div>
    </div>
  );
}

/** Control in the title block. */
export function GridToggle() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(EVENT))}
      className="note underline-offset-4 hover:underline"
      aria-label="Toggle the setting-out grid overlay"
    >
      Grid <span className="opacity-60">(G)</span>
    </button>
  );
}
