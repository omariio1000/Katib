/*
 * The typing session: tracks the cursor through a prepared text, checks each
 * keystroke and keeps score. Wrong keys never advance the cursor, so every
 * character is eventually typed correctly with the right finger.
 *
 * Inside a cluster the base letter comes first; its diacritics may then be typed
 * in any order (people differ on shadda-then-fatha vs fatha-then-shadda).
 */
class TypingSession {
  constructor(prepared, layout) {
    this.text = prepared;
    this.layout = layout;
    this.index = 0;
    this.baseDone = false;
    this.pending = [];
    this.correct = 0;
    this.errors = 0;
    this.startedAt = null;
    this.finishedAt = null;
    this.errorClusters = new Set();
    this.charStats = {}; // char -> [hits, misses]
    this._settle();
  }

  get clusters() { return this.text.clusters; }
  get current() { return this.clusters[this.index]; }
  get done() { return this.index >= this.clusters.length; }

  _settle() {
    while (!this.done && this.current.skip) this.index++;
    this.baseDone = false;
    this.pending = this.done ? [] : sortMarks(this.current.marks);
  }

  /** The next character the learner should type. */
  expected() {
    if (this.done) return null;
    return this.baseDone ? this.pending[0] : this.current.base;
  }

  /**
   * The key output to suggest next: usually expected(), but a bare lam followed by a
   * bare alif is suggested as the lam-alif key when the layout (and lesson) has one.
   */
  suggestion(allowLigature) {
    const ch = this.expected();
    if (!allowLigature || ch !== 'ل' || this.baseDone || this.current.marks.length) return ch;
    const next = this.clusters[this.index + 1];
    if (next && !next.skip && !next.marks.length && this.layout.canType('ل' + next.base)) return 'ل' + next.base;
    return ch;
  }

  /** Would `ch` be accepted from the given state? Returns the new state or null. */
  _step(state, ch) {
    if (state.index >= this.clusters.length) return null;
    const cluster = this.clusters[state.index];
    let { baseDone, pending } = state;
    if (!baseDone) {
      if (ch !== cluster.base) return null;
      baseDone = true;
      pending = sortMarks(cluster.marks);
    } else {
      const at = pending.indexOf(ch);
      if (at < 0) return null;
      pending = pending.filter((_, i) => i !== at);
    }
    let index = state.index;
    if (!pending.length) {
      index++;
      while (index < this.clusters.length && this.clusters[index].skip) index++;
      baseDone = false;
      pending = index < this.clusters.length ? sortMarks(this.clusters[index].marks) : [];
    }
    return { index, baseDone, pending };
  }

  _bump(ch, hit) {
    const s = this.charStats[ch] || (this.charStats[ch] = [0, 0]);
    s[hit ? 0 : 1]++;
  }

  /**
   * Feeds the output of one key press (may be several characters, e.g. "لا").
   * Returns { ok, expected, finished }.
   */
  type(output) {
    if (this.done || !output) return { ok: false, finished: this.done };
    if (this.startedAt === null) this.startedAt = performance.now();
    const expected = this.expected();

    let state = { index: this.index, baseDone: this.baseDone, pending: this.pending };
    const typed = [];
    for (const ch of output) {
      const next = this._step(state, ch);
      if (!next) { state = null; break; }
      typed.push(ch);
      state = next;
    }

    if (!state) {
      this.errors++;
      this.errorClusters.add(this.index);
      this._bump(expected, false);
      return { ok: false, expected, finished: false };
    }

    typed.forEach(ch => this._bump(ch, true));
    this.correct += typed.length;
    this.index = state.index;
    this.baseDone = state.baseDone;
    this.pending = state.pending;
    if (this.done) this.finishedAt = performance.now();
    return { ok: true, expected, finished: this.done };
  }

  elapsedMs() {
    if (this.startedAt === null) return 0;
    return (this.finishedAt || performance.now()) - this.startedAt;
  }

  /** Words per minute, using the standard five keystrokes per word. */
  wpm() {
    const minutes = this.elapsedMs() / 60000;
    if (minutes < 1 / 60) return 0;
    return Math.round((this.correct / 5) / minutes);
  }

  accuracy() {
    const total = this.correct + this.errors;
    return total ? Math.round((this.correct / total) * 1000) / 10 : 100;
  }

  progress() {
    return this.text.keystrokes ? Math.min(1, this.correct / this.text.keystrokes) : 1;
  }

  /** Display-string range [start, end) of the cluster under the cursor. */
  currentRange() {
    if (this.done) return null;
    return [this.current.start, this.current.end];
  }
}
