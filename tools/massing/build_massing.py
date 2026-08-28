"""
Builds The Corso massing model in Blender and exports it as a GLB.

Run with the bpy module rather than the Blender GUI:

    python tools/massing/build_massing.py

The volumes come from tools/massing/the-corso.json, which is generated from
the project content by export-volumes.mjs. Nothing about the arrangement is
decided here — this script only decides how the arrangement is *made*, and
everything it adds is either a property of a physical study model (bevelled
arrises, a base plate) or a direct expression of the storey count the project
data already carries (scored floor lines). It invents no facade, no opening
and no material.

Ambient occlusion is baked in; direct light is not. That split is deliberate.
Occlusion is low frequency — the shadow gathering under the terrace, in the
gap between the towers, along the base — and bakes accurately into a small
texture. Direct light falling across a scored floor line is the opposite: a
0.02 storey recess is smaller than one texel at any texture size worth
shipping, so baking it turns every storey into a smear. The browser shades
that from the geometry's own normals, where there is no resolution limit at
all, and multiplies the baked occlusion into the ambient term.
"""

from __future__ import annotations

import json
import math
import os
import sys
import time
from pathlib import Path

import bpy

ROOT = Path(__file__).resolve().parents[2]
DATA = Path(__file__).resolve().parent / "the-corso.json"
OUT = ROOT / "public" / "models" / "the-corso-massing.glb"

# --- The study model's own conventions ------------------------------------
# One unit is one storey, matching the project data.
# A scribed line, not a stack of slabs. The bevel has to stay well under the
# score or the two meet in the middle and every storey reads as a separate
# tray — which is a different building.
BEVEL = 0.006          # arris width; a card model has no perfectly sharp corner
SCORE_DEPTH = 0.022    # how far a floor line is cut back
SCORE_HALF = 0.013     # half-height of the scored band
BAKE_SIZE = 512
BAKE_SAMPLES = 64

# Pale card for the masses, lighter card for the open elements.
# Card colours, lit by the page rather than by this script.
CARD = (0.55, 0.53, 0.49, 1.0)
CARD_OPEN = (0.80, 0.78, 0.72, 1.0)
GROUND = (0.14, 0.135, 0.125, 1.0)


def log(message: str) -> None:
    print(f"[massing] {message}", flush=True)


# --------------------------------------------------------------------------
# Coordinates
#
# The project data is glTF-handed: x across, y up, z toward the viewer.
# Blender is z-up, and its glTF exporter maps blender (x, y, z) to glTF
# (x, z, -y). Authoring through this one function is what keeps the exported
# model in the same frame as the flat drawing.
# --------------------------------------------------------------------------
def to_blender(x: float, y: float, z: float) -> tuple[float, float, float]:
    return (x, -z, y)


def clear_scene() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)


def add_box(
    name: str,
    centre: tuple[float, float, float],
    size: tuple[float, float, float],
) -> bpy.types.Object:
    """A box in project coordinates: centre (x, y, z), size (w, h, d)."""
    w, h, d = size
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=to_blender(*centre))
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = (w, d, h)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return obj


def storeys(y0: float, y1: float) -> list[float]:
    """Level boundaries inside a volume, on the same whole-storey grid."""
    if y1 - y0 < 2:
        return []
    first = math.ceil(y0 + 0.999)
    return [y for y in range(first, math.ceil(y1 - 0.001))]


def build_volume(volume: dict) -> bpy.types.Object:
    """
    One volume, scored at every storey it contains.

    A tall volume is built as a stack: full-width bodies between the levels,
    and a set-back band at each level line. Boolean cutting would give the
    same picture and a far worse mesh, so the recesses are simply the shape
    the stack is assembled in.
    """
    vid = volume["id"]
    w, h, d = volume["size"]
    px, py, pz = volume["position"]
    y0, y1 = py - h / 2, py + h / 2

    levels = storeys(y0, y1)
    parts: list[bpy.types.Object] = []

    if not levels:
        parts.append(add_box(f"part_{vid}", (px, py, pz), (w, h, d)))
    else:
        edges = [y0]
        for level in levels:
            edges.extend([level - SCORE_HALF, level + SCORE_HALF])
        edges.append(y1)

        for i in range(len(edges) - 1):
            lo, hi = edges[i], edges[i + 1]
            if hi - lo < 1e-4:
                continue
            scored = i % 2 == 1  # every other span is a level band
            inset = SCORE_DEPTH if scored else 0.0
            parts.append(
                add_box(
                    f"part_{vid}_{i}",
                    (px, (lo + hi) / 2, pz),
                    (w - inset * 2, hi - lo, d - inset * 2),
                )
            )

    for part in parts:
        part.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    if len(parts) > 1:
        bpy.ops.object.join()

    obj = bpy.context.active_object
    obj.name = f"massing_{vid}"

    bevel = obj.modifiers.new(name="arris", type="BEVEL")
    bevel.width = BEVEL
    bevel.segments = 2
    bevel.limit_method = "ANGLE"
    bevel.angle_limit = math.radians(40)

    return obj


def build_ground(volumes: list[dict]) -> bpy.types.Object:
    """
    The base the model sits on.

    A study model is made on a board, and the board is what the shadows fall
    across — without it the towers would be lit as if floating.
    """
    xs = [v["position"][0] for v in volumes]
    zs = [v["position"][2] for v in volumes]
    widths = [v["size"][0] for v in volumes]
    depths = [v["size"][2] for v in volumes]

    x0 = min(x - w / 2 for x, w in zip(xs, widths))
    x1 = max(x + w / 2 for x, w in zip(xs, widths))
    z0 = min(z - d / 2 for z, d in zip(zs, depths))
    z1 = max(z + d / 2 for z, d in zip(zs, depths))
    ground = min(v["position"][1] - v["size"][1] / 2 for v in volumes)

    margin = 1.6
    thickness = 0.4
    return add_box(
        "massing_base",
        ((x0 + x1) / 2, ground - thickness / 2, (z0 + z1) / 2),
        (x1 - x0 + margin * 2, thickness, z1 - z0 + margin * 2),
    )


def gltf_output_group() -> bpy.types.NodeTree:
    """
    The exporter's occlusion inlet.

    glTF carries ambient occlusion in its own texture slot, which has no
    equivalent in Blender's shader graph. The exporter reads it from a node
    group with this exact name and an input called Occlusion — arcane, but it
    is the documented route, and the alternative is multiplying occlusion into
    base colour and losing it to whatever the page's own lighting does.
    """
    name = "glTF Material Output"
    group = bpy.data.node_groups.get(name)
    if group is None:
        group = bpy.data.node_groups.new(name, "ShaderNodeTree")
        group.interface.new_socket(
            "Occlusion", in_out="INPUT", socket_type="NodeSocketFloat"
        )
        group.nodes.new("NodeGroupInput")
    return group


def make_material(obj: bpy.types.Object, colour, name: str):
    """Flat card, plus somewhere to bake the occlusion into."""
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()

    output = nodes.new("ShaderNodeOutputMaterial")
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Base Color"].default_value = colour
    bsdf.inputs["Roughness"].default_value = 0.92
    bsdf.inputs["Metallic"].default_value = 0.0
    links.new(bsdf.outputs["BSDF"], output.inputs["Surface"])

    image = bpy.data.images.new(
        f"ao_{name}", width=BAKE_SIZE, height=BAKE_SIZE, alpha=False,
        is_data=True,
    )
    tex = nodes.new("ShaderNodeTexImage")
    tex.image = image
    tex.location = (-420, -260)
    tex.image.colorspace_settings.name = "Non-Color"
    nodes.active = tex

    inlet = nodes.new("ShaderNodeGroup")
    inlet.node_tree = gltf_output_group()
    inlet.location = (140, -320)
    links.new(tex.outputs["Color"], inlet.inputs["Occlusion"])

    obj.data.materials.clear()
    obj.data.materials.append(mat)
    return mat, tex, bsdf, image


def unwrap(obj: bpy.types.Object) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.03)
    bpy.ops.object.mode_set(mode="OBJECT")


def light_the_scene() -> None:
    """
    An even white dome, which is all an occlusion bake needs.

    There is no sun here on purpose: occlusion asks how much of the sky each
    point can see, not where the light comes from. The direction of the light
    is the page's business, and it changes with nothing.
    """
    world = bpy.data.worlds.new("study")
    bpy.context.scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value = (1.0, 1.0, 1.0, 1.0)
    bg.inputs["Strength"].default_value = 1.0


def main() -> int:
    started = time.time()
    data = json.loads(DATA.read_text())
    volumes = data["volumes"]
    log(f"{data['title']}: {len(volumes)} volumes")

    clear_scene()
    light_the_scene()

    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = BAKE_SAMPLES
    scene.cycles.use_denoising = True
    scene.render.bake.use_selected_to_active = False
    scene.render.bake.margin = 6

    built: list[tuple[bpy.types.Object, bpy.types.Image]] = []

    for volume in volumes:
        obj = build_volume(volume)
        bpy.ops.object.select_all(action="DESELECT")
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier="arris")
        # Bake the transform in. Every mesh then arrives in the page already
        # in model space, so nothing on that side has to reproduce Blender's
        # object hierarchy to put a volume where it belongs.
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        colour = CARD_OPEN if volume.get("open") else CARD
        _, tex, bsdf, image = make_material(obj, colour, volume["id"])
        unwrap(obj)
        built.append((obj, image))
        log(f"  built {obj.name}: {len(obj.data.polygons)} faces")

    base = build_ground(volumes)
    bpy.ops.object.select_all(action="DESELECT")
    base.select_set(True)
    bpy.context.view_layer.objects.active = base
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    _, tex, bsdf, image = make_material(base, GROUND, "base")
    unwrap(base)
    built.append((base, image))

    # --- Bake ------------------------------------------------------------
    for obj, image in built:
        bpy.ops.object.select_all(action="DESELECT")
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        t0 = time.time()
        bpy.ops.object.bake(type="AO")
        log(f"  baked {obj.name} in {time.time() - t0:.1f}s")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(
        filepath=str(OUT),
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_apply=True,
        export_cameras=False,
        export_lights=False,
        export_image_format="JPEG",
        export_jpeg_quality=82,
    )

    size = OUT.stat().st_size
    log(f"wrote {OUT.relative_to(ROOT)} — {size / 1024:.0f} KB")
    log(f"done in {time.time() - started:.1f}s")
    return 0


if __name__ == "__main__":
    sys.exit(main())
