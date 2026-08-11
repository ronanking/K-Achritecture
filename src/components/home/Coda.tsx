"use client";

import { useRef } from "react";
import Link from "next/link";
import { gsap, useGSAP, mq } from "@/lib/animation/gsap";
import { Reveal } from "@/components/typography/Reveal";
import { site } from "@/lib/site";

/**
 * The horizon.
 *
 * The datum that opened the site — a line struck across an empty sheet —
 * returns here as the thing it was always going to become on this coast.
 * It rises a little as the page ends, which is the only parallax on the
 * homepage that moves something the reader can actually see.
 */
export function Coda() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(mq.motion, () => {
        const tw = gsap.fromTo(
          "[data-horizon]",
          { yPercent: 46, scaleX: 0.72 },
          {
            yPercent: 0,
            scaleX: 1,
            ease: "none",
            scrollTrigger: {
              trigger: root.current,
              start: "top bottom",
              end: "center center",
              scrub: 0.5,
            },
          },
        );
        return () => tw.scrollTrigger?.kill();
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      data-surface="paper"
      aria-labelledby="coda-heading"
      className="relative overflow-hidden"
    >
      <div className="frame relative flex min-h-[86svh] flex-col justify-between py-20 md:py-28">
        <div
          aria-hidden
          data-horizon
          className="pointer-events-none absolute inset-x-0 top-1/2 h-px origin-center bg-ink/20"
        />

        <div className="bays relative">
          <p className="note col-span-3 opacity-45 md:col-span-2">
            03 — Enquiries
          </p>
        </div>

        <div className="relative">
          <Reveal
            as="h2"
            className="display-tight max-w-[13ch] text-h1"
          >
            <span id="coda-heading">Tell us about the site.</span>
          </Reveal>

          <div className="bays mt-12 items-end gap-y-8 md:mt-16">
            <div className="col-span-6 md:col-span-5">
              <p className="text-body opacity-70">
                New homes, renovations, townhouses, apartment buildings and
                interior fit-outs — across the Sunshine Coast and beyond.
              </p>
            </div>

            <div className="col-span-6 md:col-span-4">
              <ul className="space-y-1 text-body">
                <li>
                  <a
                    className="underline-offset-4 hover:underline"
                    href={`mailto:${site.email}`}
                  >
                    {site.email}
                  </a>
                </li>
                <li>
                  <a
                    className="underline-offset-4 hover:underline"
                    href={`tel:${site.phoneHref}`}
                  >
                    {site.phone}
                  </a>
                </li>
                <li className="pt-3 opacity-60">{site.address.line1}</li>
                <li className="opacity-60">{site.address.line2}</li>
              </ul>
            </div>

            <div className="col-span-6 md:col-span-3 md:justify-self-end">
              <Link
                href="/contact"
                className="group inline-flex items-baseline gap-4"
                data-cursor="Enquire"
              >
                <span className="text-h4">Start an enquiry</span>
                <span
                  aria-hidden
                  className="block h-px w-12 origin-left bg-current transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-150"
                />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
