import JestEnv from "jest-environment-node";
import axios from "axios";

export default class extends JestEnv {
  moduleMap = {
    d3: "/node_modules/d3/dist/d3.js",
    tweakpane: "/node_modules/tweakpane/dist/tweakpane.js",
  };

  used = new Set();

  constructor(config, context) {
    super(config, context);
    this.server_url = process.env.SERVER_URL;
    this.global.useHtml = this.useHtml.bind(this);
    this.global.useStyle = this.useStyle.bind(this);
    this.global.useModule = this.useModule.bind(this);
    this.global.useScript = this.useScript.bind(this);
  }

  get currentTestName() {
    return this.global.expect.getState().currentTestName;
  }

  get currentHtml() {
    return this.global.document.documentElement.outerHTML;
  }

  async useHtml(doc) {
    return this.useText(
      doc?.documentElement.outerHTML || this.currentHtml,
      "html"
    );
  }

  async useStyle(css) {
    return this.useScript((css) => {
      const element = document.createElement("style");
      element.appendChild(document.createTextNode(css));
      document.head.appendChild(element);
    }, css);
  }

  async useModule(...items) {
    return this.useScript(async (...items) => {
      for (const item of items) {
        await import(item);
      }
    }, ...items.map((item) => this.moduleMap[item] || item));
  }

  async useScript(func, ...params) {
    return this.useText(JSON.stringify([func.toString(), ...params]), "script");
  }

  async useText(text, type, id = this.currentTestName) {
    this.used.add(id);

    try {
      const response = await axios.post(
        `${this.server_url}/use?id=${encodeURI(id)}&type=${type}`,
        Buffer.from(text),
        {
          headers: {
            "Content-Type": "text/plain",
          },
        }
      );
      return response.data;
    } catch (error) {
      throw error.response.data;
    }
  }

  async teardown() {
    if (this.used.size) {
      try {
        const url = new URL(`${this.server_url}/use/`);
        for (const id of this.used) {
          url.searchParams.append("id", id);
        }
        await axios.delete(url.href);
      } catch (error) {
        throw error.response.data;
      }
    }

    await super.teardown();
  }
}
