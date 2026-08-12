import type { NimviGenome, NimviReaction } from "./types";
import { withBasePath } from "../base-path.ts";

export const SPRITE_COLUMNS = 4;
export const SPRITE_ROWS = 5;

const sprite = (path: string) => withBasePath(path);

export const SPRITE_MODELS = [
  { name: "Brotinho", src: sprite("/sprites/roles/nimvi-brotinho-roles.png?v=5") },
  { name: "Lúnula", src: sprite("/sprites/roles/nimvi-lunula-roles.png?v=5") },
  { name: "Velume", src: sprite("/sprites/roles/nimvi-velume-roles.png?v=5") },
  { name: "Mocori", src: sprite("/sprites/nimvi-mocori.png?v=1") },
  { name: "Soruli", src: sprite("/sprites/nimvi-soruli.png?v=1") },
  { name: "Aguari", src: sprite("/sprites/nimvi-aguari.png?v=1") },
  { name: "Cravim", src: sprite("/sprites/nimvi-cravim.png?v=1") },
  { name: "Tobiru", src: sprite("/sprites/nimvi-tobiru.png?v=1") },
  { name: "Paturi", src: sprite("/sprites/nimvi-paturi.png?v=1") },
  { name: "Lumeli", src: sprite("/sprites/nimvi-lumeli.png?v=1") },
  { name: "Castu", src: sprite("/sprites/nimvi-castu.png?v=1") },
  { name: "Orumo", src: sprite("/sprites/nimvi-orumo.png?v=1") },
  { name: "Ziru", src: sprite("/sprites/nimvi-ziru.png?v=1") },
] as const;

export function spriteModelForGenome(genome: NimviGenome) {
  return SPRITE_MODELS[genome.model % SPRITE_MODELS.length];
}

export function spriteRowForReaction(reaction: NimviReaction): number {
  if (reaction === "love") return 1;
  if (reaction === "play") return 1;
  return 0;
}

export function spriteFrameDuration(reaction: NimviReaction): number {
  if (reaction === "idle" || reaction === "blink") return 320;
  if (reaction === "love") return 180;
  if (reaction === "play") return 160;
  return 240;
}
