"use client";

import { useRef } from "react";
import { gsap, useGSAP, mq } from "@/lib/animation/gsap";
import { Plate } from "@/components/media/Plate";
import type { Plate as PlateData } from "@/lib/projects/types";

/**
 * The plates.
 *
 * Photography is given room. Nothing is cropped into a card, nothing is
 * rounded, and the sizes are not all the same — a full-bleed frame, a pair,
 * a held single, in the rhythm the project data asks for.
 *
 * Each plate is uncovered from its lower edge as it arrives, once, and is then
 * left alone.
 */
export function ProjectGallery({
  gallery,
  reference,
}: {
  gallery: PlateData[];
  reference: string;
}) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(mq.motion, () => {
        const plates = gsap.utils.toArray<HTMLElement>("[data-uncover]");
        const tweens = plates.map((el) =>
          gsap.fromTo(
            el,
            { clipPath: "inset(0% 0% 100% 0%)" },
            {
              clipPath: "inset(0% 0% 0% 0%)",
              duration: 1.15,
              ease: "expo.out",
              scrollTrigger: { trigger: el, start: "top 88%", once: true },
            },
          ),
        );
        return () => tweens.forEach((t) => t.scrollTrigger?.kill());
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  // Consecutive plates marked "pair" share a row.
  const rows: PlateData[][] = [];
  let buffer: PlateData[] = [];
  for (const plate of gallery) {
    if (plate.layout === "pair") {
      buffer.push(plate);
      if (buffer.length === 2) {
        rows.push(buffer);
        buffer = [];
      }
    } else {
      if (buffer.length) {
        rows.push(buffer);
        buffer = [];
      }
      rows.push([plate]);
    }
  }
  if (buffer.length) rows.push(buffer);

  let n = 0;

  return (
    <section ref={root} data-surface="paper" aria-label="Photography">
      <div className="frame">
        <div className="rule-b bays py-4">
          <p className="note col-span-3 opacity-45 md:col-span-2">
            {reference} — Plates
          </p>
          <p className="note col-span-3 text-right opacity-45 md:col-span-10">
            {String(gallery.length).padStart(2, "0")}
          </p>
        </div>
      </div>

      <div className="space-y-[var(--gutter)] py-[var(--gutter)] md:space-y-8 md:py-8">
        {rows.map((row, i) => {
          if (row.length === 2) {
            return (
              <div key={i} className="frame">
                <div className="grid grid-cols-2 gap-[var(--gutter)]">
                  {row.map((plate) => {
                    n += 1;
                    return (
                      <div key={n} data-uncover>
                        <Plate
                          plate={plate}
                          sizes="(min-width: 48rem) 45vw, 50vw"
                          reference={`${reference} · P${String(n).padStart(2, "0")}`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          }

          const plate = row[0];
          n += 1;
          const ref = `${reference} · P${String(n).padStart(2, "0")}`;

          if (plate.layout === "full") {
            return (
              <div key={i} data-uncover>
                <Plate plate={plate} sizes="100vw" reference={ref} />
              </div>
            );
          }

          if (plate.layout === "tall") {
            return (
              <div key={i} className="frame">
                <div className="bays">
                  <div
                    data-uncover
                    className="col-span-5 md:col-span-5 md:col-start-7"
                  >
                    <Plate
                      plate={plate}
                      sizes="(min-width: 48rem) 42vw, 84vw"
                      reference={ref}
                    />
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div key={i} className="frame">
              <div data-uncover>
                <Plate
                  plate={plate}
                  sizes="(min-width: 48rem) 92vw, 100vw"
                  reference={ref}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
