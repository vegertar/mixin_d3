import { CustomElement } from "./custom_element";

/**
 * `ShadowElement` is the base class of our own ShadowDOM element.
 */
export declare class ShadowElement extends CustomElement {
  /**
   * `cloned` is an array of selectors or nodes that are going to be cloned
   * deeply into newly attached `this.shadowRoot`. Defaults `[]`;
   */
  static cloned: [string | HTMLElement];
}
