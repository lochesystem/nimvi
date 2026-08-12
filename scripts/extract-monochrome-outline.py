#!/usr/bin/env python3
"""Keep only dark outline pixels from a generated concept spritesheet."""

from pathlib import Path
import sys

from PIL import Image


def main() -> None:
    source = Path(sys.argv[1])
    destination = Path(sys.argv[2])
    image = Image.open(source).convert("RGBA")

    # Five animation rows need an exact integer cell height for QA/cropping.
    width, height = image.size
    height -= height % 5
    image = image.crop((0, 0, width - (width % 4), height))

    pixels = []
    for red, green, blue, _alpha in image.getdata():
        luminance = (red * 299 + green * 587 + blue * 114) // 1000
        if luminance < 96:
            pixels.append((19, 18, 27, 255))
        else:
            pixels.append((0, 0, 0, 0))

    image.putdata(pixels)
    destination.parent.mkdir(parents=True, exist_ok=True)
    image.save(destination)


if __name__ == "__main__":
    main()
