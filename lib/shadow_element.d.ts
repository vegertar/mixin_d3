import { CustomElement } from "./custom_element";

/**
 * `ShadowElement` is the base class of our own ShadowDOM element.
 */
export declare class ShadowElement extends CustomElement {
  /**
   * `cloned` returns an array of selectors that are going to be cloned deeply
   * into newly attached `this.shadowRoot`. By default, the `cloned` array is
   * `["link[rel=stylesheet]"]`.
   */
  static get cloned(): string[];

  /**
   * `style` returns a CSS string for creating a style element in ShadowDOM.
   * By default, `style` returns `""`.
   */
  static get style(): string;
}
