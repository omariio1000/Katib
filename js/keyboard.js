/*
 * On-screen keyboard and hands. The keyboard is drawn as the physical keys sit
 * (left to right), coloured by the finger that presses each key.
 */
class KeyboardView {
  constructor(root) {
    this.root = root;
    this.keys = {};
    this.layout = null;
  }

  render(layout) {
    this.layout = layout;
    this.root.innerHTML = '';
    this.root.classList.add('kb');
    this.keys = {};
    for (const row of KEYBOARD_ROWS) {
      const rowEl = document.createElement('div');
      rowEl.className = 'kb-row';
      for (const item of row) {
        const spec = typeof item === 'string' ? { code: item, w: 1 } : Object.assign({ w: 1 }, item);
        const el = document.createElement('div');
        el.style.gridColumn = `span ${Math.round(spec.w * 4)}`;
        if (spec.spacer) { el.className = 'kb-spacer'; rowEl.appendChild(el); continue; }
        el.className = `key f-${FINGER_OF[spec.code] || 'none'}`;
        el.dataset.code = spec.code;
        if (spec.label) {
          el.classList.add('key-mod');
          el.innerHTML = `<span class="k-label">${spec.label}</span>`;
        } else {
          const [plain, shifted] = layout.keys[spec.code] || [null, null];
          el.innerHTML =
            `<span class="k-shift" lang="ar">${shifted ? showChar(shifted) : ''}</span>` +
            `<span class="k-main" lang="ar">${plain ? showChar(plain) : ''}</span>` +
            `<span class="k-latin">${latinLabel(spec.code)}</span>`;
        }
        if (HOME_BUMPS.includes(spec.code)) el.classList.add('key-bump');
        this.keys[spec.code] = el;
        rowEl.appendChild(el);
      }
      this.root.appendChild(rowEl);
    }
  }

  clearTarget() {
    this.root.querySelectorAll('.key.target').forEach(k => k.classList.remove('target'));
  }

  /** Highlights the key (and the right Shift) needed for `output`. Returns the key info. */
  showTarget(output) {
    this.clearTarget();
    if (!output || !this.layout) return null;
    const info = this.layout.charToKey[output];
    if (!info) return null;
    this.keys[info.code] && this.keys[info.code].classList.add('target');
    if (info.shift) {
      const shiftCode = shiftFor(info.code);
      this.keys[shiftCode] && this.keys[shiftCode].classList.add('target');
    }
    this.root.classList.toggle('shift-hint', info.shift);
    return info;
  }

  setShiftLayer(on) {
    this.root.classList.toggle('shift-on', on);
  }

  press(code, ok) {
    const el = this.keys[code];
    if (!el) return;
    const cls = ok ? 'pressed' : 'wrong';
    el.classList.remove('pressed', 'wrong');
    void el.offsetWidth; // restart the animation
    el.classList.add(cls);
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove(cls), ok ? 140 : 380);
  }

  /** Colours keys by error rate: rates maps code -> 0..1 (or null when unknown). */
  heatmap(rates) {
    this.root.classList.add('kb-heat');
    for (const [code, el] of Object.entries(this.keys)) {
      const r = rates[code];
      el.style.removeProperty('--heat');
      el.classList.toggle('heat-none', r == null);
      if (r != null) el.style.setProperty('--heat', Math.min(1, r * 4).toFixed(2));
    }
  }
}

/** Shift is pressed with the hand opposite to the key. */
function shiftFor(code) {
  return (FINGER_OF[code] || '').startsWith('l') ? 'ShiftRight' : 'ShiftLeft';
}

/** A simple pair of hands; the active finger lights up. */
function handsSVG() {
  const finger = (id, x, y, h, w = 26) =>
    `<rect class="finger f-${id}" data-finger="${id}" x="${x}" y="${y}" width="${w}" height="${h}" rx="${w / 2}"/>`;
  // Left hand: pinky, ring, middle, index, thumb.
  const left =
    finger('lp', 20, 52, 58) + finger('lr', 52, 30, 80) + finger('lm', 84, 20, 90) + finger('li', 116, 32, 78) +
    `<rect class="finger f-th" data-finger="th" x="150" y="96" width="24" height="56" rx="12" transform="rotate(-38 162 124)"/>` +
    `<rect class="palm" x="18" y="98" width="130" height="62" rx="26"/>`;
  const right =
    finger('ri', 254, 32, 78) + finger('rm', 286, 20, 90) + finger('rr', 318, 30, 80) + finger('rp', 350, 52, 58) +
    `<rect class="finger f-th" data-finger="th" x="226" y="96" width="24" height="56" rx="12" transform="rotate(38 238 124)"/>` +
    `<rect class="palm" x="252" y="98" width="130" height="62" rx="26"/>`;
  return `<svg viewBox="0 0 400 165" class="hands-svg" aria-hidden="true">${left}${right}</svg>`;
}
