#!/usr/bin/env python3
"""Render fixed semantic Nimvi role sheets with the runtime palettes."""

from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parent.parent
MODELS = (
    ("Brotinho", ROOT / "public/sprites/roles/nimvi-brotinho-roles.png"),
    ("Lúnula", ROOT / "public/sprites/roles/nimvi-lunula-roles.png"),
    ("Velume", ROOT / "public/sprites/roles/nimvi-velume-roles.png"),
)
PALETTES = (
    ("Pêssego", "#f28f79", "#ffd1a8", "#c95a63", "#281d35", "#67c6aa"),
    ("Índigo", "#34338f", "#42d9dd", "#20215f", "#15132c", "#69f0d0"),
    ("Musgo", "#6faf65", "#c8df8c", "#3c755e", "#203238", "#f2b86b"),
    ("Ameixa", "#9a4d86", "#f08fa1", "#62365f", "#241c35", "#ffbf47"),
    ("Gelo", "#65b9c5", "#d8f1e8", "#47739b", "#26344e", "#ff7c74"),
    ("Caramelo", "#b77745", "#f1c575", "#75434b", "#302037", "#8de0c1"),
    ("Pitaya", "#df6296", "#ffb6c7", "#98476f", "#35203e", "#8fe3c2"),
    ("Tempestade", "#536a83", "#9ebac1", "#37445f", "#202333", "#a68cff"),
)


def body_pattern(marking: int, x: float, y: float) -> int:
    px = int(x * 16) / 16
    py = int(y * 16) / 16

    def ellipse(cx: float, cy: float, rx: float, ry: float) -> bool:
        return ((px - cx) / rx) ** 2 + ((py - cy) / ry) ** 2 <= 1

    pattern = marking % 6
    if pattern == 0:
        return 1 if ellipse(0.3, 0.48, 0.24, 0.38) else 0
    if pattern == 1:
        if ellipse(0.68, 0.28, 0.36, 0.25):
            return 1
        return 2 if py > 0.82 and 0.2 < px < 0.78 else 0
    if pattern == 2:
        if abs(px - (0.42 + (py - 0.5) * 0.1)) < 0.1 and py < 0.78:
            return 1
        return 2 if ellipse(0.77, 0.65, 0.16, 0.2) else 0
    if pattern == 3:
        if ellipse(0.26, 0.32, 0.2, 0.22) or ellipse(0.72, 0.63, 0.25, 0.28):
            return 1
        return 2 if ellipse(0.48, 0.88, 0.28, 0.12) else 0
    if pattern == 4:
        if py < 0.3 + px * 0.12:
            return 1
        return 2 if ellipse(0.28, 0.68, 0.13, 0.16) or ellipse(0.7, 0.56, 0.1, 0.14) else 0
    if ellipse(0.22, 0.55, 0.18, 0.28) or ellipse(0.72, 0.38, 0.22, 0.24):
        return 1
    return 2 if ellipse(0.6, 0.82, 0.24, 0.15) else 0


def rgb(color: str) -> tuple[int, int, int]:
    return Image.new("RGB", (1, 1), color).getpixel((0, 0))


def colorize(
    frame: Image.Image,
    body: str,
    light: str,
    shadow: str,
    outline: str,
    accent: str,
    marking: int,
) -> Image.Image:
    role_sheet = frame.convert("RGBA")
    source = role_sheet.load()
    result = Image.new("RGBA", role_sheet.size)
    target = result.load()
    for y in range(role_sheet.height):
        for x in range(role_sheet.width):
            red, green, blue, alpha = source[x, y]
            if alpha <= 24:
                continue
            target[x, y] = (23, 20, 43, 255) if red < 80 and green < 80 and blue < 80 else (255, 255, 255, 255)
    return result


def main() -> None:
    cell_width = 220
    cell_height = 215
    gallery = Image.new("RGBA", (cell_width * len(PALETTES), cell_height * len(MODELS)), "#f7f1df")
    draw = ImageDraw.Draw(gallery)
    for row, (model_name, source_path) in enumerate(MODELS):
        sheet = Image.open(source_path).convert("RGBA")
        frame = sheet.crop((0, 0, sheet.width // 4, sheet.height // 5))
        for column, (palette_name, body, light, shadow, outline, accent) in enumerate(PALETTES):
            sprite = colorize(frame, body, light, shadow, outline, accent, column)
            bounds = sprite.getbbox()
            if bounds:
                sprite = sprite.crop(bounds)
            sprite.thumbnail((180, 155), Image.Resampling.NEAREST)
            x = column * cell_width + (cell_width - sprite.width) // 2
            y = row * cell_height + 32 + (155 - sprite.height) // 2
            gallery.alpha_composite(sprite, (x, y))
            draw.text((column * cell_width + 10, row * cell_height + 8), f"{model_name} · {palette_name}", fill="#17142b")
    destination = ROOT / "docs/assets/nimvi-fixed-model-gallery.png"
    destination.parent.mkdir(parents=True, exist_ok=True)
    gallery.convert("RGB").save(destination)
    print(destination)

    qa_variants = ((0, 0), (1, 3), (2, 5))
    for (model_name, source_path), (palette_index, marking) in zip(MODELS, qa_variants):
        sheet = Image.open(source_path).convert("RGBA")
        colored = Image.new("RGBA", sheet.size)
        palette_name, body, light, shadow, outline, accent = PALETTES[palette_index]
        source_cell_width = sheet.width // 4
        source_cell_height = sheet.height // 5
        for row in range(5):
            for column in range(4):
                box = (
                    column * source_cell_width,
                    row * source_cell_height,
                    (column + 1) * source_cell_width,
                    (row + 1) * source_cell_height,
                )
                colored.alpha_composite(
                    colorize(sheet.crop(box), body, light, shadow, outline, accent, marking),
                    (box[0], box[1]),
                )
        qa_path = ROOT / "docs/assets" / f"nimvi-color-qa-{model_name.lower()}.png"
        colored.save(qa_path)
        print(f"{qa_path} ({palette_name}, padrão {marking})")


if __name__ == "__main__":
    main()
