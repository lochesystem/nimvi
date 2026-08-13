import assert from "node:assert/strict";
import test from "node:test";

import { addFriend, decodeRoomSnapshot, encodeRoomSnapshot, friendVisitPath, parseFriends, removeFriend } from "../app/nimvi/friends.ts";
import { createRoom } from "../app/nimvi/room.ts";
import { readFile } from "node:fs/promises";

test("amizades inválidas são ignoradas e DNAs repetidos são unidos", () => {
  const friends = parseFriends(JSON.stringify([
    { seed: "N2ABC123", addedAt: 10 },
    { seed: "n2abc123", addedAt: 20 },
    { seed: "---", addedAt: 30 },
  ]));
  assert.deepEqual(friends, [{ seed: "N2ABC123", addedAt: 20 }]);
});

test("não permite adicionar o próprio Nimvi nem repetir um amigo", () => {
  const initial = [{ seed: "N2FRIEND", addedAt: 10 }];
  assert.equal(addFriend(initial, "N2FRIEND", "N2OWNER"), initial);
  assert.equal(addFriend(initial, "N2OWNER", "N2OWNER"), initial);
});

test("adiciona e remove um amigo pelo DNA normalizado", () => {
  const friends = addFriend([], "n2-new-friend", "N2OWNER");
  assert.equal(friends[0].seed, "N2NEWFRIEND");
  assert.deepEqual(removeFriend(friends, "n2newfriend"), []);
});

test("visitar e voltar fazem navegação completa para reidratar o Nimvi", async () => {
  const game = await readFile(new URL("../app/nimvi/NimviGame.tsx", import.meta.url), "utf8");
  assert.match(game, /<a href=\{withBasePath\("\/"\)\}>Voltar ao meu Nimvi<\/a>/);
  assert.match(game, /<a href=\{withBasePath\(friendVisitPath\(friend\)\)\}>Visitar<\/a>/);
});

test("o convite leva uma fotografia compacta do quarto", () => {
  const room = createRoom(true);
  room.wallpaper = "wall-mint";
  room.floor = "floor-wood";
  room.slots["side-left"] = "tv";
  room.objectStates.tvOn = true;
  const decoded = decodeRoomSnapshot(encodeRoomSnapshot(room));
  assert.equal(decoded?.wallpaper, "wall-mint");
  assert.equal(decoded?.floor, "floor-wood");
  assert.equal(decoded?.slots["side-left"], "tv");
  assert.equal(decoded?.objectStates.tvOn, true);
});

test("a visita de um amigo salvo inclui seu quarto", () => {
  const friend = { seed: "N2FRIEND", addedAt: 10, room: createRoom(true) };
  assert.match(friendVisitPath(friend), /^\/\?dna=N2FRIEND&quarto=/);
});
