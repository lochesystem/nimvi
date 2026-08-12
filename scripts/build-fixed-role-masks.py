#!/usr/bin/env python3
"""Build fixed semantic role masks for the three approved Nimvi spritesheets."""

from collections import deque
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parent.parent
SOURCES = (
    ("brotinho", ROOT / "public/sprites/nimvi-brotinho.png"),
    ("lunula", ROOT / "public/sprites/nimvi-lunula.png"),
    ("velume", ROOT / "public/sprites/nimvi-velume.png"),
)

OUTLINE = (0, 0, 0, 255)
BODY = (255, 255, 255, 255)
ACCESSORY = (255, 0, 255, 255)
DETAIL = (255, 255, 0, 255)


def source_regions(frame: Image.Image) -> tuple[set[tuple[int, int]], set[tuple[int, int]]]:
    frame = frame.convert("RGBA")
    width, height = frame.size
    pixels = frame.load()
    outline: set[tuple[int, int]] = set()
    explicit_fill: set[tuple[int, int]] = set()
    for y in range(height):
        for x in range(width):
            red, green, blue, alpha = pixels[x, y]
            if alpha <= 24:
                continue
            luminance = red * 0.299 + green * 0.587 + blue * 0.114
            (explicit_fill if luminance > 150 else outline).add((x, y))

    if explicit_fill:
        bridge = set()
        for y in range(height):
            for x in range(width):
                if (x, y) in outline or (x, y) in explicit_fill:
                    continue
                horizontal_seam = (
                    ((x - 1, y) in outline and (x + 1, y) in explicit_fill)
                    or ((x + 1, y) in outline and (x - 1, y) in explicit_fill)
                )
                vertical_seam = (
                    ((x, y - 1) in outline and (x, y + 1) in explicit_fill)
                    or ((x, y + 1) in outline and (x, y - 1) in explicit_fill)
                )
                if horizontal_seam or vertical_seam:
                    bridge.add((x, y))
        return outline, explicit_fill | bridge

    outside: set[tuple[int, int]] = set()
    queue: deque[tuple[int, int]] = deque()

    def enqueue(x: int, y: int) -> None:
        point = (x, y)
        if not (0 <= x < width and 0 <= y < height) or point in outside or point in outline:
            return
        outside.add(point)
        queue.append(point)

    for x in range(width):
        enqueue(x, 0)
        enqueue(x, height - 1)
    for y in range(height):
        enqueue(0, y)
        enqueue(width - 1, y)
    while queue:
        x, y = queue.popleft()
        enqueue(x - 1, y)
        enqueue(x + 1, y)
        enqueue(x, y - 1)
        enqueue(x, y + 1)

    fill = {
        (x, y)
        for y in range(height)
        for x in range(width)
        if (x, y) not in outside and (x, y) not in outline
    }
    return outline, fill


def fill_open_tail(
    outline: set[tuple[int, int]],
    accessory: set[tuple[int, int]],
    box: tuple[int, int, int, int],
) -> None:
    left, top, right, bottom = box
    for y in range(top, bottom):
        xs = [x for x in range(left, right) if (x, y) in outline]
        if len(xs) < 2 or max(xs) - min(xs) > 72:
            continue
        for x in range(min(xs) + 1, max(xs)):
            if (x, y) not in outline:
                accessory.add((x, y))


def connected_components(points: set[tuple[int, int]]) -> list[set[tuple[int, int]]]:
    visited: set[tuple[int, int]] = set()
    components: list[set[tuple[int, int]]] = []
    for start in points:
        if start in visited:
            continue
        component: set[tuple[int, int]] = set()
        queue = deque([start])
        visited.add(start)
        while queue:
            x, y = queue.popleft()
            component.add((x, y))
            for neighbor in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                if neighbor in points and neighbor not in visited:
                    visited.add(neighbor)
                    queue.append(neighbor)
        components.append(component)
    return sorted(components, key=len, reverse=True)


def classify(
    model: str,
    row: int,
    outline: set[tuple[int, int]],
    fill: set[tuple[int, int]],
) -> tuple[set[tuple[int, int]], set[tuple[int, int]], set[tuple[int, int]]]:
    body = set(fill)
    accessory: set[tuple[int, int]] = set()
    detail: set[tuple[int, int]] = set()
    components = connected_components(fill)
    main = components[0] if components else set()

    if model == "brotinho":
        for component in components[1:]:
            min_x = min(x for x, _ in component)
            min_y = min(y for _, y in component)
            if min_y < 150 or min_x > 220:
                accessory |= component
        if row <= 2:
            accessory |= {
                (x, y)
                for x, y in main
                if ((x < 140 or x > 150) and y < 125) or (x > 220 and y > 125)
            }
        else:
            accessory |= {(x, y) for x, y in main if (x > 62 and y < 145) or (x > 220 and y > 125)}

    elif model == "lunula":
        for component in components[1:]:
            min_x = min(x for x, _ in component)
            min_y = min(y for _, y in component)
            if min_y < 205 or min_x > 220:
                accessory |= component
        accessory |= {(x, y) for x, y in main if x < 125 and y < 135}
        fill_open_tail(outline, accessory, (220, 115, 305, 230))

    else:
        for component in components[1:]:
            min_x = min(x for x, _ in component)
            min_y = min(y for _, y in component)
            max_x = max(x for x, _ in component)
            max_y = max(y for _, y in component)
            if min_y < 150 or max_x > 210:
                accessory |= component
            elif min_y < 200 and max_y < 200 and 80 < min_x < 165:
                detail |= component
        if row <= 2:
            accessory |= {
                (x, y)
                for x, y in main
                if (x < 112 and y < 136)
                or (x > 150 and y < 0.8 * x - 18)
                or (x > 215 and y > 118)
            }
            detail |= {
                (x, y)
                for x, y in main
                if y < 130 and (105 <= x <= 128 or 140 <= x <= 164)
            }
        # A cauda do Velume já tem sua área definida pelo desenho-base. Não a
        # fechamos por scanlines: em curvas abertas isso pode pintar o espaço
        # transparente entre a cauda e o corpo.

    detail -= accessory
    body -= accessory
    body -= detail
    return body, accessory, detail


def build_sheet(model: str, source_path: Path) -> Path:
    source = Image.open(source_path).convert("RGBA")
    output = Image.new("RGBA", source.size)
    cell_width = source.width // 4
    cell_height = source.height // 5
    for row in range(5):
        for column in range(4):
            left = column * cell_width
            top = row * cell_height
            frame = source.crop((left, top, left + cell_width, top + cell_height))
            outline, fill = source_regions(frame)
            body, accessory, detail = classify(model, row, outline, fill)
            mask = Image.new("RGBA", frame.size)
            pixels = mask.load()
            for point in outline:
                pixels[point] = OUTLINE
            for point in body:
                pixels[point] = BODY
            for point in accessory:
                pixels[point] = ACCESSORY
            for point in detail:
                pixels[point] = DETAIL
            output.alpha_composite(mask, (left, top))

    destination = ROOT / "public/sprites/roles" / f"nimvi-{model}-roles.png"
    destination.parent.mkdir(parents=True, exist_ok=True)
    output.save(destination)
    print(destination)
    return destination


def main() -> None:
    for model, source in SOURCES:
        build_sheet(model, source)


if __name__ == "__main__":
    main()
