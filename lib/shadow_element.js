import { CustomElement } from "./custom_element.js";

function clone(node) {
  if (node instanceof HTMLTemplateElement) {
    node = node.content;
  }
  return node.cloneNode(true);
}

export class ShadowElement extends CustomElement {
  static cloned = [];

  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    const cloned = this.constructor.cloned;
    if (cloned) {
      for (const selector of cloned) {
        if (typeof selector === "string") {
          document.querySelectorAll(selector).forEach((node) => {
            this.shadowRoot.appendChild(clone(node));
          });
        } else {
          this.shadowRoot.appendChild(clone(selector));
        }
      }
    }
  }
}
