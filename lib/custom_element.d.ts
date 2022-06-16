/**
 * `CustomElement` is the base class of our own HTML custom element.
 */
export declare class CustomElement extends HTMLElement {
  // the standard web component lifecycle hooks
  static get observedAttributes(): [];
  constructor();
  attributeChangedCallback(): void;
  connectedCallback(): void;
  disconnectedCallback(): void;
  adoptedCallback(): void;

  /**
   * `raf` is used to commit an update function, apply with `this` instance,
   * the duplicated callback in the same frame will be filtered out.
   */
  raf(fn: FrameRequestCallback): void;

  /**
   * After executing all committed callbacks at one frame moment, `raf` will
   * resolve the `complete` promise to notify that the updating is finished.
   */
  get complete(): Promise<boolean>;
}
