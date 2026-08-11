"use client";

import { useRef } from "react";
import Link from "next/link";
import { gsap, useGSAP, mq } from "@/lib/animation/gsap";
import { Plate } from "@/components/media/Plate";
import { categoryTitle } from "@/lib/projects/categories";
import type { Project } from "@/lib/projects/types";

/**
 * Selected work.
 *
 * Sheets laid down on a table, one over the last. Each project wipes in from
 * the bottom edge of the frame while the one beneath it is still visible, so
 * the sequence reads as a set being assembled rather than a carousel being
 * clicked through.
 *
 * The stack is an enhancement, not the structure. Written plainly, this is a
 * sequence of plates each with its caption — which is exactly what it stays
 * as without JavaScript, or for a reader who has asked for less movement.
 * The stacking behaviour is applied by CSS only once the document has
 * confirmed it will animate (see globals.css → THE SHEET STACK), so no reader
 * is ever left with eight projects hidden behind the first one.
 *
 * Held by `position: sticky`. The scroll length is derived from the number of
 * projects, so adding a fifth lengthens the section by exactly one segment
 * and nothing needs retuning.
 */
export function SelectedWork({ projects }: { projects: Project[] }) {
  const root = useRef<HTMLElement>(null);
  const n = projects.length;

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add({ motion: mq.motion, desktop: mq.desktop }, (ctx) => {
        const { motion, desktop } = ctx.conditions as {
          motion: boolean;
          desktop: boolean;
        };
        if (!motion) return;

        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: root.current,
            start: "top top",
            end: "bottom bottom",
            // Close to the input. This section is a controller, not a film.
            scrub: 0.28,
          },
        });

        const segment = 1 / n;

        for (let i = 1; i < n; i++) {
          const at = segment * i;

          tl.fromTo(
            `[data-plate="${i}"]`,
            { clipPath: "inset(100% 0% 0% 0%)" },
            { clipPath: "inset(0% 0% 0% 0%)", duration: segment * 0.72 },
            at - segment * 0.72,
          );

          // The outgoing sheet gives a little ground as it is covered.
          if (desktop) {
            tl.fromTo(
              `[data-plate="${i}"] [data-media]`,
              { scale: 1.12 },
              { scale: 1, duration: segment * 0.72 },
              at - segment * 0.72,
            );
          }
        }

        // Captions cut rather than cross-fade — a label either applies or it
        // does not.
        projects.forEach((_, i) => {
          const at = segment * i;
          tl.to(
            `[data-caption="${i}"]`,
            { opacity: 1, y: 0, duration: 0.001 },
            Math.max(at - segment * 0.34, 0),
          );
          if (i < n - 1) {
            tl.to(
              `[data-caption="${i}"]`,
              { opacity: 0, y: -12, duration: 0.001 },
              segment * (i + 1) - segment * 0.34,
            );
          }
        });

        return () => tl.kill();
      });

      return () => mm.revert();
    },
    { scope: root, dependencies: [n] },
  );

  return (
    <section
      ref={root}
      data-surface="ink"
      data-stack
      aria-labelledby="selected-heading"
      className="relative"
      style={{ "--stack-h": `${(n + 1) * 100}svh` } as React.CSSProperties}
    >
      <div className="frame">
        <div className="rule-b bays py-4">
          <h2
            id="selected-heading"
            className="note col-span-3 opacity-45 md:col-span-2"
          >
            Selected work
          </h2>
          <p className="note col-span-3 text-right opacity-45 md:col-span-10">
            {String(n).padStart(2, "0")} plates
          </p>
        </div>
      </div>

      <div data-stack-viewport className="w-full">
        {projects.map((project, i) => (
          <div
            key={project.slug}
            data-stack-item
            data-plate={i}
            className="overflow-hidden"
          >
            <div data-media className="absolute inset-0 will-change-transform">
              <Plate
                plate={project.hero}
                fill
                sizes="100vw"
                priority={i === 0}
                reference={`KA · ${String(i + 1).padStart(2, "0")}`}
              />
            </div>

            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to top, rgba(11,11,11,.82) 0%, rgba(11,11,11,.28) 38%, rgba(11,11,11,.12) 70%)",
              }}
            />

            {/* The plain reading of this section. */}
            <div
              data-static-caption
              className="frame absolute inset-x-0 bottom-0 pb-8 text-paper"
            >
              <p className="note mb-3 opacity-60">
                {String(i + 1).padStart(2, "0")} —{" "}
                {categoryTitle(project.category)}
              </p>
              <Link href={`/projects/${project.slug}`} data-cursor="Open">
                <span className="display-tight block text-h3">
                  {project.title}
                </span>
              </Link>
              <p className="note mt-2 opacity-70">
                {[project.location, project.year].filter(Boolean).join(" — ")}
              </p>
            </div>
          </div>
        ))}

        {/* The held frame's caption, swapped as the sheets are laid down. */}
        <div
          data-stack-captions
          className="frame pointer-events-none absolute inset-x-0 bottom-0 pb-[calc(var(--nav-h)*0.6)] text-paper"
        >
          <div className="relative h-[9.5rem] md:h-[11rem]">
            {projects.map((project, i) => (
              <div
                key={project.slug}
                data-caption={i}
                className="absolute inset-x-0 bottom-0"
                style={{
                  opacity: i === 0 ? 1 : 0,
                  transform: i === 0 ? "none" : "translateY(12px)",
                }}
              >
                <div className="bays items-end gap-y-4">
                  <div className="col-span-6 md:col-span-8">
                    <p className="note mb-3 opacity-60">
                      {String(i + 1).padStart(2, "0")} —{" "}
                      {categoryTitle(project.category)}
                    </p>
                    <Link
                      href={`/projects/${project.slug}`}
                      className="pointer-events-auto inline-block"
                      data-cursor="Open"
                    >
                      <span className="display-tight block text-h2">
                        {project.title}
                      </span>
                    </Link>
                  </div>
                  <div className="col-span-6 md:col-span-4">
                    <p className="note opacity-70 md:text-right">
                      {[project.location, project.year]
                        .filter(Boolean)
                        .join(" — ")}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
