"use client";

import { useRef } from "react";
import Link from "next/link";
import { gsap, useGSAP, mq } from "@/lib/animation/gsap";
import { Plate } from "@/components/media/Plate";
import { categoryTitle } from "@/lib/projects/categories";
import type { Project } from "@/lib/projects/types";

/**
 * The next project surfaces underneath the one you are leaving.
 *
 * It emerges from the lower edge as the page ends, so the archive keeps going
 * rather than stopping at a footer. It never navigates on its own: the reader
 * arrives at the next building only by choosing to.
 */
export function NextProject({
  project,
  reference,
}: {
  project: Project;
  reference: string;
}) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(mq.motion, () => {
        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: root.current,
            start: "top bottom",
            end: "bottom bottom",
            scrub: 0.4,
          },
        });

        tl.fromTo(
          "[data-next-media]",
          { clipPath: "inset(100% 0% 0% 0%)", scale: 1.14 },
          { clipPath: "inset(0% 0% 0% 0%)", scale: 1, duration: 0.7 },
          0,
        ).fromTo(
          "[data-next-type]",
          { opacity: 0, y: 26 },
          { opacity: 1, y: 0, duration: 0.3 },
          0.55,
        );

        return () => tl.kill();
      });

      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      data-surface="ink"
      aria-label="Next project"
      className="relative h-[150svh]"
    >
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <div
          data-next-media
          data-hide="wipe"
          className="absolute inset-0 will-change-transform"
        >
          <Plate
            plate={project.hero}
            fill
            sizes="100vw"
            reference={reference}
          />
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, rgba(11,11,11,.8) 0%, rgba(11,11,11,.25) 45%, rgba(11,11,11,.2) 100%)",
            }}
          />
        </div>

        <div className="frame absolute inset-0 flex flex-col justify-end pb-12 text-paper md:pb-16">
          <div data-next-type data-hide="fade">
            <p className="note mb-5 opacity-60">Next project</p>
            <div
              aria-hidden
              className="mb-6 h-px w-full bg-paper/30"
            />
            <Link
              href={`/projects/${project.slug}`}
              className="group inline-block"
              data-cursor="Open"
            >
              <span className="display-tight block text-h1">
                {project.title}
              </span>
              <span className="note mt-4 flex flex-wrap gap-x-8 gap-y-1 opacity-65">
                <span>{categoryTitle(project.category)}</span>
                {project.location ? <span>{project.location}</span> : null}
                <span
                  aria-hidden
                  className="inline-block h-px w-10 translate-y-[-0.35em] bg-current transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-150"
                />
              </span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
