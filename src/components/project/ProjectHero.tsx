"use client";

import { useRef } from "react";
import { gsap, SplitText, useGSAP, ease, mq } from "@/lib/animation/gsap";
import { Plate } from "@/components/media/Plate";
import { categoryTitle } from "@/lib/projects/categories";
import type { Project } from "@/lib/projects/types";

/**
 * The project opens at full size, on the datum.
 *
 * The title is set on a hairline struck across the frame — the same line the
 * homepage opens with, arriving here as the level the building is set out
 * from. As the page moves on, the photograph gives ground slowly while the
 * title leaves faster, which is what standing back from a building feels like.
 */
export function ProjectHero({
  project,
  reference,
}: {
  project: Project;
  reference: string;
}) {
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

        const tl = gsap
          .timeline({ defaults: { ease: ease.datum } })
          .set(".ph-title", { opacity: 1 })
          .fromTo(".ph-datum", { scaleX: 0 }, { scaleX: 1, duration: 1.1 }, 0)
          .from(split.lines, { yPercent: 112, duration: 1, stagger: 0.08 }, 0.18)
          .fromTo(
            ".ph-meta",
            { opacity: 0, y: 12 },
            { opacity: 1, y: 0, duration: 0.8, stagger: 0.06 },
            0.45,
          );

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
          .to(".ph-media", { yPercent: 12, scale: 1.08 }, 0)
          .to(".ph-lockup", { yPercent: -40, opacity: 0 }, 0);

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
      className="relative h-[100svh] overflow-hidden"
    >
      <div className="ph-media absolute inset-0 will-change-transform">
        <Plate
          plate={project.hero}
          fill
          priority
          sizes="100vw"
          reference={reference}
        />
      </div>

      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, rgba(11,11,11,.85) 0%, rgba(11,11,11,.25) 40%, rgba(11,11,11,.15) 72%)",
        }}
      />

      <div className="ph-lockup frame absolute inset-x-0 bottom-0 pb-10 text-paper md:pb-14">
        <div className="ph-meta note mb-5 flex items-baseline justify-between opacity-0">
          <span>{reference}</span>
          <span>{categoryTitle(project.category)}</span>
        </div>

        <div
          aria-hidden
          className="ph-datum mb-6 h-px w-full origin-left bg-paper/35"
        />

        <h1
          ref={title}
          className="ph-title display-tight text-mega opacity-0"
        >
          {project.title}
        </h1>

        {project.subtitle ? (
          <p className="ph-meta note mt-4 opacity-0">{project.subtitle}</p>
        ) : null}

        <div className="ph-meta note mt-6 flex flex-wrap gap-x-8 gap-y-1 opacity-0">
          {project.location ? <span>{project.location}</span> : null}
          {project.year ? <span>{project.year}</span> : null}
          {project.status ? <span>{project.status}</span> : null}
        </div>
      </div>
    </section>
  );
}
