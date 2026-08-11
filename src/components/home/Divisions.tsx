"use client";

import { useState } from "react";
import Link from "next/link";
import { Plate } from "@/components/media/Plate";
import { categoryCounts } from "@/lib/projects";
import type { PlateTone } from "@/lib/projects/types";

/**
 * The divisions of work.
 *
 * Was a ruled list of four titles and four sentences — accurate, and entirely
 * grey. Now the division you are pointing at fills the frame behind the list,
 * so the section is carried by the work rather than by its description. The
 * words that remain are the ones that say something a picture cannot: what the
 * division is called, and how many projects are in it.
 *
 * Hover is not required to understand this. On a touch screen each row carries
 * its own plate inline.
 */

const backdrop: Record<string, { alt: string; tone: PlateTone }> = {
  "new-homes-and-renovations": {
    alt: "A private house open to its landscaped garden.",
    tone: "mid",
  },
  townhouses: {
    alt: "Attached houses holding a suburban street frontage.",
    tone: "shadow",
  },
  "multi-residential": {
    alt: "An apartment building rising above the street.",
    tone: "light",
  },
  "fit-outs": {
    alt: "A finished interior fit-out, joinery under raking light.",
    tone: "shadow",
  },
};

export function Divisions() {
  const divisions = categoryCounts();
  const [active, setActive] = useState<string | null>(null);

  return (
    <section
      data-surface="ink"
      aria-labelledby="divisions-heading"
      className="relative overflow-hidden"
      onMouseLeave={() => setActive(null)}
    >
      {/* The frame behind the list. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 hidden md:block">
        {divisions.map((d) => (
          <div
            key={d.id}
            className="absolute inset-0 transition-opacity duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
            style={{ opacity: active === d.id ? 0.68 : 0 }}
          >
            <Plate
              plate={{ ...backdrop[d.id], aspect: 16 / 9 }}
              fill
              sizes="100vw"
            />
          </div>
        ))}
        <div
          className="absolute inset-0 transition-opacity duration-700"
          style={{
            background:
              "linear-gradient(to right, rgba(11,11,11,.82) 0%, rgba(11,11,11,.3) 62%, rgba(11,11,11,.55) 100%)",
            opacity: active ? 1 : 0,
          }}
        />
      </div>

      <div className="frame relative">
        <div className="bays rule-b py-4">
          <p className="note col-span-3 opacity-45 md:col-span-2">
            02 — Divisions
          </p>
          <p className="note col-span-3 text-right opacity-45 md:col-span-10">
            {String(divisions.reduce((n, d) => n + d.count, 0)).padStart(2, "0")}{" "}
            projects
          </p>
        </div>

        <h2 id="divisions-heading" className="sr-only-k">
          Divisions of work
        </h2>

        <ul className="py-4 md:py-8">
          {divisions.map((d) => {
            const empty = d.count === 0;

            const row = (
              <div className="py-6 md:py-8">
                <div className="flex items-baseline gap-5 md:gap-8">
                  <span className="note w-8 shrink-0 opacity-45">
                    {empty ? "—" : String(d.count).padStart(2, "0")}
                  </span>
                  <span
                    className={`display-tight text-h2 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                      empty ? "opacity-30" : "md:group-hover:translate-x-3"
                    }`}
                  >
                    {d.title}
                  </span>
                </div>

                {/* Handheld carries the image with the row. */}
                <div className="mt-5 md:hidden">
                  <Plate
                    plate={{ ...backdrop[d.id], aspect: 16 / 9 }}
                    sizes="100vw"
                  />
                </div>
              </div>
            );

            return (
              <li
                key={d.id}
                className="rule-b"
                onMouseEnter={() => !empty && setActive(d.id)}
              >
                {empty ? (
                  <div>
                    {row}
                    <span className="sr-only-k">
                      No projects published in this division yet.
                    </span>
                  </div>
                ) : (
                  <Link
                    href={`/projects?division=${d.id}`}
                    className="group block"
                    data-cursor="View"
                  >
                    {row}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>

        <div className="flex items-baseline justify-between pb-16 pt-6 md:pb-24">
          <Link
            href="/projects"
            className="group inline-flex items-baseline gap-4"
            data-cursor="Index"
          >
            <span className="text-h4">All projects</span>
            <span
              aria-hidden
              className="block h-px w-12 origin-left bg-current transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-150"
            />
          </Link>
          <p className="note max-w-[22ch] text-right opacity-45">
            1,000+ apartments completed, under construction or proposed
          </p>
        </div>
      </div>
    </section>
  );
}
