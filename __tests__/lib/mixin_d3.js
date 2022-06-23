async function init(style = { width: "unset", height: "unset" }) {
  await useHtml(style);
  await useScript(async () => {
    const { CustomElement } = await import("/lib/custom_element.js");
    const { ShadowElement } = await import("/lib/shadow_element.js");
    const { MixinD3, mixinD3, create } = await import("/lib/mixin_d3.js");

    window.CustomElement = CustomElement;
    window.ShadowElement = ShadowElement;
    window.MixinD3 = MixinD3;
    window.mixinD3 = mixinD3;
    window.create = create;
    window.sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  });
}

describe("mixin_d3:", () => {
  beforeEach(async () => {
    await init();
  });

  test("Hello World", async () => {
    await useScript(async () => {
      window.customElements.define(
        "my-app",
        class extends MixinD3 {
          connectedCallback() {
            super.connectedCallback();
            this.data = [{ tag: "h1", text: "Hello, World" }];
          }
        }
      );

      document.body.innerHTML = "<my-app></my-app>";
      const myApp = document.querySelector("my-app");
      await myApp.complete;
      const h1 = myApp.querySelector("h1");
      expect(h1.textContent).toBe("Hello, World");

      myApp.data[0].text = "Hello, world";
      await myApp.complete;
      expect(h1.textContent).toBe("Hello, world");
    });
  });

  test("Ticking Clock", async () => {
    await useScript(async () => {
      window.customElements.define(
        "my-app",
        class extends MixinD3 {
          connectedCallback() {
            super.connectedCallback();
            this.data = [
              { tag: "h1", text: "Hello, world!" },
              { tag: "h2", key: (d) => d },
            ];

            this._refresh();
            setInterval(() => this._refresh(), 1000);
          }

          _refresh() {
            this.data[1].data = [
              "It is ",
              new Date().toLocaleTimeString(),
              ".",
            ];
          }
        }
      );

      document.body.innerHTML = "<my-app></my-app>";
      const myApp = document.querySelector("my-app");
      await myApp.complete;
      const h2 = myApp.querySelector("h2");
      const text1 = h2.childNodes[0];
      const text2 = h2.childNodes[1];
      const text3 = h2.childNodes[2];
      expect(text1.textContent).toBe("It is ");
      expect(text2.textContent).toBe(new Date().toLocaleTimeString());
      expect(text3.textContent).toBe(".");

      await sleep(1000);
      await myApp.complete;
      expect(h2.childNodes[1].textContent).toBe(
        new Date().toLocaleTimeString()
      );

      // the first TextNode is remaining
      expect(h2.childNodes[0]).toBe(text1);

      // the second TextNode is newly created
      expect(h2.childNodes[1]).not.toBe(text2);

      // the third TextNode is remaining
      expect(h2.childNodes[2]).toBe(text3);
    });
  });

  describe("Lifting State Up:", () => {
    async function initUtils() {
      await useScript(() => {
        window.scaleNames = {
          c: "Celsius",
          f: "Fahrenheit",
        };

        window.toCelsius = function (fahrenheit) {
          return ((fahrenheit - 32) * 5) / 9;
        };

        window.toFahrenheit = function (celsius) {
          return (celsius * 9) / 5 + 32;
        };

        window.tryConvert = function (temperature, convert) {
          const input = parseFloat(temperature);
          if (Number.isNaN(input)) {
            return "";
          }
          const output = convert(input);
          const rounded = Math.round(output * 1000) / 1000;
          return rounded.toString();
        };
      });
    }

    test("1", async () => {
      await initUtils();
      await useScript(async () => {
        window.customElements.define(
          "my-app",
          class extends MixinD3 {
            #temperature;

            connectedCallback() {
              super.connectedCallback();
              const that = this;
              this.data[0] = {
                tag: "fieldset",
                data: [
                  { tag: "legend", text: "Enter temperature in Celsius:" },
                  {
                    tag: "input",
                    events: {
                      input: (event) => {
                        that.#temperature = event.target.value;
                        that.data[0].touch();
                      },
                    },
                  },
                  {
                    tag: "p",
                    $each: function () {
                      this.textContent =
                        that.#temperature >= 100
                          ? "The water would boil."
                          : "The water would not boil.";
                    },
                  },
                ],
              };
            }
          }
        );

        document.body.innerHTML = "<my-app></my-app>";
      });
    });

    test("2", async () => {
      await initUtils();
      await useScript(async () => {
        window.customElements.define(
          "temperature-input",
          class extends MixinD3 {
            #scale;

            static get observedAttributes() {
              return [...super.observedAttributes, "scale"];
            }

            attributeChangedCallback(name, oldValue, newValue) {
              super.attributeChangedCallback(name, oldValue, newValue);
              if (oldValue === newValue) {
                return;
              }

              if (name === "scale") {
                this.#scale = newValue;
                this.data[0]?.touch();
              }
            }

            connectedCallback() {
              super.connectedCallback();
              const that = this;
              this.data[0] = {
                tag: "fieldset",
                data: [
                  {
                    tag: "legend",
                    $each: function () {
                      this.textContent =
                        "Enter temperature in " + scaleNames[that.#scale];
                    },
                  },
                  { tag: "input" },
                ],
              };
            }
          }
        );

        document.body.innerHTML = `
          <div>
            <temperature-input scale="c"></temperature-input>
            <temperature-input scale="f"></temperature-input>
          </div>
        `;
      });
    });

    test("3", async () => {
      await init({ height: "200px" });
      await initUtils();
      await useScript(async () => {
        window.customElements.define(
          "temperature-input",
          class extends MixinD3 {
            #scale;
            #temperature;

            static get observedAttributes() {
              return [...super.observedAttributes, "scale", "temperature"];
            }

            attributeChangedCallback(name, oldValue, newValue) {
              super.attributeChangedCallback(name, oldValue, newValue);
              if (oldValue === newValue) {
                return;
              }

              switch (name) {
                case "scale":
                  this.#scale = newValue;
                  this.updater?.();
                  break;
                case "temperature":
                  this.#temperature = newValue;
                  this.updater?.();
                  break;
              }
            }

            connectedCallback() {
              super.connectedCallback();
              const that = this;
              this.data[0] = {
                tag: "fieldset",
                data: [
                  {
                    tag: "legend",
                    $each: function () {
                      const scale = scaleNames[that.#scale];
                      this.textContent = "Enter temperature in " + scale;
                    },
                  },
                  {
                    tag: "input",
                    $each: function () {
                      this.value = that.#temperature;
                    },
                  },
                ],
              };
              this.updater = this.data[0].touch;
            }
          }
        );

        window.customElements.define(
          "temperature-calculator",
          class extends MixinD3 {
            #scale = "c";
            #temperature = "";

            set #celsius(temperature) {
              this.#scale = "c";
              this.#temperature = temperature;
              this.data.touch();
            }

            get #celsius() {
              return this.#scale === "f"
                ? tryConvert(this.#temperature, toCelsius)
                : this.#temperature;
            }

            set #fahrenheit(temperature) {
              this.#scale = "f";
              this.#temperature = temperature;
              this.data.touch();
            }

            get #fahrenheit() {
              return this.#scale === "c"
                ? tryConvert(this.#temperature, toFahrenheit)
                : this.#temperature;
            }

            connectedCallback() {
              super.connectedCallback();
              const that = this;
              this.data = [
                {
                  tag: "temperature-input",
                  attrs: { scale: "c" },
                  events: {
                    input: (event) => {
                      this.#celsius = event.target.value;
                    },
                  },
                  $each: function () {
                    this.setAttribute("temperature", that.#celsius);
                  },
                },
                {
                  tag: "temperature-input",
                  attrs: { scale: "f" },
                  events: {
                    input: (event) => {
                      this.#fahrenheit = event.target.value;
                    },
                  },
                  $each: function () {
                    this.setAttribute("temperature", that.#fahrenheit);
                  },
                },
                {
                  tag: "p",
                  $each: function () {
                    this.textContent =
                      parseFloat(that.#celsius) >= 100
                        ? "The water would boil."
                        : "The water would not boil.";
                  },
                },
              ];
            }
          }
        );

        document.body.innerHTML = `
          <temperature-calculator></temperature-calculator>
        `;
      });
    });
  });

  test("Repeat Circle", async () => {
    await useScript(async () => {
      const { ResponsiveSvg } = await import("/lib/responsive-svg.js");

      window.customElements.define(
        "my-app",
        class extends mixinD3(ResponsiveSvg, d3) {
          ns = "svg";
          root = this.root.select("svg");
        }
      );

      document.body.innerHTML = '<my-app viewBox="0,0,960,500"></my-app>';
      const myApp = document.querySelector("my-app");
      myApp.data = [
        {
          tag: "circle",
          attrs: {
            fill: "steelblue",
            r: 20,
            cx: 40,
            cy: 250,
          },
          transitions: [
            {
              duration: 2000,
              attrs: { cx: 920 },
            },
            {
              duration: 2000,
              attrs: { cx: 40 },
              events: {
                end() {
                  myApp.data[0].transitions = myApp.data[0].transitions;
                },
              },
            },
          ],
        },
      ];
    });
  });
});
