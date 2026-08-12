#!/usr/bin/env python3
"""Render the five four-frame action rows together at gameplay speed."""

from pathlib import Path
import sys

from PIL import Image, ImageDraw


ACTIONS = ("IDLE", "CARINHO", "TRISTE", "MOVIMENTO", "PULO")


def main() -> None:
    source = Path(sys.argv[1])
    destination = Path(sys.argv[2])
    sheet = Image.open(source).convert("RGBA")
    cell_width = sheet.width // 4
    cell_height = sheet.height // 5
    scale = 1
    label_width = 92
    frames = []

    for column in range(4):
        preview = Image.new(
            "RGBA",
            (label_width + cell_width * scale, cell_height * 5 * scale),
            (244, 239, 220, 255),
        )
        draw = ImageDraw.Draw(preview)
        for row, action in enumerate(ACTIONS):
            frame = sheet.crop(
                (
                    column * cell_width,
                    row * cell_height,
                    (column + 1) * cell_width,
                    (row + 1) * cell_height,
                )
            )
            y = row * cell_height
            draw.text((8, y + 10), action, fill=(34, 31, 45, 255))
            draw.line(
                (label_width, y + round(cell_height * 0.94), preview.width, y + round(cell_height * 0.94)),
                fill=(198, 187, 161, 255),
                width=1,
            )
            preview.alpha_composite(frame, (label_width, y))
        frames.append(preview.convert("P", palette=Image.Palette.ADAPTIVE))

    destination.parent.mkdir(parents=True, exist_ok=True)
    frames[0].save(
        destination,
        save_all=True,
        append_images=frames[1:],
        duration=140,
        loop=0,
        disposal=2,
    )


if __name__ == "__main__":
    main()
