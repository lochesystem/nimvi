import { normalizeSeed } from "./generator.ts";
import { normalizeRoom } from "./room.ts";
import type { NimviRoom, RoomItemId, RoomSlot } from "./types.ts";

export const FRIENDS_KEY = "nimvi.friends.v1";
export const DEV_FRIENDS_KEY = "nimvi.dev.friends.v1";

export type NimviFriend = {
  seed: string;
  addedAt: number;
  room?: NimviRoom;
};

const SNAPSHOT_SLOTS: RoomSlot[] = ["wall-left", "side-left", "side-right"];

export function encodeRoomSnapshot(room: NimviRoom): string {
  return [
    room.wallpaper,
    room.floor,
    ...SNAPSHOT_SLOTS.map((slot) => room.slots[slot] ?? "_"),
    room.objectStates.tvOn ? "1" : "0",
    room.objectStates.lampOn ? "1" : "0",
    String(room.objectStates.plantGrowth),
  ].join(".");
}

export function decodeRoomSnapshot(snapshot: string | null): NimviRoom | undefined {
  if (!snapshot) return undefined;
  const [wallpaper, floor, wallLeft, sideLeft, sideRight, tvOn, lampOn, plantGrowth] = snapshot.split(".");
  if (!wallpaper || !floor || plantGrowth === undefined) return undefined;
  return normalizeRoom({
    wallpaper: wallpaper as RoomItemId,
    floor: floor as RoomItemId,
    slots: {
      "wall-left": wallLeft === "_" ? null : wallLeft as RoomItemId,
      "side-left": sideLeft === "_" ? null : sideLeft as RoomItemId,
      "side-right": sideRight === "_" ? null : sideRight as RoomItemId,
    },
    inventory: [],
    objectStates: {
      tvOn: tvOn === "1",
      lampOn: lampOn === "1",
      plantGrowth: Number(plantGrowth),
      plantLastWateredAt: null,
    },
  }, true);
}

export function parseFriends(raw: string | null): NimviFriend[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const unique = new Map<string, NimviFriend>();
    parsed.forEach((entry) => {
      const seed = normalizeSeed(typeof entry?.seed === "string" ? entry.seed : "");
      if (!seed) return;
      const friend: NimviFriend = { seed, addedAt: Math.max(0, Number(entry?.addedAt) || 0) };
      if (entry?.room) friend.room = normalizeRoom(entry.room, true);
      unique.set(seed, friend);
    });
    return [...unique.values()];
  } catch {
    return [];
  }
}

export function addFriend(friends: NimviFriend[], seed: string, ownSeed?: string, room?: NimviRoom): NimviFriend[] {
  const normalized = normalizeSeed(seed);
  if (!normalized || normalized === normalizeSeed(ownSeed ?? "") || friends.some((friend) => friend.seed === normalized)) return friends;
  return [...friends, { seed: normalized, addedAt: Date.now(), room }];
}

export function friendVisitPath(friend: NimviFriend): string {
  const params = new URLSearchParams({ dna: friend.seed });
  if (friend.room) params.set("quarto", encodeRoomSnapshot(friend.room));
  return `/?${params.toString()}`;
}

export function removeFriend(friends: NimviFriend[], seed: string): NimviFriend[] {
  const normalized = normalizeSeed(seed);
  return friends.filter((friend) => friend.seed !== normalized);
}
