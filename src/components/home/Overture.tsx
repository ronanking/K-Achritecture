"use client";

import { useRef } from "react";
import Link from "next/link";
import { gsap, SplitText, useGSAP, ease, mq } from "@/lib/animation/gsap";
import { Plate } from "@/components/media/Plate";
import { site } from "@/lib/site";
import type { Project } from "@/lib/projects/types";

/**
 * The opening.
 *
 * A building, at full size, immediately.
 *
 * There is no drawn preamble. An earlier version of this section spent three
 * viewport-heights fanning setting-out lines across the screen before any
 * architecture appeared — which read as a technical demonstration rather than
 * as architecture, and made the reader work through abstract geometry to reach
 * the thing they came for. The work leads now.
 *
 * What is left is one hairline — the datum the title is set on — and a single
 * quiet reveal of the type over the photograph. On scroll the image gives
 * ground slowly while the title leaves faster, which is what stepping back
 * from a building actually looks like. One viewport, not three.
 */
export function Overture({ project }: { project: Project }) {
  const root = useRef<HTMLElement>(null);
  const title = useRef<HTMLHeadingElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(mq.motion, () => {
        const split = new SplitText(title.current, {
          type: "lines",
          mask: "lines",
        });

        // Entrance: about a second, and scrolling through it is always safe
        // because nothing here holds the page still.
        const tl = gsap
          .timeline({ defaults: { ease: ease.datum } })
          .set(".ov-title", { opacity: 1 })
          .fromTo(".ov-datum", { scaleX: 0 }, { scaleX: 1, duration: 1.15 }, 0)
          .from(
            split.lines,
            { yPercent: 112, duration: 1.05, stagger: 0.08 },
            0.15,
          )
          .fromTo(
            ".ov-note",
            { opacity: 0, y: 10 },
            { opacity: 1, y: 0, duration: 0.75, stagger: 0.07 },
            0.45,
          );

        // Departure.
        const drift = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: root.current,
            start: "top top",
            end: "bottom top",
            scrub: 0.4,
          },
        });

        drift
          .to(".ov-media", { yPercent: 12, scale: 1.07 }, 0)
          .to(".ov-lockup", { yPercent: -38, opacity: 0 }, 0);

        return () => {
          tl.kill();
          drift.kill();
          split.revert();
        };
      });

      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      data-surface="ink"
      aria-label="Introduction"
      className="relative h-[100svh] overflow-hidden"
    >
      <div className="ov-media absolute inset-0 will-change-transform">
        <Plate
          plate={project.hero}
          fill
          priority
          sizes="100vw"
          reference="KA · 01"
        />
      </div>

      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, rgba(11,11,11,.86) 0%, rgba(11,11,11,.3) 42%, rgba(11,11,11,.2) 100%)",
        }}
      />

      <div className="ov-lockup frame absolute inset-x-0 bottom-0 pb-10 md:pb-14">
        <div data-hide="fade" className="ov-note note mb-5 flex items-baseline justify-between">
          <span>{site.region}</span>
          <span className="hidden sm:block">Selected work</span>
        </div>

        <div
          aria-hidden
          className="ov-datum mb-7 h-px w-full origin-left bg-paper/35"
        />

        <div className="bays items-end gap-y-8">
          <h1
            ref={title}
            data-hide="fade"
            className="ov-title display-tight col-span-6 text-h1 md:col-span-8 lg:col-span-7"
          >
            Elevating the standard of modern architecture
          </h1>

          <div className="col-span-6 flex items-end justify-between md:col-span-4 lg:col-span-5">
            <p data-hide="fade" className="ov-note note max-w-[18ch]">
              Sunshine Coast, Queensland
            </p>

            <Link
              href={`/projects/${project.slug}`}
              data-hide="fade" className="ov-note group block text-right"
              data-cursor="View"
            >
              <span className="display-tight block text-h4">
                {project.title}
              </span>
              {project.location ? (
                <span className="note mt-1 block opacity-55">
                  {project.location}
                </span>
              ) : null}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
