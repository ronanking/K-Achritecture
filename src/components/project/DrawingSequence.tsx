"use client";

import { useRef } from "react";
import { gsap, useGSAP, mq } from "@/lib/animation/gsap";
import { Plate } from "@/components/media/Plate";
import type { Drawing } from "@/lib/projects/types";

/**
 * Drawing → reality.
 *
 * A plan is drawn on, line by line, as the page is scrolled. When the drawing
 * completes it dissolves into the photograph of the space it describes, so the
 * representation and the built thing are seen in the same frame, at the same
 * scale, one after the other.
 *
 * ── Status ──────────────────────────────────────────────────────────────
 * This system is built and idle. No architectural drawings have been invented
 * for this site: the sequence renders only for drawings that carry real
 * `paths`, traced from the studio's own exports. Until those exist, every
 * project returns null here and the page simply does not include the section.
 * Adding one plan to a project's `drawings` array switches it on, with no
 * other change.
 */
export function DrawingSequence({
  drawings,
  reference,
}: {
  drawings?: Drawing[];
  reference: string;
}) {
  const root = useRef<HTMLElement>(null);
  const usable = (drawings ?? []).filter((d) => d.paths?.length);

  useGSAP(
    () => {
      if (!usable.length) return;
      const mm = gsap.matchMedia();

      mm.add(mq.motion, () => {
        const scenes = gsap.utils.toArray<HTMLElement>("[data-scene]");
        const tls = scenes.map((scene) => {
          const tl = gsap.timeline({
            defaults: { ease: "none" },
            scrollTrigger: {
              trigger: scene,
              start: "top top",
              end: "bottom bottom",
              scrub: 0.4,
            },
          });

          tl.to(scene.querySelectorAll("[data-stroke]"), {
            strokeDashoffset: 0,
            stagger: 0.04,
            duration: 0.55,
          })
            .to(scene.querySelector("[data-resolves]"), { opacity: 1, duration: 0.25 }, 0.6)
            .to(scene.querySelector("[data-linework]"), { opacity: 0, duration: 0.2 }, 0.72);

          return tl;
        });
        return () => tls.forEach((t) => t.kill());
      });

      return () => mm.revert();
    },
    { scope: root, dependencies: [usable.length] },
  );

  if (!usable.length) return null;

  return (
    <section ref={root} data-surface="chalk" aria-label="Drawings">
      <div className="frame">
        <div className="rule-b bays py-4">
          <p className="note col-span-3 opacity-45 md:col-span-2">
            {reference} — Drawings
          </p>
        </div>
      </div>

      {usable.map((drawing, i) => (
        <div
          key={`${drawing.kind}-${i}`}
          data-scene
          className="relative h-[220svh]"
        >
          <div className="sticky top-0 flex h-[100svh] items-center overflow-hidden">
            <div className="frame w-full">
              <div className="relative mx-auto w-full max-w-[80rem]">
                {drawing.resolvesTo ? (
                  <div data-resolves style={{ opacity: 0 }}>
                    <Plate
                      plate={drawing.resolvesTo}
                      sizes="(min-width: 80rem) 80rem, 92vw"
                      reference={`${reference} · ${drawing.kind}`}
                    />
                  </div>
                ) : null}

                <svg
                  data-linework
                  viewBox={drawing.viewBox ?? "0 0 1200 800"}
                  className={`${
                    drawing.resolvesTo ? "absolute inset-0" : ""
                  } h-full w-full text-ink`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                  aria-hidden
                >
                  {drawing.paths!.map((d, j) => (
                    <path
                      key={j}
                      data-stroke
                      d={d}
                      pathLength={1}
                      vectorEffect="non-scaling-stroke"
                      style={{ strokeDasharray: 1, strokeDashoffset: 1 }}
                    />
                  ))}
                </svg>
              </div>

              <p className="note mt-6 opacity-45">
                {drawing.title}
                {drawing.caption ? ` — ${drawing.caption}` : ""}
              </p>
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}
