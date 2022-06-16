import { CustomElement } from "./custom_element.js";

export class ShadowElement extends CustomElement {
  static get cloned() {
    return ["link[rel=stylesheet]"];
  }

  static get style() {
    return "";
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    for (const selector of this.constructor.cloned) {
      document.querySelectorAll(selector).forEach((node) => {
        this.shadowRoot.appendChild(node.cloneNode(true));
      });
    }

    const css = this.constructor.style;
    if (css) {
      const style = document.createElement("style");
      style.appendChild(document.createTextNode(css));
      this.shadowRoot.appendChild(style);
    }
  }
}
