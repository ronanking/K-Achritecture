"use client";

import { useRef } from "react";
import Link from "next/link";
import { gsap, useGSAP, mq } from "@/lib/animation/gsap";
import { Plate } from "@/components/media/Plate";
import { Reveal } from "@/components/typography/Reveal";
import { site } from "@/lib/site";

/**
 * The close.
 *
 * The page ends the way it opened — on a building, at full size — rather than
 * on a paragraph. The contact details are set small against it, because a
 * closing frame should be an invitation to look, not a page of instructions.
 */
export function Coda() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(mq.motion, () => {
        const tw = gsap.fromTo(
          "[data-coda-media]",
          { yPercent: -8, scale: 1.08 },
          {
            yPercent: 0,
            scale: 1,
            ease: "none",
            scrollTrigger: {
              trigger: root.current,
              start: "top bottom",
              end: "bottom bottom",
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
      data-surface="ink"
      aria-labelledby="coda-heading"
      className="relative min-h-[92svh] overflow-hidden"
    >
      <div
        data-coda-media
        className="absolute inset-0 will-change-transform"
        aria-hidden
      >
        <Plate
          plate={{
            alt: "A K Architecture house at dusk, light coming from within.",
            aspect: 16 / 9,
            tone: "shadow",
          }}
          fill
          sizes="100vw"
        />
      </div>

      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, rgba(11,11,11,.9) 0%, rgba(11,11,11,.35) 55%, rgba(11,11,11,.55) 100%)",
        }}
      />

      <div className="frame relative flex min-h-[92svh] flex-col justify-between py-10 md:py-14">
        <div className="rule-b flex items-baseline justify-between pb-3">
          <p className="note opacity-55">03 — Enquiries</p>
          <p className="note opacity-55">{site.region}</p>
        </div>

        <div>
          <Reveal as="h2" className="display-tight max-w-[12ch] text-h1">
            <span id="coda-heading">Tell us about the site.</span>
          </Reveal>

          <div className="bays mt-10 items-end gap-y-6 md:mt-14">
            <div className="col-span-6 md:col-span-5">
              <Link
                href="/contact"
                className="group inline-flex items-baseline gap-4"
                data-cursor="Enquire"
              >
                <span className="display-tight text-h3">Start an enquiry</span>
                <span
                  aria-hidden
                  className="block h-px w-14 origin-left bg-current transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-150"
                />
              </Link>
            </div>

            <div className="col-span-6 md:col-span-4 md:col-start-9">
              <ul className="note space-y-1 opacity-65">
                <li>
                  <a className="hover:opacity-100" href={`mailto:${site.email}`}>
                    {site.email}
                  </a>
                </li>
                <li>
                  <a
                    className="hover:opacity-100"
                    href={`tel:${site.phoneHref}`}
                  >
                    {site.phone}
                  </a>
                </li>
                <li className="pt-2">{site.address.line1}</li>
                <li>{site.address.line2}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
