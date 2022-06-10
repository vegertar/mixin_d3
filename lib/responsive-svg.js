import { ShadowElement } from "./shadow_element.js";

export class ResponsiveSvg extends ShadowElement {
  // attrs
  viewBox;
  size;

  // elements
  _divElement;
  _svgElement;
  _slotElement;

  static get style() {
    return `
      :host {
        display: flex;
        width: 100%;
        height: 100%;
        justify-content: center;
        align-items: center;
      }

      div {
        overflow: hidden;
        display: inline-block;
        position: relative;
        width: 100%;
        height: 100%;
      }

      svg {
        display: inline-block;
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%,-50%);
        width: 100%;
        height: 100%;
      }

      div.by-width {
        height: auto;
      }

      div.by-height svg {
        width: auto;
      }

      foreignObject {
        width: 100%;
        height: 100%;
      }
    `;
  }

  static get observedAttributes() {
    // use multiple forms of view box to compatible with
    //  setAttribute("viewBox", ...)
    //  setAttributeNS(null, "viewBox", ...)
    return ["viewBox", "viewbox", "view-box", "size"];
  }

  constructor() {
    super();
    const ns = "http://www.w3.org/2000/svg";

    this._divElement = this.shadowRoot.appendChild(
      document.createElement("div")
    );

    this._svgElement = this._divElement.appendChild(
      document.createElementNS(ns, "svg")
    );
    this._svgElement.setAttribute("part", "svg");

    this._slotElement = this._svgElement
      .appendChild(document.createElementNS(ns, "foreignObject"))
      .appendChild(document.createElement("slot"));
    this._slotElement.addEventListener("slotchange", () =>
      this._updateSlotAttrs()
    );
  }

  _updateSlotAttrs() {
    for (const elem of this._slotElement.assignedElements()) {
      if (elem.nodeName === "svg") {
        elem.setAttribute("viewBox", this.viewBox);
      }
    }
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener("resize", this._onResize);
    if (!this.size) {
      this._onResize();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("resize", this._onResize);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) {
      return;
    }

    switch (name) {
      // Is there a [[likely]] optimization in JS?
      case "size": {
        this.size = newValue.split(",").map((i) => parseInt(i));
        this.raf(this._updateDimension);
        break;
      }
      case "viewBox":
      case "viewbox":
      case "view-box": {
        this._svgElement.setAttribute("viewBox", newValue);
        this.viewBox = newValue.split(",").map((i) => parseInt(i));
        this._updateSlotAttrs();
        this.raf(this._updateDimension);
        break;
      }
    }
  }

  _onResize = () => {
    const { width, height } = this.getBoundingClientRect();
    this.setAttribute("size", [width, height]);
  };

  _updateDimension = () => {
    if (!this.viewBox || !this.size) {
      return;
    }

    const [width, height] = this.size;
    if (width === 0 || height === 0) {
      return;
    }

    const ratio = this.viewBox[2] / this.viewBox[3];
    const container = this._divElement;

    if (height * ratio > width) {
      // should align by width
      container.classList.add("by-width");
      container.classList.remove("by-height");

      // let CSS calculates height from padding bottom and
      // leave svg taking up all the space
      container.style.paddingBottom = `${100 / ratio}%`;
    } else {
      // should align by height
      container.classList.add("by-height");
      container.classList.remove("by-width");

      // in this case let container take up all the space and
      // leave svg calculating width from viewBox automatically
      container.style.paddingBottom = 0;
    }
  };
}

window.customElements.define("responsive-svg", ResponsiveSvg);
