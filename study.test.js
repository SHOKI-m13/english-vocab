import test from "node:test";
import assert from "node:assert/strict";
import { words, englishAnswers } from "./words.js";
import { keys, wordId, rate, createState, configure, mastered, outstanding, reveal,
  answer, undoAnswer, restart, setThreshold } from "./study.js";

function grade(state, correct) {
  assert.equal(reveal(state), true);
  assert.equal(answer(state, correct), true);
}

test("84 entries, 168 independent directional records and shared Japanese answers", () => {
  assert.equal(words.filter(word => word.lesson === 7).length, 37);
  assert.equal(words.filter(word => word.lesson === 8).length, 47);
  assert.equal(new Set(words.map(word => word.en)).size, 84);
  assert(words.every(word => word.ja && word.en));
  assert.deepEqual(englishAnswers({ ja: "言葉" }, [
    { en: "term", ja: "言葉" }, { en: "word", ja: "語・言葉" }
  ]), ["term", "word"]);
  const state = createState();
  assert.deepEqual(new Set(state.cycle.queue), new Set(keys));
  assert.equal(answer(state, true), false);
  const key = state.cycle.queue[0];
  const other = wordId(key) + (key.endsWith(":en") ? ":ja" : ":en");
  grade(state, true);
  assert.equal(state.records[key].streak, 1);
  assert.equal(rate(state.records[key]), 1);
  assert.equal(rate(state.records[other]), null);
});

test("exactly one question per pending item in every round, weak items remain", () => {
  const state = createState();
  const weak = keys[0];
  let round = 1;
  let previous;
  while (state.cycle.queue.length) {
    assert.equal(state.cycle.round, round);
    const expected = outstanding(state);
    const seen = [];
    while (state.cycle.round === round && state.cycle.queue.length) {
      const key = state.cycle.queue[0];
      if (new Set(expected.map(wordId)).size > 1) assert.notEqual(wordId(key), previous);
      seen.push(key);
      grade(state, key !== weak || round > 2);
      previous = wordId(key);
    }
    assert.equal(seen.length, expected.length);
    assert.deepEqual(new Set(seen), new Set(expected));
    if (round === 3) {
      assert.deepEqual(outstanding(state), [weak]);
      assert.equal(state.records[weak].streak, 1);
    }
    round++;
  }
  assert.equal(state.clears, 1);
  assert.equal(state.cycle.completed, true);
  assert.equal(state.cycle.round, 5);
  assert.equal(state.records[weak].wrong, 2);
  assert(undoAnswer(state));
  assert.equal(state.clears, 0);
  assert.equal(state.cycle.revealed, true);
  grade(state, true);
  const totals = { ...state.records[weak] };
  restart(state);
  assert.equal(state.cycle.queue.length, 168);
  assert.deepEqual(state.records[weak], { ...totals, streak: 0 });
  assert.equal(state.clears, 1);
  configure(state, "weak", "en");
  assert.deepEqual(state.cycle.target, [weak]);
  grade(state, true);
  grade(state, false);
  assert.equal(state.records[weak].streak, 0);
});

test("serialized state resumes the exact queue and supports one undo", () => {
  const state = createState();
  configure(state, "8", "ja");
  setThreshold(state, 5);
  const before = [...state.cycle.queue];
  const key = before[0];
  grade(state, false);
  reveal(state);
  const saved = JSON.parse(JSON.stringify(state));
  assert.equal(saved.threshold, 5);
  assert.equal(saved.cycle.revealed, true);
  assert.deepEqual(saved.cycle.queue, before.slice(1));
  assert(undoAnswer(saved));
  assert.deepEqual(saved.cycle.queue, before);
  assert.equal(saved.records[key].wrong, 0);
  assert.equal(saved.records[key].lastSeen, null);
  assert.equal(saved.sessions, 0);
  assert.equal(mastered(saved, key), false);
  assert.equal(undoAnswer(saved), false);
});
