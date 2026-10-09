/*
 * Keyboard geometry, finger assignments and Arabic layouts.
 *
 * Keys are identified by KeyboardEvent.code (the physical key position), so the
 * app works no matter which keyboard layout the operating system has active.
 *
 * Layout data:
 *  - "win":   Windows "Arabic (101)" (kbda1). Verified against kbdlayout.info/kbda1.
 *  - "macpc": macOS "Arabic – PC". Extracted from macOS with UCKeyTranslate.
 *             Same as Windows except it types Arabic-Indic digits.
 *  - "mac":   macOS "Arabic" (Apple's own layout). Extracted from macOS with UCKeyTranslate.
 *
 * Each entry is [unshifted, shifted]. A value may be more than one character
 * (e.g. the lam-alif key types "لا"), or null when the key types nothing.
 */

const FATHA = 'َ', DAMMA = 'ُ', KASRA = 'ِ', SUKUN = 'ْ', SHADDA = 'ّ';
const FATHATAN = 'ً', DAMMATAN = 'ٌ', KASRATAN = 'ٍ';

const FINGER_OF = {
  Backquote: 'lp', Digit1: 'lp', Digit2: 'lr', Digit3: 'lm', Digit4: 'li', Digit5: 'li',
  Digit6: 'ri', Digit7: 'ri', Digit8: 'rm', Digit9: 'rr', Digit0: 'rp', Minus: 'rp', Equal: 'rp', Backspace: 'rp',
  Tab: 'lp', KeyQ: 'lp', KeyW: 'lr', KeyE: 'lm', KeyR: 'li', KeyT: 'li',
  KeyY: 'ri', KeyU: 'ri', KeyI: 'rm', KeyO: 'rr', KeyP: 'rp', BracketLeft: 'rp', BracketRight: 'rp', Backslash: 'rp',
  CapsLock: 'lp', KeyA: 'lp', KeyS: 'lr', KeyD: 'lm', KeyF: 'li', KeyG: 'li',
  KeyH: 'ri', KeyJ: 'ri', KeyK: 'rm', KeyL: 'rr', Semicolon: 'rp', Quote: 'rp', Enter: 'rp',
  ShiftLeft: 'lp', KeyZ: 'lp', KeyX: 'lr', KeyC: 'lm', KeyV: 'li', KeyB: 'li',
  KeyN: 'ri', KeyM: 'ri', Comma: 'rm', Period: 'rr', Slash: 'rp', ShiftRight: 'rp',
  Space: 'th',
};

const FINGER_NAMES = {
  lp: 'Left pinky', lr: 'Left ring', lm: 'Left middle', li: 'Left index',
  ri: 'Right index', rm: 'Right middle', rr: 'Right ring', rp: 'Right pinky', th: 'Thumb',
};

// Rows of the physical keyboard, left to right. Widths are in key units.
const KEYBOARD_ROWS = [
  ['Backquote', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'Minus', 'Equal', { code: 'Backspace', w: 2, label: '⌫' }],
  [{ code: 'Tab', w: 1.5, label: 'tab' }, 'KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP', 'BracketLeft', 'BracketRight', { code: 'Backslash', w: 1.5 }],
  [{ code: 'CapsLock', w: 1.75, label: 'caps' }, 'KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Quote', { code: 'Enter', w: 2.25, label: 'enter ⏎' }],
  [{ code: 'ShiftLeft', w: 2.25, label: 'shift' }, 'KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma', 'Period', 'Slash', { code: 'ShiftRight', w: 2.75, label: 'shift' }],
  [{ spacer: true, w: 3.75 }, { code: 'Space', w: 7.5, label: 'space' }, { spacer: true, w: 3.75 }],
];

const HOME_BUMPS = ['KeyF', 'KeyJ'];

const LATIN_LABEL = {
  Backquote: '`', Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Backslash: '\\',
  Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/',
};
function latinLabel(code) {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  return LATIN_LABEL[code] || '';
}

const WIN_101_KEYS = {
  Backquote: ['ذ', SHADDA],
  Digit1: ['1', '!'], Digit2: ['2', '@'], Digit3: ['3', '#'], Digit4: ['4', '$'], Digit5: ['5', '%'],
  Digit6: ['6', '^'], Digit7: ['7', '&'], Digit8: ['8', '*'], Digit9: ['9', ')'], Digit0: ['0', '('],
  Minus: ['-', '_'], Equal: ['=', '+'],
  KeyQ: ['ض', FATHA], KeyW: ['ص', FATHATAN], KeyE: ['ث', DAMMA], KeyR: ['ق', DAMMATAN], KeyT: ['ف', 'لإ'],
  KeyY: ['غ', 'إ'], KeyU: ['ع', '‘'], KeyI: ['ه', '÷'], KeyO: ['خ', '×'], KeyP: ['ح', '؛'],
  BracketLeft: ['ج', '<'], BracketRight: ['د', '>'], Backslash: ['\\', '|'],
  KeyA: ['ش', KASRA], KeyS: ['س', KASRATAN], KeyD: ['ي', ']'], KeyF: ['ب', '['], KeyG: ['ل', 'لأ'],
  KeyH: ['ا', 'أ'], KeyJ: ['ت', 'ـ'], KeyK: ['ن', '،'], KeyL: ['م', '/'], Semicolon: ['ك', ':'], Quote: ['ط', '"'],
  KeyZ: ['ئ', '~'], KeyX: ['ء', SUKUN], KeyC: ['ؤ', '}'], KeyV: ['ر', '{'], KeyB: ['لا', 'لآ'],
  KeyN: ['ى', 'آ'], KeyM: ['ة', '’'], Comma: ['و', ','], Period: ['ز', '.'], Slash: ['ظ', '؟'],
};

const MAC_PC_KEYS = Object.assign({}, WIN_101_KEYS, {
  Digit1: ['١', '!'], Digit2: ['٢', '@'], Digit3: ['٣', '#'], Digit4: ['٤', '$'], Digit5: ['٥', '٪'],
  Digit6: ['٦', '^'], Digit7: ['٧', '&'], Digit8: ['٨', '*'], Digit9: ['٩', ')'], Digit0: ['٠', '('],
});

const MAC_ARABIC_KEYS = {
  Backquote: ['ـ', null],
  Digit1: ['١', '!'], Digit2: ['٢', '@'], Digit3: ['٣', '#'], Digit4: ['٤', '$'], Digit5: ['٥', '٪'],
  Digit6: ['٦', '^'], Digit7: ['٧', '&'], Digit8: ['٨', '*'], Digit9: ['٩', ')'], Digit0: ['٠', '('],
  Minus: ['-', 'ـ'], Equal: ['=', '+'],
  KeyQ: ['ض', FATHA], KeyW: ['ص', FATHATAN], KeyE: ['ث', KASRA], KeyR: ['ق', KASRATAN], KeyT: ['ف', DAMMA],
  KeyY: ['غ', DAMMATAN], KeyU: ['ع', SUKUN], KeyI: ['ه', SHADDA], KeyO: ['خ', ']'], KeyP: ['ح', '['],
  BracketLeft: ['ج', '}'], BracketRight: ['ة', '{'], Backslash: ['\\', '|'],
  KeyA: ['ش', '»'], KeyS: ['س', '«'], KeyD: ['ي', 'ى'], KeyF: ['ب', null], KeyG: ['ل', null],
  KeyH: ['ا', 'آ'], KeyJ: ['ت', null], KeyK: ['ن', '٫'], KeyL: ['م', '٬'], Semicolon: ['ك', ':'], Quote: ['؛', '"'],
  KeyZ: ['ظ', "'"], KeyX: ['ط', null], KeyC: ['ذ', 'ئ'], KeyV: ['د', 'ء'], KeyB: ['ز', 'أ'],
  KeyN: ['ر', 'إ'], KeyM: ['و', 'ؤ'], Comma: ['،', '>'], Period: ['.', '<'], Slash: ['/', '؟'],
};

const LAYOUT_DEFS = [
  {
    id: 'win', name: 'Arabic (101)', platform: 'Windows',
    description: 'The standard Arabic layout on Windows. Most physical Arabic keyboards are printed with it.',
    keys: WIN_101_KEYS,
  },
  {
    id: 'macpc', name: 'Arabic – PC', platform: 'macOS',
    description: 'The Windows-style layout on a Mac. Pick this to learn one layout that works on both systems.',
    keys: MAC_PC_KEYS,
  },
  {
    id: 'mac', name: 'Arabic', platform: 'macOS',
    description: "Apple's own Arabic layout, printed on Arabic Mac keyboards. Many letters sit in different places.",
    keys: MAC_ARABIC_KEYS,
  },
];

/** Builds the lookup tables used everywhere else. */
function buildLayout(def) {
  const charToKey = {}; // char (or multi-char string) -> { code, shift }
  for (const [code, outputs] of Object.entries(def.keys)) {
    outputs.forEach((out, shiftIdx) => {
      if (out && !charToKey[out]) charToKey[out] = { code, shift: shiftIdx === 1 };
    });
  }
  charToKey[' '] = { code: 'Space', shift: false };
  charToKey['\n'] = { code: 'Enter', shift: false };
  return Object.assign({}, def, {
    charToKey,
    output(code, shift) {
      if (code === 'Space') return ' ';
      if (code === 'Enter' || code === 'NumpadEnter') return '\n';
      const k = def.keys[code];
      return k ? k[shift ? 1 : 0] : null;
    },
    canType(ch) { return Boolean(charToKey[ch]); },
    title: `${def.platform} · ${def.name}`,
  });
}

const LAYOUTS = Object.fromEntries(LAYOUT_DEFS.map(d => [d.id, buildLayout(d)]));
