"use client";

import { useRef } from "react";
import Link from "next/link";
import { gsap, useGSAP, mq } from "@/lib/animation/gsap";
import { Plate } from "@/components/media/Plate";
import { categoryTitle } from "@/lib/projects/categories";
import type { Project } from "@/lib/projects/types";

/**
 * Selected work — the band.
 *
 * The whole site runs downward except this. Here vertical scroll drives
 * lateral movement, so the work is travelled along rather than fallen past.
 * Changing direction once, in the place that matters most, is what stops the
 * page reading as one long column.
 *
 * The plates are deliberately unequal — a tall portrait beside a wide one —
 * because a row of identical rectangles is a carousel, and a row of different
 * ones is a composition.
 *
 * The band is an enhancement. Written plainly this is a vertical list of
 * plates, which is exactly what it stays as without JavaScript or for a reader
 * who has asked for less movement (see globals.css → THE HORIZONTAL BAND).
 */
export function SelectedWork({ projects }: { projects: Project[] }) {
  const root = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const n = projects.length;

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(mq.motion, () => {
        const el = track.current;
        if (!el) return;

        // Measured, not assumed — the distance is whatever the track actually
        // overhangs the viewport, recalculated on every refresh so a resize or
        // a late font never leaves the last plate stranded off-screen.
        const distance = () => Math.max(0, el.scrollWidth - window.innerWidth);

        const tw = gsap.to(el, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: {
            trigger: root.current,
            start: "top top",
            end: () => `+=${distance()}`,
            scrub: 0.35,
            invalidateOnRefresh: true,
          },
        });

        return () => {
          tw.scrollTrigger?.kill();
          tw.kill();
        };
      });

      return () => mm.revert();
    },
    { scope: root, dependencies: [n] },
  );

  return (
    <section
      ref={root}
      data-surface="ink"
      data-hstack
      aria-labelledby="selected-heading"
      className="relative"
      style={{ "--n": n } as React.CSSProperties}
    >
      <div data-hstack-viewport className="w-full">
        <div ref={track} data-hstack-track className="w-full">
          {projects.map((project, i) => {
            // Alternating proportion, so the band has rhythm rather than
            // repetition.
            const portrait = i % 2 === 1;

            return (
              <article
                key={project.slug}
                data-hstack-item
                className="group relative"
              >
                <Link
                  href={`/projects/${project.slug}`}
                  data-cursor="Open"
                  className="block"
                >
                  <div className="overflow-hidden">
                    <Plate
                      plate={{
                        ...project.hero,
                        aspect: portrait ? 3 / 4 : 4 / 3,
                      }}
                      sizes="(min-width: 48rem) 52vw, 84vw"
                      priority={i === 0}
                      reference={`KA · ${String(i + 1).padStart(2, "0")}`}
                      mediaClassName="transition-transform duration-[1.2s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
                    />
                  </div>

                  <div className="rule-t mt-5 flex items-baseline justify-between gap-6 pt-4">
                    <div className="min-w-0">
                      <p className="note mb-2 opacity-45">
                        {String(i + 1).padStart(2, "0")} —{" "}
                        {categoryTitle(project.category)}
                      </p>
                      <h3 className="display-tight text-h3">{project.title}</h3>
                    </div>
                    <p className="note shrink-0 text-right opacity-55">
                      {[project.location, project.year]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                </Link>
              </article>
            );
          })}

          {/* The band ends by handing you the index rather than stopping. */}
          <article data-hstack-item className="flex items-center">
            <Link
              href="/projects"
              data-cursor="Index"
              className="group block w-full"
            >
              <p className="note mb-4 opacity-45">
                {String(n).padStart(2, "0")} of{" "}
                {String(n).padStart(2, "0")} shown
              </p>
              <span className="display-tight block text-h2">
                Every project
              </span>
              <span
                aria-hidden
                className="mt-6 block h-px w-24 origin-left bg-current opacity-40 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-[2]"
              />
            </Link>
          </article>
        </div>
      </div>

      {/* Section marker, held over the band. */}
      <div className="frame pointer-events-none absolute inset-x-0 top-0 pt-[calc(var(--nav-h)+1rem)]">
        <div className="rule-b flex items-baseline justify-between pb-3">
          <h2 id="selected-heading" className="note opacity-45">
            Selected work
          </h2>
          <p className="note opacity-45">Scroll →</p>
        </div>
      </div>
    </section>
  );
}
