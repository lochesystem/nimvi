#!/usr/bin/env python3
"""Render the complete white Nimvi collection from idle frame zero."""

from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parent.parent
MODELS = (
    ("Brotinho", "roles/nimvi-brotinho-roles.png"),
    ("Lúnula", "roles/nimvi-lunula-roles.png"),
    ("Velume", "roles/nimvi-velume-roles.png"),
    ("Mocori", "nimvi-mocori.png"),
    ("Soruli", "nimvi-soruli.png"),
    ("Aguari", "nimvi-aguari.png"),
    ("Cravim", "nimvi-cravim.png"),
    ("Tobiru", "nimvi-tobiru.png"),
    ("Paturi", "nimvi-paturi.png"),
    ("Lumeli", "nimvi-lumeli.png"),
    ("Castu", "nimvi-castu.png"),
    ("Orumo", "nimvi-orumo.png"),
    ("Ziru", "nimvi-ziru.png"),
    ("Rizo", "nimvi-rizo.png"),
    ("Uvilo", "nimvi-uvilo.png"),
    ("Tavri", "nimvi-tavri.png"),
    ("Kelo", "nimvi-kelo.png"),
    ("Bumo", "nimvi-bumo.png"),
    ("Neli", "nimvi-neli.png"),
    ("Piri", "nimvi-piri.png"),
    ("Savo", "nimvi-savo.png"),
    ("Muru", "nimvi-muru.png"),
    ("Vaski", "nimvi-vaski.png"),
)


def neutralize(frame: Image.Image) -> Image.Image:
    frame = frame.convert("RGBA")
    pixels = frame.load()
    for y in range(frame.height):
        for x in range(frame.width):
            red, green, blue, alpha = pixels[x, y]
            if alpha <= 24:
                continue
            pixels[x, y] = (23, 20, 43, 255) if red < 80 and green < 80 and blue < 80 else (255, 255, 255, 255)
    return frame


def main() -> None:
    card_width = 300
    card_height = 260
    columns = 5
    rows = (len(MODELS) + columns - 1) // columns
    gallery = Image.new("RGBA", (card_width * columns, card_height * rows), "#f7f1df")
    draw = ImageDraw.Draw(gallery)
    for index, (name, filename) in enumerate(MODELS):
        sheet = Image.open(ROOT / "public/sprites" / filename).convert("RGBA")
        frame = neutralize(sheet.crop((0, 0, sheet.width // 4, sheet.height // 5)))
        bounds = frame.getbbox()
        if bounds:
            frame = frame.crop(bounds)
        frame.thumbnail((250, 205), Image.Resampling.NEAREST)
        column = index % columns
        row = index // columns
        x = column * card_width + (card_width - frame.width) // 2
        y = row * card_height + 35 + (205 - frame.height) // 2
        gallery.alpha_composite(frame, (x, y))
        draw.text((column * card_width + 14, row * card_height + 12), name, fill="#17142b")
    destination = ROOT / "docs/assets/nimvi-model-collection.png"
    gallery.convert("RGB").save(destination)
    print(destination)


if __name__ == "__main__":
    main()
