/* Drive the whole app in a real browser: walk a station through focus mode,
 * fill the desk sections, generate the report, reload, then pull the plug and
 * check it still works offline.
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
  viewport: { width: 390, height: 844 }, // iPhone 14 Pro
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

const shot = (n) => page.screenshot({ path: join(OUT, `${n}.png`) });

// A real JPEG, so the decode-and-resize path runs for true.
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
  await shot("01-empty");
});

await step("a new station opens on the field work", async () => {
  await page.getByRole("button", { name: "+ New station" }).click();
  await page.locator(".stagetabs").waitFor({ timeout: 5000 });

  // On site comes first, and holds exactly the tables that get filled in
  // standing at the station.
  const tabs = await page.locator(".stagetab .stagename").allInnerTexts();
  if (tabs[0] !== "On site") throw new Error(`field stage is not first: ${tabs}`);
  if ((await page.locator('.stagetab[aria-pressed="true"] .stagename').innerText()) !== "On site") {
    throw new Error("did not land on the On site stage");
  }

  const sections = await page.locator(".indexname").allInnerTexts();
  const expected = [
    "Station",
    "Well openings",
    "Condition assessment",
    "General improvement works",
  ];
  if (sections.join("|") !== expected.join("|")) {
    throw new Error(`field sections wrong or out of order: ${sections.join(", ")}`);
  }
  // 2 station + 3 openings + (29 assets + 2 site-only shots) + 11 improvements
  const total = await page.locator('.stagetab[aria-pressed="true"] .stagecount').innerText();
  if (!total.endsWith("/ 47")) throw new Error(`field stage should hold 47 items, says ${total}`);
  await shot("02-walkthrough");
});

await step("focus mode shows one question at a time", async () => {
  await page.getByRole("button", { name: /^(Resume|Start)/ }).click();
  await page.locator(".focus").waitFor({ timeout: 5000 });

  const questions = await page.locator(".focusq").count();
  if (questions !== 1) throw new Error(`expected one question on screen, saw ${questions}`);
  if (!(await page.locator(".focusq").innerText()).includes("SPS number")) {
    throw new Error("focus did not open on the first unanswered question");
  }
  // The thumb bar has to sit inside the viewport, not below the fold.
  const navBottom = await page.evaluate(() => {
    const nav = document.querySelector(".focusnav");
    return nav ? Math.round(nav.getBoundingClientRect().bottom) : -1;
  });
  const viewportHeight = await page.evaluate(() => window.innerHeight);
  if (navBottom > viewportHeight + 1) {
    throw new Error(`Next button is off screen (${navBottom} > ${viewportHeight})`);
  }
  await shot("03-focus-first");

  await page.locator(".focusbody input").fill("SPS-KED345");
  await page.getByRole("button", { name: /Next/ }).click();
  await page.waitForTimeout(250);
  if (!(await page.locator(".focusq").innerText()).includes("Date of inspection")) {
    throw new Error("Next did not advance");
  }
  await page.getByRole("button", { name: /Back/ }).click();
  await page.waitForTimeout(250);
  if ((await page.locator(".focusbody input").inputValue()) !== "SPS-KED345") {
    throw new Error("going back lost the answer");
  }
});

await step("swiping moves between questions", async () => {
  const swipe = (fromX, toX) =>
    page.evaluate(
      ([x0, x1]) => {
        // The handler reads clientX off real Touch objects, so build real ones
        // — a plain literal is rejected by the TouchEvent constructor.
        const node = document.querySelector(".focus");
        const target = document.querySelector(".focusq");
        const at = (x) => [
          new Touch({ identifier: 1, target, clientX: x, clientY: 300, pageX: x, pageY: 300 }),
        ];
        node.dispatchEvent(
          new TouchEvent("touchstart", { touches: at(x0), bubbles: true, cancelable: true })
        );
        node.dispatchEvent(
          new TouchEvent("touchend", { changedTouches: at(x1), bubbles: true, cancelable: true })
        );
      },
      [fromX, toX]
    );

  const first = await page.locator(".focusq").innerText();
  await swipe(320, 60);
  await page.waitForTimeout(300);
  const second = await page.locator(".focusq").innerText();
  if (second === first) throw new Error(`swiping left did not advance (still on ${first})`);

  await swipe(60, 320);
  await page.waitForTimeout(300);
  if ((await page.locator(".focusq").innerText()) !== first) {
    throw new Error("swiping right did not go back");
  }
});

await step("rate an asset and photograph it", async () => {
  // Jump straight to the condition assessment rather than tapping Next 4 times.
  await page.getByRole("button", { name: "Jump to another question" }).click();
  await page.locator(".focusjump").waitFor();
  const rows = await page.locator(".jumprow").count();
  if (rows !== 47) throw new Error(`jump list should hold 47 rows, saw ${rows}`);
  await shot("04-jump");
  await page.getByRole("button", { name: /^·?\s*Signage/ }).click();
  await page.waitForTimeout(250);

  if (!(await page.locator(".focusq").innerText()).includes("Signage")) {
    throw new Error("jump did not land on Signage");
  }
  await page.locator('.rating[data-value="4"]').click();
  await page.waitForTimeout(200);
  const meaning = await page.locator(".ratingmeaning").innerText();
  if (!meaning.includes("Poor")) throw new Error(`rating meaning missing: ${meaning}`);
  const count = await page.locator(".focuscount").innerText();
  if (!/·\s*3 answered/.test(count)) throw new Error(`answered tally did not move: ${count}`);

  await page.locator(".focusbody textarea").fill("Faded, cable ties perished.");
  await page.getByRole("button", { name: /^Take a photo/ }).click();
  await page.locator("#camera").setInputFiles(jpegPath);
  await page.waitForTimeout(1000);
  if ((await page.locator(".focusbody .shot").count()) !== 1) {
    throw new Error("photo did not attach in focus mode");
  }
  // Adding a photo must not knock you off the question you are on.
  if (!(await page.locator(".focusq").innerText()).includes("Signage")) {
    throw new Error("adding a photo moved off the question");
  }
  await shot("05-focus-rated");
});

await step("leaving focus returns to the walk-through", async () => {
  await page.getByRole("button", { name: "Leave focus mode" }).click();
  await page.locator(".stagetabs").waitFor({ timeout: 5000 });
  const rowText = await page
    .locator(".indexrow", { hasText: "Condition assessment" })
    .innerText();
  if (!rowText.includes("1/31")) throw new Error(`walk-through count stale: ${rowText}`);
  const title = await page.locator("#title").innerText();
  if (!title.includes("SPS-KED345")) throw new Error(`header did not pick up the name: ${title}`);
});

await step("the list view still works for the rest of a section", async () => {
  await page.getByRole("button", { name: /^Condition assessment/ }).click();
  // The two photo-only site shots sit in this section too; only the rated
  // assets take a rating.
  const cards = page.locator(".assetcard:not(.photoonly)");
  await page.locator(".assetcard").first().waitFor();
  if ((await cards.count()) !== 29) throw new Error(`expected 29 rated assets, saw ${await cards.count()}`);
  for (const [i, rating] of [2, 5, 3].entries()) {
    const card = cards.nth(i + 1);
    await card.locator(`.rating[data-value="${rating}"]`).click();
    await card.locator("textarea").fill(`Asset ${i + 2}: rated ${rating} on inspection.`);
  }
  await page.waitForTimeout(400);
  const tally = await page.locator('.chip[aria-current="true"] .tally').innerText();
  if (tally !== "4/31") throw new Error(`chip tally stale: ${tally}`);
  await shot("06-list");
});

await step("photographing deep in the list holds your place", async () => {
  const card = page.locator(".assetcard:not(.photoonly)").nth(21);
  await card.scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => window.scrollY);
  await card.getByRole("button", { name: /^Take a photo/ }).click();
  await page.locator("#camera").setInputFiles(jpegPath);
  await page.waitForTimeout(1000);
  const after = await page.evaluate(() => window.scrollY);
  if (Math.abs(after - before) > 40) throw new Error(`scroll jumped ${before} -> ${after}`);
});

await step("well openings and improvement works are field work", async () => {
  await page.getByRole("button", { name: /^Well openings/ }).click();
  const inputs = page.locator("main .field input");
  if ((await inputs.count()) !== 3) throw new Error("expected 3 well opening measurements");
  await inputs.nth(0).fill("1200");
  await page.getByRole("button", { name: /^General improvement works/ }).click();
  await page.locator("main textarea").first().fill("Pavement sunken at the gate.");
  await page.waitForTimeout(400);
});

await step("the site-only shots live with the condition rows", async () => {
  await page.getByRole("button", { name: /^Condition assessment/ }).click();
  const photoOnly = page.locator(".assetcard", { hasText: "photo only" });
  if ((await photoOnly.count()) !== 2) {
    throw new Error("expected Site Layout and Top Slab alongside the rated assets");
  }
  // The rest — Switchboard, Wet Well, Davit Base — are photographed on the row
  // you rate them on, not in a section of their own.
  if ((await page.locator(".assetcard", { hasText: "Switchboard" }).count()) !== 1) {
    throw new Error("Switchboard should appear once, on its condition row");
  }
  await photoOnly.first().getByRole("button", { name: /library/i }).click();
  await page.locator("#library").setInputFiles(jpegPath);
  await page.waitForTimeout(900);
  await shot("07-sitephotos");
});

await step("a second well takes a whole set of measurements", async () => {
  await page.getByRole("button", { name: /^Well openings/ }).click();
  const values = page.locator("main .field input:not(.instlabel)");
  const before = await values.count();
  if (before !== 3) throw new Error(`expected 3 measurements, saw ${before}`);
  if ((await page.locator("main .card").count()) !== 1) {
    throw new Error("the first well should be one block");
  }

  // A second well is a second of every measurement, not a second L1.
  await page.getByRole("button", { name: "+ Another well" }).click();
  await page.waitForTimeout(600);
  if ((await values.count()) !== 6) {
    throw new Error(`a second well should add 3 measurements, saw ${await values.count()}`);
  }
  if ((await page.locator("main .card").count()) !== 2) {
    throw new Error("the second well should be its own block");
  }
  // Named once for the block, not once per row.
  if ((await page.locator(".instlabel").count()) !== 1) {
    throw new Error("expected one name field for the whole set");
  }

  await page.locator(".instlabel").fill("Well 2");
  await page.waitForTimeout(300);
  const headings = await page.locator("main .card > h3").allInnerTexts();
  if (headings.join("|") !== "First well|well Well 2") {
    throw new Error(`well blocks are mislabelled: ${headings.join(" / ")}`);
  }

  await values.nth(0).fill("1200");
  await values.nth(3).fill("980");
  await page.waitForTimeout(500);
  await shot("08-repeat");
});

await step("N/A is an answer, not a blank", async () => {
  await page.getByRole("button", { name: /^Condition assessment/ }).click();
  const rpz = page.locator(".assetcard", { hasText: "RPZ" }).first();
  await rpz.scrollIntoViewIfNeeded();
  const naButton = rpz.locator(".nabtn");
  if (!(await naButton.count())) throw new Error("no N/A option on a condition row");
  await naButton.click();
  await page.waitForTimeout(400);
  if ((await naButton.getAttribute("aria-pressed")) !== "true") {
    throw new Error("N/A did not take");
  }
  if ((await rpz.getAttribute("data-rating")) !== "N/A") {
    throw new Error("N/A was not stored as the rating");
  }
  const meaning = await rpz.locator(".ratingmeaning").innerText();
  if (!meaning.includes("Not present")) throw new Error(`N/A has no explanation: ${meaning}`);
  // It counts as answered, so the tally moves.
  const tally = await page.locator('.chip[aria-current="true"] .tally').innerText();
  if (tally !== "6/31") throw new Error(`N/A did not count as answered: ${tally}`);

  // And picking a number afterwards clears it.
  await rpz.locator('.rating[data-value="3"]').click();
  await page.waitForTimeout(300);
  if ((await naButton.getAttribute("aria-pressed")) !== "false") {
    throw new Error("N/A stayed selected after a number was chosen");
  }
  await naButton.click();
  await page.waitForTimeout(300);
});

await step("a second sluice valve gets its own rating", async () => {
  await page.getByRole("button", { name: /^Condition assessment/ }).click();
  await page.locator(".assetcard", { hasText: "Gate Valves / Spindles" }).first()
    .scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: /Another gate valves/i }).click();
  await page.waitForTimeout(600);
  const copies = page.locator(".assetcard", { hasText: "Gate Valves / Spindles" });
  if ((await copies.count()) !== 2) throw new Error("no second gate valve row");
  await copies.nth(1).locator('.rating[data-value="5"]').click();
  await copies.nth(1).locator("textarea").fill("Seized, spindle sheared.");
  await page.waitForTimeout(500);
  if ((await copies.nth(1).getAttribute("data-rating")) !== "5") {
    throw new Error("the copy did not take its own rating");
  }
  if ((await copies.nth(0).getAttribute("data-rating")) === "5") {
    throw new Error("rating the copy changed the original");
  }
});

await step("the desk stage holds the rest", async () => {
  await page.getByRole("button", { name: "Walk-through" }).click();
  await page.getByRole("button", { name: /^Desk/ }).click();
  await page.waitForTimeout(300);
  const sections = await page.locator(".indexname").allInnerTexts();
  const expected = [
    "SPS details",
    "Pump specifications",
    "Site overview",
    "Recommended scope of works",
    "Document control",
  ];
  if (sections.join("|") !== expected.join("|")) {
    throw new Error(`desk sections wrong: ${sections.join(", ")}`);
  }
  await shot("08-desk");
});

await step("overview prose and quick picks", async () => {
  await page.getByRole("button", { name: /^Site overview/ }).click();
  await page.locator("#f_overview_flow").fill("Pumps from the Kedron catchment to SPS-KED120.");
  await page.locator("#f_site_issues").fill("Switchboard flooded twice in 2025.");
  const bypass = await page.locator("#f_bypass_text").inputValue();
  if (!bypass.includes("permanent bypass point")) throw new Error("bypass default missing");

  await page.getByRole("button", { name: /^SPS details/ }).click();
  const yes = page.getByRole("button", { name: "Yes", exact: true }).first();
  await yes.click();
  if ((await yes.getAttribute("aria-pressed")) !== "true") throw new Error("quick pick not set");
});

await step("a figure keeps only the latest image", async () => {
  await page.getByRole("button", { name: /^Site overview/ }).click();
  await page.getByRole("button", { name: "Choose image" }).first().click();
  await page.locator("#library").setInputFiles([jpegPath, jpegPath, jpegPath]);
  await page.waitForTimeout(1200);
  if ((await page.locator("img.figure").count()) !== 1) throw new Error("expected exactly 1 figure");
  await page.getByRole("button", { name: "Remove image" }).click();
  await page.waitForTimeout(600);
  if ((await page.locator("img.figure").count()) !== 0) throw new Error("figure not removed");
});

await step("works list", async () => {
  await page.getByRole("button", { name: /^Recommended scope/ }).click();
  await page.locator("#f_works_list").fill("Replace riser bends\nReline the wet well");
  await page.waitForTimeout(400);
});

await step("report checklist", async () => {
  await page.getByRole("button", { name: "Report", exact: true }).first().click();
  await page.getByText("Generate Word report").waitFor();
  await page.screenshot({ path: join(OUT, "09-report.png"), fullPage: true });
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
  if (!/6 of 30 assets rated/.test(meta)) throw new Error(`list meta wrong: ${meta}`);
  if (!/3 photos/.test(meta)) throw new Error(`photo count wrong: ${meta}`);
  await shot("10-list");
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
