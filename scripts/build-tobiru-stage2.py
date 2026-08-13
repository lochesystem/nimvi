#!/usr/bin/env python3
"""Build the Tobiru stage-2 runtime sheet and QA previews from keyed source art."""

from collections import deque
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "docs/source-art/nimvi-evolution/tobiru-stage2-keyed.png"
DESTINATION = ROOT / "public/sprites/nimvi-tobiru-stage2.png"
QA = ROOT / "docs/assets/nimvi-tobiru-stage2-sheet.png"
IDLE_GIF = ROOT / "docs/assets/nimvi-tobiru-stage2-idle.gif"
HAPPY_GIF = ROOT / "docs/assets/nimvi-tobiru-stage2-happy.gif"
CELL_WIDTH = 313
CELL_HEIGHT = 250
OUTLINE = (23, 20, 43, 255)
WHITE = (255, 255, 255, 255)


def remove_key(image: Image.Image) -> Image.Image:
    result = Image.new("RGBA", image.size)
    source = image.convert("RGB")
    output = result.load()
    for y in range(image.height):
        for x in range(image.width):
            red, green, blue = source.getpixel((x, y))
            if green > red * 1.35 and green > blue * 1.35 and green > 120:
                continue
            luminance = red * .299 + green * .587 + blue * .114
            output[x, y] = OUTLINE if luminance < 150 else WHITE
    return result


def main_component(image: Image.Image) -> Image.Image:
    alpha = image.getchannel("A")
    opaque = {(x, y) for y in range(image.height) for x in range(image.width) if alpha.getpixel((x, y)) > 0}
    components = []
    while opaque:
        start = opaque.pop()
        component = {start}
        queue = deque([start])
        while queue:
            x, y = queue.popleft()
            for neighbor in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                if neighbor in opaque:
                    opaque.remove(neighbor)
                    component.add(neighbor)
                    queue.append(neighbor)
        components.append(component)
    main = max(components, key=len)
    left = min(x for x, _ in main)
    top = min(y for _, y in main)
    right = max(x for x, _ in main) + 1
    bottom = max(y for _, y in main) + 1
    return image.crop((left, top, right, bottom))


def build() -> Image.Image:
    source = Image.open(SOURCE).convert("RGB")
    frames = []
    for row in range(2):
        for column in range(4):
            left = round(column * source.width / 4)
            right = round((column + 1) * source.width / 4)
            top = round(row * source.height / 2)
            bottom = round((row + 1) * source.height / 2)
            frames.append(main_component(remove_key(source.crop((left, top, right, bottom)))))

    widest = max(frame.width for frame in frames)
    tallest = max(frame.height for frame in frames)
    scale = min(272 / widest, 210 / tallest)
    sheet = Image.new("RGBA", (CELL_WIDTH * 4, CELL_HEIGHT * 5))
    for index, frame in enumerate(frames):
        width = round(frame.width * scale)
        height = round(frame.height * scale)
        resized = frame.resize((width, height), Image.Resampling.NEAREST)
        column = index % 4
        row = index // 4
        target_bottom = 230 - (8 if row == 1 and column == 2 else 0)
        x = column * CELL_WIDTH + (CELL_WIDTH - width) // 2
        y = row * CELL_HEIGHT + target_bottom - height
        sheet.alpha_composite(resized, (x, y))
    return sheet


def save_gif(sheet: Image.Image, row: int, destination: Path, frame_ms: int) -> None:
    frames = []
    for column in range(4):
        frame = sheet.crop((column * CELL_WIDTH, row * CELL_HEIGHT, (column + 1) * CELL_WIDTH, (row + 1) * CELL_HEIGHT))
        background = Image.new("RGBA", frame.size, "#f7f1df")
        background.alpha_composite(frame)
        frames.append(background.convert("P", palette=Image.Palette.ADAPTIVE))
    frames[0].save(destination, save_all=True, append_images=frames[1:], duration=frame_ms, loop=0, disposal=2)


if __name__ == "__main__":
    sheet = build()
    DESTINATION.parent.mkdir(parents=True, exist_ok=True)
    QA.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(DESTINATION)
    sheet.crop((0, 0, CELL_WIDTH * 4, CELL_HEIGHT * 2)).save(QA)
    save_gif(sheet, 0, IDLE_GIF, 320)
    save_gif(sheet, 1, HAPPY_GIF, 180)
    print(DESTINATION)
    print(IDLE_GIF)
    print(HAPPY_GIF)
