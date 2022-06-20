describe("mixin_d3:", () => {
  beforeEach(async () => {
    await useHtml({ width: "unset", height: "unset" });
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
            this.data[1].children = [
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
});
