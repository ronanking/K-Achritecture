"use client";

import { useRef } from "react";
import Link from "next/link";
import { gsap, useGSAP, ease, mq } from "@/lib/animation/gsap";
import { Reveal } from "@/components/typography/Reveal";

/**
 * How the studio thinks.
 *
 * Four positions the practice actually holds, each with the diagram an
 * architect would sketch to explain it — sun, air, ground, material. These are
 * ordinary architectural notation, drawn for this page. They are not
 * reproductions of any K Architecture drawing, and none is presented as one.
 *
 * Each diagram draws itself once, on approach, and then stops. Nothing here
 * loops.
 */

const PRINCIPLES: {
  index: string;
  label: string;
  headline: string;
  body: string;
  /** Ordered strokes. Drawn in this order, as they would be by hand. */
  strokes: string[];
}[] = [
  {
    index: "01",
    label: "Light",
    headline: "Natural light, planned for",
    body: "Orientation and opening are resolved early, so rooms are lit by the sun rather than corrected afterwards by fittings.",
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
    body: "Subtropical Queensland rewards a plan that lets air pass straight through it. Openings are placed in pairs, on opposite sides.",
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
    body: "The garden is part of the brief. Buildings are set out around what is already growing, not over it.",
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
    body: "Material selection favours what is available locally and what will still look correct in this climate in twenty years.",
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

        <div className="py-16 md:py-24">
          <Reveal
            as="h2"
            className="display-tight max-w-[16ch] text-h2"
          >
            <span id="method-heading">Every project answers the same four questions first.</span>
          </Reveal>

          <div className="mt-14 grid gap-x-[var(--gutter)] gap-y-12 md:mt-20 md:grid-cols-2 lg:grid-cols-4">
            {PRINCIPLES.map((p) => (
              <article key={p.index} className="rule-t pt-6">
                <div className="mb-6 flex items-baseline justify-between">
                  <span className="note opacity-45">{p.index}</span>
                  <span className="note opacity-45">{p.label}</span>
                </div>

                <svg
                  data-diagram
                  data-draw
                  viewBox="0 0 80 52"
                  className="mb-7 h-auto w-full max-w-[15rem] text-ink"
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

                <h3 className="display-tight mb-3 text-h4">{p.headline}</h3>
                <p className="text-body opacity-70">{p.body}</p>
              </article>
            ))}
          </div>

          <div className="rule-t mt-14 pt-6 md:mt-20">
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
