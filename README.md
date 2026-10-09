# Katib · كاتب

**Learn the Arabic keyboard and touch typing — with full diacritics.**

Katib is a free, open-source typing tutor for Arabic. It teaches you where every
letter lives, which finger presses it, and how to type harakat (فتحة، ضمة، كسرة،
سكون), shadda (شدة), tanwin and every hamza form, then lets you practise on real,
sourced Arabic: the Qur'an, hadith, classical poetry, proverbs, the Universal
Declaration of Human Rights, and news-style prose.

It runs in any modern browser on **macOS and Windows** (and Linux). There's nothing to install
and no account, and it works offline.

## Features

- **Guided course**: 17 short lessons. The home row comes first, then each row, then
  diacritics, hamza, lam-alif, punctuation and numbers. A lesson is complete at 90% accuracy.
- **Finger guidance**: the keyboard is colour-coded by finger, the next key glows,
  the right Shift key is shown for shifted characters, and a pair of hands shows
  which finger to use.
- **Three layouts, exactly as your computer has them**:
  - Windows **Arabic (101)**
  - macOS **Arabic – PC** (same as Windows, with Arabic-Indic digits)
  - macOS **Arabic** (Apple's own layout)
- **Works without installing Arabic**: Katib reads *physical* key positions, so you
  can learn on an English keyboard. If your system already uses an Arabic layout
  that differs from the one you picked, Katib notices and offers to switch.
- **Diacritics done right**: type the letter, then its marks. Shadda and its vowel can
  go in either order. Diacritics can be turned off for plain-text practice.
- **Real texts with sources**: every passage shows its reference (surah and verse,
  hadith collection and number, poet).
- **Progress**: speed history, accuracy, and a heatmap of the keys you miss most, plus
  a "practise weak keys" drill.
- **Your own text**: paste anything and type it.
- Light and dark themes, three Arabic fonts (Naskh, Amiri, Sans), adjustable text size, optional key sounds.

## Running it

**Easiest:** open `index.html` in Chrome, Edge, Safari or Firefox. That's it.

**As an installable app (works offline):** serve the folder over HTTP, then use your
browser's *Install app* / *Add to Dock* option:

```bash
python3 -m http.server 8000
```

Then visit http://localhost:8000. Any static host (GitHub Pages, Netlify, Cloudflare Pages)
works too, because there's no build step.

## Keyboard shortcuts while typing

| Key   | Action                                   |
|-------|------------------------------------------|
| Esc   | Restart the current text                 |
| Enter | (on the results screen) next lesson / passage |

## Project layout

```
index.html            page shell
css/style.css         all styles (light + dark)
js/data/layouts.js    key geometry, finger map, the three Arabic layouts
js/data/words.js      vowelized word list used by lessons
js/data/texts.js      practice passages with sources
js/arabic.js          diacritics, normalisation, text → typeable clusters
js/lessons.js         the course and exercise generator
js/engine.js          the typing session (checking keys, WPM, accuracy)
js/keyboard.js        on-screen keyboard and hands
js/app.js             views, settings, storage
sw.js                 offline cache
```

Plain HTML, CSS and JavaScript with no dependencies and no build. Progress is stored in
the browser's `localStorage` and never leaves your device.

## Sources & credits

- **Qur'an**: [Tanzil Project](https://tanzil.net), *Simple* text, used under its terms
  (verbatim, with attribution). For typing, the superscript alif and Qur'anic pause marks are
  omitted at display time because no keyboard layout can type them (e.g. الرَّحْمَٰنِ is typed الرَّحْمَنِ).
  The stored text is unchanged.
- **Hadith**: well-known narrations with references in [sunnah.com](https://sunnah.com) numbering.
- **Poetry & proverbs**: classical and early-modern works in the public domain
  (al-Mutanabbī, Imruʾ al-Qays, al-Shāfiʿī, Aḥmad Shawqī, Ḥāfiẓ Ibrāhīm, Abū al-Qāsim al-Shābbī).
- **Human rights**: Arabic text of the [Universal Declaration of Human Rights](https://www.un.org/ar/about-us/universal-declaration-of-human-rights).
- **News-style**: original sentences written for this project. They read like news but do not report real events.
- **Layouts**: the macOS layouts were extracted from macOS itself; the Windows layout was checked against
  [kbdlayout.info](https://kbdlayout.info/kbda1).
- **Fonts**: Noto Naskh Arabic, Noto Sans Arabic and Amiri (SIL Open Font License) via Google Fonts, with system fallbacks.

## Contributing

Contributions are very welcome, especially more passages, more vowelized words, and checks
of the diacritics. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE). Text content keeps its own terms (see *Sources & credits*).
