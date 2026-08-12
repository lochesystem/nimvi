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
};

export type NimviSave = {
  version: 1;
  seed: string;
  bornAt: number;
  lastSeenAt: number;
  bond: number;
  metrics: NimviMetrics;
};

export type NimviReaction = "idle" | "blink" | "love" | "play" | "wake";

export type PixelFrame = (string | null)[][];
