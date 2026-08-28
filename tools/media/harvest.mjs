/**
 * Pulls the photography off the live K Architecture site into this repository.
 *
 * This exists because the container these agents run in cannot reach
 * karchitecture.com.au — the session's egress gateway refuses the connection
 * for every client, browsers included. On any ordinary machine there is no
 * such restriction, so this script does the job there instead. It needs
 * nothing but Node 22.
 *
 *     node --experimental-strip-types tools/media/harvest.mjs
 *     node --experimental-strip-types tools/media/harvest.mjs --dry-run
 *
 * What it does:
 *
 *   1. Reads the site's sitemap to find every page.
 *   2. Matches each page against the projects in src/content/projects by
 *      title, then by slug. Nothing is guessed: a page that matches neither
 *      goes to public/images/unsorted rather than into the wrong project.
 *   3. Pulls the full-resolution original of every photograph on the page —
 *      Squarespace serves whatever width you ask for, so it asks for 2500.
 *   4. Files them into the slots the site actually declares: the hero first,
 *      then one per design feature, then the gallery, then any remainder.
 *   5. Writes a sources.json beside them recording where each file came from,
 *      so the provenance of every image on the site stays checkable.
 *
 * Then `npm run build` picks them up. No content file has to change.
 */
import { mkdir, writeFile, readdir } from "node:fs/promises";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SITE = process.env.SITE ?? "https://www.karchitecture.com.au";
const WIDTH = process.env.WIDTH ?? "2500w";
const DRY = process.argv.includes("--dry-run");

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const outRoot = join(root, "public", "images");

const UA =
  "K-Architecture-site-build/1.0 (photography import for karchitecture.com.au)";

const CDN = /https:\/\/(?:images\.squarespace-cdn\.com|static1\.squarespace\.com)\/[^\s"'\\<>]+/g;

/** Squarespace decorations that are never project photography. */
const NOT_PHOTOGRAPHY =
  /(logo|favicon|icon|avatar|placeholder|sprite|\.svg|\.gif)/i;

/**
 * The projects, read straight from the content directory.
 *
 * Their index re-exports with extensionless paths, which Node's own resolver
 * will not follow, so each leaf is imported directly. They import nothing but
 * types, which type stripping removes, so this needs no build step.
 */
async function loadProjects() {
  const dir = resolve(root, "src/content/projects");
  const found = [];
  for (const entry of (await readdir(dir)).sort()) {
    if (!entry.endsWith(".ts") || entry === "index.ts") continue;
    const module = await import(join(dir, entry));
    for (const value of Object.values(module)) {
      if (value && typeof value === "object" && "slug" in value) found.push(value);
    }
  }
  return found.sort((a, b) => a.order - b.order);
}

function log(message) {
  process.stdout.write(`${message}\n`);
}

async function get(url) {
  const response = await fetch(url, { headers: { "user-agent": UA } });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response;
}

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

/** Every page the site publishes. */
async function pages() {
  let xml;
  try {
    xml = await (await get(`${SITE}/sitemap.xml`)).text();
  } catch (error) {
    if (/\b40[37]\b|ENOTFOUND|ECONNREFUSED|fetch failed/.test(error.message)) {
      throw new Error(
        `Could not reach ${SITE} (${error.message}).\n\n` +
          "If you are running this inside a Claude Code session, that is the\n" +
          "session's egress policy refusing the connection, not the site being\n" +
          "down — no client in that container can reach it, browsers included.\n" +
          "Run this on an ordinary machine, or allow karchitecture.com.au and\n" +
          "images.squarespace-cdn.com in the environment's network policy.",
      );
    }
    throw error;
  }
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
}

/**
 * Photographs on a page, in document order.
 *
 * Squarespace puts the same image in src, data-src and several srcset
 * candidates, all of them the same file at different widths. The query string
 * is dropped so those collapse to one entry, and asked for again at full size.
 */
function photographs(html) {
  const seen = new Map();
  for (const match of html.matchAll(CDN)) {
    const raw = match[0].replace(/&amp;/g, "&");
    const base = raw.split("?")[0];
    if (NOT_PHOTOGRAPHY.test(base)) continue;
    if (!seen.has(base)) seen.set(base, `${base}?format=${WIDTH}`);
  }
  return [...seen.values()];
}

function title(html) {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  const og = html.match(
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i,
  )?.[1];
  return (h1 ?? og ?? "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

const normalise = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");

/**
 * The slots this project declares, in reading order.
 *
 * Filling the site's own structure rather than dumping a numbered pile means
 * the hero lands in the hero, and each design feature gets the photograph that
 * followed it on the original page.
 */
function slotsFor(project) {
  const slots = ["hero"];
  for (const feature of project.features ?? []) {
    if (feature.plate) slots.push(`feature-${feature.index}`);
  }
  for (let i = 0; i < (project.gallery?.length ?? 0); i++) {
    slots.push(`gallery-${String(i + 1).padStart(2, "0")}`);
  }
  return slots;
}

function extensionOf(url) {
  const match = url.split("?")[0].match(/\.(jpe?g|png|webp|avif)$/i);
  return match ? `.${match[1].toLowerCase()}` : ".jpg";
}

async function save(url, dir, name) {
  const file = join(dir, `${name}${extensionOf(url)}`);
  if (DRY) {
    log(`      would write ${file.replace(root + "/", "")}`);
    return file;
  }
  const buffer = Buffer.from(await (await get(url)).arrayBuffer());
  await mkdir(dir, { recursive: true });
  await writeFile(file, buffer);
  log(`      ${file.replace(root + "/", "")}  ${(buffer.length / 1024) | 0} KB`);
  return file;
}

async function main() {
  const projects = await loadProjects();
  log(`${projects.length} projects in this repository\n`);

  const urls = await pages();
  log(`${urls.length} pages in ${SITE}/sitemap.xml\n`);

  const byTitle = new Map(projects.map((p) => [normalise(p.title), p]));
  const bySlug = new Map(projects.map((p) => [normalise(p.slug), p]));

  const report = [];
  let matched = 0;
  let loose = 0;

  for (const url of urls) {
    let html;
    try {
      html = await (await get(url)).text();
    } catch (error) {
      log(`  ${url}\n      skipped: ${error.message}`);
      continue;
    }

    const images = photographs(html);
    if (!images.length) continue;

    const pageTitle = title(html);
    const pageSlug = url.replace(/\/$/, "").split("/").pop() ?? "";
    const project =
      byTitle.get(normalise(pageTitle)) ?? bySlug.get(normalise(pageSlug));

    log(`  ${url}`);
    log(`      "${pageTitle}" — ${images.length} photographs`);

    if (!project) {
      loose++;
      const dir = join(outRoot, "unsorted", pageSlug || "page");
      const files = [];
      for (const [i, image] of images.entries()) {
        files.push({
          slot: `unsorted/${pageSlug}/${String(i + 1).padStart(2, "0")}`,
          source: image,
          file: await save(image, dir, String(i + 1).padStart(2, "0")),
        });
        await pause(120);
      }
      report.push({ url, title: pageTitle, project: null, files });
      log(`      no project matches this page — filed under unsorted/`);
      continue;
    }

    matched++;
    const dir = join(outRoot, "projects", project.slug);
    const slots = slotsFor(project);
    const files = [];

    for (const [i, image] of images.entries()) {
      const name = slots[i] ?? `extra-${String(i - slots.length + 1).padStart(2, "0")}`;
      files.push({
        slot: `${project.slug}/${name}`,
        source: image,
        file: await save(image, dir, name),
      });
      await pause(120);
    }

    report.push({ url, title: pageTitle, project: project.slug, files });
    if (images.length < slots.length) {
      log(`      ${slots.length - images.length} slots left to compose`);
    }
  }

  if (!DRY) {
    await mkdir(outRoot, { recursive: true });
    await writeFile(
      join(outRoot, "sources.json"),
      JSON.stringify(
        { site: SITE, harvested: new Date().toISOString(), pages: report },
        null,
        2,
      ) + "\n",
    );
  }

  const total = report.reduce((n, page) => n + page.files.length, 0);
  log(
    `\n${total} photographs — ${matched} pages matched a project, ${loose} filed under unsorted.`,
  );
  log(DRY ? "Dry run: nothing written." : "Now run: npm run build");
}

await main();
