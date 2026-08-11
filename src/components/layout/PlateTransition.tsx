"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Plate } from "@/components/media/Plate";
import type { Plate as PlateData } from "@/lib/projects/types";

/**
 * Continuity between the index and the project.
 *
 * Clicking a project does not cut to a new page — the plate you were looking
 * at grows to fill the viewport and the project's hero arrives underneath it,
 * so the image never leaves the screen. Navigation is issued immediately;
 * the animation runs over the top of the load rather than in front of it, so
 * nothing here delays the router.
 *
 * Motion owns this overlay exclusively. No GSAP timeline touches it.
 */

type Ctx = {
  expand: (from: HTMLElement, plate: PlateData, href: string) => void;
  active: boolean;
};

const PlateTransitionContext = createContext<Ctx>({
  expand: () => {},
  active: false,
});

export const usePlateTransition = () => useContext(PlateTransitionContext);

type State = {
  rect: { top: number; left: number; width: number; height: number };
  plate: PlateData;
  href: string;
} | null;

export function PlateTransitionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const [state, setState] = useState<State>(null);
  const target = useRef<string | null>(null);

  const expand = useCallback(
    (from: HTMLElement, plate: PlateData, href: string) => {
      if (reduced) {
        router.push(href);
        return;
      }
      const r = from.getBoundingClientRect();
      target.current = href;
      setState({
        rect: { top: r.top, left: r.left, width: r.width, height: r.height },
        plate,
        href,
      });
      router.push(href);
    },
    [reduced, router],
  );

  // Release once the destination has committed. A ceiling keeps a slow load
  // from stranding the overlay on screen.
  useEffect(() => {
    if (!state) return;
    const arrived = pathname === target.current;
    const delay = arrived ? 420 : 2600;
    const id = setTimeout(() => setState(null), delay);
    return () => clearTimeout(id);
  }, [state, pathname]);

  return (
    <PlateTransitionContext.Provider value={{ expand, active: !!state }}>
      {children}
      <AnimatePresence>
        {state ? (
          <motion.div
            key="plate-transition"
            className="pointer-events-none fixed inset-0 z-[70]"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          >
            <motion.div
              className="absolute overflow-hidden"
              initial={{
                top: state.rect.top,
                left: state.rect.left,
                width: state.rect.width,
                height: state.rect.height,
              }}
              animate={{
                top: 0,
                left: 0,
                width: "100vw",
                height: "100svh",
              }}
              transition={{ duration: 0.72, ease: [0.16, 1, 0.3, 1] }}
            >
              <Plate plate={state.plate} fill sizes="100vw" />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </PlateTransitionContext.Provider>
  );
}

/**
 * Arrival.
 *
 * A sheet retracts off the page on every navigation after the first. The
 * first load is left alone — the fastest possible first paint matters more
 * than a flourish nobody asked for.
 */
let hasMounted = false;

export function ArrivalSheet() {
  const pathname = usePathname();
  const { active } = usePlateTransition();
  // Read at render time, written after the first commit. The opening page load
  // must not wait behind a curtain it did not ask for.
  const isFirstLoad = !hasMounted;

  useEffect(() => {
    hasMounted = true;
  }, []);

  if (isFirstLoad || active) return null;

  return (
    <motion.div
      key={pathname}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[65] origin-top bg-ink"
      initial={{ scaleY: 1 }}
      animate={{ scaleY: 0 }}
      transition={{ duration: 0.62, ease: [0.76, 0, 0.24, 1] }}
    />
  );
}
