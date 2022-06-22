import { ShadowElement } from "./shadow_element.js";

export class ResponsiveSvg extends ShadowElement {
  // attrs
  _viewBox;
  _size;

  // elements
  _divElement;
  _svgElement;

  static get cloned() {
    const template = document.createElement("template");
    template.innerHTML = `
      <style>
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
      </style>
      <div>
        <svg>
          <foreignObject><slot></slot></foreignObject>
        </svg>
      </div>
    `;

    return [...super.cloned, template];
  }

  static get observedAttributes() {
    // use multiple forms of view box to compatible with
    //  setAttribute("viewBox", ...)
    //  setAttributeNS(null, "viewBox", ...)
    return ["viewBox", "viewbox", "view-box", "size"];
  }

  constructor() {
    super();
    this._divElement = this.shadowRoot.querySelector("div");
    this._svgElement = this._divElement.querySelector("svg");
  }

  get viewBox() {
    return this._viewBox;
  }

  get size() {
    return this._size;
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener("resize", this._onResize);
    if (!this._size) {
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
        this._size = newValue
          ? this._splitValue(newValue).map((i) => parseInt(i))
          : null;
        this.raf(this._updateDimension);
        break;
      }
      case "viewBox":
      case "viewbox":
      case "view-box": {
        if (newValue) {
          this._svgElement.setAttribute("viewBox", newValue);
          this._viewBox = this._splitValue(newValue).map((i) => parseInt(i));
        } else {
          this._svgElement.removeAttribute("viewBox");
          this._viewBox = null;
        }
        this.raf(this._updateDimension);
        break;
      }
    }
  }

  _splitValue(v) {
    if (v.indexOf(",") === -1) {
      if (v.indexOf(" ") === -1) {
        throw new Error(`The value should be separated by comma or space`);
      }
      return v.split(" ");
    }
    return v.split(",");
  }

  _onResize = () => {
    const { width, height } = this.getBoundingClientRect();
    this.setAttribute("size", [width, height]);
  };

  _updateDimension = () => {
    if (!this._viewBox || !this._size) {
      return;
    }

    const [width, height] = this._size;
    if (width === 0 || height === 0) {
      return;
    }

    const ratio = this._viewBox[2] / this._viewBox[3];
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
