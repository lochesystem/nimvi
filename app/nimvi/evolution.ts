import type { NimviSave } from "./types";

export type EvolutionDefinition = {
  name: "Tobiru" | "Velume" | "Soruli" | "Lumeli";
  model: number;
  stage2Src: string;
  finalMessage: string;
};

export const EVOLUTIONS: Record<number, EvolutionDefinition> = {
  2: { name: "Velume", model: 2, stage2Src: "/sprites/nimvi-velume-stage2.png?v=1", finalMessage: "As folhas e a cauda de Velume floresceram!" },
  4: { name: "Soruli", model: 4, stage2Src: "/sprites/nimvi-soruli-stage2.png?v=1", finalMessage: "A concha de Soruli despertou novos cristais!" },
  7: { name: "Tobiru", model: 7, stage2Src: "/sprites/nimvi-tobiru-stage2.png?v=1", finalMessage: "As asas de Tobiru estão mais fortes!" },
  9: { name: "Lumeli", model: 9, stage2Src: "/sprites/nimvi-lumeli-stage2.png?v=1", finalMessage: "A luz de Lumeli ganhou uma nova forma!" },
};

export const EVOLUTION_MIN_AGE_MS = 3 * 24 * 60 * 60 * 1_000;
export const EVOLUTION_MIN_BOND = 20;

export function evolutionForModel(model: number): EvolutionDefinition | null {
  return EVOLUTIONS[model] ?? null;
}

export function evolutionReadiness(save: NimviSave, now = Date.now()) {
  const ageReady = now - save.bornAt >= EVOLUTION_MIN_AGE_MS;
  const bondReady = save.bond >= EVOLUTION_MIN_BOND;
  const healthReady = save.care.illness === "none" && save.care.health >= 70;
  return { ageReady, bondReady, healthReady, ready: ageReady && bondReady && healthReady };
}
