import type { Project } from "@/lib/projects/types";

import { wallumburn } from "./wallumburn";
import { jamesOnToowayCreek } from "./james-on-tooway-creek";
import { theCorso } from "./the-corso";
import { theMillwell } from "./the-millwell";
import { marketLaneResidences } from "./market-lane-residences";
import { socoApartments } from "./soco-apartments";
import { riviera } from "./riviera";
import { cove } from "./cove";
import { richardHenry } from "./richard-henry";

/**
 * The archive.
 *
 * To add a project: write one file in this directory against the `Project`
 * type, import it here, and add it to the array. Everything else — the index,
 * the filters, routing, metadata, the sitemap, the next-project sequence —
 * is derived.
 */
export const projects: Project[] = [
  wallumburn,
  jamesOnToowayCreek,
  theCorso,
  theMillwell,
  marketLaneResidences,
  socoApartments,
  riviera,
  cove,
  richardHenry,
];
