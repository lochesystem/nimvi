#!/usr/bin/env python3
"""Render all ten new Nimvi models together at their in-game frame rates."""

from math import ceil
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parent.parent
MODELS = (
    "mocori", "soruli", "aguari", "cravim", "tobiru", "paturi", "lumeli", "castu", "orumo", "ziru",
    "rizo", "uvilo", "tavri", "kelo", "bumo", "neli", "piri", "savo", "muru", "vaski",
)
CELL_WIDTH = 313
CELL_HEIGHT = 250
GRID_COLUMNS = 5


def render(row: int, name: str, duration: int) -> None:
    output_frames: list[Image.Image] = []
    for phase in range(4):
        canvas = Image.new("RGBA", (CELL_WIDTH * GRID_COLUMNS, CELL_HEIGHT * ceil(len(MODELS) / GRID_COLUMNS)), "#f7f1df")
        draw = ImageDraw.Draw(canvas)
        for index, model in enumerate(MODELS):
            sheet = Image.open(ROOT / "public/sprites" / f"nimvi-{model}.png").convert("RGBA")
            frame = sheet.crop((phase * CELL_WIDTH, row * CELL_HEIGHT, (phase + 1) * CELL_WIDTH, (row + 1) * CELL_HEIGHT))
            x = (index % GRID_COLUMNS) * CELL_WIDTH
            y = (index // GRID_COLUMNS) * CELL_HEIGHT
            canvas.alpha_composite(frame, (x, y))
            draw.text((x + 10, y + 8), model.capitalize(), fill="#17142b")
        output_frames.append(canvas.convert("P", palette=Image.Palette.ADAPTIVE))
    destination = ROOT / "docs/assets" / f"nimvi-new-models-{name}.gif"
    output_frames[0].save(destination, save_all=True, append_images=output_frames[1:], duration=duration, loop=0, disposal=2)
    print(destination)


def main() -> None:
    render(0, "idle", 320)
    render(0, "idle-half-speed", 640)
    render(1, "happy", 180)
    render(1, "happy-half-speed", 360)


if __name__ == "__main__":
    main()
