"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/animation/gsap";
import { lockScroll } from "./SmoothScroll";
import { KMark } from "./KMark";
import { nav, site } from "@/lib/site";

/**
 * Navigation.
 *
 * Three destinations, indexed like sheets in a set. The bar takes its colour
 * from whatever surface is passing beneath it, so it reads as lit by the page
 * rather than pasted on top of it.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const ref = useRef<HTMLElement>(null);
  const [tone, setTone] = useState<"light" | "dark">("light");
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Surface awareness. One ScrollTrigger per declared surface, re-created on
  // navigation. No scroll listeners, no per-frame React state.
  useGSAP(
    () => {
      const navH =
        parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue("--nav-h"),
        ) * 16 || 72;

      const sections = gsap.utils.toArray<HTMLElement>("[data-surface]");
      const triggers = sections.map((el) =>
        ScrollTrigger.create({
          trigger: el,
          start: () => `top top+=${navH * 0.5}`,
          end: () => `bottom top+=${navH * 0.5}`,
          onToggle: (self) => {
            if (!self.isActive) return;
            setTone(el.dataset.surface === "ink" ? "light" : "dark");
          },
        }),
      );

      const top = ScrollTrigger.create({
        start: 8,
        end: "max",
        onToggle: (self) => setScrolled(self.isActive),
      });

      return () => {
        triggers.forEach((t) => t.kill());
        top.kill();
      };
    },
    { dependencies: [pathname], revertOnUpdate: true },
  );

  // Close the panel on navigation, and never leave the page locked.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    lockScroll(open);
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      lockScroll(false);
    };
  }, [open]);

  const colour = open || tone === "light" ? "text-paper" : "text-ink";

  return (
    <>
      <a
        href="#main"
        className="sr-only-k focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-ink focus:px-4 focus:py-3 focus:text-paper"
      >
        Skip to content
      </a>

      <header
        ref={ref}
        className={`fixed inset-x-0 top-0 z-50 transition-colors duration-500 ${colour}`}
      >
        <div className="frame flex h-[var(--nav-h)] items-center justify-between">
          <Link
            href="/"
            aria-label={`${site.name} — home`}
            className="group flex items-center gap-3"
          >
            <KMark className="h-5 w-auto" />
            <span
              className="note hidden sm:block"
              style={{ letterSpacing: "0.22em" }}
            >
              {site.name}
            </span>
          </Link>

          <nav aria-label="Primary" className="hidden md:block">
            <ul className="flex items-baseline gap-10">
              {nav.map((item, i) => (
                <li key={item.href}>
                  <NavLink
                    href={item.href}
                    index={String(i + 1).padStart(2, "0")}
                    active={
                      pathname === item.href ||
                      pathname.startsWith(`${item.href}/`)
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="site-menu"
            className="note relative z-10 md:hidden"
            style={{ letterSpacing: "0.18em" }}
          >
            {open ? "Close" : "Menu"}
          </button>
        </div>

        {/* The datum. Draws itself across the head of the page once the
            document has moved, and is the only thing separating the bar from
            the content. */}
        <div
          aria-hidden
          className="frame pointer-events-none"
          style={{ opacity: scrolled && !open ? 1 : 0, transition: "opacity .4s" }}
        >
          <div
            className="h-px origin-left bg-current opacity-25"
            style={{
              transform: `scaleX(${scrolled && !open ? 1 : 0})`,
              transition: "transform .9s cubic-bezier(0.16,1,0.3,1)",
            }}
          />
        </div>
      </header>

      <AnimatePresence>{open ? <MenuPanel /> : null}</AnimatePresence>
    </>
  );
}

function NavLink({
  href,
  children,
  index,
  active,
}: {
  href: string;
  children: React.ReactNode;
  index: string;
  active: boolean;
}) {
  return (
    <Link href={href} className="group relative block" aria-current={active ? "page" : undefined}>
      <span className="flex items-baseline gap-1.5">
        <span
          className="note opacity-40 transition-opacity duration-300 group-hover:opacity-90"
          style={{ fontSize: "0.5625rem" }}
        >
          {index}
        </span>
        <span
          className="text-label uppercase"
          style={{ letterSpacing: "0.12em" }}
        >
          {children}
        </span>
      </span>
      {/* The rule draws from the left on approach, and stays drawn on the
          page you are on. */}
      <span
        aria-hidden
        className="absolute -bottom-1.5 left-0 block h-px w-full origin-left bg-current transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100"
        style={{ transform: active ? "scaleX(1)" : "scaleX(0)" }}
      />
    </Link>
  );
}

/** Full-viewport navigation for handheld. */
function MenuPanel() {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  return (
    <motion.div
      id="site-menu"
      ref={panelRef}
      tabIndex={-1}
      data-surface="ink"
      initial={{ clipPath: "inset(0 0 100% 0)" }}
      animate={{ clipPath: "inset(0 0 0% 0)" }}
      exit={{ clipPath: "inset(0 0 100% 0)" }}
      transition={{ duration: 0.62, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-40 flex flex-col justify-between pb-8 pt-[var(--nav-h)] outline-none md:hidden"
    >
      <nav aria-label="Primary" className="frame mt-10">
        <ul>
          {nav.map((item, i) => (
            <motion.li
              key={item.href}
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.14 + i * 0.07,
                duration: 0.7,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="rule-b"
            >
              <Link
                href={item.href}
                className="flex items-baseline justify-between py-5"
              >
                <span className="display-tight text-h2">{item.label}</span>
                <span className="note opacity-45">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </Link>
            </motion.li>
          ))}
        </ul>
      </nav>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.36, duration: 0.6 }}
        className="frame note space-y-1 opacity-60"
      >
        <p>{site.address.line1}</p>
        <p>{site.address.line2}</p>
        <p className="pt-3">
          <a href={`mailto:${site.email}`}>{site.email}</a>
        </p>
      </motion.div>
    </motion.div>
  );
}
