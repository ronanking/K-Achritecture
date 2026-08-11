"use client";

import { useRef } from "react";
import { gsap, useGSAP, mq } from "@/lib/animation/gsap";
import { Plate } from "@/components/media/Plate";
import { Reveal } from "@/components/typography/Reveal";
import type { ProjectFeature } from "@/lib/projects/types";

/**
 * The design logic, shown rather than summarised.
 *
 * Each move the building makes gets its own moment: the number, the decision,
 * and the evidence. A feature without a photograph becomes a held statement
 * with nothing else in the frame — the compression between two expansions.
 *
 * Plates drift against the scroll by a few percent. Any more than that and the
 * building appears to be sliding, which is the opposite of what a building is
 * supposed to look like.
 */
export function ProjectFeatures({
  features,
  reference,
}: {
  features: ProjectFeature[];
  reference: string;
}) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(`${mq.desktop} and ${mq.motion}`, () => {
        const items = gsap.utils.toArray<HTMLElement>("[data-drift]");
        const tweens = items.map((el) =>
          gsap.fromTo(
            el,
            { yPercent: -5 },
            {
              yPercent: 5,
              ease: "none",
              scrollTrigger: {
                trigger: el.parentElement,
                start: "top bottom",
                end: "bottom top",
                scrub: 0.5,
              },
            },
          ),
        );
        return () => tweens.forEach((t) => t.scrollTrigger?.kill());
      });

      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section ref={root} data-surface="ink" aria-label="Design">
      <div className="frame">
        <div className="rule-b bays py-4">
          <p className="note col-span-3 opacity-45 md:col-span-2">
            {reference} — Design
          </p>
          <p className="note col-span-3 text-right opacity-45 md:col-span-10">
            {String(features.length).padStart(2, "0")} moves
          </p>
        </div>
      </div>

      {features.map((feature, i) => {
        const flip = i % 2 === 1;

        if (!feature.plate) {
          // A held statement. The whole frame, and nothing in it.
          return (
            <div key={feature.index} className="frame py-24 md:py-40">
              <div className="bays">
                <p className="note col-span-1 opacity-40">{feature.index}</p>
                <div className="col-span-5 md:col-span-8 md:col-start-3">
                  <Reveal
                    as="h3"
                    className="display-tight text-h2"
                  >
                    {feature.headline}
                  </Reveal>
                  {feature.body ? (
                    <Reveal
                      as="p"
                      delay={0.08}
                      className="prose-k mt-8 max-w-[46ch] opacity-70"
                    >
                      {feature.body}
                    </Reveal>
                  ) : null}
                </div>
              </div>
            </div>
          );
        }

        return (
          <div key={feature.index} className="frame py-16 md:py-24">
            <div className="bays items-center gap-y-8">
              <div
                className={`col-span-6 overflow-hidden md:col-span-7 ${
                  flip ? "md:order-2 md:col-start-6" : ""
                }`}
              >
                <div data-drift className="will-change-transform">
                  <Plate
                    plate={feature.plate}
                    sizes="(min-width: 48rem) 58vw, 100vw"
                    reference={`${reference} · ${feature.index}`}
                  />
                </div>
              </div>

              <div
                className={`col-span-6 md:col-span-4 ${
                  flip ? "md:order-1 md:col-start-1" : "md:col-start-9"
                }`}
              >
                <p className="note mb-5 opacity-40">{feature.index}</p>
                <Reveal as="h3" className="display-tight text-h3">
                  {feature.headline}
                </Reveal>
                {feature.body ? (
                  <Reveal
                    as="p"
                    delay={0.06}
                    className="mt-5 text-body opacity-70"
                  >
                    {feature.body}
                  </Reveal>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
