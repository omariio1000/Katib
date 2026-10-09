/*
 * Arabic text helpers: diacritic handling, normalisation for a given layout,
 * and splitting text into typeable clusters (a base letter plus its marks).
 */

const HARAKAT = [FATHA, DAMMA, KASRA, SUKUN, SHADDA, FATHATAN, DAMMATAN, KASRATAN];
const HARAKAT_SET = new Set(HARAKAT);

// Any Arabic combining mark, including Qur'anic annotation signs and the superscript alif.
const ANY_MARK_RE = /[ؐ-ًؚ-ٰٟۖ-ۜ۟-۪ۨ-ۭ]/g;
const IS_MARK_RE = /^[ؐ-ًؚ-ٰٟۖ-ۜ۟-۪ۨ-ۭ]$/;
// Qur'anic annotations (pause marks, rub' al-hizb, small high letters…) that no keyboard types.
const QURANIC_SIGNS_RE = /[ؐ-ؚٓ-ٰٟۖ-ۭ]/g;
const ARABIC_LETTER_RE = /[ء-غف-ي]/;

const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const toArabicDigits = s => String(s).replace(/[0-9]/g, d => ARABIC_DIGITS[d]);
const toLatinDigits = s => String(s).replace(/[٠-٩]/g, d => ARABIC_DIGITS.indexOf(d));

/** Fallbacks tried, in order, when a character can't be typed on the current layout. */
const SUBSTITUTES = {
  '?': ['؟'], ',': ['،'], ';': ['؛'], '%': ['٪'], '٪': ['%'],
  '«': ['"'], '»': ['"'], '“': ['"'], '”': ['"'], '‘': ["'", '"'], '’': ["'", '"'],
  'ٱ': ['ا'], '٫': ['.', ','], '٬': [','], '–': ['-'], '—': ['-'],
};
for (let d = 0; d <= 9; d++) {
  SUBSTITUTES[String(d)] = [ARABIC_DIGITS[d]];
  SUBSTITUTES[ARABIC_DIGITS[d]] = [String(d)];
}

/** Display names for characters that deserve a friendly label. */
const CHAR_INFO = {
  [FATHA]: { name: 'Fatha', ar: 'فَتْحة', sound: 'short “a”' },
  [DAMMA]: { name: 'Damma', ar: 'ضَمّة', sound: 'short “u”' },
  [KASRA]: { name: 'Kasra', ar: 'كَسْرة', sound: 'short “i”' },
  [SUKUN]: { name: 'Sukun', ar: 'سُكون', sound: 'no vowel' },
  [SHADDA]: { name: 'Shadda', ar: 'شَدّة', sound: 'doubled letter' },
  [FATHATAN]: { name: 'Tanwin fath', ar: 'تنوين فتح', sound: '“-an”' },
  [DAMMATAN]: { name: 'Tanwin damm', ar: 'تنوين ضم', sound: '“-un”' },
  [KASRATAN]: { name: 'Tanwin kasr', ar: 'تنوين كسر', sound: '“-in”' },
  'ا': { name: 'Alif', ar: 'ألف' }, 'ب': { name: 'Ba', ar: 'باء' }, 'ت': { name: 'Ta', ar: 'تاء' },
  'ث': { name: 'Tha', ar: 'ثاء' }, 'ج': { name: 'Jim', ar: 'جيم' }, 'ح': { name: 'Ḥa', ar: 'حاء' },
  'خ': { name: 'Kha', ar: 'خاء' }, 'د': { name: 'Dal', ar: 'دال' }, 'ذ': { name: 'Dhal', ar: 'ذال' },
  'ر': { name: 'Ra', ar: 'راء' }, 'ز': { name: 'Zay', ar: 'زاي' }, 'س': { name: 'Sin', ar: 'سين' },
  'ش': { name: 'Shin', ar: 'شين' }, 'ص': { name: 'Ṣad', ar: 'صاد' }, 'ض': { name: 'Ḍad', ar: 'ضاد' },
  'ط': { name: 'Ṭa', ar: 'طاء' }, 'ظ': { name: 'Ẓa', ar: 'ظاء' }, 'ع': { name: 'ʿAyn', ar: 'عين' },
  'غ': { name: 'Ghayn', ar: 'غين' }, 'ف': { name: 'Fa', ar: 'فاء' }, 'ق': { name: 'Qaf', ar: 'قاف' },
  'ك': { name: 'Kaf', ar: 'كاف' }, 'ل': { name: 'Lam', ar: 'لام' }, 'م': { name: 'Mim', ar: 'ميم' },
  'ن': { name: 'Nun', ar: 'نون' }, 'ه': { name: 'Ha', ar: 'هاء' }, 'و': { name: 'Waw', ar: 'واو' },
  'ي': { name: 'Ya', ar: 'ياء' },
  'ء': { name: 'Hamza', ar: 'همزة' }, 'أ': { name: 'Alif with hamza above', ar: 'ألف بهمزة فوق' },
  'إ': { name: 'Alif with hamza below', ar: 'ألف بهمزة تحت' }, 'آ': { name: 'Alif madda', ar: 'ألف ممدودة' },
  'ؤ': { name: 'Waw with hamza', ar: 'واو بهمزة' }, 'ئ': { name: 'Ya with hamza', ar: 'ياء بهمزة' },
  'ى': { name: 'Alif maqsura', ar: 'ألف مقصورة' }, 'ة': { name: 'Ta marbuta', ar: 'تاء مربوطة' },
  'لا': { name: 'Lam-alif', ar: 'لام ألف' }, 'لأ': { name: 'Lam-alif with hamza', ar: 'لام ألف بهمزة' },
  'لإ': { name: 'Lam-alif with hamza below', ar: 'لام ألف بهمزة تحت' }, 'لآ': { name: 'Lam-alif madda', ar: 'لام ألف ممدودة' },
  'ـ': { name: 'Tatweel (kashida)', ar: 'تطويل' },
  '،': { name: 'Arabic comma', ar: 'فاصلة' }, '؛': { name: 'Arabic semicolon', ar: 'فاصلة منقوطة' },
  '؟': { name: 'Arabic question mark', ar: 'علامة استفهام' }, '.': { name: 'Full stop', ar: 'نقطة' },
  ' ': { name: 'Space' }, '\n': { name: 'Enter (new line)' },
};

const isHaraka = ch => HARAKAT_SET.has(ch);
const isArabicLetter = ch => ARABIC_LETTER_RE.test(ch);

/** Removes every Arabic diacritic (tashkeel), leaving the letters. */
function stripDiacritics(text) {
  return text.replace(ANY_MARK_RE, '');
}

/**
 * Makes a combining mark visible on its own by seating it on a tatweel (ـَ).
 * (A dotted circle ◌ is missing from most Arabic web fonts and renders as a box.)
 */
function showChar(ch) {
  if (ch === ' ') return '␣';
  if (ch === '\n') return '⏎';
  return isHaraka(ch) ? 'ـ' + ch : ch;
}

/** Puts shadda first (the order people type it), then the other marks. */
function sortMarks(marks) {
  return marks.slice().sort((a, b) => (b === SHADDA) - (a === SHADDA));
}

/**
 * Turns raw text into the exact sequence a learner will type on `layout`.
 * Text wrapped in {curly braces} is shown but skipped (used for verse numbers).
 * Returns { display, clusters, keystrokes }.
 */
function prepareText(raw, layout, { diacritics = true, allowSkips = false } = {}) {
  let text = raw
    .replace(/﻿/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/آ/g, 'آ').replace(/أ/g, 'أ').replace(/إ/g, 'إ')
    .replace(/ؤ/g, 'ؤ').replace(/ئ/g, 'ئ')
    .replace(QURANIC_SIGNS_RE, '')
    .replace(/۞/g, '');
  if (!diacritics) text = stripDiacritics(text);
  text = text
    .replace(/[\t  -​ ]/g, ' ')
    .replace(/ +/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();

  const clusters = [];
  let display = '';
  const pushSkip = s => {
    clusters.push({ start: display.length, end: display.length + s.length, base: s, marks: [], skip: true });
    display += s;
  };

  for (let i = 0; i < text.length; i++) {
    let ch = text[i];
    if (allowSkips && ch === '{') {
      const close = text.indexOf('}', i);
      if (close > i) { pushSkip(text.slice(i + 1, close)); i = close; continue; }
    }
    if (IS_MARK_RE.test(ch)) {
      const prev = clusters[clusters.length - 1];
      if (prev && !prev.skip && layout.canType(ch) && isArabicLetter(prev.base)) {
        prev.marks.push(ch);
        prev.end += 1;
        display += ch;
      }
      continue; // marks that can't be typed (or have nothing to sit on) are dropped
    }
    if (!layout.canType(ch)) {
      const sub = (SUBSTITUTES[ch] || []).find(s => layout.canType(s));
      if (sub) ch = sub;
    }
    if (!layout.canType(ch)) { pushSkip(ch); continue; }
    clusters.push({ start: display.length, end: display.length + 1, base: ch, marks: [], skip: false });
    display += ch;
  }

  // Remove repeated marks inside a cluster (e.g. accidental double fatha).
  for (const c of clusters) c.marks = [...new Set(c.marks)];

  const keystrokes = clusters.reduce((n, c) => n + (c.skip ? 0 : 1 + c.marks.length), 0);
  return { display, clusters, keystrokes };
}

/** Letters (not marks) used in a word, ignoring diacritics. */
function lettersOf(word) {
  return [...stripDiacritics(word)];
}

/** Diacritics used in a word. */
function marksOf(word) {
  return [...word].filter(isHaraka);
}
