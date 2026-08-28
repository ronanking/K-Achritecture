import { projects } from "@/content/projects";
import { attachMedia } from "@/lib/media";
import { categories } from "./categories";
import type { CategoryId, Project } from "./types";

export * from "./types";
export { categories, categoryById, categoryTitle } from "./categories";

/**
 * The schedule, in sheet order, with any supplied photography attached.
 *
 * Resolving media here rather than in the content files means the archive can
 * arrive in pieces: a project with photographs shows them, a project without
 * shows composed plates, and no component has to care which it is holding.
 */
export const allProjects: Project[] = [...projects]
  .sort((a, b) => a.order - b.order)
  .map(attachMedia);

/** Sheet reference, e.g. "01". Derived from position, never stored. */
export function sheetRef(project: Project): string {
  const i = allProjects.findIndex((p) => p.slug === project.slug);
  return String(i + 1).padStart(2, "0");
}

export function getProject(slug: string): Project | undefined {
  return allProjects.find((p) => p.slug === slug);
}

export const featuredProjects: Project[] = allProjects.filter((p) => p.featured);

export function projectsInCategory(id: CategoryId): Project[] {
  return allProjects.filter((p) => p.category === id);
}

/**
 * Categories with their occupancy. Divisions the practice works in are always
 * listed — a division with nothing published yet is shown at zero rather than
 * hidden, because the absence of a published project is not the absence of the
 * capability.
 */
export function categoryCounts() {
  return categories.map((c) => ({
    ...c,
    count: projectsInCategory(c.id).length,
  }));
}

/**
 * The project that follows this one. Prefers the next in the same division so
 * that browsing keeps its thread, and falls back to the next in the schedule.
 * Wraps, so the archive never dead-ends.
 */
export function nextProject(slug: string): Project {
  const i = allProjects.findIndex((p) => p.slug === slug);
  const current = allProjects[i];

  const sameCategory = allProjects.filter(
    (p) => p.category === current.category && p.slug !== slug,
  );
  const laterInCategory = sameCategory.find((p) => p.order > current.order);

  return (
    laterInCategory ??
    sameCategory[0] ??
    allProjects[(i + 1) % allProjects.length]
  );
}

/** Every plate a project owns, in reading order. Used for preloading budgets. */
export function projectPlates(project: Project) {
  return [
    project.hero,
    ...(project.features?.map((f) => f.plate) ?? []),
    ...(project.gallery ?? []),
  ].filter(Boolean);
}
