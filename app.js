import { words, englishAnswers } from "./words.js";
import { createState, configure, mastered, outstanding, wordId, rate, reveal,
  answer, undoAnswer, restart, setThreshold } from "./study.js";

const $ = id => document.getElementById(id);
const storageKey = "english-vocab-v1";
const wordMap = new Map(words.map(word => [word.id, word]));
let state;
let view = "study";
let activeSince = null;
try {
  state = JSON.parse(localStorage.getItem(storageKey));
} catch {
  state = null;
}
state ??= createState();

function save() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
    $("notice").hidden = true;
  } catch {
    $("notice").textContent = "学習記録を保存できません。ブラウザの保存設定をご確認ください。";
    $("notice").hidden = false;
  }
}

function tick() {
  if (activeSince === null) return;
  const now = performance.now();
  const elapsed = now - activeSince;
  state.elapsed += elapsed;
  state.cycle.elapsed += elapsed;
  activeSince = now;
}

function syncClock() {
  tick();
  activeSince = view === "study" && !document.hidden && state.cycle.queue.length
    ? performance.now() : null;
}

const percent = value => value === null ? "未学習" : Math.round(value * 100) + "%";
const fullMastery = (word, current = state) =>
  ["en", "ja"].every(direction => mastered(current, word.id + ":" + direction));

function duration(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(seconds / 3600);
  return (hours ? hours + "時間" : "") + Math.floor(seconds / 60) % 60 + "分" + seconds % 60 + "秒";
}

function metrics(container, entries) {
  container.replaceChildren(...entries.map(([label, value]) => {
    const group = document.createElement("div");
    const term = document.createElement("dt");
    const detail = document.createElement("dd");
    term.textContent = label;
    detail.textContent = value;
    group.append(term, detail);
    return group;
  }));
}

function renderResult(cycle) {
  const result = $("result");
  const heading = document.createElement("h1");
  if (!cycle.target.length) {
    heading.textContent = "苦手単語はまだありません";
    const detail = document.createElement("p");
    detail.textContent = "ALL または Lesson を選んで学習を始めましょう。";
    result.replaceChildren(heading, detail);
    return;
  }
  heading.textContent = "COMPLETE";
  const list = document.createElement("dl");
  list.className = "metrics";
  const selected = new Set(cycle.target.map(wordId));
  const difficult = Object.entries(cycle.misses).sort((a, b) => b[1] - a[1]).slice(0, 3);
  metrics(list, [
    ["完全暗記済み単語", words.filter(word => selected.has(word.id) && fullMastery(word)).length + "語"],
    ["暗記済み項目", cycle.target.length],
    ["総回答数", cycle.answers],
    ["正答率", percent(cycle.answers ? cycle.correct / cycle.answers : null)],
    ["今回の学習時間", duration(cycle.elapsed)],
    ["クリア回数", state.clears]
  ]);
  const detail = document.createElement("p");
  detail.textContent = "特に苦戦した単語：" + (difficult.map(([id, count]) =>
    wordMap.get(id).en + "（×" + count + "）").join("、") || "なし");
  const again = document.createElement("button");
  again.className = "primary";
  again.textContent = "もう一周する";
  again.onclick = () => change(() => restart(state));
  result.replaceChildren(heading, list, detail, again);
}

function renderStudy() {
  const cycle = state.cycle;
  const remaining = outstanding(state).length;
  const total = cycle.target.length;
  const achieved = total ? (total - remaining) / total : 0;
  $("scope").value = state.scope;
  $("mode").value = state.mode;
  $("round").textContent = "ラウンド " + cycle.round;
  $("remaining").textContent = "残り " + remaining + " 項目";
  $("progress-count").textContent = (total - remaining) + " / " + total;
  $("achievement").textContent = "暗記達成率 " + percent(achieved);
  $("bar").value = achieved;
  const ids = [...new Set(cycle.target.map(wordId))];
  for (const [direction, element, label] of [
    ["en", "english-progress", "英日"], ["ja", "japanese-progress", "日英"]
  ]) {
    const done = ids.filter(id => mastered(state, id + ":" + direction)).length;
    $(element).textContent = label + " " + done + " / " + ids.length;
  }

  const key = cycle.queue[0];
  $("card").hidden = !key;
  $("result").hidden = Boolean(key);
  $("grades").hidden = !key;
  $("undo").disabled = !state.undo;
  $("correct").disabled = $("wrong").disabled = !key || !cycle.revealed;
  if (!key) {
    renderResult(cycle);
    return;
  }
  const word = wordMap.get(wordId(key));
  const english = key.endsWith(":en");
  $("direction").textContent = english ? "英語 → 日本語" : "日本語 → 英語";
  $("prompt").textContent = english ? word.en : word.ja;
  $("prompt").lang = english ? "en" : "ja";
  $("prompt").classList.toggle("long", $("prompt").textContent.length > (english ? 19 : 13));
  $("answer").hidden = !cycle.revealed;
  $("answer").textContent = cycle.revealed ? (english ? word.ja : englishAnswers(word).join(" / ")) : "";
  $("answer").lang = english ? "ja" : "en";
  $("hint").hidden = cycle.revealed;
}

function renderStats() {
  const rows = words.map(word => {
    const en = state.records[word.id + ":en"];
    const ja = state.records[word.id + ":ja"];
    return { word, en, ja, shown: en.shown + ja.shown,
      correct: en.correct + ja.correct, wrong: en.wrong + ja.wrong };
  });
  const shown = rows.reduce((sum, row) => sum + row.shown, 0);
  const correct = rows.reduce((sum, row) => sum + row.correct, 0);
  metrics($("totals"), [
    ["総学習回数", state.sessions], ["総回答数", shown], ["総正答数", correct],
    ["累積正答率", percent(rate({ shown, correct }))],
    ["完全暗記済み単語", words.filter(word => fullMastery(word)).length + " / 84"],
    ["クリア回数", state.clears], ["累積学習時間", duration(state.elapsed)]
  ]);
  if ($("sort").value === "accuracy") rows.sort((a, b) => (rate(a) ?? Infinity) - (rate(b) ?? Infinity));
  if ($("sort").value === "wrong") rows.sort((a, b) => b.wrong - a.wrong);
  $("word-list").replaceChildren(...rows.map(({ word, en, ja, wrong }) => {
    const item = document.createElement("li");
    const title = document.createElement("strong");
    title.lang = "en";
    title.textContent = word.en;
    const meaning = document.createElement("p");
    meaning.textContent = word.ja;
    const detail = document.createElement("small");
    const status = direction => mastered(state, word.id + ":" + direction) ? "（暗記済み）" : "";
    detail.textContent = "英日 " + percent(rate(en)) + status("en") + "　日英 "
      + percent(rate(ja)) + status("ja") + "　不正解 " + wrong + "回";
    item.append(title, meaning, detail);
    return item;
  }));
}

function render() {
  document.documentElement.dataset.theme = state.theme;
  $("threshold").value = state.threshold;
  $("theme").value = state.theme;
  for (const button of document.querySelectorAll("[data-view]")) {
    const selected = button.dataset.view === view;
    $(button.dataset.view).hidden = !selected;
    if (selected) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  }
  if (view === "study") renderStudy();
  if (view === "stats") renderStats();
}

function change(action) {
  tick();
  activeSince = null;
  action();
  syncClock();
  save();
  render();
}

for (const button of document.querySelectorAll("[data-view]")) {
  button.onclick = () => change(() => {
    view = button.dataset.view;
    window.scrollTo(0, 0);
  });
}
$("scope").onchange = () => change(() => configure(state, $("scope").value, state.mode));
$("mode").onchange = () => change(() => configure(state, state.scope, $("mode").value));
$("card").onclick = () => change(() => reveal(state));
$("correct").onclick = () => change(() => answer(state, true));
$("wrong").onclick = () => change(() => answer(state, false));
$("undo").onclick = () => change(() => undoAnswer(state));
$("sort").onchange = renderStats;
$("threshold").onchange = () => change(() => setThreshold(state, Number($("threshold").value)));
$("theme").onchange = () => change(() => { state.theme = $("theme").value; });
$("reset").onclick = () => {
  $("reset-dialog").returnValue = "";
  $("reset-dialog").showModal();
};
$("reset-dialog").onclose = () => {
  if ($("reset-dialog").returnValue === "reset") change(() => { state = createState(); });
};

document.addEventListener("visibilitychange", () => { syncClock(); save(); });
window.addEventListener("pagehide", () => { tick(); activeSince = null; save(); });
window.addEventListener("pageshow", syncClock);
setInterval(() => {
  if (activeSince !== null) { tick(); save(); }
}, 5000);
render();
syncClock();
save();
if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(console.error);
