"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import {
  SPRITE_COLUMNS,
  SPRITE_ROWS,
  SLEEP_FRAME_INDEX,
  spriteFrameDuration,
  spriteModelForGenome,
  spriteRowForReaction,
} from "./spriteCatalog";
import type { NimviGenome, NimviReaction } from "./types";

export type NimviSpriteHandle = {
  download: () => void;
};

type Props = {
  genome: NimviGenome;
  reaction: NimviReaction;
  label: string;
  sleeping?: boolean;
  modelSrc?: string;
};

function neutralizeFrame(context: CanvasRenderingContext2D) {
  const { width, height } = context.canvas;
  const image = context.getImageData(0, 0, width, height);
  const pixels = image.data;
  for (let index = 0; index < width * height; index += 1) {
    const offset = index * 4;
    if (pixels[offset + 3] <= 24) continue;
    const red = pixels[offset];
    const green = pixels[offset + 1];
    const blue = pixels[offset + 2];
    const isOutline = red < 80 && green < 80 && blue < 80;
    pixels[offset] = isOutline ? 23 : 255;
    pixels[offset + 1] = isOutline ? 20 : 255;
    pixels[offset + 2] = isOutline ? 43 : 255;
    pixels[offset + 3] = 255;
  }
  context.putImageData(image, 0, 0);
}

function paint(
  canvas: HTMLCanvasElement,
  sheet: HTMLImageElement,
  frameIndex: number,
  reaction: NimviReaction,
) {
  const context = canvas.getContext("2d");
  if (!context) return;
  const cellWidth = Math.floor(sheet.naturalWidth / SPRITE_COLUMNS);
  const cellHeight = Math.floor(sheet.naturalHeight / SPRITE_ROWS);
  const actionRow = spriteRowForReaction(reaction);
  if (canvas.width !== cellWidth || canvas.height !== cellHeight) {
    canvas.width = cellWidth;
    canvas.height = cellHeight;
  }
  context.imageSmoothingEnabled = false;
  context.clearRect(0, 0, cellWidth, cellHeight);
  context.drawImage(
    sheet,
    (frameIndex % SPRITE_COLUMNS) * cellWidth,
    actionRow * cellHeight,
    cellWidth,
    cellHeight,
    0,
    0,
    cellWidth,
    cellHeight,
  );
  neutralizeFrame(context);
}

export const NimviSprite = forwardRef<NimviSpriteHandle, Props>(function NimviSprite(
  { genome, reaction, label, sleeping = false, modelSrc },
  forwardedRef,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const model = spriteModelForGenome(genome);

  useEffect(() => {
    let frame = 0;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const sheet = new Image();
    let timer: number | null = null;
    sheet.onload = () => {
      if (sleeping) {
        paint(canvas, sheet, SLEEP_FRAME_INDEX, "blink");
        return;
      }
      paint(canvas, sheet, frame, reaction);
      timer = window.setInterval(() => {
        frame = (frame + 1) % SPRITE_COLUMNS;
        paint(canvas, sheet, frame, reaction);
      }, spriteFrameDuration(reaction));
    };
    sheet.src = modelSrc ?? model.src;
    return () => {
      sheet.onload = null;
      if (timer !== null) window.clearInterval(timer);
    };
  }, [genome, model.src, modelSrc, reaction, sleeping]);

  useImperativeHandle(forwardedRef, () => ({
    download() {
      const source = canvasRef.current;
      if (!source) return;
      const output = document.createElement("canvas");
      output.width = 512;
      output.height = 512;
      const context = output.getContext("2d");
      if (!context) return;
      context.imageSmoothingEnabled = false;
      context.fillStyle = "#f7f1df";
      context.fillRect(0, 0, output.width, output.height);
      const scale = Math.min(440 / source.width, 440 / source.height);
      const width = Math.round(source.width * scale);
      const height = Math.round(source.height * scale);
      context.drawImage(source, 0, 0, source.width, source.height, (512 - width) / 2, (512 - height) / 2, width, height);
      const link = document.createElement("a");
      link.download = `${genome.name.toLowerCase()}-${genome.seed}.png`;
      link.href = output.toDataURL("image/png");
      link.click();
    },
  }), [genome]);

  return (
    <canvas
      ref={canvasRef}
      width={313}
      height={250}
      className="nimvi-sprite"
      role="img"
      aria-label={label}
    />
  );
});
