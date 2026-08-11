import type { Category, CategoryId } from "./types";

/**
 * The practice's own divisions of work.
 *
 * Ordered from the most intimate scale to the most urban — the index reads as
 * a progression rather than a menu.
 */
export const categories: Category[] = [
  {
    id: "new-homes-and-renovations",
    title: "New Homes & Renovations",
    short: "Homes",
    blurb:
      "Thoughtfully crafted and budget conscious designs which are both beautiful and practical.",
  },
  {
    id: "townhouses",
    title: "Townhouses",
    short: "Townhouses",
    blurb:
      "Small-scale attached housing, planned for privacy, aspect and the street it belongs to.",
  },
  {
    id: "multi-residential",
    title: "Multi-residential",
    short: "Multi-residential",
    blurb:
      "Mixed use and apartment projects, from boutique residences to buildings that shape a city block.",
  },
  {
    id: "fit-outs",
    title: "Fit-outs",
    short: "Fit-outs",
    blurb:
      "Detailed interior design for existing apartments, commercial offices and retail spaces.",
  },
];

export const categoryById = new Map<CategoryId, Category>(
  categories.map((c) => [c.id, c]),
);

export function categoryTitle(id: CategoryId): string {
  return categoryById.get(id)?.title ?? id;
}
