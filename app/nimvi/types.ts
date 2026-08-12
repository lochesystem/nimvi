export type NimviGenome = {
  seed: string;
  name: string;
  model: number;
  body: number;
  palette: number;
  eyes: number;
  mouth: number;
  crown: number;
  marking: number;
  tail: number;
  quirk: number;
  asymmetry: number;
};

export type NimviMetrics = {
  visits: number;
  interactions: number;
  focusReturns: number;
  hiddenSeconds: number;
  resizes: number;
  nightVisits: number;
  meals: number;
  baths: number;
  sleepSessions: number;
  medicines: number;
  refusals: number;
};

export type NimviIllness = "none" | "cold" | "stomach";

export type NimviCareAction = "love" | "play" | "feed" | "bath" | "sleep" | "medicine";

export type NimviCare = {
  hunger: number;
  hygiene: number;
  energy: number;
  happiness: number;
  health: number;
  illness: NimviIllness;
  neglectMinutes: number;
  isSleeping: boolean;
  sleepStartedAt: number | null;
  lastUpdatedAt: number;
  lastActions: Partial<Record<NimviCareAction, number>>;
};

export type NimviSave = {
  version: 2;
  seed: string;
  bornAt: number;
  lastSeenAt: number;
  bond: number;
  metrics: NimviMetrics;
  care: NimviCare;
};

export type NimviReaction = "idle" | "blink" | "love" | "play" | "wake";

export type PixelFrame = (string | null)[][];
