#!/usr/bin/env python3
"""Render the complete Lumeli laboratory evolution sequence as a GIF."""

from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "docs/assets/nimvi-lumeli-evolution.gif"
SIZE = (800, 600)
CELL = (313, 250)
INK = "#17142b"


def frame_from_sheet(path: Path, column: int, row: int) -> Image.Image:
    sheet = Image.open(path).convert("RGBA")
    return sheet.crop((column * CELL[0], row * CELL[1], (column + 1) * CELL[0], (row + 1) * CELL[1]))


def laboratory() -> Image.Image:
    image = Image.new("RGBA", SIZE, "#d9e9e7")
    draw = ImageDraw.Draw(image)
    for x in range(0, SIZE[0], 40):
        draw.line((x, 0, x, 420), fill="#afc8c7", width=2)
    for y in range(0, 421, 40):
        draw.line((0, y, SIZE[0], y), fill="#afc8c7", width=2)
    draw.rectangle((0, 420, 800, 600), fill="#879fa1", outline=INK, width=8)
    for x in range(0, SIZE[0], 64):
        draw.line((x, 420, x, 600), fill="#748c8f", width=2)
    for y in range(452, 600, 32):
        draw.line((0, y, 800, y), fill="#748c8f", width=2)
    draw.rectangle((235, 453, 565, 515), fill="#8fd8d2", outline=INK, width=7)
    draw.rectangle((235, 492, 565, 515), fill="#47747b")
    for x in (285, 395, 505):
        draw.rectangle((x, 470, x + 12, 482), fill="#fff18b", outline=INK, width=3)
    draw.rectangle((35, 32, 215, 92), fill="#fffaf0", outline=INK, width=4)
    draw.text((54, 53), "LAB NIMVI  02", fill=INK)
    return image


def place(base: Image.Image, sprite: Image.Image, scale: float = 1, black: bool = False, y_shift: int = 0) -> Image.Image:
    result = base.copy()
    sprite = sprite.copy()
    if black:
        alpha = sprite.getchannel("A")
        silhouette = Image.new("RGBA", sprite.size, INK)
        silhouette.putalpha(alpha)
        sprite = silhouette
    width = round(sprite.width * scale)
    height = round(sprite.height * scale)
    sprite = sprite.resize((width, height), Image.Resampling.NEAREST)
    result.alpha_composite(sprite, ((SIZE[0] - width) // 2, 445 - height + y_shift))
    return result


def main() -> None:
    old_sheet = ROOT / "public/sprites/nimvi-lumeli.png"
    new_sheet = ROOT / "public/sprites/nimvi-lumeli-stage2.png"
    old = frame_from_sheet(old_sheet, 0, 0)
    new_idle = [frame_from_sheet(new_sheet, index, 0) for index in range(4)]
    new_happy = [frame_from_sheet(new_sheet, index, 1) for index in range(4)]
    lab = laboratory()
    sequence: list[tuple[Image.Image, int]] = []

    sequence += [(place(lab, old), 240)] * 4
    for index in range(6):
        charged = place(lab, old, 1 + index * .018)
        draw = ImageDraw.Draw(charged)
        radius = 95 + index * 22
        draw.ellipse((400 - radius, 315 - radius, 400 + radius, 315 + radius), outline="#ffffff", width=8)
        sequence.append((charged, 100))
    sequence += [(Image.new("RGBA", SIZE, "white"), 100)] * 5
    sequence += [(place(lab, new_idle[0], .78, True), 150), (place(lab, new_idle[0], .9, True), 150), (place(lab, new_idle[0], 1.02, True), 220)]
    sequence += [(Image.new("RGBA", SIZE, "white"), 90), (place(lab, new_idle[0], 1.02), 320)]
    for _ in range(3):
        for index, happy in enumerate(new_happy):
            sequence.append((place(lab, happy, 1.02, y_shift=-8 if index == 2 else 0), 180))

    frames = [image.convert("P", palette=Image.Palette.ADAPTIVE) for image, _ in sequence]
    durations = [duration for _, duration in sequence]
    frames[0].save(OUT, save_all=True, append_images=frames[1:], duration=durations, loop=0, disposal=2)
    print(OUT)


if __name__ == "__main__":
    main()
