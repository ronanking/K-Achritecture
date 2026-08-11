"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";

/**
 * Single registration point for GSAP.
 *
 * Registering in one module guarantees the plugins are attached exactly once
 * regardless of how many components import them, and keeps registration out of
 * component bodies where React Strict Mode would run it twice.
 */
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);

  // Lenis drives the ticker. Lag smoothing would let GSAP invent frames that
  // Lenis never scrolled through, which desynchronises scrubbed timelines.
  gsap.ticker.lagSmoothing(0);
}

/**
 * Named easings, so that motion vocabulary is consistent across the site and
 * mirrors the CSS custom properties in globals.css.
 *
 *   datum   — the long settled arrival. Reveals, entrances, sequences.
 *   set     — the short deliberate move. Interface feedback.
 *   section — symmetrical. Used when something travels across the page.
 */
export const ease = {
  datum: "expo.out",
  set: "power3.out",
  section: "power2.inOut",
  linear: "none",
} as const;

/**
 * Duration vocabulary, in seconds. Kept small and reused so that nothing on
 * the site moves at an arbitrary speed.
 */
export const dur = {
  tap: 0.24,
  set: 0.45,
  reveal: 0.9,
  sequence: 1.4,
} as const;

/**
 * Breakpoints, shared by every gsap.matchMedia() in the site so that a section
 * cannot quietly disagree with the CSS about what "desktop" means.
 */
export const mq = {
  handheld: "(max-width: 47.999rem)",
  tablet: "(min-width: 48rem) and (max-width: 79.999rem)",
  desktop: "(min-width: 48rem)",
  large: "(min-width: 80rem)",
  motion: "(prefers-reduced-motion: no-preference)",
  reduced: "(prefers-reduced-motion: reduce)",
} as const;

export { gsap, ScrollTrigger, SplitText, useGSAP };
