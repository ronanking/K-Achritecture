#!/usr/bin/env python3
"""Draw the home screen icon: a wet well in section, with its rising main.

No image libraries in this repo, so the PNG is emitted by hand — a chunk
writer and a small rasteriser are less machinery than a dependency for two
flat images.

    python3 tools/sps-template/make-icons.py
"""

from __future__ import annotations

import struct
import zlib
from pathlib import Path

OUT = Path(__file__).resolve().parents[2] / "public" / "sps"

NAVY = (11, 59, 168)
DEEP = (7, 38, 110)
PAPER = (242, 244, 247)
WATER = (111, 157, 255)
STEEL = (214, 222, 236)


def png(path: Path, size: int, pixels: list[list[tuple[int, int, int]]]) -> None:
    raw = b"".join(
        b"\x00" + b"".join(struct.pack("3B", *pixel) for pixel in row) for row in pixels
    )

    def chunk(kind: bytes, payload: bytes) -> bytes:
        return (
            struct.pack(">I", len(payload))
            + kind
            + payload
            + struct.pack(">I", zlib.crc32(kind + payload) & 0xFFFFFFFF)
        )

    path.write_bytes(
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )


def blend(base, over, alpha):
    return tuple(round(b + (o - b) * alpha) for b, o in zip(base, over))


def coverage(x, y, inside, samples=3):
    """Fraction of a pixel inside a shape, sampled on a grid, for clean edges."""
    hits = 0
    for sy in range(samples):
        for sx in range(samples):
            if inside(x + (sx + 0.5) / samples, y + (sy + 0.5) / samples):
                hits += 1
    return hits / (samples * samples)


def draw(size: int) -> list[list[tuple[int, int, int]]]:
    u = size / 100.0  # work in a 100x100 design grid

    def rect(x0, y0, x1, y1, radius=0.0):
        def inside(px, py):
            px, py = px / u, py / u
            if not (x0 <= px <= x1 and y0 <= py <= y1):
                return False
            if radius <= 0:
                return True
            for cx, cy in ((x0 + radius, y0 + radius), (x1 - radius, y0 + radius),
                           (x0 + radius, y1 - radius), (x1 - radius, y1 - radius)):
                if abs(px - cx) > radius or abs(py - cy) > radius:
                    continue
                if (px - cx) ** 2 + (py - cy) ** 2 > radius**2:
                    if (px < x0 + radius or px > x1 - radius) and (
                        py < y0 + radius or py > y1 - radius
                    ):
                        return False
            return True

        return inside

    def disc(cx, cy, r):
        return lambda px, py: (px / u - cx) ** 2 + (py / u - cy) ** 2 <= r**2

    # A wet well seen in section: chamber walls, standing water, riser pipe up
    # and over to the rising main.
    shapes = [
        (rect(0, 0, 100, 100, 22), NAVY),
        (rect(18, 24, 74, 88, 4), DEEP),     # chamber walls
        (rect(23, 29, 69, 83, 2), PAPER),    # dry side
        (rect(23, 58, 69, 83, 2), WATER),    # standing water
        (rect(41, 40, 49, 72), STEEL),       # riser
        (disc(45, 72, 7.5), STEEL),          # pump
        (rect(41, 40, 90, 47), STEEL),       # rising main, out through the wall
        (rect(26, 17, 66, 26, 3), STEEL),    # access lid, sitting on the slab
    ]

    pixels = []
    for y in range(size):
        row = []
        for x in range(size):
            colour = (0, 0, 0)
            alpha_total = 0.0
            for inside, shade in shapes:
                a = coverage(x, y, inside)
                if a:
                    colour = blend(colour, shade, a) if alpha_total else shade
                    alpha_total = max(alpha_total, a)
            row.append(colour if alpha_total else PAPER)
        pixels.append(row)
    return pixels


def main() -> None:
    for size in (180, 512):
        png(OUT / f"icon-{size}.png", size, draw(size))
        print(f"wrote public/sps/icon-{size}.png")


if __name__ == "__main__":
    main()
