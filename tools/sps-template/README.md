# SPS condition assessment field tool

Writing fifteen sewerage pump station condition assessments by hand is fifteen
passes through the same Word template. This is the same template, filled in on
a phone at the station and handed back as a finished `.docx`.

The app lives at **`/sps`** — open it once on the iPhone, then Share → Add to
Home Screen. After that it runs with no signal and no Safari chrome.

`public/` has no directory index, so `/sps/index.html` is the only path that
actually exists; `next.config.ts` redirects `/sps` onto it. Reaching the page
at any other URL loads the markup with every relative asset resolved one
directory too high — no styles, no scripts. `test-app.mjs` asserts against
that now, and takes an `SPS_URL` so it can be pointed at a live deployment.

---

## How it fits together

```
tools/sps-template/source/SPS_Condition_Assessment_Template.docx   the template as issued
                        │
                        │  build.py
                        ▼
public/sps/template.docx    same document, with {{tokens}} where answers go
public/sps/schema.js        every token, described: label, type, section, order
                        │
                        │  the phone, offline
                        ▼
public/sps/app.js           renders the form from schema.js, stores answers and
                            photos in IndexedDB
public/sps/docx.js          unzips template.docx, substitutes, injects photos,
                            zips it back up
                        ▼
SPS-KED345 Condition Assessment Report.docx
```

`build.py` is the only thing that knows the shape of the Word document, and
`schema.js` is the only thing the app knows. Neither can drift from the other,
because both come out of the same run.

## On site first

`SECTION_ORDER` in `build.py` puts the sections in the order the work actually
happens and marks each one `field` or `office`. `field` is everything
answerable standing at the station — the station number, well openings, the
condition assessment, general improvement works and the photographs, 54
answers — and the app opens there. Everything that needs Maximo, uMap or the
master plan sits behind the Desk tab. Move a section between the two lists and
the ordering, the stage tabs and the walk-through all follow.

### Two of something

Every labelled row in tables 1, 3, 4 and 5 can be repeated. Two sluice valves,
three wells worth of opening measurements, a second pump — hit **+ Another** on
the row and it gains a copy directly beneath, with its own rating, comment and
photographs. Name the copy (`east`, `Well 2`, `SV2`) or leave it numbered; the
report duplicates the `w:tr` and suffixes the label, `Gate Valves / Spindles
(east)`.

Instance one keeps the original field ids, so nothing already captured moves,
and keys are never reused — deleting the middle of three cannot make a later
copy inherit the deleted one's answers.

### Photographs live on the thing they are of

The template's nine standing Appendix 1 shots are mostly of something that
already has a condition row, so they were folded into it: rate the driveway and
photograph it in the same place. `PHOTO_GROUP_MERGES` in `build.py` is the map,
asserted against the template at build time. The two that are of the site
rather than an asset — Site Layout, Top Slab — stay as photo-only entries in
the same section.

Appendix 1 then shows only what was actually photographed, and a register
follows it — *Table 8: Assets inspected but not photographed* — listing
everything else with its condition rating, so a gap in the evidence is stated
rather than left to be noticed.

### Getting round

Opening a station lands on the walk-through: two stage tabs, one button that
drops you back where you stopped, and the sections as an index. From there
**focus mode** takes over the screen and asks one question at a time — a large
question, the five rating targets, a comment, a camera, and Back/Next under
the thumb. Swipe or arrow-key between questions, `☰` to jump anywhere, `✕` to
come back out. The list view is still there behind the section chips for
working through a table quickly or for using the thing on a laptop.

## Rebuilding after the template changes

When Unitywater reissues the template, drop the new file over
`source/SPS_Condition_Assessment_Template.docx` and run:

```bash
python3 tools/sps-template/build.py     # rewrites template.docx and schema.js
node    tools/sps-template/test-generate.mjs
```

The build asserts on the things it cannot silently get wrong — the cover page
placeholders still being where it expects, cell properties still being in
schema order — so a template that has moved underneath it fails loudly rather
than producing a quietly broken report.

New rows in any of the tables need no code change: they are picked up from the
row labels and appear in the app automatically. New *sections* need a handler
in `build.py`.

## Tests

```bash
node tools/sps-template/test-generate.mjs   # no dependencies
```

Fills every field in the schema, attaches photos, then takes the result apart
again: well-formed XML in every part, no unresolved tokens, correct escaping of
`&` and `<`, one media part and one relationship per photo, unique drawing ids,
rating cells shaded from the schema palette, and the template's own tables,
drawings and section breaks all still present.

```bash
npm i --no-save playwright && npx playwright install chromium
node tools/sps-template/test-app.mjs        # needs a browser
```

Drives the real app in a phone-sized Chromium: create a station, fill it in,
rate assets, attach photos, generate the report, reload to prove persistence,
then go offline and prove it still works. Screenshots land in `.sps-test/app/`.

## Token vocabulary

`docx.js` resolves these; `build.py` writes them.

| Token | Becomes |
| --- | --- |
| `{{f:ID}}` | text, in place inside its run — newlines become line breaks |
| `{{shd:ID}}` | a table cell fill colour, or `auto` when unrated |
| `{{para:ID}}` | the whole paragraph, replaced by one paragraph per line |
| `{{list:ID}}` | the whole paragraph, replaced by a bulleted list |
| `{{img:ID}}` | the whole paragraph, replaced by a centred image |
| `{{n:ID}}` | nothing on the original row, ` (2)` on a repeat of it |
| `{{photos}}` | the whole of Appendix 1, plus the not-photographed register |

## Notes on the report

- **Appendix 1 is generated, not filled.** The template ships nine fixed photo
  slots; the app writes a table per group that actually has photos — the
  site-only shots first, then every condition asset that was photographed, with
  its rating in the heading. Two photos across, matching the original layout.
  Anything not photographed is listed in the register that follows.
- **`SPS-XXXXXX` is a live placeholder.** Type it anywhere and it is replaced
  with the station number on export. The bypass boilerplate in section 4.1
  relies on this.
- **Nothing is mandatory.** Empty fields stay empty, so a draft can be
  generated at any point in the inspection.
- **The table of contents refreshes itself.** `build.py` sets `updateFields`,
  so Word offers to repaginate on open.
- **Photos are re-encoded** to JPEG at 1600px on the long edge before storage.
  Thirty 12-megapixel HEICs would make a report nobody can email, and the
  re-encode also bakes in the EXIF rotation.

## Storage and privacy

Stations and photographs live in IndexedDB on the phone and are never uploaded
— report generation is entirely local, which is also why it works in a paddock.
The app asks for persistent storage on load; installing it to the home screen is
what actually stops iOS clearing the data after a week of not opening it. The
Backup card on the front screen writes every station and photo to one JSON file
that can be imported here or on another device.
