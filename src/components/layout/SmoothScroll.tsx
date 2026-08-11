"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import { gsap, ScrollTrigger } from "@/lib/animation/gsap";

/**
 * One scroll system.
 *
 * Lenis owns the scroll position. GSAP's ticker owns the clock. ScrollTrigger
 * is told to update from Lenis rather than from its own listener. Getting this
 * wrong produces two competing loops and scrubbed animation that lags a frame
 * behind the pointer, which is the single most common way a "smooth scrolling"
 * site ends up feeling worse than a plain one.
 *
 * The smoothing is deliberately short. Scroll should feel resolved, not
 * slippery — the page settles, it does not glide.
 */

let lenis: Lenis | null = null;

export function getLenis(): Lenis | null {
  return lenis;
}

/** Hold the page still while a full-viewport panel is open. */
export function lockScroll(locked: boolean) {
  if (lenis) {
    if (locked) lenis.stop();
    else lenis.start();
  }
  // Reduced-motion and some touch contexts run without Lenis.
  document.body.style.overflow = locked && !lenis ? "hidden" : "";
  document.documentElement.classList.toggle("lenis-stopped", locked);
}

export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduced.matches) return;

    const instance = new Lenis({
      // Short. The page settles rather than glides.
      duration: 0.9,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      // Native scrolling on touch. Synthesised touch scroll always reads as
      // laggy on a phone, and mobile browsers already do this well.
      syncTouch: false,
      touchMultiplier: 1.5,
      // GSAP's ticker drives the frame, not Lenis's own loop.
      autoRaf: false,
    });
    lenis = instance;

    instance.on("scroll", ScrollTrigger.update);

    const tick = (time: number) => instance.raf(time * 1000);
    gsap.ticker.add(tick);

    // Web fonts change line boxes, which changes every scroll distance on the
    // page. Measure again once they have landed.
    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled) ScrollTrigger.refresh();
    });

    return () => {
      cancelled = true;
      gsap.ticker.remove(tick);
      instance.destroy();
      lenis = null;
    };
  }, []);

  // Route changes: land at the top of the new page immediately — a smooth
  // scroll to the top on navigation is a delay, not a flourish — then let the
  // new document lay out before ScrollTrigger measures it.
  useEffect(() => {
    if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
    else window.scrollTo(0, 0);

    const raf = requestAnimationFrame(() => {
      ScrollTrigger.refresh();
    });
    return () => cancelAnimationFrame(raf);
  }, [pathname]);

  return <>{children}</>;
}
