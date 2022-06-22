export class CustomElement extends window.HTMLElement {
  _lastRAF = null;
  _batchUpdates = [];
  _completeResolve = null;
  _completePromise = Promise.resolve(true);
  _task = async (timestamp) => {
    do {
      const fns = this._batchUpdates;
      this._batchUpdates = [];
      const set = fns.length === 1 ? fns : new Set(fns);
      for (const fn of set) {
        try {
          const now = performance.now();
          if (now - timestamp > 1000 / this.frameRate) {
            this._batchUpdates = [...set, ...this._batchUpdates];
            this._lastRAF = requestAnimationFrame(this._task);
            console.warn(
              this.constructor.name,
              ": Time exceeded for FPS",
              this.frameRate,
              ", dispatch to next frame:",
              this._batchUpdates.length
            );
            return;
          }

          await fn.apply(this, [now]);
          if (set !== fns) {
            set.delete(fn);
          }
        } catch (error) {
          console.error(error);
        }
      }
    } while (this._batchUpdates.length);

    const resolve = this._completeResolve;
    this._lastRAF = null;
    resolve(true);
  };

  frameRate = 60;

  get complete() {
    return this._completePromise;
  }

  raf(fn) {
    this._batchUpdates.push(fn);
    if (!this._lastRAF) {
      this._completePromise = new Promise((res, _rej) => {
        this._completeResolve = res;
      });

      this._lastRAF = requestAnimationFrame(this._task);
    }
  }

  static get observedAttributes() {
    return [];
  }

  attributeChangedCallback() {}

  connectedCallback() {}

  disconnectedCallback() {
    this._lastRAF && cancelAnimationFrame(this._lastRAF);
  }

  adoptedCallback() {}
}
