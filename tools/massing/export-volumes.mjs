/**
 * Hands the massing volumes to Blender.
 *
 * The volumes live in the project content and nowhere else — the site reads
 * them, the flat axonometric projects them, and the Blender script models
 * them. This script is the only bridge between the TypeScript and the Python,
 * so the model can never quietly disagree with the page about what it shows.
 *
 *   node --experimental-strip-types tools/massing/export-volumes.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");

const { theCorso } = await import(
  resolve(root, "src/content/projects/the-corso.ts")
);

if (!theCorso.massing) {
  throw new Error("the-corso has no massing block to export");
}

const out = {
  slug: theCorso.slug,
  title: theCorso.title,
  basis: theCorso.massing.basis,
  volumes: theCorso.massing.volumes,
};

const target = resolve(here, "the-corso.json");
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, JSON.stringify(out, null, 2) + "\n");

console.log(
  `${out.volumes.length} volumes -> ${target.replace(root + "/", "")}`,
);
