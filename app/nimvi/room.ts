import type { NimviRoom, RoomItemId, RoomSlot } from "./types";

export type RoomItemCategory = "parede" | "piso" | "parede-objeto" | "movel" | "chao";

export type RoomItem = {
  id: RoomItemId;
  name: string;
  category: RoomItemCategory;
  slots: RoomSlot[];
  asset?: string;
  interactive?: "tv" | "lamp" | "plant" | "toy";
};

export const ROOM_SLOTS: RoomSlot[] = ["wall-left", "wall-right", "side-left", "side-right"];

export const ROOM_ITEMS: RoomItem[] = [
  { id: "wall-cream", name: "Grade creme", category: "parede", slots: [] },
  { id: "wall-mint", name: "Jardim menta", category: "parede", slots: [], asset: "/wallpapers/botanical-mint.png" },
  { id: "wall-dusk", name: "Céu violeta", category: "parede", slots: [], asset: "/wallpapers/celestial-violet.png" },
  { id: "wall-peach", name: "Arcos pêssego", category: "parede", slots: [], asset: "/wallpapers/geometric-peach.png" },
  { id: "floor-stone", name: "Porcelanato branco", category: "piso", slots: [], asset: "/floors/porcelain-white.png" },
  { id: "floor-wood", name: "Vinílico de madeira", category: "piso", slots: [], asset: "/floors/vinyl-oak.png" },
  { id: "shelf", name: "Prateleira", category: "parede-objeto", slots: ["wall-left", "wall-right"], asset: "/furniture/shelf.png" },
  { id: "picture", name: "Quadro lunar", category: "parede-objeto", slots: ["wall-left", "wall-right"], asset: "/furniture/picture.png" },
  { id: "mobile", name: "Móbile", category: "parede-objeto", slots: ["wall-left", "wall-right"], asset: "/furniture/mobile.png" },
  { id: "plant", name: "Planta", category: "movel", slots: ["side-left", "side-right"], asset: "/furniture/plant.png", interactive: "plant" },
  { id: "lamp", name: "Luminária", category: "movel", slots: ["side-left", "side-right"], asset: "/furniture/lamp.png", interactive: "lamp" },
  { id: "tv", name: "TV pixel", category: "movel", slots: ["side-left", "side-right"], asset: "/furniture/tv.png", interactive: "tv" },
  { id: "table", name: "Mesinha", category: "movel", slots: ["side-left", "side-right"], asset: "/furniture/table.png" },
  { id: "cushion", name: "Almofada", category: "chao", slots: ["side-left", "side-right"], asset: "/furniture/cushion.png" },
  { id: "bed", name: "Caminha", category: "chao", slots: ["side-left", "side-right"], asset: "/furniture/bed.png" },
  { id: "toybox", name: "Caixa de brinquedos", category: "chao", slots: ["side-left", "side-right"], asset: "/furniture/toybox.png", interactive: "toy" },
];

export const DEV_INVENTORY = ROOM_ITEMS.map((item) => item.id);
export const STARTER_INVENTORY: RoomItemId[] = [
  "wall-cream", "wall-mint", "floor-stone", "floor-wood", "shelf", "picture", "plant", "lamp", "tv", "table", "cushion", "toybox",
];

export const roomItem = (id: RoomItemId | null) => ROOM_ITEMS.find((item) => item.id === id) ?? null;

export function createRoom(dev = false): NimviRoom {
  return {
    wallpaper: "wall-cream",
    floor: "floor-stone",
    slots: {
      "wall-left": "shelf",
      "wall-right": "picture",
      "side-left": "plant",
      "side-right": "lamp",
    },
    inventory: [...(dev ? DEV_INVENTORY : STARTER_INVENTORY)],
    objectStates: { tvOn: false, lampOn: false, plantGrowth: 1, plantLastWateredAt: null },
  };
}

export function normalizeRoom(value: Partial<NimviRoom> | undefined, dev = false): NimviRoom {
  const base = createRoom(dev);
  if (!value) return base;
  const validIds = new Set(ROOM_ITEMS.map((item) => item.id));
  const inventory = Array.isArray(value.inventory) ? value.inventory.filter((id): id is RoomItemId => validIds.has(id as RoomItemId)) : base.inventory;
  const available = new Set(dev ? DEV_INVENTORY : [...base.inventory, ...inventory]);
  const slots = { ...base.slots };
  for (const slot of ROOM_SLOTS) {
    const id = value.slots?.[slot];
    const item = id ? roomItem(id) : null;
    slots[slot] = item && available.has(item.id) && item.slots.includes(slot) ? item.id : null;
  }
  const wallpaper = roomItem(value.wallpaper ?? null)?.category === "parede" && available.has(value.wallpaper as RoomItemId) ? value.wallpaper as RoomItemId : base.wallpaper;
  const floor = roomItem(value.floor ?? null)?.category === "piso" && available.has(value.floor as RoomItemId) ? value.floor as RoomItemId : base.floor;
  return {
    wallpaper,
    floor,
    slots,
    inventory: [...available],
    objectStates: {
      tvOn: Boolean(value.objectStates?.tvOn),
      lampOn: Boolean(value.objectStates?.lampOn),
      plantGrowth: Math.max(0, Math.min(2, Number(value.objectStates?.plantGrowth) || 0)),
      plantLastWateredAt: typeof value.objectStates?.plantLastWateredAt === "number" ? value.objectStates.plantLastWateredAt : null,
    },
  };
}

export function placeRoomItem(room: NimviRoom, itemId: RoomItemId, slot?: RoomSlot): NimviRoom {
  const item = roomItem(itemId);
  if (!item || !room.inventory.includes(itemId)) return room;
  if (item.category === "parede") return { ...room, wallpaper: itemId };
  if (item.category === "piso") return { ...room, floor: itemId };
  if (!slot || !item.slots.includes(slot)) return room;
  const slots = { ...room.slots };
  for (const key of ROOM_SLOTS) if (slots[key] === itemId) slots[key] = null;
  slots[slot] = itemId;
  return { ...room, slots };
}

export function clearRoomSlot(room: NimviRoom, slot: RoomSlot): NimviRoom {
  return { ...room, slots: { ...room.slots, [slot]: null } };
}
