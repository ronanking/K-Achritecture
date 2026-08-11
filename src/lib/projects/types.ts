/**
 * Project schema.
 *
 * One shape describes every project. Almost every field is optional, because
 * the archive of a working practice is uneven: some projects have drawings,
 * some have a builder credit, some have nothing but a name and a suburb. The
 * renderer is required to look composed in all of those cases, so absence is
 * modelled here as a first-class state rather than an error.
 */

export type CategoryId =
  | "new-homes-and-renovations"
  | "townhouses"
  | "multi-residential"
  | "fit-outs";

export interface Category {
  id: CategoryId;
  /** Full name, as the practice uses it. */
  title: string;
  /** Short form for tight interface positions. */
  short: string;
  /** One line describing the work. Used on the index and in metadata. */
  blurb: string;
}

/**
 * How a plate sits in the composition.
 *
 *   full   — edge to edge, the full viewport
 *   wide   — full measure inside the sheet margin
 *   inset  — offset, occupying part of the grid
 *   tall   — a portrait plate, held to one side
 *   pair   — sits beside the plate that follows it
 */
export type PlateLayout = "full" | "wide" | "inset" | "tall" | "pair";

/** Tonal value of a plate, used to keep rhythm when a photograph is pending. */
export type PlateTone = "shadow" | "mid" | "light";

export interface Plate {
  /**
   * Path under /public. Left undefined when the photograph has not been
   * supplied — the media component draws a measured placeholder in its place
   * so the composition, aspect ratio and scroll choreography are all correct
   * the moment the real file lands at this path.
   */
  src?: string;
  /** Always required. Written for someone who cannot see the photograph. */
  alt: string;
  /** width ÷ height. Reserved up front so nothing ever shifts on load. */
  aspect: number;
  layout?: PlateLayout;
  caption?: string;
  tone?: PlateTone;
  /** Credit for this specific frame, where it differs from the project. */
  photographer?: string;
}

/**
 * A piece of the project's design logic, shown as its own moment in the page
 * rather than buried in a paragraph.
 */
export interface ProjectFeature {
  /** Sheet reference, e.g. "01". */
  index: string;
  headline: string;
  body?: string;
  plate?: Plate;
}

export type DrawingKind =
  | "plan"
  | "elevation"
  | "section"
  | "site"
  | "detail"
  | "sketch";

/**
 * A drawing, and optionally the photograph it resolves into.
 *
 * The drawing → reality sequence only runs when `paths` are present. No
 * drawings have been fabricated for this site; the system is built and idle,
 * waiting for the studio's own DWG/PDF exports to be traced to SVG.
 */
export interface Drawing {
  kind: DrawingKind;
  title: string;
  /** viewBox of the SVG the paths are drawn in, e.g. "0 0 1200 800". */
  viewBox?: string;
  /** Ordered `d` attributes. Drawn on in sequence, as if by hand. */
  paths?: string[];
  /** The photograph the drawing dissolves into. */
  resolvesTo?: Plate;
  caption?: string;
}

export interface Credit {
  role: string;
  name: string;
  href?: string;
}

export interface Statistic {
  label: string;
  value: string;
}

export interface Award {
  title: string;
  body: string;
  year: string;
}

export interface Model {
  /** Path to a .glb under /public/models. */
  src: string;
  poster?: Plate;
  /** Named states the viewer can isolate: roof, upper, ground, site. */
  layers?: string[];
}

export interface Project {
  slug: string;
  title: string;
  /** Optional second line, e.g. a house name or building type. */
  subtitle?: string;
  category: CategoryId;
  /** Suburb or locality only. Street addresses of private homes are never published. */
  location?: string;
  year?: string;
  status?: "Completed" | "Under construction" | "In design" | "Proposed";

  /** One or two lines. Used on the index, in cards, and as the meta description. */
  summary?: string;
  /** Long-form description, one string per paragraph. */
  description?: string[];

  hero: Plate;
  gallery?: Plate[];
  features?: ProjectFeature[];
  drawings?: Drawing[];

  materials?: string[];
  credits?: Credit[];
  statistics?: Statistic[];
  awards?: Award[];
  video?: { src: string; poster?: Plate };
  model?: Model;

  /** Promoted to the homepage sequence. */
  featured?: boolean;
  /** Position in the drawing schedule. Lower numbers come first. */
  order: number;
}
