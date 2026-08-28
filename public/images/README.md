# Photography

Drop files in here and the site uses them. Nothing else has to change: no
content file names an image path, and `npm run build` regenerates the manifest
before every build, on Vercel as well as locally.

A plate with no file is *composed* instead — a light study, deterministic per
plate — so the site is finished-looking whether the archive is complete, half
supplied, or empty. That is deliberate. It means photography can arrive one
project at a time without the site ever showing a hole.

## How to supply an image

Put it at the path for its slot. Any of `.jpg`, `.jpeg`, `.png`, `.webp`
or `.avif` works — the extension is found, not assumed.

```sh
cp ~/Downloads/corso-tower.jpg public/images/projects/the-corso/hero.jpg
npm run build
```

To pull the whole archive off the live site in one go, see
`tools/media/harvest.mjs`:

```sh
npm run media:harvest -- --dry-run   # see what it would take
npm run media:harvest                # take it
```

## Slots

9 projects. A project's slots follow its own structure, so the
hero lands in the hero and each design feature keeps the photograph that
belongs to it.

### Wallumburn

```
projects/wallumburn/hero
projects/wallumburn/feature-01
projects/wallumburn/feature-02
projects/wallumburn/feature-03
projects/wallumburn/gallery-01
projects/wallumburn/gallery-02
projects/wallumburn/gallery-03
projects/wallumburn/gallery-04
```

### James on Tooway Creek

```
projects/james-on-tooway-creek/hero
projects/james-on-tooway-creek/feature-01
projects/james-on-tooway-creek/feature-02
projects/james-on-tooway-creek/feature-03
projects/james-on-tooway-creek/gallery-01
projects/james-on-tooway-creek/gallery-02
projects/james-on-tooway-creek/gallery-03
projects/james-on-tooway-creek/gallery-04
```

### The Corso

```
projects/the-corso/hero
projects/the-corso/feature-01
projects/the-corso/feature-02
projects/the-corso/feature-03
projects/the-corso/gallery-01
projects/the-corso/gallery-02
projects/the-corso/gallery-03
projects/the-corso/gallery-04
```

### The Millwell

```
projects/the-millwell/hero
projects/the-millwell/feature-01
projects/the-millwell/feature-02
projects/the-millwell/feature-03
projects/the-millwell/gallery-01
projects/the-millwell/gallery-02
projects/the-millwell/gallery-03
```

### Market Lane Residences

```
projects/market-lane-residences/hero
projects/market-lane-residences/feature-01
projects/market-lane-residences/feature-02
projects/market-lane-residences/gallery-01
projects/market-lane-residences/gallery-02
projects/market-lane-residences/gallery-03
```

### Soco Apartments

```
projects/soco-apartments/hero
projects/soco-apartments/feature-01
projects/soco-apartments/gallery-01
projects/soco-apartments/gallery-02
projects/soco-apartments/gallery-03
```

### Riviera

```
projects/riviera/hero
projects/riviera/gallery-01
projects/riviera/gallery-02
projects/riviera/gallery-03
```

### Cove

```
projects/cove/hero
projects/cove/feature-01
projects/cove/feature-02
projects/cove/gallery-01
projects/cove/gallery-02
projects/cove/gallery-03
```

### Richard Henry

```
projects/richard-henry/hero
projects/richard-henry/gallery-01
projects/richard-henry/gallery-02
projects/richard-henry/gallery-03
```

### Elsewhere on the site

```
home/statement-01     a room, portrait
home/statement-02     a house in its landscape, very wide
home/method-01        one per position, 01 to 04
home/method-02
home/method-03
home/method-04
home/division-new-homes-and-renovations
home/division-townhouses
home/division-multi-residential
home/division-fit-outs
home/coda             the closing frame, full bleed
studio/opening        the studio page's first plate
studio/discipline-new-homes-and-renovations
studio/discipline-townhouses
studio/discipline-multi-residential
studio/discipline-fit-outs
studio/coda
```

The homepage's selected work and every project card take their images from the
project slots above — they are the same photographs, not separate ones.

## Provenance

`tools/media/harvest.mjs` writes `sources.json` here, recording the page and
the URL each file came from. Keep it: it is the only record of where the
site's photography originated.
