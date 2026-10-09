# Contributing to Katib

Thank you for helping people learn to type Arabic! There's no build step: edit a file and
refresh the browser.

## Adding practice text

Passages live in [`js/data/texts.js`](js/data/texts.js), grouped by source. Each item needs a
`ref` saying exactly where it comes from.

```js
{ ref: 'Muslim 2699', text: 'مَنْ سَلَكَ طَرِيقًا يَلْتَمِسُ فِيهِ عِلْمًا ...' },
```

Rules:

1. **Only public-domain or openly licensed text.** Don't paste articles from news sites:
   they are copyrighted. Good sources for modern prose include
   [Arabic Wikinews](https://ar.wikinews.org) (CC BY 2.5) and
   [Arabic Wikipedia](https://ar.wikipedia.org) (CC BY-SA). Credit them in `credit` and `ref`.
2. **Always fill in `ref`.** Surah:verse, collection and hadith number, poet, or article title.
3. **Qur'an text must come verbatim from Tanzil** (https://tanzil.net, *Simple* edition). Don't retype
   verses by hand. Katib strips untypeable marks automatically when displaying.
4. **Diacritics**: vowelize fully and correctly, or not at all. Half-vowelized text is confusing
   to learners. Put shadda before the vowel (`بَّ` = ب + ّ + َ).
5. Use Arabic punctuation (، ؛ ؟). Text inside `{curly braces}` is shown but skipped while typing.
6. For poetry, put each half-line (shaṭr) on its own line with `\n`.

## Adding words

[`js/data/words.js`](js/data/words.js) is a space-separated list of fully vowelized words.
Lessons choose words that contain only the letters learned so far, so short words made of
home-row letters (ش س ي ب ل ا ت ن م ك) are especially valuable.

## Layouts

Layouts are in [`js/data/layouts.js`](js/data/layouts.js), keyed by
[`KeyboardEvent.code`](https://developer.mozilla.org/docs/Web/API/KeyboardEvent/code).
If you add one, please say how you verified it (for example, extracted from the OS, or
checked against the official layout file).

## Checking your change

Open `index.html`, then:

- Do a lesson on each layout (Settings → Keyboard layout).
- Open *Practice* and type a passage from the source you changed, with diacritics on and off.
- Try light and dark themes.
