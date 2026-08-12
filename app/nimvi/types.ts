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

export type RoomSlot = "wall-left" | "wall-right" | "side-left" | "side-right";
export type RoomItemId =
  | "wall-cream" | "wall-mint" | "wall-dusk" | "wall-peach"
  | "floor-stone" | "floor-wood"
  | "shelf" | "picture" | "mobile" | "plant" | "lamp" | "tv" | "table" | "cushion" | "bed" | "toybox";

export type NimviRoom = {
  wallpaper: RoomItemId;
  floor: RoomItemId;
  slots: Record<RoomSlot, RoomItemId | null>;
  inventory: RoomItemId[];
  objectStates: {
    tvOn: boolean;
    lampOn: boolean;
    plantGrowth: number;
    plantLastWateredAt: number | null;
  };
};

export type NimviSave = {
  version: 3;
  seed: string;
  bornAt: number;
  lastSeenAt: number;
  bond: number;
  metrics: NimviMetrics;
  care: NimviCare;
  room: NimviRoom;
};

export type NimviReaction = "idle" | "blink" | "love" | "play" | "wake";

export type PixelFrame = (string | null)[][];
