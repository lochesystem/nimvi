#!/usr/bin/env python3
"""Encode generated dark outlines and white interiors as a transparent sprite mask."""

from pathlib import Path
import sys

from PIL import Image


def main() -> None:
    source = Path(sys.argv[1])
    destination = Path(sys.argv[2])
    image = Image.open(source).convert("RGBA")
    width, height = image.size
    image = image.crop((0, 0, width - width % 4, height - height % 5))

    encoded = []
    for red, green, blue, _alpha in image.getdata():
        luminance = (red * 299 + green * 587 + blue * 114) // 1000
        if luminance < 96:
            encoded.append((19, 18, 27, 255))
        elif green > red * 1.35 and green > blue * 1.35:
            encoded.append((0, 0, 0, 0))
        elif luminance > 150:
            encoded.append((255, 255, 255, 255))
        else:
            encoded.append((0, 0, 0, 0))

    image.putdata(encoded)
    destination.parent.mkdir(parents=True, exist_ok=True)
    image.save(destination)


if __name__ == "__main__":
    main()
