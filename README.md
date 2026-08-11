# K Architecture

A website for [K Architecture](https://www.karchitecture.com.au), a boutique
architectural practice on the Sunshine Coast, Queensland.

The site is built so that the interface behaves the way architecture does —
proportion, rhythm, compression and release, light and shadow, drawing
resolving into built form. Every page is set out from a **datum**: a hairline
reference that opens the site, becomes the grid the index is ruled on, the line
a project title sits on, and finally the horizon the site ends at.

---

## Quick start

```bash
git clone https://github.com/ronanking/K-Achritecture.git
cd K-Achritecture
npm install
cp .env.example .env.local     # optional — the site runs without it
npm run dev                    # http://localhost:3000
```

```bash
npm run build                  # production build
npm start                      # serve the production build
npm run lint                   # eslint
npx tsc --noEmit               # typecheck
```

Node 20+ is required (Next.js 16).

---

## Stack

| Concern | Choice | Why it is here |
| --- | --- | --- |
| Framework | Next.js 16 (App Router) | Static generation for every page, per-project metadata, image optimisation |
| Language | TypeScript | The project schema is the contract the whole site is built on |
| Styling | Tailwind CSS v4 | Design tokens live in CSS (`@theme`), utilities stay in the markup |
| UI motion | Motion for React | Menus, filters, page arrival, the index → project transition |
| Choreography | GSAP + ScrollTrigger | Every multi-element and scroll-linked sequence |
| Type reveals | GSAP SplitText | Line-by-line masking that reverts to plain text when finished |
| Scrolling | Lenis | One smooth-scroll system, driven by GSAP's ticker |
| Validation | Zod | One schema shared by the contact form and its API route |

Nothing else is installed. There is no component library, no icon pack, no
state manager — React context carries the one piece of cross-tree state
(the index → project transition), and everything else is local.

**Three.js / React Three Fiber are deliberately not installed.** See
[3D](#3d-a-deliberate-omission).

---

## Architecture

```
src/
  app/
    layout.tsx              root shell: fonts, metadata, scroll, structured data
    page.tsx                the homepage sequence
    projects/page.tsx       the index
    projects/[slug]/        one renderer, every project (statically generated)
    studio/ contact/
    api/enquiry/route.ts    enquiry delivery
    sitemap.ts robots.ts
  components/
    layout/                 header, footer, scroll, transitions, grid overlay
    home/                   the six movements of the homepage
    project/                hero, title block, design sequence, gallery, next
    media/Plate.tsx         the one image component
    typography/Reveal.tsx   the one text animation
    contact/ ui/
  content/
    projects/*.ts           one file per project
    studio.ts
  lib/
    projects/               schema, queries, categories
    animation/gsap.ts       single plugin registration, shared easings
    site.ts enquiry.ts
public/images/projects/     photography, by project slug
```

### Adding a project

1. Copy an existing file in `src/content/projects/`, e.g. `wallumburn.ts`.
2. Fill in what you know. **Leave out what you don't** — every field except
   `slug`, `title`, `category`, `order` and `hero` is optional, and the page is
   designed to look composed when they are missing.
3. Import it in `src/content/projects/index.ts` and add it to the array.

The index, the filters, the route, the metadata, the sitemap entry and the
next-project sequence are all derived. Nothing else needs editing.

### Adding photography

Drop files under `public/images/projects/<slug>/` and set the `src` on the
relevant plate:

```ts
hero: {
  src: "/images/projects/wallumburn/hero.jpg",
  alt: "Wallumburn seen across its landscape…",
  aspect: 16 / 9,
}
```

`aspect` is declared in the data and reserved in the layout **before** the file
loads, so adding photography never shifts the page and never re-measures a
scroll sequence. Until `src` is set, the plate draws a measured stand-in in its
place (see [Photography](#photography)).

---

## The design system

**Colour** is taken from the material palette the studio builds with, not from
a screen palette: `ink` and `graphite` for shadow, `steel`, `concrete` and
`linen` for notation, `paper` and `chalk` for daylight, and a single accent —
`oxide` — used only to mark state. It never decorates.

**Type** is three faces with three jobs and no fourth:

- **Archivo** — structure. Headings, navigation, anything load-bearing.
- **Newsreader** — argument. The prose that explains a building.
- **DM Mono** — notation. References, metadata, dimensions; the annotation
  voice a drawing uses.

**Layout** is a twelve-bay grid on desktop and six on handheld, inside a sheet
margin that widens with the viewport. Press **G** anywhere on the site — or use
the control in the footer's title block — to see the setting-out grid the pages
are actually composed on.

**Surfaces** alternate between `ink` and `paper` down every page. Each section
declares its own surface, and the navigation reads that declaration to decide
how it should be lit.

---

## The animation architecture

The rule that keeps this maintainable: **Motion and GSAP never control the same
property on the same element.** Their responsibilities are split by kind of
work, not by convenience.

### Motion for React

Interface, and anything that enters or leaves the React tree.

- Handheld navigation panel (clip-path reveal, staggered items)
- Division filter — the sliding oxide rule uses `layoutId`; rows stagger in
- Index → project plate transition (below)
- Page arrival sheet, skipped on the first load
- Contact form state changes

### GSAP

Every multi-element sequence and everything driven by scroll.

- **Overture entrance** — the mark drawn stroke by stroke, the datum struck
  across the sheet, tick marks, the title rising out of a mask
- **Project hero** — datum, masked title lines, metadata
- **Reveal** — line-by-line masking via SplitText, reverted the moment it
  finishes so text goes back to ordinary reflowing markup
- **Method diagrams** — sun, air, ground and material drawn on once

### ScrollTrigger sequences

| Where | What happens | Scrub |
| --- | --- | --- |
| Overture | setting-out lines multiply → close on a rectangle → the rectangle fills with the building → the building takes the frame | 0.35 |
| Selected work | four projects wipe in from the lower edge as sheets laid down, captions cutting rather than fading | 0.28 |
| Project hero | the photograph gives ground slowly while the title leaves faster | 0.4 |
| Project features | plates drift ±5% against the scroll — desktop only | 0.5 |
| Gallery | each plate uncovered from its lower edge, once | — |
| Next project | the following project emerges from the lower edge | 0.4 |
| Coda | the datum returns and rises into a horizon | 0.5 |
| Header | one trigger per surface, switching how the bar is lit | — |

Scrub values are tuned per section rather than set globally: sections that act
as controllers track close to the input, cinematic ones are allowed a little
smoothing.

**Pinning is done with CSS `position: sticky`, not ScrollTrigger's pin.**
Sticky cannot desynchronise from Lenis, needs no pin spacing arithmetic, and
survives a mobile viewport resize without re-measuring. ScrollTrigger is used
only to scrub, never to pin.

### Lenis

One scroll system. Lenis owns the scroll position; GSAP's ticker owns the
clock; ScrollTrigger is updated from Lenis rather than from its own listener:

```ts
lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);
```

`autoRaf: false` so Lenis does not start a second loop. Smoothing is short
(`duration: 0.9`) — the page settles rather than glides. Touch scrolling is
left native (`syncTouch: false`), because synthesised touch scroll always reads
as lag on a phone. Route changes land at the top immediately and refresh
ScrollTrigger on the next frame; web fonts trigger another refresh once they
land, since they change every scroll distance on the page.

### The index → project transition

Clicking a project on the index does not cut to a new page: the plate you were
looking at grows to fill the viewport while the project's hero arrives beneath
it. Navigation is issued **immediately** — the animation runs over the top of
the load rather than in front of it, so nothing here delays the router. A
ceiling releases the overlay if a load is slow, and reduced-motion visitors
navigate directly.

### Restraint

Nothing loops. Nothing moves that isn't explaining something. There is no
permanent cursor blob — the marker appears only over elements carrying
`data-cursor`, where the image lives somewhere other than the thing being
pointed at and the affordance genuinely needs stating, and it is off entirely
on touch and coarse pointers.

---

## Reduced motion

`prefers-reduced-motion: reduce` is honoured before the first paint. An inline
script in `<head>` sets `data-anim` on `<html>`, and elements that are meant to
arrive are hidden by CSS **only** when that flag is on — so a visitor with
reduced motion, or with JavaScript disabled, never waits for something that
will not happen, and never sees a flash of hidden content.

With reduced motion: Lenis is not instantiated at all, every GSAP
`matchMedia` block is skipped, the plate transition falls back to a direct
navigation, and all content is simply present. The site is designed to be
beautiful standing still.

---

## Photography

**No stock imagery stands in for K Architecture's work, and no architectural
drawings have been invented.**

The studio's own domain was unreachable from the environment this site was
built in (blocked by network policy), so the project photography could not be
downloaded. Rather than substitute generic architecture images, every plate
holds its exact reserved space with a drawn stand-in: a tonal field in the
site's material palette, registration marks to each corner, the sheet
reference, and the ratio the photograph will occupy.

This means:

- the compositions, scroll choreography and layout are all final and correct;
- adding a `src` to a plate is the entire handover — nothing else changes;
- nothing on the site misrepresents the practice's work.

See [What would unlock the most](#what-would-unlock-the-most).

---

## 3D — a deliberate omission

Three.js, React Three Fiber and Drei are **not** installed, because no
architectural models exist to put in them and fabricating a low-quality model
of someone's building would misrepresent it.

The project schema already carries the field:

```ts
model?: { src: string; poster?: Plate; layers?: string[] }
```

If the studio supplies a `.glb` for a flagship project, the intended sequence
is a scroll-driven separation — complete building → roof lifts → upper floor →
ground floor → plan — with orbit and floor isolation. That would add R3F and
Drei, dynamically imported so the model never blocks first render, with DPR
capped, rendering paused when off-screen, and geometry disposed on unmount.

## Drawing → reality — built and idle

The same applies to `DrawingSequence`. The component is complete: it draws a
plan on stroke by stroke as the page scrolls, then dissolves it into the
photograph of the space it describes. It renders only for drawings that carry
real `paths` traced from the studio's own exports, so today every project
returns `null` and the section simply is not part of the page. Adding one plan
to a project's `drawings` array switches it on with no other change.

---

## The enquiry form

The form validates against the same Zod schema on both sides, carries a
honeypot and a submission-timing check, and posts to `/api/enquiry`.

Delivery needs three environment variables (see `.env.example`):
`RESEND_API_KEY`, `ENQUIRY_TO_EMAIL`, `ENQUIRY_FROM_EMAIL`. Set them in the
Vercel project settings.

**Without them the form is still functional and still honest**: it reports that
automatic delivery is not connected and hands the visitor a prepared email,
addressed to the studio, with everything they typed already in it. It never
pretends to have sent something it did not send.

Any provider with a REST send endpoint can replace Resend — it is a single
`fetch` in `src/app/api/enquiry/route.ts`.

The in-memory rate limit is best-effort; serverless instances are not shared.
Put a platform rate limit in front of the route for anything stronger.

---

## Deployment

The intended flow is **local → GitHub → Vercel**, with preview deployments on
every branch and pull request.

A Vercel project named **`k-architecture`** already exists in the
`ronankings-projects` team, and its build pipeline has been verified against
this repository (Next.js 16 detected, dependencies install, Turbopack build
runs). It needs one thing: the Git connection, which can only be made from the
dashboard.

1. Open
   [vercel.com/ronankings-projects/k-architecture/settings/git](https://vercel.com/ronankings-projects/k-architecture/settings/git)
   → **Connect Git Repository** → `ronanking/K-Achritecture`.
   *(Or import the repo fresh at [vercel.com/new](https://vercel.com/new) —
   framework, build command and output directory are all auto-detected and no
   configuration is required either way.)*
2. Add the environment variables from `.env.example` to Production and Preview.
   `NEXT_PUBLIC_SITE_URL` should be the production domain.
3. Set the production branch, then **Deploy**. From that point on, pushes to
   the production branch go live and every other branch gets its own preview
   URL — which is the whole workflow this repository is set up for.

Nothing in the codebase needs changing to deploy. `npm run build` passes
cleanly, all pages except the enquiry route are statically generated, and there
is no custom Vercel configuration to maintain.

`robots.ts` blocks indexing on any deployment where `VERCEL_ENV` is not
`production`, so preview URLs never compete with the real site in search.

---

## Content provenance

Everything factual on this site comes from K Architecture's own published
material — project names, descriptions, locations, categories, credits, team
roles, the award, and the practice's own account of what it does. Where a
detail could not be confirmed it was **left out** rather than approximated:
several projects carry no year, and one carries no location.

Two things to confirm before launch:

- **The phone number** (`0403 266 037`) is taken from the practice's public
  business listings rather than from the studio directly. Verify it in
  `src/lib/site.ts`.
- **Street addresses of private houses are deliberately not published.** Only
  the suburb is shown. Keep it that way.

---

## What would unlock the most

In rough order of impact:

1. **Project photography.** The single largest change available. Every plate is
   already sized, placed and choreographed.
2. **Plan, section and elevation drawings** (SVG, or PDF/DWG to trace). This
   turns on the drawing → reality sequence, which is the idea the whole site is
   organised around.
3. **Photographer and builder credits** per project — the title block is built
   for them and currently runs short.
4. **Years and completion status** for the projects that carry none.
5. **A `.glb` for one flagship project**, which turns on the 3D section.
6. **A studio portrait and team photographs** for the studio page.
7. **The remaining project list** — this build covers nine confirmed projects;
   the archive is larger.
