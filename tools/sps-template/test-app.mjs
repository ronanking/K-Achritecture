/* Drive the whole app in a real browser: create a station, fill it in, take
 * photos, generate the report, reload, then pull the plug and check it still
 * works offline.
 *
 * Playwright is not a dependency of this site, so install it just for this:
 *
 *     npm i --no-save playwright && npx playwright install chromium
 *     node tools/sps-template/test-app.mjs
 *
 * Set PW_CHROMIUM to point at an existing Chromium build instead.
 *
 * By default it serves public/sps itself. Set SPS_URL to test a real
 * deployment instead — including a non-canonical URL, which is exactly how
 * the missing-trailing-slash bug got through the first time:
 *
 *     SPS_URL=http://localhost:3000/sps node tools/sps-template/test-app.mjs
 */
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../../public/sps");
const OUT = resolve(HERE, "../../.sps-test/app");
await mkdir(OUT, { recursive: true });

const TYPES = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".png": "image/png", ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

const server = createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (path === "/" || path.endsWith("/")) path += "index.html";
  const file = resolve(join(ROOT, path));
  if (!file.startsWith(ROOT) || !existsSync(file)) {
    res.writeHead(404).end("nope");
    return;
  }
  res.writeHead(200, {
    "content-type": TYPES[extname(file)] || "application/octet-stream",
    "service-worker-allowed": "/",
  });
  res.end(await readFile(file));
});
const target = process.env.SPS_URL;
if (!target) await new Promise((r) => server.listen(0, r));
const origin = target || `http://localhost:${server.address().port}`;
console.log(`target: ${origin}${target ? " (external)" : " (local static server)"}`);

const browser = await chromium.launch({
  executablePath: process.env.PW_CHROMIUM || undefined,
  args: ["--no-sandbox"],
});
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },       // iPhone 14 Pro
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  acceptDownloads: true,
});
const page = await context.newPage();

const problems = [];
page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
page.on("console", (m) => {
  if (m.type() === "error") problems.push(`console: ${m.text()}`);
});

const step = async (name, fn) => {
  process.stdout.write(`  ${name} … `);
  try {
    await fn();
    console.log("ok");
  } catch (e) {
    console.log("FAILED");
    problems.push(`${name}: ${e.message}`);
    await page.screenshot({ path: join(OUT, `fail-${name.replace(/\W+/g, "-")}.png`) });
  }
};

console.log("running e2e");

await page.goto(target ? origin : `${origin}/`, { waitUntil: "networkidle" });

await step("empty state renders", async () => {
  await page.getByText("Nothing captured yet").waitFor({ timeout: 5000 });
  // Styles and scripts have to have resolved. Served one directory up — at
  // /sps instead of /sps/ — every relative asset 404s and the page renders as
  // naked markup that still contains all the right words.
  const styled = await page.evaluate(() => {
    const bar = document.querySelector(".topbar");
    return bar ? getComputedStyle(bar).display : "no topbar";
  });
  if (styled !== "flex") throw new Error(`stylesheet did not load (topbar display: ${styled})`);
  const hiddenInput = await page.evaluate(() => {
    const el = document.getElementById("camera");
    return el ? getComputedStyle(el).position : "missing";
  });
  if (hiddenInput !== "absolute") throw new Error("file pickers are not hidden — app.css missing");
  await page.screenshot({ path: join(OUT, "01-empty.png") });
});

await step("create a station", async () => {
  await page.getByRole("button", { name: "+ New station" }).click();
  await page.getByRole("navigation", { name: "Report sections" }).waitFor();
});

await step("cover fields save", async () => {
  await page.locator("#f_sps_id").fill("SPS-KED345");
  await page.locator("#f_doc_number").fill("UW-SPS-0345");
  await page.locator("#f_sign_prepared_by_name").fill("R. King");
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(OUT, "02-cover.png") });
  const title = await page.locator("#title").innerText();
  if (!title.includes("SPS-KED345")) throw new Error(`header did not update: ${title}`);
});

await step("overview prose", async () => {
  await page.getByRole("button", { name: /^Site overview/ }).click();
  await page.locator("#f_overview_flow").fill("Pumps from the Kedron catchment to SPS-KED120.");
  await page.locator("#f_site_issues").fill("Switchboard flooded twice in 2025.");
  const bypass = await page.locator("#f_bypass_text").inputValue();
  if (!bypass.includes("permanent bypass point")) throw new Error("bypass default missing");
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(OUT, "03-overview.png") });
});

await step("details quick picks", async () => {
  await page.getByRole("button", { name: /^SPS details/ }).click();
  const yes = page.getByRole("button", { name: "Yes", exact: true }).first();
  await yes.click();
  if ((await yes.getAttribute("aria-pressed")) !== "true") throw new Error("quick pick not set");
  await page.screenshot({ path: join(OUT, "04-details.png") });
});

await step("rate assets and comment", async () => {
  await page.getByRole("button", { name: /^Condition assessment/ }).click();
  const cards = page.locator(".assetcard");
  await cards.first().waitFor();
  const count = await cards.count();
  if (count !== 29) throw new Error(`expected 29 asset cards, saw ${count}`);

  for (const [i, rating] of [4, 2, 5, 3].entries()) {
    const card = cards.nth(i);
    await card.locator(`.rating[data-value="${rating}"]`).click();
    await card.locator("textarea").fill(`Asset ${i + 1}: rated ${rating} on inspection.`);
  }
  await page.waitForTimeout(500);
  const meaning = await cards.first().locator(".ratingmeaning").innerText();
  if (!meaning.includes("Poor")) throw new Error(`rating meaning not shown: ${meaning}`);
  // The chip tally has to keep up without a re-render throwing away the scroll.
  const tally = await page
    .locator('.chip[aria-current="true"] .tally')
    .innerText();
  if (tally !== "4/29") throw new Error(`chip tally stale: ${tally}`);
  const subtitle = await page.locator("#subtitle").innerText();
  if (!/ of 146 filled/.test(subtitle)) throw new Error(`subtitle wrong: ${subtitle}`);
  await page.screenshot({ path: join(OUT, "05-condition.png") });
});

// A real JPEG so the resize path runs for true.
const jpeg = Buffer.from(
  "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwg" +
    "JC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAAoADwBAREA/8QAHwAAAQUBAQEBAQEAAAAA" +
    "AAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEI" +
    "I0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1" +
    "dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi" +
    "4+Tl5ufo6erx8vP09fb3+Pn6/9oACAEBAAA/APn+iiigAooooAKKKKACiiigAooooAKKKKACiiigD//Z",
  "base64"
);
const jpegPath = join(OUT, "shot.jpg");
await writeFile(jpegPath, jpeg);

await step("attach photos to an asset", async () => {
  const card = page.locator(".assetcard").first();
  await card.getByRole("button", { name: /^Take a photo/ }).click();
  await page.locator("#camera").setInputFiles(jpegPath);
  await page.waitForTimeout(900);
  // Each picker has to be armed by its own button — that is what tells the app
  // which asset the next photo belongs to.
  await card.getByRole("button", { name: /from the library/ }).click();
  await page.locator("#library").setInputFiles([jpegPath, jpegPath]);
  await page.waitForTimeout(1400);
  const shots = await page.locator(".assetcard").first().locator(".shot").count();
  if (shots !== 3) throw new Error(`expected 3 thumbnails, saw ${shots}`);
  await page.screenshot({ path: join(OUT, "06-photos.png") });
});

await step("photographing deep in the list holds your place", async () => {
  const card = page.locator(".assetcard").nth(21);
  await card.scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => window.scrollY);
  await card.getByRole("button", { name: /^Take a photo/ }).click();
  await page.locator("#camera").setInputFiles(jpegPath);
  await page.waitForTimeout(1000);
  const after = await page.evaluate(() => window.scrollY);
  if (Math.abs(after - before) > 40) {
    throw new Error(`scroll jumped from ${before} to ${after}`);
  }
  if ((await page.locator(".assetcard").nth(21).locator(".shot").count()) !== 1) {
    throw new Error("photo did not attach to the right asset");
  }
});

await step("a figure keeps only the latest image", async () => {
  await page.getByRole("button", { name: /^Site overview/ }).click();
  await page.getByRole("button", { name: "Choose image" }).first().click();
  await page.locator("#library").setInputFiles([jpegPath, jpegPath, jpegPath]);
  await page.waitForTimeout(1200);
  const figures = await page.locator("img.figure").count();
  if (figures !== 1) throw new Error(`expected 1 figure, saw ${figures}`);
  await page.getByRole("button", { name: "Remove image" }).click();
  await page.waitForTimeout(600);
  if ((await page.locator("img.figure").count()) !== 0) throw new Error("figure not removed");
});

await step("site photo groups", async () => {
  await page.getByRole("button", { name: /^Site photos/ }).click();
  const cards = page.locator("main .card");
  if ((await cards.count()) !== 9) throw new Error("expected 9 standing photo groups");
  await cards.first().getByRole("button", { name: /library/i }).click();
  await page.locator("#library").setInputFiles(jpegPath);
  await page.waitForTimeout(900);
  await page.screenshot({ path: join(OUT, "07-sitephotos.png") });
});

await step("works list", async () => {
  await page.getByRole("button", { name: /^Recommended scope/ }).click();
  await page.locator("#f_works_list").fill("Replace riser bends\nReline the wet well");
  await page.waitForTimeout(400);
});

await step("report checklist", async () => {
  await page.getByRole("button", { name: "Report", exact: true }).last().click();
  await page.getByText("Generate Word report").waitFor();
  await page.screenshot({ path: join(OUT, "08-report.png"), fullPage: true });
});

let downloaded = null;
await step("generate the report", async () => {
  const wait = page.waitForEvent("download", { timeout: 30000 });
  await page.getByRole("button", { name: "Generate Word report" }).click();
  const download = await wait;
  downloaded = join(OUT, download.suggestedFilename());
  await download.saveAs(downloaded);
  if (download.suggestedFilename() !== "SPS-KED345 Condition Assessment Report.docx") {
    throw new Error(`unexpected file name: ${download.suggestedFilename()}`);
  }
});

await step("data survives a reload", async () => {
  await page.reload({ waitUntil: "networkidle" });
  await page.getByText("SPS-KED345").first().waitFor({ timeout: 5000 });
  const meta = await page.locator(".stationlist .meta").first().innerText();
  if (!/4 of 29 assets rated/.test(meta)) throw new Error(`list meta wrong: ${meta}`);
  if (!/5 photos/.test(meta)) throw new Error(`photo count wrong: ${meta}`);
  await page.screenshot({ path: join(OUT, "09-list.png") });
});

await step("service worker registers", async () => {
  const ready = await page.evaluate(() =>
    navigator.serviceWorker.ready.then((r) => !!r.active).catch(() => false)
  );
  if (!ready) throw new Error("no active service worker");
});

await step("works offline", async () => {
  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByText("SPS-KED345").first().waitFor({ timeout: 8000 });
  // The template has to come from the cache too, or no report gets built.
  const cached = await page.evaluate(async () => {
    const response = await fetch("template.docx");
    return response.ok ? (await response.arrayBuffer()).byteLength : 0;
  });
  if (cached < 100000) throw new Error(`template not available offline (${cached} bytes)`);
  await context.setOffline(false);
});

await step("a deleted station stays deleted", async () => {
  await page.getByText("SPS-KED345").first().click();
  await page.getByRole("button", { name: "Report", exact: true }).first().click();
  await page.locator("#f_sps_id").waitFor({ state: "detached" }).catch(() => {});
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Delete station" }).click();
  await page.getByText("Nothing captured yet").waitFor({ timeout: 5000 });
  // The pending autosave must not write the station back on the way out.
  await page.waitForTimeout(1200);
  await page.reload({ waitUntil: "networkidle" });
  await page.getByText("Nothing captured yet").waitFor({ timeout: 5000 });
});

await browser.close();
if (!target) server.close();

console.log(`\ndownload: ${downloaded}`);
if (problems.length) {
  console.error(`\n${problems.length} problem(s):`);
  problems.forEach((p) => console.error(`  ✗ ${p}`));
  process.exit(1);
}
console.log("e2e clean");
