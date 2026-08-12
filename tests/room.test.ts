import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { clearRoomSlot, createRoom, DEV_INVENTORY, normalizeRoom, placeRoomItem, ROOM_ITEMS } from "../app/nimvi/room.ts";

test("quarto inicial ocupa somente slots compatíveis", () => {
  const room = createRoom();
  assert.equal(room.slots["side-left"], "plant");
  assert.equal(room.slots["wall-left"], "shelf");
  assert.equal(Object.keys(room.slots).length, 3);
});

test("móvel não pode invadir slot incompatível", () => {
  const room = createRoom();
  assert.equal(placeRoomItem(room, "tv", "wall-left"), room);
});

test("um item único muda de slot em vez de duplicar", () => {
  const room = placeRoomItem(createRoom(), "plant", "side-right");
  assert.equal(room.slots["side-left"], null);
  assert.equal(room.slots["side-right"], "plant");
});

test("papel de parede e piso são aplicados sem slot", () => {
  const room = placeRoomItem(placeRoomItem(createRoom(), "wall-mint"), "floor-wood");
  assert.equal(room.wallpaper, "wall-mint");
  assert.equal(room.floor, "floor-wood");
});

test("guardar item limpa apenas o espaço escolhido", () => {
  const room = createRoom();
  const next = clearRoomSlot(room, "side-left");
  assert.equal(next.slots["side-left"], null);
  assert.equal(next.slots["side-right"], room.slots["side-right"]);
});

test("objetos de chão usam apenas as laterais e nunca cruzam o Nimvi", () => {
  const room = createRoom();
  assert.equal(placeRoomItem(room, "cushion", "side-left").slots["side-left"], "cushion");
  assert.equal(placeRoomItem(room, "toybox", "side-right").slots["side-right"], "toybox");
});

test("conta DEV recebe o catálogo completo sem afetar inventário normal", () => {
  const normal = createRoom();
  const dev = createRoom(true);
  assert.equal(dev.inventory.length, DEV_INVENTORY.length);
  assert.ok(dev.inventory.length > normal.inventory.length);
});

test("normalização remove invasões e itens desconhecidos", () => {
  const room = normalizeRoom({
    ...createRoom(),
    slots: { ...createRoom().slots, "wall-left": "tv" },
  });
  assert.equal(room.slots["wall-left"], null);
});

test("a janela não possui slot de parede para móveis comuns", () => {
  const room = createRoom(true);
  assert.equal("wall-right" in room.slots, false);
  for (const item of ROOM_ITEMS.filter((entry) => entry.category === "parede-objeto")) {
    assert.deepEqual(item.slots, ["wall-left"]);
  }
});

test("cada móvel usa um sprite PNG versionado", () => {
  const furniture = ROOM_ITEMS.filter((item) => item.slots.length > 0);
  assert.equal(furniture.length, 10);
  for (const item of furniture) {
    assert.ok(item.asset, `${item.name} precisa de um sprite`);
    const png = readFileSync(join(process.cwd(), "public", item.asset));
    assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  }
});

test("cada piso usa uma textura PNG versionada", () => {
  const floors = ROOM_ITEMS.filter((item) => item.category === "piso");
  assert.equal(floors.length, 2);
  for (const floor of floors) {
    assert.ok(floor.asset, `${floor.name} precisa de uma textura`);
    const png = readFileSync(join(process.cwd(), "public", floor.asset));
    assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  }
});

test("papéis decorativos usam textura e a grade creme continua padrão", () => {
  const walls = ROOM_ITEMS.filter((item) => item.category === "parede");
  assert.equal(walls.length, 4);
  assert.equal(walls.find((item) => item.id === "wall-cream")?.asset, undefined);
  for (const wall of walls.filter((item) => item.id !== "wall-cream")) {
    assert.ok(wall.asset, `${wall.name} precisa de uma textura`);
    const png = readFileSync(join(process.cwd(), "public", wall.asset));
    assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  }
});
