/*
 * The guided course. Lessons are defined by physical keys (for letters) or by
 * characters (for diacritics, hamza forms, punctuation), so the same course
 * adapts to every layout: on macOS "Arabic" the top-row lesson teaches different
 * letters than on Windows, but always the same finger movements.
 */

const DIGITS_TOKEN = 'DIGITS';

const LESSON_DEFS = [
  { id: 'home', title: 'Home row', tip: 'Rest your left fingers on A S D F and your right fingers on J K L ;. Feel the bumps on F and J — that is home. Thumbs rest on the space bar.', codes: ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon'] },
  { id: 'home-reach', title: 'Home row — inner & outer reach', tip: 'Your index fingers reach one key toward the middle; your right pinky reaches one key to the right. Return to home after every reach.', codes: ['KeyG', 'KeyH', 'Quote'] },
  { id: 'top-left', title: 'Top row — left hand', tip: 'Reach up and slightly left with each finger, then come back to the home row.', codes: ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT'] },
  { id: 'top-right', title: 'Top row — right hand', tip: 'The right index finger covers two columns: Y and U on the top row.', codes: ['KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP'] },
  { id: 'top-edge', title: 'Top row — right pinky stretch', tip: 'Keep your other fingers anchored on the home row while the pinky stretches.', codes: ['BracketLeft', 'BracketRight'] },
  { id: 'bottom-left', title: 'Bottom row — left hand', tip: 'Curl your fingers down and slightly right. Keep your wrists still.', codes: ['KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB'] },
  { id: 'bottom-right', title: 'Bottom row — right hand', tip: 'The right index finger covers N and M. Middle, ring and pinky take the next three keys.', codes: ['KeyN', 'KeyM', 'Comma', 'Period', 'Slash'] },
  { id: 'corner', title: 'The far corner', tip: 'Your left pinky reaches up past the number row’s first key. Take it slowly.', codes: ['Backquote'] },
  { id: 'letters', title: 'All the letters', tip: 'A full review of every letter. Aim for steady rhythm rather than speed.', review: true },
  { id: 'vowels', title: 'Short vowels — fatha, damma, kasra', tip: 'Harakat are typed right after their letter. Hold Shift with the opposite hand’s pinky.', chars: [FATHA, DAMMA, KASRA] },
  { id: 'sukun-shadda', title: 'Sukun & shadda', tip: 'Sukun marks a letter with no vowel. Shadda doubles a letter: type the letter, then shadda, then its vowel.', chars: [SUKUN, SHADDA] },
  { id: 'tanween', title: 'Tanwin', tip: 'Tanwin adds a final “n” sound: -an, -un, -in. Tanwin fath usually sits before a final alif: كتابًا.', chars: [FATHATAN, DAMMATAN, KASRATAN] },
  { id: 'hamza', title: 'Hamza, madda & special letters', tip: 'Hamza has several seats: on alif (أ إ), on waw (ؤ), on ya (ئ) and on its own (ء).', chars: ['أ', 'إ', 'آ', 'ؤ', 'ئ', 'ء', 'ى', 'ة'] },
  { id: 'lam-alif', title: 'Lam-alif', tip: 'Lam followed by alif joins into a special shape. Your layout has a dedicated key for it — or type ل then ا.', chars: ['لا', 'لأ', 'لإ', 'لآ'] },
  { id: 'punctuation', title: 'Punctuation', tip: 'Arabic uses its own comma ، semicolon ؛ and question mark ؟.', chars: ['،', '؛', '؟', '.', '!', ':', '"', '(', ')'] },
  { id: 'numbers', title: 'Numbers', tip: 'Reach up from the home row; each finger takes the digits above its column.', chars: [DIGITS_TOKEN] },
  { id: 'sentences', title: 'Real sentences', tip: 'Everything together: full, vowelized sentences from proverbs and hadith.', review: true, sentences: true },
];

/** Works out, for one layout, which characters each lesson introduces. */
function resolveLessons(layout) {
  const learned = new Set();
  const lessons = [];
  for (const def of LESSON_DEFS) {
    let fresh = [];
    if (def.codes) {
      for (const code of def.codes) {
        const out = layout.keys[code] && layout.keys[code][0];
        if (out && [...out].every(isArabicLetter)) fresh.push(out);
      }
    } else if (def.chars) {
      const chars = def.chars[0] === DIGITS_TOKEN
        ? ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0'].map(c => layout.keys[c][0])
        : def.chars;
      fresh = chars.filter(ch => layout.canType(ch));
    }
    fresh = fresh.filter(ch => !learned.has(ch));
    if (!fresh.length && !def.review) continue;
    fresh.forEach(ch => learned.add(ch));
    lessons.push(Object.assign({}, def, { fresh, learned: new Set(learned), number: lessons.length + 1 }));
  }
  return lessons;
}

const pick = arr => arr[Math.floor(Math.random() * arr.length)];
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const UNIQUE_WORDS = [...new Set(WORDS)];

/** Words whose letters (and diacritics, if `withMarks`) are all in `learned`. */
function eligibleWords(learned, withMarks) {
  return UNIQUE_WORDS
    .filter(w => lettersOf(w).every(ch => learned.has(ch)))
    .filter(w => !withMarks || marksOf(w).every(m => learned.has(m)))
    .map(w => (withMarks ? w : stripDiacritics(w)));
}

function letterGroups(fresh, known, count) {
  const pool = fresh.concat(fresh, known.slice(0, 8));
  const groups = fresh.map(ch => ch.repeat(ch.length > 1 ? 2 : 3));
  while (groups.length < count) {
    const len = 2 + Math.floor(Math.random() * 3);
    let g = '';
    for (let i = 0; i < len; i++) g += pick(pool);
    groups.push(g);
  }
  return groups;
}

function chooseWords(candidates, mustContain, count) {
  const preferred = mustContain.length
    ? candidates.filter(w => mustContain.some(ch => w.includes(ch)))
    : candidates;
  let chosen = shuffle(preferred).slice(0, count);
  if (chosen.length < count) chosen = chosen.concat(shuffle(candidates.filter(w => !chosen.includes(w))).slice(0, count - chosen.length));
  // Repeat if the pool is small, so the exercise still has a decent length.
  while (chosen.length && chosen.length < Math.min(count, 8)) chosen = chosen.concat(shuffle(chosen)).slice(0, count);
  return chosen;
}

function pseudoWords(letters, count) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const len = 3 + Math.floor(Math.random() * 3);
    let w = '';
    for (let j = 0; j < len; j++) w += pick(letters);
    out.push(w);
  }
  return out;
}

/** Generates a fresh exercise text for a resolved lesson. */
function lessonText(lesson) {
  const learned = lesson.learned;
  const marksLearned = HARAKAT.some(m => learned.has(m));
  const letters = [...learned].filter(ch => [...ch].every(isArabicLetter));
  const fresh = lesson.fresh;
  const freshMarks = fresh.filter(isHaraka);

  if (lesson.sentences) {
    const pool = TEXT_SOURCES.filter(s => s.id === 'proverbs' || s.id === 'hadith').flatMap(s => s.items);
    return shuffle(pool).slice(0, 3).map(passageText).join(' ');
  }

  if (lesson.id === 'numbers') {
    const groups = [];
    for (let i = 0; i < 14; i++) {
      let g = '';
      const len = 2 + Math.floor(Math.random() * 3);
      for (let j = 0; j < len; j++) g += pick(fresh);
      groups.push(g);
    }
    const words = eligibleWords(learned, true);
    return groups.slice(0, 8).join(' ') + ' ' + groups.slice(8).map(g => `${pick(words)} ${g}`).join(' ');
  }

  if (lesson.id === 'punctuation') {
    const words = shuffle(eligibleWords(learned, true)).slice(0, 18);
    const marks = fresh.filter(p => !'()"'.includes(p));
    const parts = [];
    for (let i = 0; i < words.length; i += 3) {
      const trio = words.slice(i, i + 3).join(' ');
      const r = Math.random();
      if (fresh.includes('(') && r < 0.15) parts.push(`(${trio})`);
      else if (fresh.includes('"') && r < 0.3) parts.push(`"${trio}"`);
      else parts.push(trio + pick(marks));
    }
    return parts.join(' ');
  }

  if (freshMarks.length) {
    // Syllable drill shaped like real words: بَتُ, سَلَّمَ, كَتْ, بَيتٌ, كَتَبًا
    const common = letters.filter(ch => ch.length === 1 && !'اءأإآئؤىة'.includes(ch)).slice(0, 14);
    const vowel = () => pick([FATHA, DAMMA, KASRA]);
    const groups = [];
    for (let i = 0; i < 10; i++) {
      const m = pick(freshMarks);
      let g = pick(common) + FATHA;
      if (m === SHADDA) g += pick(common) + SHADDA + vowel();
      else if (m === SUKUN) g += pick(common) + SUKUN;
      else if (m === FATHATAN) g += pick(common) + FATHATAN + 'ا';
      else if (m === DAMMATAN || m === KASRATAN) g += pick(common) + m;
      else g += pick(common) + m + (Math.random() < 0.5 ? pick(common) + pick(freshMarks) : '');
      groups.push(g);
    }
    const words = chooseWords(eligibleWords(learned, true), freshMarks, 12);
    return groups.join(' ') + ' ' + words.join(' ');
  }

  const known = shuffle(letters.filter(ch => !fresh.includes(ch)));
  const drills = lesson.review ? [] : letterGroups(fresh, known, 10);
  const candidates = eligibleWords(learned, marksLearned);
  let words = chooseWords(candidates, lesson.review ? [] : fresh, lesson.review ? 24 : 14);
  if (words.length < 6) words = words.concat(pseudoWords(letters.filter(ch => ch.length === 1), 10 - words.length));
  return drills.concat(words).join(' ');
}
