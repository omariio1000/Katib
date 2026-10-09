/*
 * Katib — app shell: views, settings, storage and the typing screen.
 */

const $ = sel => document.querySelector(sel);
const $$ = sel => [...document.querySelectorAll(sel)];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------------------------------------------------------------- storage

const STORE_KEY = 'katib:v1';
const isMac = /Mac/i.test((navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '');

const DEFAULTS = {
  settings: {
    layout: isMac ? 'mac' : 'win', layoutChosen: false, theme: 'auto', font: 'naskh', size: 'm',
    sound: false, showKeyboard: true, showHands: true, diacritics: true,
  },
  lessons: {},   // lessonId -> { wpm, acc, stars }
  history: [],   // { t, wpm, acc, ms, kind }
  chars: {},     // char -> [hits, misses]
};

function loadStore() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (raw) return Object.assign({}, DEFAULTS, raw, { settings: Object.assign({}, DEFAULTS.settings, raw.settings) });
  } catch (e) { /* storage unavailable or corrupt: start fresh */ }
  return JSON.parse(JSON.stringify(DEFAULTS));
}
const store = loadStore();
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (e) { /* ignore */ }
}

const S = store.settings;
let layout = LAYOUTS[S.layout] || LAYOUTS.win;
let lessons = resolveLessons(layout);

// ---------------------------------------------------------------- sound

let audio = null;
function beep(ok) {
  if (!S.sound) return;
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    const t = audio.currentTime;
    osc.type = ok ? 'triangle' : 'square';
    osc.frequency.value = ok ? 1250 : 150;
    gain.gain.setValueAtTime(ok ? 0.035 : 0.05, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + (ok ? 0.04 : 0.12));
    osc.connect(gain).connect(audio.destination);
    osc.start(t);
    osc.stop(t + 0.13);
  } catch (e) { /* no audio */ }
}

// ---------------------------------------------------------------- appearance

const FONTS = {
  naskh: "'Noto Naskh Arabic', 'Geeza Pro', 'Traditional Arabic', 'Arabic Typesetting', serif",
  amiri: "'Amiri', 'Noto Naskh Arabic', 'Geeza Pro', 'Traditional Arabic', serif",
  sans: "'Noto Sans Arabic', 'SF Arabic', 'Segoe UI', 'Geeza Pro', sans-serif",
};
const SIZES = { s: '26px', m: '32px', l: '40px' };

function applyAppearance() {
  const root = document.documentElement;
  if (S.theme === 'auto') root.removeAttribute('data-theme'); else root.dataset.theme = S.theme;
  root.style.setProperty('--ar-font', FONTS[S.font] || FONTS.naskh);
  root.style.setProperty('--text-size', SIZES[S.size] || SIZES.m);
  $('#keyboard').hidden = !S.showKeyboard;
  $('#hands').hidden = !S.showHands;
  $('#layout-chip').textContent = `⌨ ${layout.platform} · ${layout.name}`;
}

function setLayout(id) {
  layout = LAYOUTS[id];
  S.layout = id;
  S.layoutChosen = true;
  save();
  lessons = resolveLessons(layout);
  typingKeyboard.render(layout);
  refKeyboard.render(layout);
  applyAppearance();
  renderLayoutOptions();
  renderLearn();
  renderReference();
  if (currentView === 'type' && sessionSpec) startSession(sessionSpec, true);
}

function renderLayoutOptions() {
  for (const host of [$('#setup-layouts'), $('#settings-layouts')]) {
    host.innerHTML = LAYOUT_DEFS.map(d => `
      <button type="button" class="layout-option ${d.id === S.layout ? 'selected' : ''}" data-layout="${d.id}">
        <span class="lo-platform">${d.platform}</span>
        <span class="lo-name">${d.name}</span>
        <span class="lo-sample" lang="ar">${['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT'].map(c => `<span>${d.keys[c][0]}</span>`).join('')}</span>
        <span class="lo-desc">${d.description}</span>
      </button>`).join('');
  }
}

// ---------------------------------------------------------------- routing

let currentView = 'learn';
function show(view) {
  currentView = view;
  $$('.view').forEach(v => { v.hidden = v.dataset.view !== view; });
  $$('[data-nav]').forEach(a => a.classList.toggle('active', a.dataset.nav === view || (view === 'type' && a.dataset.nav === lastSection)));
  if (view === 'learn') renderLearn();
  if (view === 'practice') renderPractice();
  if (view === 'keyboard') renderReference();
  if (view === 'progress') renderProgress();
  window.scrollTo(0, 0);
}

let lastSection = 'learn';
function route() {
  const view = (location.hash.match(/^#\/(\w+)/) || [])[1] || 'learn';
  if (view === 'type' && !session) { location.hash = '#/learn'; return; }
  if (view !== 'type') lastSection = view;
  show(['learn', 'practice', 'keyboard', 'progress', 'type'].includes(view) ? view : 'learn');
}
window.addEventListener('hashchange', route);

// ---------------------------------------------------------------- learn view

function starsHTML(n) {
  return `<span class="stars" aria-label="${n} of 3 stars">${[1, 2, 3].map(i => `<i class="${i <= n ? 'on' : ''}">★</i>`).join('')}</span>`;
}

function nextLessonIndex() {
  const i = lessons.findIndex(l => !(store.lessons[l.id] && store.lessons[l.id].stars));
  return i < 0 ? lessons.length - 1 : i;
}

function renderLearn() {
  $('#setup').hidden = S.layoutChosen;
  const next = nextLessonIndex();
  $('#lesson-grid').innerHTML = lessons.map((l, i) => {
    const rec = store.lessons[l.id];
    const keys = l.fresh.length
      ? l.fresh.map(ch => `<span class="chip" lang="ar">${esc(showChar(ch))}</span>`).join('')
      : '<span class="chip chip-wide">review</span>';
    return `<li class="lesson ${rec && rec.stars ? 'done' : ''} ${i === next ? 'next' : ''}" data-lesson="${i}" tabindex="0">
      <div class="lesson-num">${l.number}</div>
      <div class="lesson-body">
        <div class="lesson-title">${esc(l.title)}</div>
        <div class="chips">${keys}</div>
      </div>
      <div class="lesson-meta">${rec ? starsHTML(rec.stars) + `<small>${rec.wpm} wpm · ${rec.acc}%</small>` : (i === next ? '<span class="pill">Up next</span>' : '')}</div>
    </li>`;
  }).join('');
  $('#btn-continue').textContent = Object.keys(store.lessons).length ? 'Continue' : 'Start lesson 1';
}

$('#lesson-grid').addEventListener('click', e => {
  const li = e.target.closest('[data-lesson]');
  if (li) startLesson(Number(li.dataset.lesson));
});
$('#lesson-grid').addEventListener('keydown', e => {
  const li = e.target.closest('[data-lesson]');
  if (li && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); startLesson(Number(li.dataset.lesson)); }
});
$('#btn-continue').addEventListener('click', () => startLesson(nextLessonIndex()));

function startLesson(i) {
  const l = lessons[i];
  const note = l.note && l.note.replace(/\{(\d)\}/g, (_, d) => esc(layout.keys[`Digit${d}`][0]));
  startSession({ kind: 'lesson', lessonIndex: i, kicker: `Lesson ${l.number} of ${lessons.length}`, title: l.title, tip: l.tip, note });
}

// ---------------------------------------------------------------- practice view

function renderPractice() {
  $('#practice-diacritics').checked = S.diacritics;
  const cards = TEXT_SOURCES.map(src => `
    <button class="source" data-source="${src.id}">
      <span class="source-ar" lang="ar">${src.ar}</span>
      <span class="source-title">${esc(src.title)}</span>
      <span class="source-blurb">${esc(src.blurb)}</span>
      <span class="source-count">${src.items.length} passages</span>
    </button>`);
  cards.unshift(`
    <button class="source" data-source="words">
      <span class="source-ar" lang="ar">كلمات</span>
      <span class="source-title">Common words</span>
      <span class="source-blurb">A random mix of everyday vocabulary.</span>
      <span class="source-count">${UNIQUE_WORDS.length} words</span>
    </button>`);
  $('#source-grid').innerHTML = cards.join('');
}

$('#source-grid').addEventListener('click', e => {
  const b = e.target.closest('[data-source]');
  if (b) startPractice(b.dataset.source);
});
$('#practice-diacritics').addEventListener('change', e => { S.diacritics = e.target.checked; save(); });

const sourceCursor = {};
function startPractice(sourceId) {
  if (sourceId === 'words') {
    startSession({ kind: 'practice', sourceId, kicker: 'Practice', title: 'Common words' });
    return;
  }
  const src = TEXT_SOURCES.find(s => s.id === sourceId);
  if (sourceCursor[sourceId] === undefined) sourceCursor[sourceId] = Math.floor(Math.random() * src.items.length);
  else sourceCursor[sourceId] = (sourceCursor[sourceId] + 1) % src.items.length;
  const item = src.items[sourceCursor[sourceId]];
  startSession({
    kind: 'practice', sourceId, kicker: `${src.title} · ${src.ar}`, title: item.ref,
    text: passageText(item), credit: src.credit, creditUrl: src.creditUrl,
  });
}

$('#btn-custom').addEventListener('click', () => {
  const text = $('#custom-text').value.trim();
  if (!text) { $('#custom-text').focus(); return; }
  startSession({ kind: 'practice', sourceId: 'custom', kicker: 'Practice', title: 'Your text', text });
});

function weakChars(limit = 6) {
  return Object.entries(store.chars)
    .filter(([ch, [h, m]]) => h + m >= 5 && m > 0 && layout.canType(ch) && ch !== ' ')
    .map(([ch, [h, m]]) => ({ ch, rate: m / (h + m), hits: h, misses: m }))
    .sort((a, b) => b.rate - a.rate)
    .slice(0, limit);
}

function weakKeysText() {
  const weak = weakChars().map(w => w.ch);
  if (!weak.length) return null;
  const marks = weak.filter(isHaraka);
  const letters = weak.filter(ch => !isHaraka(ch));
  const all = new Set([...layout.charToKey ? Object.keys(layout.charToKey) : []]);
  const words = shuffle(UNIQUE_WORDS.filter(w => weak.some(ch => w.includes(ch)))).slice(0, 18)
    .filter(w => lettersOf(w).every(ch => all.has(ch)));
  const drills = letters.map(ch => `${ch}${ch}${ch}`);
  const syll = marks.map(m => ['ب', 'ت', 'س', 'ل', 'م', 'ن'].map(l => l + m).join(''));
  return drills.concat(syll, words).join(' ');
}

$('#btn-weak').addEventListener('click', () => {
  const text = weakKeysText();
  if (!text) { toast('Type a few lessons first — then Katib can find your weak keys.'); return; }
  startSession({ kind: 'practice', sourceId: 'weak', kicker: 'Practice', title: 'Your weak keys', text });
});

// ---------------------------------------------------------------- typing screen

const typingKeyboard = new KeyboardView($('#keyboard'));
const refKeyboard = new KeyboardView($('#ref-keyboard'));
const heatKeyboard = new KeyboardView($('#heat-keyboard'));
$('#hands').innerHTML = handsSVG();

let session = null;
let sessionSpec = null;
let tick = null;
const useHighlights = typeof Highlight !== 'undefined' && CSS.highlights;

function buildText(spec) {
  if (spec.kind === 'lesson') {
    const l = lessons[spec.lessonIndex];
    return prepareText(lessonText(l), layout, { diacritics: true });
  }
  if (spec.sourceId === 'words') {
    const words = shuffle(UNIQUE_WORDS).slice(0, 30).join(' ');
    return prepareText(words, layout, { diacritics: S.diacritics });
  }
  return prepareText(spec.text, layout, { diacritics: S.diacritics || spec.sourceId === 'custom', allowSkips: true });
}

function startSession(spec, keepText) {
  sessionSpec = spec;
  const prepared = keepText && session && session._spec === spec && session.layout === layout ? session.text : buildText(spec);
  session = new TypingSession(prepared, layout);
  session._spec = spec;
  clearInterval(tick);
  tick = null;

  $('#type-kicker').textContent = spec.kicker || '';
  $('#type-title').textContent = spec.title || '';
  const credit = spec.credit ? (spec.creditUrl ? `<a href="${spec.creditUrl}" target="_blank" rel="noopener">${esc(spec.credit)}</a>` : esc(spec.credit)) : (spec.tip ? esc(spec.tip) : '');
  $('#type-credit').innerHTML = credit;
  $('#lesson-note').innerHTML = spec.note || '';
  $('#lesson-note').hidden = !spec.note;
  $('#results').hidden = true;
  $('.type-card').classList.remove('show-results');
  renderText();
  updateTyping();
  if (location.hash !== '#/type') location.hash = '#/type'; else show('type');
}

function renderText() {
  const el = $('#text');
  const { display, clusters } = session.text;
  if (useHighlights) {
    el.textContent = display;
  } else {
    // Fallback for browsers without the CSS Highlight API: one span per cluster.
    el.innerHTML = clusters.map((c, i) => `<span data-i="${i}" class="${c.skip ? 'skip' : ''}">${esc(display.slice(c.start, c.end))}</span>`).join('');
  }
  $('#text-box').scrollTop = 0;
}

function paintText() {
  const el = $('#text');
  const clusters = session.clusters;
  const cur = session.done ? clusters.length : session.index;
  if (useHighlights) {
    const node = el.firstChild;
    if (!node) return;
    const range = (a, b) => { const r = new Range(); r.setStart(node, a); r.setEnd(node, b); return r; };
    const typedEnd = cur < clusters.length ? clusters[cur].start : session.text.display.length;
    CSS.highlights.set('typed', new Highlight(range(0, typedEnd)));
    CSS.highlights.set('skipped', new Highlight(...clusters.filter(c => c.skip).map(c => range(c.start, c.end))));
    CSS.highlights.set('mistake', new Highlight(...[...session.errorClusters].filter(i => i < cur).map(i => range(clusters[i].start, clusters[i].end))));
    if (cur < clusters.length) {
      const r = range(clusters[cur].start, clusters[cur].end);
      CSS.highlights.set('current', new Highlight(r));
      scrollToRange(r);
    } else {
      CSS.highlights.delete('current');
    }
  } else {
    el.querySelectorAll('span').forEach((s, i) => {
      s.className = clusters[i].skip ? 'skip' : i < cur ? (session.errorClusters.has(i) ? 'typed mistake' : 'typed') : i === cur ? 'current' : '';
    });
    const curEl = el.querySelector('.current');
    if (curEl) scrollToRect(curEl.getBoundingClientRect());
  }
}

function scrollToRange(r) {
  const rects = r.getClientRects();
  if (rects.length) scrollToRect(rects[0]);
}

function scrollToRect(rect) {
  const box = $('#text-box');
  const boxRect = box.getBoundingClientRect();
  const lineH = parseFloat(getComputedStyle($('#text')).lineHeight) || 60;
  const y = rect.top - boxRect.top + box.scrollTop;
  const target = Math.max(0, Math.floor(y / lineH) * lineH - lineH);
  if (Math.abs(box.scrollTop - target) > 2) box.scrollTo({ top: target, behavior: 'smooth' });
}

function fmtTime(ms) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function lessonAllowsLigature() {
  if (!sessionSpec || sessionSpec.kind !== 'lesson') return true;
  return lessons[sessionSpec.lessonIndex].learned.has('لا');
}

function updateTyping() {
  paintText();
  $('#stat-wpm').textContent = session.wpm();
  $('#stat-acc').textContent = session.accuracy();
  $('#stat-time').textContent = fmtTime(session.elapsedMs());
  $('#progress-fill').style.width = `${session.progress() * 100}%`;
  renderHint();
}

function keyName(info) {
  const label = info.code === 'Space' ? 'Space' : info.code === 'Enter' ? 'Enter' : latinLabel(info.code);
  return (info.shift ? 'Shift + ' : '') + label;
}

function renderHint() {
  const hint = $('#hint');
  const out = session.done ? null : session.suggestion(lessonAllowsLigature());
  const info = typingKeyboard.showTarget(out);
  $$('#hands .finger').forEach(f => f.classList.remove('active'));
  if (!out || !info) { hint.innerHTML = ''; return; }

  const finger = FINGER_OF[info.code];
  const fingers = [finger];
  if (info.shift) fingers.push(FINGER_OF[shiftFor(info.code)]);
  fingers.forEach(f => $$(`#hands [data-finger="${f}"]`).forEach(el => el.classList.add('active')));

  const meta = CHAR_INFO[out] || {};
  let glyph = showChar(out);
  if (isHaraka(out) && session.current) glyph = session.current.base + out;
  const name = meta.name ? `<b>${esc(meta.name)}</b>${meta.ar ? ` <span lang="ar">${meta.ar}</span>` : ''}${meta.sound ? ` <span class="muted">· ${meta.sound}</span>` : ''}` : '';
  const how = info.shift
    ? `<kbd>Shift</kbd> with your ${FINGER_NAMES[FINGER_OF[shiftFor(info.code)]].toLowerCase()}, then <kbd>${esc(latinLabel(info.code))}</kbd> with your ${FINGER_NAMES[finger].toLowerCase()}`
    : `<kbd>${esc(keyName(info))}</kbd> · ${FINGER_NAMES[finger]}`;
  const cue = startsNumber() ? '<div class="hint-cue">← Numbers run left to right: start at the left end of the number</div>' : '';
  hint.innerHTML = `<div class="hint-glyph f-${finger}" lang="ar">${esc(glyph)}</div><div class="hint-text">${name ? `<div>${name}</div>` : ''}<div>${how}</div>${cue}</div>`;
}

/** True when the cursor sits on the first digit of a number with two or more digits. */
function startsNumber() {
  const isDigit = c => c && !c.skip && /^[0-9٠-٩]$/.test(c.base);
  const i = session.index;
  return !session.baseDone && isDigit(session.clusters[i]) && !isDigit(session.clusters[i - 1]) && isDigit(session.clusters[i + 1]);
}

function flashError() {
  const box = $('#text-box');
  box.classList.remove('flash-err');
  void box.offsetWidth;
  box.classList.add('flash-err');
  clearTimeout(box._t);
  box._t = setTimeout(() => box.classList.remove('flash-err'), 350);
}

function finishSession() {
  clearInterval(tick);
  tick = null;
  const wpm = session.wpm();
  const acc = session.accuracy();
  const ms = session.elapsedMs();
  const spec = sessionSpec;

  for (const [ch, [h, m]] of Object.entries(session.charStats)) {
    const s = store.chars[ch] || (store.chars[ch] = [0, 0]);
    s[0] += h; s[1] += m;
  }
  store.history.push({ t: Date.now(), wpm, acc, ms, kind: spec.kind });
  if (store.history.length > 500) store.history.splice(0, store.history.length - 500);

  let headline = 'Well done!';
  let note = '';
  let nextLabel = 'Next passage';
  if (spec.kind === 'lesson') {
    const l = lessons[spec.lessonIndex];
    const stars = acc >= 98 && wpm >= 25 ? 3 : acc >= 95 ? 2 : acc >= 90 ? 1 : 0;
    const prev = store.lessons[l.id];
    if (stars || prev) {
      store.lessons[l.id] = {
        stars: Math.max(stars, prev ? prev.stars : 0),
        wpm: Math.max(wpm, prev ? prev.wpm : 0),
        acc: Math.max(acc, prev ? prev.acc : 0),
      };
    }
    if (stars) {
      headline = stars === 3 ? 'Excellent!' : 'Lesson complete';
      note = stars < 3 ? 'For three stars: 98% accuracy and 25 wpm.' : '';
      nextLabel = spec.lessonIndex < lessons.length - 1 ? 'Next lesson' : 'Practice real text';
    } else {
      headline = 'Almost there';
      note = 'Reach 90% accuracy to complete this lesson. Slow down — accuracy first, speed follows.';
      nextLabel = 'Try a new exercise';
    }
    spec.passed = Boolean(stars);
    spec.stars = stars;
  }
  save();

  const missed = Object.entries(session.charStats)
    .filter(([, [, m]]) => m > 0)
    .sort((a, b) => b[1][1] - a[1][1])
    .slice(0, 6)
    .map(([ch, [, m]]) => `<span class="chip miss" lang="ar" title="${m} missed">${esc(showChar(ch))}<small>${m}</small></span>`)
    .join('');

  const r = $('#results');
  r.innerHTML = `
    <div class="results-inner">
      ${spec.kind === 'lesson' ? starsHTML(spec.stars) : ''}
      <h2>${headline}</h2>
      <div class="results-stats">
        <div><b>${wpm}</b><small>wpm</small></div>
        <div><b>${acc}%</b><small>accuracy</small></div>
        <div><b>${fmtTime(ms)}</b><small>time</small></div>
      </div>
      ${note ? `<p class="muted">${note}</p>` : ''}
      ${missed ? `<div class="results-missed"><span class="muted small">Missed keys</span><div class="chips">${missed}</div></div>` : ''}
      <div class="results-actions">
        <button class="btn" id="btn-again">Again <kbd>Esc</kbd></button>
        <button class="btn primary" id="btn-next-session">${nextLabel} <kbd>Enter</kbd></button>
      </div>
    </div>`;
  r.hidden = false;
  $('.type-card').classList.add('show-results');
  $('#btn-again').onclick = () => startSession(spec, true);
  $('#btn-next-session').onclick = nextSession;
  typingKeyboard.clearTarget();
  $('#hint').innerHTML = '';
}

function nextSession() {
  const spec = sessionSpec;
  if (spec.kind === 'lesson') {
    if (spec.passed && spec.lessonIndex < lessons.length - 1) startLesson(spec.lessonIndex + 1);
    else if (spec.passed) location.hash = '#/practice';
    else startLesson(spec.lessonIndex);
  } else if (spec.sourceId === 'custom') {
    startSession(spec, true);
  } else if (spec.sourceId === 'weak') {
    $('#btn-weak').click();
  } else {
    startPractice(spec.sourceId);
  }
}

$('#btn-back').addEventListener('click', () => { location.hash = `#/${lastSection}`; });

// ---------------------------------------------------------------- keyboard input

let mismatch = { count: 0, layoutId: null, dismissed: false };

function checkSystemLayout(e, out) {
  if (mismatch.dismissed || !e.key || e.key.length > 2 || !/[؀-ۿ]/.test(e.key)) return;
  if (e.key === out) { mismatch.count = 0; return; }
  const match = LAYOUT_DEFS.find(d => d.id !== layout.id && LAYOUTS[d.id].output(e.code, e.shiftKey) === e.key);
  if (!match) return;
  mismatch.count = mismatch.layoutId === match.id ? mismatch.count + 1 : 1;
  mismatch.layoutId = match.id;
  if (mismatch.count === 4) {
    toast(`Your computer seems to be using the <b>${match.platform} ${match.name}</b> layout.`, [
      { label: 'Switch to it', action: () => setLayout(match.id) },
      { label: 'Keep mine', action: () => { mismatch.dismissed = true; } },
    ]);
  }
}

function isTypingTarget(el) {
  return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
}

document.addEventListener('keydown', e => {
  if (document.querySelector('dialog[open]') || isTypingTarget(e.target)) return;

  if (currentView === 'keyboard') { referenceKey(e); return; }
  if (currentView !== 'type' || !session) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;

  if (e.key === 'Shift') { typingKeyboard.setShiftLayer(true); return; }
  if (e.code === 'Escape') { e.preventDefault(); startSession(sessionSpec, true); return; }

  if (!$('#results').hidden) {
    if (e.code === 'Enter' || e.code === 'NumpadEnter') { e.preventDefault(); nextSession(); }
    else if (e.code === 'Space') e.preventDefault();
    return;
  }

  const out = layout.output(e.code, e.shiftKey);
  if (['Tab', 'Backspace', 'Space', 'Enter', 'Quote', 'Slash'].includes(e.code) || out) e.preventDefault();
  if (!out || e.repeat) return;

  checkSystemLayout(e, out);
  const res = session.type(out);
  typingKeyboard.press(e.code, res.ok);
  beep(res.ok);
  if (!res.ok) flashError();
  if (!tick && !session.done) tick = setInterval(() => {
    $('#stat-wpm').textContent = session.wpm();
    $('#stat-time').textContent = fmtTime(session.elapsedMs());
  }, 500);
  updateTyping();
  if (res.finished) finishSession();
});

document.addEventListener('keyup', e => {
  if (e.key === 'Shift') {
    typingKeyboard.setShiftLayer(false);
    if (currentView === 'keyboard') refKeyboard.setShiftLayer($('#ref-shift').checked);
  }
});

window.addEventListener('blur', () => {
  if (currentView === 'type' && session && !session.done) $('#start-overlay').hidden = false;
  typingKeyboard.setShiftLayer(false);
});
window.addEventListener('focus', () => { $('#start-overlay').hidden = true; });
$('#start-overlay').addEventListener('click', () => { $('#start-overlay').hidden = true; window.focus(); });

// ---------------------------------------------------------------- keyboard reference

function comboHTML(ch) {
  const info = layout.charToKey[ch];
  if (!info) return '<span class="muted">not on this layout</span>';
  const base = layout.keys[info.code] && layout.keys[info.code][0];
  return `${info.shift ? '<kbd>Shift</kbd> + ' : ''}<kbd>${esc(latinLabel(info.code))}</kbd>` +
    (info.shift && base ? ` <span class="muted small">(the <span lang="ar">${esc(showChar(base))}</span> key)</span>` : '') +
    ` <span class="finger-dot f-${FINGER_OF[info.code]}" title="${FINGER_NAMES[FINGER_OF[info.code]]}"></span>`;
}

function refRows(chars) {
  return chars.filter(ch => layout.canType(ch) || CHAR_INFO[ch]).map(ch => {
    const m = CHAR_INFO[ch] || {};
    const sample = isHaraka(ch) ? (ch === SHADDA ? 'بَّ' : 'ب' + ch) : ch;
    return `<tr><td class="ref-glyph" lang="ar">${esc(sample)}</td>
      <td><b>${esc(m.name || ch)}</b>${m.ar ? `<br><span lang="ar" class="muted">${m.ar}</span>` : ''}${m.sound ? `<br><span class="muted small">${m.sound}</span>` : ''}</td>
      <td class="ref-combo">${comboHTML(ch)}</td></tr>`;
  }).join('');
}

function renderReference() {
  refKeyboard.setShiftLayer($('#ref-shift').checked);
  $('#ref-harakat').innerHTML = refRows([FATHA, DAMMA, KASRA, SUKUN, SHADDA, FATHATAN, DAMMATAN, KASRATAN]);
  $('#ref-special').innerHTML = refRows(['ء', 'أ', 'إ', 'آ', 'ؤ', 'ئ', 'ى', 'ة', 'لا', 'لأ', 'لإ', 'لآ', 'ـ'].filter(ch => layout.canType(ch)));
  $('#ref-punct').innerHTML = refRows(['،', '؛', '؟', '.', '!', ':', '"', '(', ')'].filter(ch => layout.canType(ch)));
  $('#finger-legend').innerHTML = handsSVG() + `<div class="legend-items">${Object.entries(FINGER_NAMES).map(([id, n]) =>
    `<span><span class="finger-dot f-${id}"></span>${n}</span>`).join('')}</div>`;
}

function referenceKey(e) {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === 'Shift') { refKeyboard.setShiftLayer(true); return; }
  const out = layout.output(e.code, e.shiftKey);
  if (!out && !FINGER_OF[e.code]) return;
  e.preventDefault();
  refKeyboard.press(e.code, true);
  refKeyboard.showTarget(null);
  const finger = FINGER_OF[e.code];
  const m = (out && CHAR_INFO[out]) || {};
  $('#key-info').innerHTML = out
    ? `<span class="key-info-glyph f-${finger}" lang="ar">${esc(showChar(out))}</span>
       <span><b>${esc(m.name || out)}</b> ${m.ar ? `<span lang="ar">${m.ar}</span>` : ''}<br>
       <span class="muted">${e.shiftKey ? 'Shift + ' : ''}${esc(latinLabel(e.code) || e.code)} · ${FINGER_NAMES[finger] || ''}</span></span>`
    : `<span class="muted">${esc(e.code)} · ${FINGER_NAMES[finger] || ''}</span>`;
  $$('#finger-legend .finger').forEach(f => f.classList.toggle('active', f.dataset.finger === finger));
}

$('#ref-shift').addEventListener('change', e => refKeyboard.setShiftLayer(e.target.checked));

// ---------------------------------------------------------------- progress

function renderProgress() {
  const h = store.history;
  const done = lessons.filter(l => store.lessons[l.id] && store.lessons[l.id].stars).length;
  const recent = h.slice(-10);
  const avgAcc = recent.length ? Math.round(recent.reduce((s, x) => s + x.acc, 0) / recent.length) : 0;
  const best = h.reduce((m, x) => Math.max(m, x.wpm), 0);
  const minutes = Math.round(h.reduce((s, x) => s + x.ms, 0) / 60000);
  $('#tiles').innerHTML = [
    [`${done}/${lessons.length}`, 'lessons complete'],
    [best, 'best wpm'],
    [recent.length ? `${avgAcc}%` : '—', 'recent accuracy'],
    [minutes, 'minutes practised'],
  ].map(([v, l]) => `<div class="tile"><b>${v}</b><small>${l}</small></div>`).join('');

  $('#chart').innerHTML = chartSVG(h.slice(-40));

  heatKeyboard.render(layout);
  const perCode = {};
  for (const [ch, [hits, misses]] of Object.entries(store.chars)) {
    const info = layout.charToKey[ch];
    if (!info || ch.length > 1) continue;
    const p = perCode[info.code] || (perCode[info.code] = [0, 0]);
    p[0] += hits; p[1] += misses;
  }
  const rates = {};
  for (const [code, [hits, misses]] of Object.entries(perCode)) if (hits + misses >= 5) rates[code] = misses / (hits + misses);
  heatKeyboard.heatmap(rates);

  const weak = weakChars();
  $('#weak-list').innerHTML = weak.length
    ? `<span class="muted small">Weakest:</span> ` + weak.map(w => `<span class="chip miss" lang="ar">${esc(showChar(w.ch))}<small>${Math.round(w.rate * 100)}%</small></span>`).join('')
    : '';
}

function chartSVG(points) {
  if (points.length < 2) return '<p class="muted">Finish a couple of exercises to see your speed here.</p>';
  const W = 640, H = 160, P = 28;
  const max = Math.max(10, ...points.map(p => p.wpm)) * 1.15;
  const x = i => P + (i * (W - 2 * P)) / (points.length - 1);
  const y = v => H - P - (v / max) * (H - 2 * P);
  const line = points.map((p, i) => `${x(i).toFixed(1)},${y(p.wpm).toFixed(1)}`).join(' ');
  const area = `${P},${H - P} ${line} ${x(points.length - 1).toFixed(1)},${H - P}`;
  const ticks = [0, Math.round(max / 2), Math.round(max)].map(v =>
    `<line x1="${P}" x2="${W - P}" y1="${y(v)}" y2="${y(v)}" class="grid"/><text x="${P - 6}" y="${y(v) + 4}" class="axis">${v}</text>`).join('');
  const dots = points.map((p, i) => `<circle cx="${x(i)}" cy="${y(p.wpm)}" r="3.5"><title>${p.wpm} wpm · ${p.acc}% · ${new Date(p.t).toLocaleDateString()}</title></circle>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" class="chart-svg" role="img" aria-label="Words per minute over your last ${points.length} sessions">
    ${ticks}<polygon points="${area}" class="area"/><polyline points="${line}" class="line"/>${dots}</svg>`;
}

$('#btn-reset').addEventListener('click', () => {
  if (!confirm('Reset all lessons, history and key statistics? This cannot be undone.')) return;
  store.lessons = {}; store.history = []; store.chars = {};
  save();
  renderProgress();
});

// ---------------------------------------------------------------- settings & toast

function openSettings() {
  $('#set-theme').value = S.theme;
  $('#set-font').value = S.font;
  $('#set-size').value = S.size;
  $('#set-keyboard').checked = S.showKeyboard;
  $('#set-hands').checked = S.showHands;
  $('#set-sound').checked = S.sound;
  renderLayoutOptions();
  $('#settings').showModal();
}
$('#btn-settings').addEventListener('click', openSettings);
$('#layout-chip').addEventListener('click', openSettings);

const bindSetting = (id, key, prop = 'value') => $(id).addEventListener('change', e => {
  S[key] = e.target[prop];
  save();
  applyAppearance();
  if (currentView === 'type' && session) paintText();
});
bindSetting('#set-theme', 'theme');
bindSetting('#set-font', 'font');
bindSetting('#set-size', 'size');
bindSetting('#set-keyboard', 'showKeyboard', 'checked');
bindSetting('#set-hands', 'showHands', 'checked');
bindSetting('#set-sound', 'sound', 'checked');

document.addEventListener('click', e => {
  const b = e.target.closest('[data-layout]');
  if (b) setLayout(b.dataset.layout);
});

function toast(html, actions = []) {
  const t = $('#toast');
  t.innerHTML = `<span>${html}</span>` + actions.map((a, i) => `<button class="btn ${i === 0 ? 'primary' : 'ghost'}" data-i="${i}">${a.label}</button>`).join('');
  t.hidden = false;
  t.onclick = e => {
    const b = e.target.closest('button');
    if (!b) return;
    actions[Number(b.dataset.i)].action();
    t.hidden = true;
  };
  clearTimeout(t._t);
  t._t = setTimeout(() => { t.hidden = true; }, actions.length ? 15000 : 4000);
}

// ---------------------------------------------------------------- boot

typingKeyboard.render(layout);
refKeyboard.render(layout);
renderLayoutOptions();
applyAppearance();
route();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => { /* offline support is optional */ });
}
