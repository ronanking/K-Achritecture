"use client";

import { useRef } from "react";
import Link from "next/link";
import { gsap, useGSAP, ease, mq } from "@/lib/animation/gsap";
import { Plate } from "@/components/media/Plate";
import { Reveal } from "@/components/typography/Reveal";
import type { PlateTone } from "@/lib/projects/types";

/**
 * The four questions.
 *
 * Previously four columns of prose with a small diagram above each — which
 * meant the section explaining how the studio thinks was the least visual
 * thing on the page. The paragraphs are gone. What is left is the diagram
 * itself, drawn over the space it describes, and the position it stands for.
 *
 * The diagrams are ordinary architectural notation drawn for this page. They
 * are not reproductions of any K Architecture drawing.
 */

const PRINCIPLES: {
  index: string;
  label: string;
  headline: string;
  tone: PlateTone;
  alt: string;
  strokes: string[];
}[] = [
  {
    index: "01",
    label: "Light",
    headline: "Natural light, planned for",
    tone: "light",
    alt: "Sun falling deep into a living space through a full-height opening.",
    strokes: [
      "M6 46 H74",
      "M18 46 V26 H50 V26",
      "M18 26 H50 V46",
      "M8 32 A32 32 0 0 1 42 6",
      "M40 10 L31 21",
      "M53 14 L45 24",
      "M64 22 L55 30",
    ],
  },
  {
    index: "02",
    label: "Air",
    headline: "Cross ventilation, by design",
    tone: "mid",
    alt: "Openings on opposite walls of a room, aligned so air passes through.",
    strokes: [
      "M6 46 H74",
      "M16 46 V22 H64 V46",
      "M6 30 H16",
      "M64 34 H74",
      "M20 30 C 34 30, 46 34, 60 34",
      "M55 30 L60 34 L55 38",
    ],
  },
  {
    index: "03",
    label: "Ground",
    headline: "Landscape, inside the plan",
    tone: "shadow",
    alt: "A retained tree standing within the footprint of the building.",
    strokes: [
      "M6 46 C 18 41, 27 44, 36 46",
      "M36 46 H74",
      "M42 46 V28 H68 V46",
      "M24 46 V28",
      "M24 28 L17 20",
      "M24 28 L31 20",
      "M24 36 L18 29",
      "M24 36 L30 29",
    ],
  },
  {
    index: "04",
    label: "Material",
    headline: "Sourced close, chosen to age",
    tone: "mid",
    alt: "Close detail of concrete meeting timber, weathered by the coast.",
    strokes: [
      "M6 46 H74",
      "M14 46 V20 H66 V46",
      "M14 28 H66",
      "M14 36 H66",
      "M28 20 V46",
      "M46 20 V46",
    ],
  },
];

export function Method() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(mq.motion, () => {
        const groups = gsap.utils.toArray<HTMLElement>("[data-diagram]");
        const tweens = groups.map((g) =>
          gsap.to(g.querySelectorAll("path"), {
            strokeDashoffset: 0,
            duration: 1.1,
            ease: ease.section,
            stagger: 0.09,
            scrollTrigger: { trigger: g, start: "top 88%", once: true },
          }),
        );
        return () => tweens.forEach((t) => t.scrollTrigger?.kill());
      });

      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section ref={root} data-surface="chalk" aria-labelledby="method-heading">
      <div className="frame">
        <div className="bays rule-b py-4">
          <p className="note col-span-3 opacity-45 md:col-span-2">01 — Method</p>
          <p className="note col-span-3 text-right opacity-45 md:col-span-10">
            Four positions
          </p>
        </div>

        <div className="py-14 md:py-20">
          <Reveal as="h2" className="display-tight max-w-[18ch] text-h2">
            <span id="method-heading">
              Every project answers the same four questions first.
            </span>
          </Reveal>

          <div className="mt-12 grid grid-cols-2 gap-x-[var(--gutter)] gap-y-10 md:mt-16 lg:grid-cols-4">
            {PRINCIPLES.map((p) => (
              <article key={p.index}>
                <div className="relative">
                  <Plate
                    plate={{ alt: p.alt, aspect: 3 / 4, tone: p.tone }}
                    sizes="(min-width: 80rem) 22vw, (min-width: 48rem) 44vw, 44vw"
                    reference={`KA · ${p.index}`}
                  />

                  {/* The diagram sits on the space it describes, the way a
                      note is drawn over a photograph on a review sheet. */}
                  <svg
                    data-diagram
                    data-draw
                    viewBox="0 0 80 52"
                    className="absolute left-3 top-3 h-auto w-[42%] text-paper mix-blend-difference"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeLinecap="square"
                    aria-hidden
                  >
                    {p.strokes.map((d, i) => (
                      <path
                        key={i}
                        d={d}
                        pathLength={1}
                        vectorEffect="non-scaling-stroke"
                      />
                    ))}
                  </svg>
                </div>

                <div className="rule-t mt-4 pt-3">
                  <p className="note mb-2 opacity-45">
                    {p.index} — {p.label}
                  </p>
                  <h3 className="display-tight text-h4">{p.headline}</h3>
                </div>
              </article>
            ))}
          </div>

          <div className="rule-t mt-12 pt-6">
            <Link
              href="/studio"
              className="group inline-flex items-baseline gap-4"
            >
              <span className="text-h4">How the studio works</span>
              <span
                aria-hidden
                className="block h-px w-12 origin-left bg-current transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-150"
              />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
