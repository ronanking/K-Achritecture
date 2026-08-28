import { mediaManifest } from "@/content/media-manifest";
import type { Plate, Project } from "@/lib/projects/types";

/**
 * Photographs, when there are photographs.
 *
 * Every plate on the site has a slot — a stable name derived from where it
 * sits, like "the-corso/hero" or "home/coda". If a file has been supplied at
 * that slot the plate shows it; if not, the plate is composed instead. No
 * content file names an image path, so supplying the archive is a matter of
 * dropping files into public/images and rebuilding, and a half-supplied
 * archive renders as a finished page rather than as a page with holes in it.
 *
 * See public/images/README.md for the slot names.
 */

export function mediaFor(slot: string | undefined): string | undefined {
  return slot ? mediaManifest[slot] : undefined;
}

/** Two digits, so a directory listing sorts the way the page reads. */
function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function fill(plate: Plate, slot: string): Plate {
  const src = plate.src ?? mediaManifest[slot];
  return src ? { ...plate, src } : plate;
}

/**
 * Resolves every plate a project owns against the manifest.
 *
 * Done once, where the projects are assembled, so no component has to know
 * that photography is optional — by the time a plate reaches the page it
 * either has a file or it does not, and the media component handles both.
 */
export function attachMedia(project: Project): Project {
  const slug = project.slug;

  return {
    ...project,
    hero: fill(project.hero, `${slug}/hero`),
    features: project.features?.map((feature) =>
      feature.plate
        ? { ...feature, plate: fill(feature.plate, `${slug}/feature-${feature.index}`) }
        : feature,
    ),
    gallery: project.gallery?.map((plate, i) =>
      fill(plate, `${slug}/gallery-${pad(i + 1)}`),
    ),
    drawings: project.drawings?.map((drawing, i) =>
      drawing.resolvesTo
        ? {
            ...drawing,
            resolvesTo: fill(drawing.resolvesTo, `${slug}/drawing-${pad(i + 1)}`),
          }
        : drawing,
    ),
  };
}
