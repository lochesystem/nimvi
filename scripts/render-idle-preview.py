from pathlib import Path

from PIL import Image


root = Path(__file__).resolve().parents[1]
sheet = Image.open(root / "docs/assets/nimvi-idle-sheet.png").convert("RGBA")
cell = sheet.height
background = (247, 241, 223, 255)
frames = []

for index in range(4):
    sprite = sheet.crop((index * cell, 0, (index + 1) * cell, cell))
    composed = Image.new("RGBA", (cell, cell), background)
    composed.alpha_composite(sprite)
    frames.append(composed.resize((256, 256), Image.Resampling.NEAREST).convert("P", palette=Image.Palette.ADAPTIVE))

frames[0].save(
    root / "docs/assets/nimvi-idle-preview.gif",
    save_all=True,
    append_images=frames[1:],
    duration=360,
    loop=0,
    disposal=2,
)
