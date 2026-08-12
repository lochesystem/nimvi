#!/usr/bin/env python3
"""Verify that fixed role masks never paint outside the approved silhouette."""

from collections import deque
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parent.parent
MODELS = ("brotinho", "lunula", "velume")
ROLE_COLORS = {
    (0, 0, 0, 255),
    (255, 255, 255, 255),
    (255, 0, 255, 255),
    (255, 255, 0, 255),
}


def outside_of(outline: set[tuple[int, int]], width: int, height: int) -> set[tuple[int, int]]:
    outside: set[tuple[int, int]] = set()
    queue: deque[tuple[int, int]] = deque()

    def enqueue(point: tuple[int, int]) -> None:
        x, y = point
        if not (0 <= x < width and 0 <= y < height) or point in outside or point in outline:
            return
        outside.add(point)
        queue.append(point)

    for x in range(width):
        enqueue((x, 0))
        enqueue((x, height - 1))
    for y in range(height):
        enqueue((0, y))
        enqueue((width - 1, y))
    while queue:
        x, y = queue.popleft()
        for neighbor in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            enqueue(neighbor)
    return outside


def is_strict_seam(
    point: tuple[int, int],
    outline: set[tuple[int, int]],
    fill: set[tuple[int, int]],
) -> bool:
    x, y = point
    return (
        ((x - 1, y) in outline and (x + 1, y) in fill)
        or ((x + 1, y) in outline and (x - 1, y) in fill)
        or ((x, y - 1) in outline and (x, y + 1) in fill)
        or ((x, y + 1) in outline and (x, y - 1) in fill)
    )


def is_contour_bracketed(point: tuple[int, int], outline: set[tuple[int, int]]) -> bool:
    x, y = point
    row = [px for px, py in outline if py == y and abs(px - x) <= 72]
    return any(px < x for px in row) and any(px > x for px in row)


def audit() -> int:
    failures: list[str] = []
    for model in MODELS:
        source_sheet = Image.open(ROOT / "public/sprites" / f"nimvi-{model}.png").convert("RGBA")
        role_sheet = Image.open(ROOT / "public/sprites/roles" / f"nimvi-{model}-roles.png").convert("RGBA")
        if source_sheet.size != role_sheet.size:
            failures.append(f"{model}: dimensões diferentes")
            continue
        cell_width = source_sheet.width // 4
        cell_height = source_sheet.height // 5
        model_added = 0
        for row in range(5):
            for column in range(4):
                box = (
                    column * cell_width,
                    row * cell_height,
                    (column + 1) * cell_width,
                    (row + 1) * cell_height,
                )
                source = source_sheet.crop(box)
                roles = role_sheet.crop(box)
                source_pixels = source.load()
                role_pixels = roles.load()
                source_opaque: set[tuple[int, int]] = set()
                outline: set[tuple[int, int]] = set()
                explicit_fill: set[tuple[int, int]] = set()
                for y in range(cell_height):
                    for x in range(cell_width):
                        red, green, blue, alpha = source_pixels[x, y]
                        if alpha <= 24:
                            continue
                        source_opaque.add((x, y))
                        luminance = red * 0.299 + green * 0.587 + blue * 0.114
                        (explicit_fill if luminance > 150 else outline).add((x, y))
                outside = outside_of(outline, cell_width, cell_height)
                added = []
                for y in range(cell_height):
                    for x in range(cell_width):
                        role = role_pixels[x, y]
                        if role[3] <= 24:
                            continue
                        if role not in ROLE_COLORS:
                            failures.append(f"{model} r{row} f{column}: papel de cor inválido {role}")
                        point = (x, y)
                        if point in source_opaque:
                            continue
                        enclosed = point not in outside and point not in outline
                        safe = enclosed or is_strict_seam(point, outline, explicit_fill) or is_contour_bracketed(point, outline)
                        if not safe:
                            added.append(point)
                if added:
                    failures.append(f"{model} r{row} f{column}: {len(added)} pixels invadem transparência")
                model_added += sum(
                    1
                    for y in range(cell_height)
                    for x in range(cell_width)
                    if role_pixels[x, y][3] > 24 and (x, y) not in source_opaque
                )
        print(f"{model}: máscara contida; {model_added} pixels internos fechados restaurados")
    for failure in failures:
        print(f"FAIL: {failure}")
    print("PASS" if not failures else "REPROVADO")
    return 0 if not failures else 1


if __name__ == "__main__":
    raise SystemExit(audit())
