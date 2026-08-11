"use client";

import { useRef } from "react";
import Link from "next/link";
import { gsap, SplitText, useGSAP, ease, mq } from "@/lib/animation/gsap";
import { Plate } from "@/components/media/Plate";
import { KMark } from "@/components/layout/KMark";
import { site } from "@/lib/site";
import type { Project } from "@/lib/projects/types";

/**
 * The overture.
 *
 * A building is drawn before it is built, and this is the same sequence:
 *
 *   CONCEPT   a single mark, and a datum struck across the viewport
 *   DRAWING   rules and setting-out lines multiply from the datum
 *   SPACE     the lines close on a rectangle — an opening
 *   BUILT     the opening fills with the thing itself, and grows to fill
 *             the frame
 *
 * Two timelines run here and they are kept strictly apart. The entrance plays
 * once on load and owns the mark, the datum and the title. The scroll timeline
 * is scrubbed and owns the setting-out lines and the aperture. Neither touches
 * a property belonging to the other, so scrolling during the entrance is
 * always safe — the page never holds anyone still.
 *
 * The section is held by CSS `position: sticky` rather than a ScrollTrigger
 * pin. Sticky cannot desynchronise from Lenis, needs no pin spacing, and
 * survives a viewport resize on a phone without re-measuring.
 */

const RULES = [18, 26, 34, 42, 58, 66, 74, 82];
const COLUMNS = [8, 23, 38, 50, 62, 77, 92];

export function Overture({ project }: { project: Project }) {
  const root = useRef<HTMLElement>(null);
  const title = useRef<HTMLHeadingElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      /* ---------------------------------------------------------------
         ENTRANCE — plays once, ~1.9s, interruptible by scrolling away.
         --------------------------------------------------------------- */
      mm.add(mq.motion, () => {
        const split = new SplitText(title.current, {
          type: "lines",
          mask: "lines",
        });

        const tl = gsap.timeline({ defaults: { ease: ease.datum } });

        tl.set(".ov-title", { opacity: 1 })
          // the mark is drawn, stroke by stroke
          .to(
            ".ov-mark path",
            {
              strokeDashoffset: 0,
              duration: 0.85,
              stagger: 0.14,
              ease: "power2.inOut",
            },
            0,
          )
          // the datum is struck across the sheet
          .fromTo(
            ".ov-datum",
            { scaleX: 0 },
            { scaleX: 1, duration: 1.25 },
            0.45,
          )
          .fromTo(
            ".ov-tick",
            { opacity: 0 },
            { opacity: 0.5, duration: 0.4, stagger: 0.035 },
            0.95,
          )
          .from(
            split.lines,
            { yPercent: 112, duration: 1.15, stagger: 0.09 },
            0.72,
          )
          .fromTo(
            ".ov-note",
            { opacity: 0, y: 10 },
            { opacity: 1, y: 0, duration: 0.8, stagger: 0.08 },
            1.05,
          );

        return () => {
          tl.kill();
          split.revert();
        };
      });

      /* ---------------------------------------------------------------
         SCROLL — drawing resolves into building. Scrubbed close to the
         input so the sequence tracks the hand rather than trailing it.
         --------------------------------------------------------------- */
      mm.add(
        { desktop: mq.desktop, handheld: mq.handheld, motion: mq.motion },
        (ctx) => {
          const { desktop, motion } = ctx.conditions as {
            desktop: boolean;
            motion: boolean;
          };
          if (!motion) return;

          const tl = gsap.timeline({
            defaults: { ease: "none" },
            scrollTrigger: {
              trigger: root.current,
              start: "top top",
              end: "bottom bottom",
              scrub: 0.35,
            },
          });

          // DRAWING — setting-out lines multiply from the datum.
          tl.fromTo(
            ".ov-rule",
            { scaleX: 0, opacity: 0 },
            { scaleX: 1, opacity: 0.4, stagger: { each: 0.02, from: "center" } },
            0,
          );

          if (desktop) {
            tl.fromTo(
              ".ov-col",
              { scaleY: 0, opacity: 0 },
              { scaleY: 1, opacity: 0.28, stagger: { each: 0.015, from: "edges" } },
              0.06,
            );
          }

          // SPACE — the lines close on an opening.
          tl.fromTo(
            ".ov-aperture",
            { strokeDashoffset: 1, opacity: 0 },
            { strokeDashoffset: 0, opacity: 0.75, duration: 0.22 },
            0.2,
          )
            // BUILT — the opening fills, then takes the whole frame.
            .to(
              ".ov-plate",
              { clipPath: "inset(18% 23% 18% 23%)", duration: 0.2 },
              0.3,
            )
            .to(
              ".ov-plate",
              { clipPath: "inset(0% 0% 0% 0%)", duration: 0.26 },
              0.52,
            )
            .to(".ov-scrim", { opacity: 0.42, duration: 0.26 }, 0.52)
            .to(
              [".ov-rule", ".ov-col", ".ov-aperture", ".ov-datum"],
              { opacity: 0, duration: 0.16 },
              0.55,
            )
            .to(".ov-mark", { opacity: 0.25, duration: 0.16 }, 0.55)
            .fromTo(
              ".ov-caption",
              { opacity: 0, y: 14 },
              { opacity: 1, y: 0, duration: 0.14 },
              0.74,
            );

          return () => tl.kill();
        },
      );

      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      data-surface="ink"
      aria-label="Introduction"
      className="relative h-[220svh] md:h-[300svh]"
    >
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden">
        {/* ---- BUILT FORM ------------------------------------------- */}
        <div data-aperture className="ov-plate absolute inset-0">
          <Plate
            plate={project.hero}
            fill
            priority
            sizes="100vw"
            reference="KA · 01"
          />
          <div
            aria-hidden
            className="ov-scrim absolute inset-0 bg-ink"
            style={{ opacity: 0.75 }}
          />
        </div>

        {/* ---- DRAWING ---------------------------------------------- */}
        <svg
          aria-hidden
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full text-linen"
          fill="none"
          stroke="currentColor"
        >
          <g vectorEffect="non-scaling-stroke" strokeWidth="1">
            {RULES.map((y) => (
              <line
                key={`r${y}`}
                className="ov-rule"
                x1="0"
                y1={y}
                x2="100"
                y2={y}
                style={{ transformOrigin: "center", opacity: 0 }}
              />
            ))}
            {COLUMNS.map((x) => (
              <line
                key={`c${x}`}
                className="ov-col"
                x1={x}
                y1="0"
                x2={x}
                y2="100"
                style={{ transformOrigin: "center", opacity: 0 }}
              />
            ))}
            <rect
              className="ov-aperture"
              x="23"
              y="18"
              width="54"
              height="64"
              pathLength={1}
              style={{ strokeDasharray: 1, strokeDashoffset: 1, opacity: 0 }}
            />
          </g>
        </svg>

        {/* ---- THE DATUM -------------------------------------------- */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-1/2 flex items-center"
        >
          <div className="ov-datum h-px w-full origin-left bg-linen/45" />
        </div>
        <div
          aria-hidden
          className="absolute inset-x-0 top-1/2 flex justify-between px-[var(--page-margin)]"
        >
          {Array.from({ length: 9 }).map((_, i) => (
            <span
              key={i}
              className="ov-tick block h-2 w-px -translate-y-1/2 bg-linen"
              style={{ opacity: 0 }}
            />
          ))}
        </div>

        {/* ---- TYPE -------------------------------------------------- */}
        <div className="frame absolute inset-0 flex flex-col justify-between pb-8 pt-[calc(var(--nav-h)+2rem)] md:pb-12">
          <div className="flex items-start justify-between">
            <KMark
              data-draw
              className="ov-mark h-16 w-auto text-linen md:h-24"
              strokeWidth={1.1}
            />
            <p data-hide="fade" className="ov-note note max-w-[16ch] text-right">
              {site.region}
            </p>
          </div>

          <div className="bays items-end gap-y-8">
            <h1
              ref={title}
              data-hide="fade"
              className="ov-title display-tight col-span-6 text-h1 md:col-span-8 lg:col-span-7"
            >
              Elevating the standard of modern architecture
            </h1>

            <div className="col-span-6 flex items-end justify-between md:col-span-4 lg:col-span-5">
              <p data-hide="fade" className="ov-note note max-w-[22ch]">
                Scroll — concept, drawing, space, built form
              </p>

              <Link
                href={`/projects/${project.slug}`}
                data-hide="fade"
                className="ov-caption group block text-right"
                data-cursor="View"
              >
                <span className="note block opacity-55">Selected work</span>
                <span className="mt-1 block text-h4">{project.title}</span>
                {project.location ? (
                  <span className="note mt-1 block opacity-55">
                    {project.location}
                  </span>
                ) : null}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
