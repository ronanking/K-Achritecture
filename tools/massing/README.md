# The massing model

The Corso's massing exists twice on the site: as a flat axonometric drawn in
SVG on the server, and as a card model you can turn. Both are projections of
the same six volumes, and those volumes live in the project content —
`src/content/projects/the-corso.ts` — not here. Nothing in this directory
decides what the model shows; it only decides how the model is made.

## Rebuilding

Two steps, in order.

```sh
# 1. Hand the volumes to Blender. Writes tools/massing/the-corso.json.
node --experimental-strip-types tools/massing/export-volumes.mjs

# 2. Model, bake and export. Writes public/models/the-corso-massing.glb.
python tools/massing/build_massing.py
```

Step two needs Blender available to Python as the `bpy` module. It is not a
project dependency — the model is committed, so nobody has to install a
374 MB wheel to run the site.

```sh
python3.11 -m venv .bpy && .bpy/bin/pip install bpy   # Blender 5.x, Python 3.11
.bpy/bin/python tools/massing/build_massing.py
```

The whole thing takes about twenty seconds.

## What the script is allowed to invent

Nothing about the building. The arrangement comes from the project data, and
the project data comes from The Corso's published description. What this
script adds is only what any physical study model has: bevelled arrises, a
base plate to catch the shadows, and a floor line scored at every storey —
and the storeys are themselves a figure the project data already carries,
since the tower heights are derived from the published apartment counts.

There is no facade here, no opening, no material and no dimension. If the
studio ever supplies drawings, this is the file that should change.

## Why the bake is occlusion only

Occlusion is low frequency — the shadow gathering under the terrace, in the
gap between the towers, along the base — and it bakes accurately into a small
texture. Direct light falling across a scored floor line is the opposite: a
0.02 storey recess is smaller than one texel at any texture size worth
shipping, so baking it turns every storey into a smear. The browser shades
that from the geometry's own normals, where there is no resolution limit, and
multiplies the baked occlusion into the ambient term.
