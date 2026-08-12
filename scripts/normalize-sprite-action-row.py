#!/usr/bin/env python3
"""Align one action row without flattening intentional jump animation rows."""

import argparse
from pathlib import Path

from PIL import Image


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("image", type=Path)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--row", type=int, required=True, help="One-based row index")
    parser.add_argument("--baseline", type=int, required=True)
    parser.add_argument("--center-x", type=int)
    parser.add_argument("--columns", type=int, default=4)
    parser.add_argument("--rows", type=int, default=5)
    args = parser.parse_args()

    source = Image.open(args.image).convert("RGBA")
    output = source.copy()
    cell_width = source.width // args.columns
    cell_height = source.height // args.rows
    row = args.row - 1

    for column in range(args.columns):
        left = column * cell_width
        top = row * cell_height
        frame = source.crop((left, top, left + cell_width, top + cell_height))
        bounds = frame.getchannel("A").getbbox()
        if not bounds:
            continue
        shifted = Image.new("RGBA", frame.size)
        offset_y = args.baseline - bounds[3]
        offset_x = 0 if args.center_x is None else round(args.center_x - (bounds[0] + bounds[2]) / 2)
        shifted.alpha_composite(frame, (offset_x, offset_y))
        output.paste(shifted, (left, top))

    args.out.parent.mkdir(parents=True, exist_ok=True)
    output.save(args.out)


if __name__ == "__main__":
    main()
