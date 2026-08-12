#!/usr/bin/env python3
"""Convert image-generated 4x2 chroma-key sheets into Nimvi's 4x5 runtime grid."""

from collections import deque
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parent.parent
SOURCE_V1 = ROOT / "docs/source-art/nimvi-new-models-keyed"
SOURCE_V2 = ROOT / "docs/source-art/nimvi-new-models-2-keyed"
DESTINATION = ROOT / "public/sprites"
MODELS_V1 = ("mocori", "soruli", "aguari", "cravim", "tobiru", "paturi", "lumeli", "castu", "orumo", "ziru")
MODELS_V2 = ("rizo", "uvilo", "tavri", "kelo", "bumo", "neli", "piri", "savo", "muru", "vaski")
MODELS = MODELS_V1 + MODELS_V2
CELL_WIDTH = 313
CELL_HEIGHT = 250
OUTPUT_ROWS = 5
OUTLINE = (23, 20, 43, 255)
WHITE = (255, 255, 255, 255)


def largest_component_bbox(image: Image.Image) -> tuple[int, int, int, int]:
    alpha = image.getchannel("A")
    width, height = image.size
    opaque = {(x, y) for y in range(height) for x in range(width) if alpha.getpixel((x, y)) > 96}
    visited: set[tuple[int, int]] = set()
    components: list[set[tuple[int, int]]] = []
    for start in opaque:
        if start in visited:
            continue
        component: set[tuple[int, int]] = set()
        queue = deque([start])
        visited.add(start)
        while queue:
            x, y = queue.popleft()
            component.add((x, y))
            for neighbor in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                if neighbor in opaque and neighbor not in visited:
                    visited.add(neighbor)
                    queue.append(neighbor)
        components.append(component)
    main = max(components, key=len)
    left = min(x for x, _ in main)
    top = min(y for _, y in main)
    right = max(x for x, _ in main) + 1
    bottom = max(y for _, y in main) + 1
    pad_x = max(8, round((right - left) * 0.05))
    pad_y = max(8, round((bottom - top) * 0.05))
    return max(0, left - pad_x), max(0, top - pad_y), min(width, right + pad_x), min(height, bottom + pad_y)


def crisp_monochrome(image: Image.Image) -> Image.Image:
    source = image.convert("RGBA")
    result = Image.new("RGBA", source.size)
    source_pixels = source.load()
    target = result.load()
    for y in range(source.height):
        for x in range(source.width):
            red, green, blue, alpha = source_pixels[x, y]
            if alpha <= 96:
                continue
            luminance = red * 0.299 + green * 0.587 + blue * 0.114
            target[x, y] = OUTLINE if luminance < 150 else WHITE
    return result


def build_model(model: str) -> Path:
    source_dir = SOURCE_V1 if model in MODELS_V1 else SOURCE_V2
    source = Image.open(source_dir / f"{model}.png").convert("RGBA")
    source_cell_width = source.width // 4
    source_cell_height = source.height // 2
    frames: list[Image.Image] = []
    boxes: list[tuple[int, int, int, int]] = []
    for row in range(2):
        for column in range(4):
            frame = source.crop((
                column * source_cell_width,
                row * source_cell_height,
                (column + 1) * source_cell_width,
                (row + 1) * source_cell_height,
            ))
            box = largest_component_bbox(frame)
            frames.append(crisp_monochrome(frame.crop(box)))
            boxes.append(box)

    widest = max(frame.width for frame in frames)
    tallest = max(frame.height for frame in frames)
    scale = min(266 / widest, 205 / tallest, 1)
    sheet = Image.new("RGBA", (CELL_WIDTH * 4, CELL_HEIGHT * OUTPUT_ROWS))
    for index, frame in enumerate(frames):
        width = max(1, round(frame.width * scale))
        height = max(1, round(frame.height * scale))
        resized = frame.resize((width, height), Image.Resampling.NEAREST)
        column = index % 4
        row = index // 4
        opaque_box = resized.getbbox()
        if not opaque_box:
            continue
        opaque_left, _, opaque_right, opaque_bottom = opaque_box
        opaque_width = opaque_right - opaque_left
        target_bottom = 228 - (2 if row == 1 and column == 3 else 0)
        x = column * CELL_WIDTH + (CELL_WIDTH - opaque_width) // 2 - opaque_left
        y = row * CELL_HEIGHT + target_bottom - opaque_bottom
        sheet.alpha_composite(resized, (x, y))

    destination = DESTINATION / f"nimvi-{model}.png"
    sheet.save(destination)
    qa_destination = ROOT / "docs/assets" / f"nimvi-new-model-qa-{model}.png"
    qa_destination.parent.mkdir(parents=True, exist_ok=True)
    qa_sheet = sheet.crop((0, 0, CELL_WIDTH * 4, CELL_HEIGHT * 2))
    qa_sheet.save(qa_destination)
    qa_sheet.crop((0, 0, CELL_WIDTH * 4, CELL_HEIGHT)).save(ROOT / "docs/assets" / f"nimvi-new-model-idle-{model}.png")
    qa_sheet.crop((0, CELL_HEIGHT, CELL_WIDTH * 4, CELL_HEIGHT * 2)).save(ROOT / "docs/assets" / f"nimvi-new-model-happy-{model}.png")
    print(f"{model}: {source.size} -> {sheet.size}, scale={scale:.3f}, source_boxes={boxes}")
    return destination


def main() -> None:
    DESTINATION.mkdir(parents=True, exist_ok=True)
    for model in MODELS:
        build_model(model)


if __name__ == "__main__":
    main()
