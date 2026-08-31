/* End-to-end check on the real template with the real browser code.
 *
 * Loads public/sps/docx.js and public/sps/schema.js the way the page does,
 * fills every field in the schema, attaches photos to a handful of assets,
 * then pulls the result apart again and asserts the report is well-formed
 * OOXML with nothing left unfilled.
 *
 *     node tools/sps-template/test-generate.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { XMLParser, XMLValidator } from "./lib/xml-check.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");
const sps = resolve(root, "public/sps");

// --- load the browser scripts into this process -----------------------------
const sandbox = globalThis;
new Function("window", readFileSync(resolve(sps, "docx.js"), "utf8"))(sandbox);
new Function("window", readFileSync(resolve(sps, "schema.js"), "utf8"))(sandbox);

const { SPSDocx, SPS_SCHEMA: schema } = sandbox;

// --- a station's worth of made-up data --------------------------------------
const values = {};
let filled = 0;
for (const section of schema.sections) {
  for (const field of section.fields || []) {
    if (field.type === "image") continue;
    values[field.id] =
      field.type === "date"
        ? "14/08/2026"
        : field.type === "lines"
          ? "Replace both riser bends\nReline the wet well\nReplace the access lid"
          : `${field.label} value`;
    filled++;
  }
  for (const [i, asset] of (section.assets || []).entries()) {
    values[`${asset.id}_rating`] = String((i % 5) + 1);
    values[`${asset.id}_comment`] = `${asset.label}: surface rust & <light> "pitting" — 20% loss\nsecond line`;
    filled += 2;
  }
}
values.sps_id = "SPS-KED345";
values.report_date = "14 August 2026";

// A one-pixel JPEG is enough to prove the drawing XML, the relationship and
// the media part all line up.
const jpeg = Buffer.from(
  "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0a" +
    "HBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAA" +
    "AAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==",
  "base64"
);

const conditionSection = schema.sections.find((s) => s.kind === "condition");
const extraPhotos = conditionSection.extraPhotos;

// Two of something: a second sluice valve and a second well's measurements.
const repeatAsset = conditionSection.assets.find((a) => a.label === "Gate Valves / Spindles");
const repeatField = schema.sections
  .find((s) => s.id === "openings")
  .fields[0];
const instances = {
  [repeatAsset.id]: [
    { key: repeatAsset.id, label: "" },
    { key: `${repeatAsset.id}__2`, label: "east" },
  ],
  [repeatField.id]: [
    { key: repeatField.id, label: "" },
    { key: `${repeatField.id}__2`, label: "Well 2" },
  ],
};
// One asset is not at this station at all.
const naAsset = conditionSection.assets.find((a) => a.label === "RPZ");
values[`${naAsset.id}_rating`] = schema.notApplicable.value;
values[`${naAsset.id}_comment`] = "No RPZ at this station.";

values[`${repeatAsset.id}__2_rating`] = "5";
values[`${repeatAsset.id}__2_comment`] = "Seized, spindle sheared.";
values[`${repeatField.id}__2`] = "980";

const photoGroups = [
  extraPhotos[0].id,
  extraPhotos[0].id, // two in one group, to exercise the 2-up row
  extraPhotos[1].id,
  conditionSection.assets[10].id,
  conditionSection.assets[10].id,
  conditionSection.assets[10].id, // odd count, so the last row pads a cell
  "img_gis",
  "img_scada",
];
const photos = photoGroups.map((group, i) => ({
  group,
  bytes: new Uint8Array(jpeg),
  width: 1600,
  height: i % 3 === 0 ? 2133 : 1200, // mix portrait and landscape
  type: "image/jpeg",
  note: i === 0 ? 'Looking north — "as found"' : "",
}));

// --- generate ---------------------------------------------------------------
const template = readFileSync(resolve(sps, "template.docx"));
const started = Date.now();
const { blob, fileName } = await SPSDocx.generate({
  template: template.buffer.slice(
    template.byteOffset,
    template.byteOffset + template.byteLength
  ),
  schema,
  values,
  photos,
  instances,
});
const out = Buffer.from(await blob.arrayBuffer());
const elapsed = Date.now() - started;

mkdirSync(resolve(root, ".sps-test"), { recursive: true });
const outPath = resolve(root, ".sps-test", fileName);
writeFileSync(outPath, out);

// --- verify -----------------------------------------------------------------
const failures = [];
function check(condition, message) {
  if (!condition) failures.push(message);
}

const archive = SPSDocx.readZip(
  out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength)
);
const read = (name) => SPSDocx.readText(archive.entries[name]);

check(fileName === "SPS-KED345 Condition Assessment Report.docx", `file name: ${fileName}`);
check(archive.order[0] === "[Content_Types].xml", "content types must be the first zip entry");

const documentXml = await read("word/document.xml");
const headerXml = await read("word/header1.xml");
const coreXml = await read("docProps/core.xml");
const relsXml = await read("word/_rels/document.xml.rels");
const typesXml = await read("[Content_Types].xml");

for (const [name, xml] of [
  ["word/document.xml", documentXml],
  ["word/header1.xml", headerXml],
  ["docProps/core.xml", coreXml],
  ["word/_rels/document.xml.rels", relsXml],
  ["[Content_Types].xml", typesXml],
]) {
  const verdict = XMLValidator(xml);
  check(verdict === true, `${name} is not well-formed: ${verdict}`);
}

const leftovers = [...documentXml.matchAll(/\{\{[^}]{0,60}\}\}/g)].map((m) => m[0]);
check(leftovers.length === 0, `unresolved tokens: ${[...new Set(leftovers)].join(", ")}`);
check(!/\{\{/.test(headerXml + coreXml), "unresolved tokens in header or core properties");

check(documentXml.includes("SPS-KED345 Condition Assessment Report"), "cover title not filled");
check(headerXml.includes("SPS-KED345"), "running header not filled");
check(coreXml.includes("<dc:title>SPS-KED345"), "core properties title not filled");
check(!documentXml.includes("SPS-XXXXXX"), "a placeholder station number survived");

// Escaping: the comment text contains &, < > and quotes.
check(documentXml.includes("&lt;light&gt;"), "angle brackets were not escaped");
check(documentXml.includes("<w:br/>"), "multi-line values did not become line breaks");

// Photos: eight media parts, eight relationships, and drawings for each.
for (let i = 1; i <= photos.length; i++) {
  check(!!archive.entries[`word/media/spsphoto${i}.jpeg`], `missing media part ${i}`);
  check(relsXml.includes(`Id="rIdSps${i}"`), `missing relationship ${i}`);
  check(documentXml.includes('r:embed="rIdSps' + i + '"'), `photo ${i} is not referenced`);
}
check(typesXml.includes('Extension="jpeg"'), "jpeg content type not declared");
check(
  archive.entries["word/media/spsphoto1.jpeg"].method === 0,
  "photos should be stored, not deflated"
);

// Every docPr id has to be unique or Word complains about the drawings.
const docPrIds = [...documentXml.matchAll(/<wp:docPr id="(\d+)"/g)].map((m) => m[1]);
check(new Set(docPrIds).size === docPrIds.length, `duplicate wp:docPr ids: ${docPrIds}`);

// Appendix 1 headings: the standing groups, then the photographed asset with
// its rating appended.
const asset = conditionSection.assets[10];
check(
  documentXml.includes(`${asset.label} — condition ${values[asset.id + "_rating"]}`),
  "asset photo group heading is missing its condition rating"
);
check(
  documentXml.includes(extraPhotos[0].label),
  "standing photo group heading is missing"
);

// --- repeated rows -----------------------------------------------------------
check(
  !/\{\{n:/.test(documentXml),
  "an instance-suffix token survived into the report"
);
// The suffix is its own run, appended after the row's own label, so look for
// the run rather than for a label and suffix side by side in the markup.
check(
  documentXml.includes('<w:t xml:space="preserve"> (east)</w:t>'),
  `no duplicated row for the second ${repeatAsset.label}`
);
check(
  documentXml.includes('<w:t xml:space="preserve"> (Well 2)</w:t>'),
  "no duplicated row for the second well's measurement"
);
check(
  documentXml.includes("Seized, spindle sheared."),
  "the second instance's comment is missing"
);
check(documentXml.includes(">980<"), "the second well's measurement is missing");
// The original row keeps its own label, unsuffixed.
check(
  documentXml.includes(`>${repeatAsset.label}</w:t>`),
  "the original row lost its label"
);
// The second gate valve is rated 5, so its cell is shaded like any other.
check(
  documentXml.includes('w:fill="FFC7CE"'),
  "the duplicated row did not pick up its own rating colour"
);

// --- the register of what was not photographed -------------------------------
check(
  documentXml.includes("Table 8: Assets inspected but not photographed"),
  "the not-photographed register is missing"
);
const photographed = new Set(photoGroups);
const unshot = conditionSection.assets.filter((a) => !photographed.has(a.id));
check(unshot.length > 20, "expected most assets to be unphotographed in this fixture");
// header + every unphotographed asset instance + the unphotographed site shot
// Not-applicable assets are not missing photographs, so they are left out.
const registerRows =
  1 + (unshot.length - 1) + 1 /* the second gate valve */ + extraPhotos.filter(
    (g) => !photographed.has(g.id)
  ).length;
const registerXml = documentXml.slice(
  documentXml.indexOf("Table 8: Assets inspected but not photographed")
);
check(
  !registerXml.includes(naAsset.label),
  "a not-applicable asset should not be listed as un-photographed"
);
check(
  documentXml.includes(`${repeatAsset.label} (east)`),
  "a repeated instance should appear in the register too"
);
const shotAsset = conditionSection.assets[10];
const registerAfterPhotos =
  documentXml.indexOf("Table 8: Assets inspected but not photographed") >
  documentXml.lastIndexOf(`${shotAsset.label} — condition`);
check(registerAfterPhotos, "the register should come after the photographs");

// Rating cells carry the palette from the schema.
for (const rating of schema.ratings) {
  check(
    documentXml.includes(`w:fill="${rating.fill}"`),
    `no cell shaded for rating ${rating.value}`
  );
}
check(!/w:fill="\{\{/.test(documentXml), "a shading token survived");

// --- N/A ---------------------------------------------------------------------
check(
  documentXml.includes(`<w:t xml:space="preserve">${schema.notApplicable.value}</w:t>`),
  "N/A did not reach the rating cell"
);
check(
  documentXml.includes(`w:fill="${schema.notApplicable.fill}"`),
  "the N/A cell is not shaded off the scale"
);

// The bulleted works list, and paragraphs from the overview prompts.
check(
  (documentXml.match(/<w:pStyle w:val="ListBullet"\/>/g) || []).length === 3,
  "recommended works did not become three bullets"
);

// Structure: the document still parses into the same shape Word expects, plus
// exactly one new drawing per photo on top of the template's own artwork.
const blank = SPSDocx.readZip(
  template.buffer.slice(template.byteOffset, template.byteOffset + template.byteLength)
);
const before = XMLParser(await SPSDocx.readText(blank.entries["word/document.xml"]));
const parsed = XMLParser(documentXml);
check(parsed.tables >= before.tables, `lost tables: ${before.tables} -> ${parsed.tables}`);
// Two rows were duplicated and no more: one per extra instance. Counting the
// suffix runs is exact, where a whole-document row count also picks up the
// generated photo tables and the register.
const suffixRuns = [...documentXml.matchAll(/<w:t xml:space="preserve"> \([^<]*\)<\/w:t>/g)];
check(suffixRuns.length === 2, `expected 2 duplicated rows, saw ${suffixRuns.length}`);
check(
  parsed.rows > before.rows + registerRows,
  `rows did not grow: ${before.rows} -> ${parsed.rows}`
);
check(
  parsed.sections === before.sections,
  `section breaks changed: ${before.sections} -> ${parsed.sections}` +
    " (page setup for the appendices depends on them)"
);
check(
  parsed.drawings === before.drawings + photos.length,
  `expected ${before.drawings + photos.length} drawings, saw ${parsed.drawings}`
);

// A supplied figure replaces the template's own prompt for it.
check(!documentXml.includes("Insert GIS Overview Photo"), "GIS prompt survived a supplied image");
check(!documentXml.includes("Insert SCADA diagram"), "SCADA prompt survived a supplied image");

// --- a draft, mid-inspection: no photos, almost nothing filled ---------------
const draft = await SPSDocx.generate({
  template: template.buffer.slice(
    template.byteOffset,
    template.byteOffset + template.byteLength
  ),
  schema,
  values: { sps_id: "SPS-KED999" },
  photos: [],
});
const draftBytes = Buffer.from(await draft.blob.arrayBuffer());
const draftArchive = SPSDocx.readZip(
  draftBytes.buffer.slice(draftBytes.byteOffset, draftBytes.byteOffset + draftBytes.byteLength)
);
const draftXml = await SPSDocx.readText(draftArchive.entries["word/document.xml"]);

check(XMLValidator(draftXml) === true, "an empty draft is not well-formed");
check(!/\{\{/.test(draftXml), "unresolved tokens in the empty draft");
check(draftXml.includes("SPS-KED999"), "the draft lost its station number");
check(
  draftXml.includes("No site photographs were captured."),
  "Appendix 1 should say so when there are no photos"
);
check(
  draftXml.includes("Insert GIS Overview Photo"),
  "with no image supplied the template's prompt should stay, so the gap is visible"
);
check(
  !draftArchive.entries["word/media/spsphoto1.jpeg"],
  "an empty draft should carry no photo parts"
);
check(
  XMLParser(draftXml).sections === before.sections,
  "the empty draft lost a section break"
);

// --- report -----------------------------------------------------------------
console.log(`generated ${fileName}`);
console.log(`  ${(out.length / 1024).toFixed(0)} KB, ${archive.order.length} parts, ${elapsed} ms`);
console.log(`  ${filled} values, ${photos.length} photos, ${parsed.tables} tables`);
console.log(`  written to ${outPath}`);

if (failures.length) {
  console.error(`\n${failures.length} check(s) failed:`);
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  process.exit(1);
}
console.log("\nall checks passed");
