"use client";

import { useRef } from "react";
import { gsap, SplitText, useGSAP, ease, mq } from "@/lib/animation/gsap";

type Tag = "p" | "h1" | "h2" | "h3" | "h4" | "div" | "span" | "blockquote";

export interface RevealProps {
  children: React.ReactNode;
  as?: Tag;
  className?: string;
  /** Play on mount instead of on scroll. For content already in view. */
  immediate?: boolean;
  delay?: number;
  stagger?: number;
  /** ScrollTrigger start. Defaults to entering the lower third. */
  start?: string;
}

/**
 * Line-by-line reveal.
 *
 * Type rises out of a mask the way a sheet is drawn out from behind another —
 * the only text animation used on the site, applied sparingly. GSAP owns
 * transform and opacity on these elements; nothing else may touch them.
 *
 * The split is reverted the moment the reveal finishes, so the text goes back
 * to being ordinary reflowing markup and cannot break on resize.
 */
export function Reveal({
  children,
  as: Tag = "div",
  className = "",
  immediate = false,
  delay = 0,
  stagger = 0.075,
  start = "top 82%",
}: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;

      const mm = gsap.matchMedia();

      mm.add(mq.motion, () => {
        let played = false;

        const split = new SplitText(el, {
          type: "lines",
          mask: "lines",
          autoSplit: true,
          onSplit(self) {
            // Once the reveal has run, re-splits (resize, late font load) must
            // not hide the text again.
            if (played) return;

            return gsap
              .timeline({
                delay,
                scrollTrigger: immediate
                  ? undefined
                  : { trigger: el, start, once: true },
                onComplete: () => {
                  played = true;
                  split.revert();
                  gsap.set(el, { clearProps: "opacity" });
                },
              })
              .set(el, { opacity: 1 })
              .from(self.lines, {
                yPercent: 112,
                duration: 1.05,
                ease: ease.datum,
                stagger,
              });
          },
        });

        return () => split.revert();
      });

      // Reduced motion: the CSS pre-hide is never applied, so there is nothing
      // to undo — the text is simply there.

      return () => mm.revert();
    },
    { scope: ref },
  );

  const Component = Tag as React.ElementType;

  return (
    <Component
      // Pre-hidden only when the document has confirmed it will animate, so
      // there is no flash and no dependence on JavaScript for legibility.
      data-reveal="fade"
      ref={ref}
      className={className}
    >
      {children}
    </Component>
  );
}
