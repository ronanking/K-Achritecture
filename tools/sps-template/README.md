# SPS condition assessment field tool

Writing fifteen sewerage pump station condition assessments by hand is fifteen
passes through the same Word template. This is the same template, filled in on
a phone at the station and handed back as a finished `.docx`.

The app lives at **`/sps/`** — open it once on the iPhone, then Share → Add to
Home Screen. After that it runs with no signal and no Safari chrome.

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
| `{{photos}}` | the whole of Appendix 1 |

## Notes on the report

- **Appendix 1 is generated, not filled.** The template ships nine fixed photo
  slots; the app writes a table per group that actually has photos — the nine
  standing shots first, then every condition asset that was photographed, with
  its rating in the heading. Two photos across, matching the original layout.
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
