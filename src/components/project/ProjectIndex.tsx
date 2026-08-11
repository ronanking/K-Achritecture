"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { gsap, useGSAP, mq } from "@/lib/animation/gsap";
import { Plate } from "@/components/media/Plate";
import { usePlateTransition } from "@/components/layout/PlateTransition";
import { categoryTitle } from "@/lib/projects/categories";
import type { Category, CategoryId, Project } from "@/lib/projects/types";

/**
 * The index, as a drawing schedule.
 *
 * Rows are numbered sheets. Moving down them changes what is held in the frame
 * beside the list: the plate wipes rather than fades, because a sheet is
 * replaced, not dissolved.
 *
 * Nothing here depends on hover. On a touch screen the list carries its own
 * plates inline and the frame is not rendered at all, so the page is not a
 * desktop interaction with the interaction removed.
 */

type Division = Category & { count: number };

export function ProjectIndex({
  projects,
  divisions,
}: {
  projects: Project[];
  divisions: Division[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const { expand } = usePlateTransition();

  const raw = params.get("division");
  const active: CategoryId | "all" =
    raw && divisions.some((d) => d.id === raw) ? (raw as CategoryId) : "all";

  const visible =
    active === "all" ? projects : projects.filter((p) => p.category === active);

  const [hovered, setHovered] = useState(0);
  const frameRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const setDivision = useCallback(
    (id: CategoryId | "all") => {
      setHovered(0);
      const qs = id === "all" ? "" : `?division=${id}`;
      router.replace(`/projects${qs}`, { scroll: false });
    },
    [router],
  );

  // The plate in the frame wipes to the next one. GSAP owns the wipe; Motion
  // owns the list. They never touch the same element.
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(`${mq.desktop} and ${mq.motion}`, () => {
        const tw = gsap.fromTo(
          `[data-preview="${hovered}"]`,
          { clipPath: "inset(0% 0% 100% 0%)" },
          {
            clipPath: "inset(0% 0% 0% 0%)",
            duration: 0.72,
            ease: "expo.out",
            overwrite: "auto",
          },
        );
        return () => {
          tw.kill();
        };
      });
      return () => mm.revert();
    },
    { scope: frameRef, dependencies: [hovered, active] },
  );

  const current = visible[hovered] ?? visible[0];

  const open = (e: React.MouseEvent, project: Project) => {
    const frame = frameRef.current;
    // Only take over the navigation when there is a frame to grow from.
    if (!frame || window.innerWidth < 768) return;
    e.preventDefault();
    expand(frame, project.hero, `/projects/${project.slug}`);
  };

  return (
    <div className="frame">
      {/* ---- Divisions ------------------------------------------------ */}
      <nav aria-label="Filter by division" className="rule-b rule-t py-4">
        <ul className="-mx-2 flex flex-wrap items-center gap-x-1 gap-y-2">
          <FilterTab
            active={active === "all"}
            count={projects.length}
            onClick={() => setDivision("all")}
          >
            All work
          </FilterTab>
          {divisions.map((d) => (
            <FilterTab
              key={d.id}
              active={active === d.id}
              count={d.count}
              disabled={d.count === 0}
              onClick={() => setDivision(d.id)}
            >
              {d.title}
            </FilterTab>
          ))}
        </ul>
      </nav>

      <div className="bays items-start">
        {/* ---- Schedule ---------------------------------------------- */}
        <div ref={listRef} className="col-span-6 md:col-span-7">
          <AnimatePresence mode="wait" initial={false}>
            <motion.ul
              key={active}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              {visible.map((project, i) => (
                <motion.li
                  key={project.slug}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: i * 0.035,
                    duration: 0.55,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="rule-b"
                  onMouseEnter={() => setHovered(i)}
                  onFocus={() => setHovered(i)}
                >
                  <Link
                    href={`/projects/${project.slug}`}
                    onClick={(e) => open(e, project)}
                    data-cursor="View"
                    className="group block py-6 transition-opacity duration-300 md:py-8"
                  >
                    <div className="flex items-baseline gap-4 md:gap-6">
                      <span className="note w-8 shrink-0 opacity-40">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="display-tight block text-h3 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] md:group-hover:translate-x-2">
                          {project.title}
                        </span>
                        <span className="note mt-2 block opacity-50">
                          {[
                            project.location,
                            categoryTitle(project.category),
                            project.year,
                          ]
                            .filter(Boolean)
                            .join("  ·  ")}
                        </span>
                      </span>
                    </div>

                    {/* Handheld carries its own plate. */}
                    <div className="mt-5 md:hidden">
                      <Plate
                        plate={project.hero}
                        sizes="100vw"
                        reference={`KA · ${String(i + 1).padStart(2, "0")}`}
                      />
                    </div>
                  </Link>
                </motion.li>
              ))}
            </motion.ul>
          </AnimatePresence>

          {visible.length === 0 ? (
            <p className="py-16 text-body opacity-60">
              No projects published in this division yet.
            </p>
          ) : null}
        </div>

        {/* ---- Frame -------------------------------------------------- */}
        <div className="hidden md:col-span-5 md:block">
          <div className="sticky top-[calc(var(--nav-h)+2rem)]">
            <div
              ref={frameRef}
              className="relative overflow-hidden"
              style={{ aspectRatio: "4 / 3" }}
            >
              {visible.map((project, i) => (
                <div
                  key={project.slug}
                  data-preview={i}
                  className="absolute inset-0"
                  style={{
                    zIndex: i === hovered ? 2 : 1,
                    visibility:
                      Math.abs(i - hovered) <= 1 ? "visible" : "hidden",
                  }}
                >
                  <Plate
                    plate={project.hero}
                    fill
                    sizes="(min-width: 80rem) 40vw, 45vw"
                    reference={`KA · ${String(i + 1).padStart(2, "0")}`}
                  />
                </div>
              ))}
            </div>

            {current ? (
              <div className="rule-t mt-4 flex items-baseline justify-between pt-3">
                <p className="note opacity-55">{current.title}</p>
                <p className="note opacity-40">
                  {current.status ?? categoryTitle(current.category)}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterTab({
  children,
  count,
  active,
  disabled = false,
  onClick,
}: {
  children: React.ReactNode;
  count: number;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-pressed={active}
        className={`note relative px-2 py-1.5 transition-opacity duration-300 ${
          disabled
            ? "cursor-default opacity-25"
            : active
              ? "opacity-100"
              : "opacity-50 hover:opacity-85"
        }`}
      >
        <span>{children}</span>
        <span className="ml-1.5 opacity-55">
          {String(count).padStart(2, "0")}
        </span>
        {active ? (
          <motion.span
            layoutId="division-rule"
            className="absolute inset-x-2 -bottom-0.5 block h-px bg-oxide"
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          />
        ) : null}
      </button>
    </li>
  );
}
