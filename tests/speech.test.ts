import assert from "node:assert/strict";
import test from "node:test";

import { MAX_SPEECH_COLUMNS, MIN_SPEECH_COLUMNS, SPEECH_DURATION_MS, speechBubbleColumns } from "../app/nimvi/speech.ts";

test("fala desaparece em menos de dois segundos", () => {
  assert.ok(SPEECH_DURATION_MS > 0);
  assert.ok(SPEECH_DURATION_MS <= 2_000);
});

test("fala curta produz o balão compacto mínimo", () => {
  assert.equal(speechBubbleColumns("Oi!"), MIN_SPEECH_COLUMNS);
});

test("fala média aumenta o balão de forma proporcional", () => {
  const short = speechBubbleColumns("Ele percebeu.");
  const medium = speechBubbleColumns("Ele comeu devagar, aproveitando cada pedacinho.");
  assert.ok(medium > short);
  assert.ok(medium < MAX_SPEECH_COLUMNS);
});

test("fala longa respeita o limite e quebra em novas linhas", () => {
  assert.equal(speechBubbleColumns("Uma mensagem muito longa ".repeat(10)), MAX_SPEECH_COLUMNS);
});
