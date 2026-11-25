import { words } from "./words.js";

export const keys = words.flatMap(word => ["en", "ja"].map(direction => word.id + ":" + direction));
export const wordId = key => key.split(":")[0];
export const rate = ({ correct, shown }) => shown ? correct / shown : null;
export const mastered = (state, key) => state.records[key].streak >= state.threshold;
export const outstanding = state => state.cycle.target.filter(key => !mastered(state, key));

function order(state, pending, first, previous, random) {
  const ranked = pending.map(key => {
    const record = state.records[key];
    const weakness = 2 * (1 - (rate(record) ?? 0.5))
      + Math.log1p(record.wrong) + 0.4 * (state.threshold - record.streak);
    return { key, score: random() * 2 + (first ? 0 : weakness) };
  }).sort((a, b) => b.score - a.score);
  const queue = [];
  const counts = new Map();
  for (const entry of ranked) {
    const id = wordId(entry.key);
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  while (ranked.length) {
    const eligible = ranked.map((entry, index) => ({ id: wordId(entry.key), index }))
      .filter(entry => entry.id !== previous);
    const half = Math.floor((ranked.length - 1) / 2);
    const otherLimit = Math.ceil((ranked.length - 1) / 2);
    const required = [...counts].find(([, count]) => count > otherLimit)?.[0];
    const index = eligible.find(({ id }) =>
      (!required || id === required) && counts.get(id) - 1 <= half
    )?.index ?? eligible[0]?.index ?? 0;
    const [{ key }] = ranked.splice(index, 1);
    queue.push(key);
    previous = wordId(key);
    counts.set(previous, counts.get(previous) - 1);
  }
  return queue;
}

export function configure(state, scope, mode, random = Math.random, previousTarget) {
  state.scope = scope;
  state.mode = mode;
  const weak = new Set(words.filter(word => {
    const records = [state.records[word.id + ":en"], state.records[word.id + ":ja"]];
    return records.some(record => record.wrong >= 2 || (rate(record) ?? 1) < 0.75);
  }).map(word => word.id));
  const target = previousTarget ?? keys.filter(key => {
    const id = wordId(key);
    return (mode === "both" || key.endsWith(":" + mode))
      && (scope === "all" || (scope === "weak" ? weak.has(id) : id.startsWith(scope + "-")));
  });
  state.cycle = { target, queue: [], round: 1, answers: 0, correct: 0, misses: {},
    elapsed: 0, previous: null, revealed: false, completed: false };
  state.undo = null;
  state.cycle.queue = order(state, outstanding(state), true, null, random);
}

export function createState(random = Math.random) {
  const records = Object.fromEntries(keys.map(key => [key,
    { shown: 0, correct: 0, wrong: 0, streak: 0, lastSeen: null }]));
  const state = { records, threshold: 3, theme: "system", clears: 0, sessions: 0, elapsed: 0 };
  configure(state, "all", "both", random);
  return state;
}

export function reveal(state) {
  if (!state.cycle.queue.length) return false;
  state.cycle.revealed = true;
  return true;
}

function advance(state, random) {
  const cycle = state.cycle;
  if (cycle.queue.length) return;
  const pending = outstanding(state);
  if (pending.length) {
    cycle.round++;
    cycle.queue = order(state, pending, false, cycle.previous, random);
  } else if (cycle.target.length && !cycle.completed) {
    cycle.completed = true;
    state.clears++;
  }
}

export function answer(state, correct, now = Date.now(), random = Math.random) {
  const cycle = state.cycle;
  const [key] = cycle.queue;
  if (!key || !cycle.revealed) return false;
  const record = state.records[key];
  state.undo = { key, record: { ...record }, cycle: structuredClone(cycle),
    clears: state.clears, sessions: state.sessions };
  if (cycle.answers === 0) state.sessions++;
  cycle.answers++;
  cycle.correct += Number(correct);
  record.shown++;
  record.correct += Number(correct);
  record.wrong += Number(!correct);
  record.streak = correct ? record.streak + 1 : 0;
  record.lastSeen = new Date(now).toISOString();
  const id = wordId(key);
  if (!correct) cycle.misses[id] = (cycle.misses[id] ?? 0) + 1;
  cycle.previous = id;
  cycle.queue.shift();
  cycle.revealed = false;
  advance(state, random);
  return true;
}

export function undoAnswer(state) {
  if (!state.undo) return false;
  const { key, record, cycle, clears, sessions } = state.undo;
  cycle.elapsed = state.cycle.elapsed;
  Object.assign(state, { cycle, clears, sessions, undo: null });
  state.records[key] = record;
  return true;
}

export function restart(state, random = Math.random) {
  const { target } = state.cycle;
  for (const key of target) state.records[key].streak = 0;
  configure(state, state.scope, state.mode, random, target);
}

export function setThreshold(state, threshold, random = Math.random) {
  if (!Number.isInteger(threshold) || threshold < 1 || threshold > 5 || threshold === state.threshold) return;
  state.threshold = threshold;
  configure(state, state.scope, state.mode, random, state.cycle.target);
}
