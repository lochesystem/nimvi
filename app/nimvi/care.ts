import type { NimviCare, NimviCareAction, NimviIllness, NimviReaction, NimviSave } from "./types";

export const CARE_TICK_MS = 30_000;

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export function createCare(now = Date.now()): NimviCare {
  return {
    hunger: 18,
    hygiene: 92,
    energy: 82,
    happiness: 72,
    health: 100,
    illness: "none",
    neglectMinutes: 0,
    isSleeping: false,
    sleepStartedAt: null,
    lastUpdatedAt: now,
    lastActions: {},
  };
}

export function normalizeCare(value: Partial<NimviCare> | undefined, now = Date.now()): NimviCare {
  const base = createCare(now);
  if (!value) return base;
  return {
    hunger: clamp(Number(value.hunger ?? base.hunger)),
    hygiene: clamp(Number(value.hygiene ?? base.hygiene)),
    energy: clamp(Number(value.energy ?? base.energy)),
    happiness: clamp(Number(value.happiness ?? base.happiness)),
    health: clamp(Number(value.health ?? base.health)),
    illness: (["none", "cold", "stomach"] as NimviIllness[]).includes(value.illness as NimviIllness) ? value.illness as NimviIllness : "none",
    neglectMinutes: Math.max(0, Number(value.neglectMinutes) || 0),
    isSleeping: Boolean(value.isSleeping),
    sleepStartedAt: typeof value.sleepStartedAt === "number" ? value.sleepStartedAt : null,
    lastUpdatedAt: Number(value.lastUpdatedAt) || now,
    lastActions: value.lastActions && typeof value.lastActions === "object" ? value.lastActions : {},
  };
}

export function advanceCare(save: NimviSave, now = Date.now()): NimviSave {
  const care = normalizeCare(save.care, now);
  const elapsedMinutes = Math.min(7 * 24 * 60, Math.max(0, (now - care.lastUpdatedAt) / 60_000));
  if (elapsedMinutes < 0.1) return { ...save, care: { ...care, lastUpdatedAt: now } };
  const hours = elapsedMinutes / 60;
  const sleeping = care.isSleeping;
  const hunger = clamp(care.hunger + hours * (sleeping ? 5 : 8));
  const hygiene = clamp(care.hygiene - hours * (sleeping ? 2 : 6));
  const energy = clamp(care.energy + hours * (sleeping ? 24 : -6));
  const happiness = clamp(care.happiness - hours * (sleeping ? 1 : 3));
  const severeNeeds = Number(hunger >= 82) + Number(hygiene <= 22) + Number(energy <= 14);
  const neglectMinutes = severeNeeds
    ? care.neglectMinutes + elapsedMinutes * severeNeeds
    : Math.max(0, care.neglectMinutes - elapsedMinutes * 2);
  let illness = care.illness;
  if (illness === "none" && neglectMinutes >= 180) illness = hunger >= 88 ? "stomach" : "cold";
  const health = clamp(care.health + (illness === "none" ? hours * 2 : -hours * 4));
  const rested = sleeping && energy >= 96;
  return {
    ...save,
    care: {
      ...care,
      hunger,
      hygiene,
      energy,
      happiness,
      health: Math.max(20, health),
      illness,
      neglectMinutes: illness === "none" ? neglectMinutes : Math.min(240, neglectMinutes),
      isSleeping: rested ? false : sleeping,
      sleepStartedAt: rested ? null : care.sleepStartedAt,
      lastUpdatedAt: now,
    },
  };
}

export type CareActionResult = {
  accepted: boolean;
  notice: string;
  reaction: NimviReaction;
  save: NimviSave;
};

const cooldowns: Record<NimviCareAction, number> = {
  love: 60_000,
  play: 5 * 60_000,
  feed: 2 * 60_000,
  bath: 5 * 60_000,
  sleep: 30_000,
  medicine: 10 * 60_000,
};

function refuse(save: NimviSave, notice: string): CareActionResult {
  return {
    accepted: false,
    notice,
    reaction: "idle",
    save: { ...save, metrics: { ...save.metrics, refusals: save.metrics.refusals + 1 } },
  };
}

export function performCareAction(input: NimviSave, action: NimviCareAction, now = Date.now()): CareActionResult {
  const save = advanceCare(input, now);
  const care = save.care;
  const actionNames: Record<NimviCareAction, string> = {
    love: "o carinho",
    play: "a brincadeira",
    feed: "a refeição",
    bath: "o banho",
    sleep: "o descanso",
    medicine: "o medicamento",
  };
  const lastAction = care.lastActions[action] ?? 0;
  if (now - lastAction < cooldowns[action]) return refuse(save, `Agora não. Ele ainda está satisfeito com ${actionNames[action]}.`);

  if (care.isSleeping && action !== "sleep") return refuse(save, "Ele está dormindo. Melhor não interromper.");
  if (action === "sleep" && care.isSleeping) {
    const sleptFor = now - (care.sleepStartedAt ?? now);
    if (care.energy < 25 && sleptFor < 10 * 60_000) return refuse(save, "Ele se encolheu mais. Ainda precisa dormir.");
    return {
      accepted: true,
      notice: "Ele acordou e procurou você com os olhos.",
      reaction: "wake",
      save: { ...save, care: { ...care, isSleeping: false, sleepStartedAt: null, lastActions: { ...care.lastActions, sleep: now } } },
    };
  }

  if (action === "love") {
    if (care.happiness >= 96) return refuse(save, "Ele encostou em você, mas já está transbordando carinho.");
    return {
      accepted: true,
      notice: "Um brilho morno apareceu.",
      reaction: "love",
      save: {
        ...save,
        bond: Math.min(100, save.bond + 2),
        metrics: { ...save.metrics, interactions: save.metrics.interactions + 1 },
        care: { ...care, happiness: clamp(care.happiness + 8), lastActions: { ...care.lastActions, love: now } },
      },
    };
  }

  if (action === "play") {
    if (care.illness !== "none") return refuse(save, "Ele não quer brincar enquanto está doente.");
    if (care.energy < 28) return refuse(save, "Ele bocejou. Está cansado demais para brincar.");
    if (care.hunger > 72) return refuse(save, "A barriga roncou. Ele prefere comer antes.");
    if (care.hygiene < 24) return refuse(save, "Ele se sente sujo e não quer brincar assim.");
    if (care.happiness > 92) return refuse(save, "Ele está contente e quer apenas ficar quietinho agora.");
    return {
      accepted: true,
      notice: "Ele inventou uma brincadeira e se sacudiu de alegria.",
      reaction: "play",
      save: {
        ...save,
        bond: Math.min(100, save.bond + 2),
        metrics: { ...save.metrics, interactions: save.metrics.interactions + 1 },
        care: {
          ...care,
          hunger: clamp(care.hunger + 7),
          hygiene: clamp(care.hygiene - 6),
          energy: clamp(care.energy - 12),
          happiness: clamp(care.happiness + 15),
          lastActions: { ...care.lastActions, play: now },
        },
      },
    };
  }

  if (action === "feed") {
    if (care.illness === "stomach") return refuse(save, "O estômago está ruim. Primeiro ele precisa do medicamento.");
    if (care.hunger < 22) return refuse(save, "Ele cheirou a comida e virou o rosto. Ainda está satisfeito.");
    return {
      accepted: true,
      notice: care.hunger > 75 ? "Ele comeu depressa e respirou aliviado." : "Ele comeu devagar, aproveitando cada pedacinho.",
      reaction: "love",
      save: {
        ...save,
        bond: Math.min(100, save.bond + 1),
        metrics: { ...save.metrics, interactions: save.metrics.interactions + 1, meals: save.metrics.meals + 1 },
        care: { ...care, hunger: clamp(care.hunger - 42), happiness: clamp(care.happiness + 4), lastActions: { ...care.lastActions, feed: now } },
      },
    };
  }

  if (action === "bath") {
    if (care.hygiene > 86) return refuse(save, "Ele conferiu as patinhas: já está limpo.");
    if (care.energy < 12) return refuse(save, "Está exausto demais para um banho agora.");
    return {
      accepted: true,
      notice: care.hygiene < 28 ? "A sujeira foi embora. Ele parece muito mais leve." : "Ele brincou com as gotas até ficar limpo.",
      reaction: "play",
      save: {
        ...save,
        metrics: { ...save.metrics, interactions: save.metrics.interactions + 1, baths: save.metrics.baths + 1 },
        care: { ...care, hygiene: clamp(care.hygiene + 55), energy: clamp(care.energy - 3), happiness: clamp(care.happiness + 3), lastActions: { ...care.lastActions, bath: now } },
      },
    };
  }

  if (action === "sleep") {
    if (care.energy > 72) return refuse(save, "Ele fechou os olhos por um segundo, mas ainda não está com sono.");
    if (care.hunger > 82) return refuse(save, "A fome não deixa ele pegar no sono.");
    return {
      accepted: true,
      notice: "Ele se ajeitou e adormeceu. A energia volta com o tempo.",
      reaction: "idle",
      save: {
        ...save,
        metrics: { ...save.metrics, interactions: save.metrics.interactions + 1, sleepSessions: save.metrics.sleepSessions + 1 },
        care: { ...care, isSleeping: true, sleepStartedAt: now, lastActions: { ...care.lastActions, sleep: now } },
      },
    };
  }

  if (care.illness === "none") return refuse(save, "Ele está saudável. Não precisa de medicamento.");
  return {
    accepted: true,
    notice: "O medicamento fez efeito. Agora ele precisa de cuidado e descanso.",
    reaction: "love",
    save: {
      ...save,
      bond: Math.min(100, save.bond + 2),
      metrics: { ...save.metrics, interactions: save.metrics.interactions + 1, medicines: save.metrics.medicines + 1 },
      care: {
        ...care,
        illness: "none",
        health: clamp(care.health + 28),
        happiness: clamp(care.happiness + 5),
        neglectMinutes: 0,
        lastActions: { ...care.lastActions, medicine: now },
      },
    },
  };
}

export function careMood(care: NimviCare): string {
  if (care.isSleeping) return "dormindo";
  if (care.illness !== "none") return "doente";
  if (care.hunger >= 75) return "com fome";
  if (care.energy <= 25) return "sonolento";
  if (care.hygiene <= 25) return "precisando de banho";
  if (care.happiness <= 30) return "entediado";
  return "bem cuidado";
}
