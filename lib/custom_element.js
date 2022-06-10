export class CustomElement extends window.HTMLElement {
  _lastRAF = null;
  _batchUpdates = [];
  _completeResolve = null;
  _completePromise = Promise.resolve(true);

  static get observedAttributes() {
    return [];
  }

  attributeChangedCallback() {}

  connectedCallback() {}

  disconnectedCallback() {
    this._lastRAF && cancelAnimationFrame(this._lastRAF);
  }

  adoptedCallback() {}

  get complete() {
    return this._completePromise;
  }

  raf(fn) {
    this._batchUpdates.push(fn);
    if (!this._lastRAF) {
      this._completePromise = new Promise((res, _rej) => {
        this._completeResolve = res;
      });

      const raf = requestAnimationFrame(async () => {
        do {
          const fns = this._batchUpdates;
          this._batchUpdates = [];
          const set = fns.length === 1 ? fns : new Set(fns);
          for (const fn of set) {
            try {
              await fn.apply(this, [performance.now()]);
            } catch (error) {
              console.error(error);
            }
          }
        } while (this._batchUpdates.length);

        const resolve = this._completeResolve;
        this._lastRAF = null;
        resolve(true);
      });
      this._lastRAF = raf;
    }
  }
}
