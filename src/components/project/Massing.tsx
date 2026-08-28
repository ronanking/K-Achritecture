"use client";

import { Component, useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "motion/react";

import { MassingFigure } from "@/components/project/MassingFigure";
import type { Massing as MassingData } from "@/lib/projects/types";
import type { ViewPreset } from "@/components/project/MassingCanvas";

/**
 * The massing, as a section.
 *
 * There are two renderers behind this and one set of controls in front of
 * them. The flat axonometric is drawn on the server and is always there. The
 * turnable model is fetched only when the section is nearly in view, only if
 * the machine can actually run it, and it fades in over the drawing when it is
 * ready. Isolating a volume works either way, so nothing here depends on the
 * WebGL half arriving.
 *
 * On a touch screen the model never takes the scroll. The stage declares
 * `touch-action: pan-y`, so a swipe down the page is a swipe down the page and
 * a swipe across it turns the model. A canvas that swallows a vertical gesture
 * halfway down a long page is a trap, and this page is very long.
 */

const MassingCanvas = dynamic(
  () => import("@/components/project/MassingCanvas"),
  { ssr: false },
);

/**
 * One throwaway context, remembered, so a machine that cannot run WebGL never
 * pays for the model bundle at all — and a machine that can is only asked once.
 */
let webgl: boolean | null = null;
function supportsWebGL(): boolean {
  if (webgl !== null) return webgl;
  try {
    const probe = document.createElement("canvas");
    webgl = Boolean(probe.getContext("webgl2") ?? probe.getContext("webgl"));
  } catch {
    webgl = false;
  }
  return webgl;
}

/**
 * If the model cannot be fetched or decoded, it simply never appears.
 *
 * The flat drawing underneath is a complete answer on its own, so there is
 * nothing to apologise for and nothing to report — a broken asset should cost
 * the reader the model, not the section.
 */
class ModelBoundary extends Component<
  { onFail: () => void; children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onFail();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

const VIEWS: { id: Exclude<ViewPreset, "free">; label: string }[] = [
  { id: "axonometric", label: "Axonometric" },
  { id: "elevation", label: "Elevation" },
  { id: "plan", label: "Plan" },
];

export function Massing({
  massing,
  reference,
}: {
  massing: MassingData;
  reference: string;
}) {
  const root = useRef<HTMLElement>(null);

  /** Near enough to be worth loading, and able to run once loaded. */
  const [live, setLive] = useState(false);
  const [ready, setReady] = useState(false);
  const [reduced, setReduced] = useState(true);
  const [coarse, setCoarse] = useState(false);

  const [active, setActive] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [preset, setPreset] = useState<ViewPreset>("axonometric");

  /* ---- Environment ------------------------------------------------- */
  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pointerQuery = window.matchMedia("(pointer: coarse)");

    const read = () => {
      setReduced(motionQuery.matches);
      setCoarse(pointerQuery.matches);
    };
    read();
    motionQuery.addEventListener("change", read);
    pointerQuery.addEventListener("change", read);

    return () => {
      motionQuery.removeEventListener("change", read);
      pointerQuery.removeEventListener("change", read);
    };
  }, []);

  /* ---- Load only when it is nearly wanted -------------------------- */
  useEffect(() => {
    const el = root.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        if (supportsWebGL()) setLive(true);
      },
      { rootMargin: "60% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const onFreeLook = useCallback(() => setPreset("free"), []);
  const onFail = useCallback(() => {
    setLive(false);
    setReady(false);
  }, []);
  const onReady = useCallback(() => setReady(true), []);
  const onHover = useCallback((id: string | null) => setHovered(id), []);
  const onSelect = useCallback(
    (id: string) => setActive((current) => (current === id ? null : id)),
    [],
  );

  const shown = massing.volumes.find((v) => v.id === (active ?? hovered));

  return (
    <section ref={root} data-surface="paper" aria-labelledby="massing-heading">
      <div className="frame">
        <div className="rule-b bays py-4">
          <p className="note col-span-3 opacity-45 md:col-span-2">
            {reference} — Massing
          </p>
          <p className="note col-span-3 text-right opacity-45 md:col-span-10">
            {String(massing.volumes.length).padStart(2, "0")} volumes
          </p>
        </div>
      </div>

      <div className="frame py-12 md:py-20">
        <div className="bays items-start gap-y-10">
          {/* ---- The stage --------------------------------------------- */}
          <div className="col-span-6 md:col-span-6">
            <div
              role="img"
              aria-label={`Axonometric massing diagram of the project: ${massing.volumes
                .map((v) => v.label)
                .join(", ")}.`}
              className="relative h-[58svh] w-full overflow-hidden bg-ink md:h-[76svh]"
            >
              <MassingFigure
                volumes={massing.volumes}
                active={active ?? hovered}
                className="absolute inset-0 h-full w-full p-6 transition-opacity duration-700 md:p-10"
              />

              {live ? (
                <div
                  aria-hidden
                  data-massing-stage
                  className="absolute inset-0 transition-opacity duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
                  style={{
                    opacity: ready ? 1 : 0,
                    pointerEvents: ready ? "auto" : "none",
                    // Vertical belongs to the page, lateral belongs to the
                    // model. Nothing here can ever eat a scroll.
                    touchAction: "pan-y",
                  }}
                >
                  <ModelBoundary onFail={onFail}>
                    <MassingCanvas
                      volumes={massing.volumes}
                      active={active}
                      hovered={hovered}
                      preset={preset}
                      reduced={reduced}
                      onHover={onHover}
                      onSelect={onSelect}
                      onFreeLook={onFreeLook}
                      onReady={onReady}
                    />
                  </ModelBoundary>
                </div>
              ) : null}

              {/* Corner notation, the way a sheet is stamped. */}
              <p className="note pointer-events-none absolute left-4 top-4 text-linen opacity-40">
                {ready ? "Model" : "Axonometric"}
              </p>

              {live && ready ? (
                <p className="note pointer-events-none absolute bottom-4 right-4 text-linen opacity-35">
                  {coarse ? "Swipe across to turn" : "Drag to turn"}
                </p>
              ) : null}
            </div>
          </div>

          {/* ---- The controls ------------------------------------------ */}
          <div className="col-span-6 md:col-span-5 md:col-start-8">
            <h2 id="massing-heading" className="display-tight text-h3">
              The massing
            </h2>

            <p className="mt-5 text-body opacity-70">{massing.caption}</p>

            {/* Views. Only offered where there is a model to move — a control
                that can never work is noise, not an affordance. */}
            {live ? (
              <div className="rule-b rule-t mt-8 py-2">
                <ul className="-mx-2 flex flex-wrap items-center">
                  {VIEWS.map((view) => {
                    const on = preset === view.id;
                    return (
                      <li key={view.id}>
                        <button
                          type="button"
                          onClick={() => setPreset(view.id)}
                          aria-pressed={on}
                          disabled={!ready}
                          className={`note relative px-2 py-1.5 transition-opacity duration-300 ${
                            !ready
                              ? "cursor-default opacity-25"
                              : on
                                ? "opacity-100"
                                : "opacity-50 hover:opacity-85"
                          }`}
                        >
                          {view.label}
                          {on && ready ? (
                            <motion.span
                              layoutId="massing-view-rule"
                              className="absolute inset-x-2 -bottom-0.5 block h-px bg-oxide"
                              transition={{
                                duration: 0.4,
                                ease: [0.16, 1, 0.3, 1],
                              }}
                            />
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}

            {/* Volumes */}
            <ul className="mt-2">
              {massing.volumes.map((v, i) => {
                const on = active === v.id;
                return (
                  <li key={v.id} className="rule-b">
                    <button
                      type="button"
                      onClick={() => onSelect(v.id)}
                      onMouseEnter={() => setHovered(v.id)}
                      onMouseLeave={() => setHovered(null)}
                      onFocus={() => setHovered(v.id)}
                      onBlur={() => setHovered(null)}
                      aria-pressed={on}
                      data-cursor={on ? "Release" : "Isolate"}
                      className="flex w-full items-baseline gap-4 py-3 text-left"
                    >
                      <span
                        className={`note w-6 shrink-0 transition-opacity duration-300 ${
                          on ? "text-oxide opacity-100" : "opacity-40"
                        }`}
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span
                        className={`text-body transition-opacity duration-300 ${
                          on ? "opacity-100" : "opacity-70"
                        }`}
                      >
                        {v.label}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {/* The note for whatever is being pointed at. Reserved height, so
                nothing below it moves when it changes. */}
            <p className="mt-5 min-h-[3.25rem] max-w-[38ch] text-body opacity-60">
              {shown?.note ?? ""}
            </p>

            {active ? (
              <button
                type="button"
                onClick={() => setActive(null)}
                className="note inline-flex items-baseline gap-3 opacity-60 transition-opacity hover:opacity-100"
              >
                Show the whole model
                <span aria-hidden className="block h-px w-8 bg-current" />
              </button>
            ) : null}

            <p className="note mt-10 max-w-[42ch] leading-[1.7] opacity-40">
              {massing.basis}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
