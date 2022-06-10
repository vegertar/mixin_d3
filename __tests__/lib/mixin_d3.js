test("replay changelog in mixin d3", async () => {
  await useHtml();
  expect(
    await useScript(async () => {
      const { ShadowElement } = await import("/lib/shadow_element.js");
      const { mixinD3 } = await import("/lib/mixin_d3.js");

      class FooComponent extends mixinD3(ShadowElement) {}

      window.customElements.define("foo-component", FooComponent);
      document.body.innerHTML = `<foo-component></foo-component>`;

      window.foo = document.querySelector("foo-component");
      window.updateFoo = (process, callback) => {
        return new Promise((resolve) => {
          const onUpdate = () => {
            foo.removeEventListener("update", onUpdate);
            foo.complete.then(() => resolve(callback()));
          };
          foo.addEventListener("update", onUpdate);
          process();
        });
      };

      return foo._data;
    })
  ).toEqual(null);

  // initialization
  expect(
    await useScript(() =>
      updateFoo(
        () => {
          foo.data.push(
            {
              tag: "h1",
              attrs: [["class", "component"]],
              text: "Test Foo Component",
            },
            {
              tag: "p",
              attrs: [["class", "component"]],
              text: "this is an initialization",
            }
          );
        },
        () => foo.shadowRoot.querySelector("p").textContent
      )
    )
  ).toBe("this is an initialization");

  // replacement
  expect(
    await useScript(() =>
      updateFoo(
        () => {
          foo.data[1] = {
            ...foo.data[1],
            tag: "span",
            text: "this is a replacement",
          };
        },
        () => foo.shadowRoot.querySelector("span").textContent
      )
    )
  ).toBe("this is a replacement");

  // set text
  expect(
    await useScript(() =>
      updateFoo(
        () => {
          foo.data[1].text = "this is a text revision";
        },
        () => foo.shadowRoot.querySelector("span").textContent
      )
    )
  ).toBe("this is a text revision");

  // modify an existed attribute
  expect(
    await useScript(() =>
      updateFoo(
        () => {
          foo.data[1].attrs[0][1] = "greeting component";
        },
        () => foo.shadowRoot.querySelector("span").className
      )
    )
  ).toBe("greeting component");

  // add a style
  expect(
    await useScript(() =>
      updateFoo(
        () => {
          foo.data[1].styles = [["border", "1px solid black"]];
        },
        () => foo.shadowRoot.querySelector("span").style.border
      )
    )
  ).toBe("1px solid black");

  // set a specific style
  expect(
    await useScript(() =>
      updateFoo(
        () => {
          foo.data[1].styles["background-color"] = "green";
        },
        () => foo.shadowRoot.querySelector("span").style.backgroundColor
      )
    )
  ).toBe("green");

  // add properties
  expect(
    await useScript(() =>
      updateFoo(
        () => {
          foo.data[1].properties = {
            foo: "bar",
            foo2: { d1: { d2: "bar2" } },
          };
        },
        () => foo.shadowRoot.querySelector("span").foo
      )
    )
  ).toBe("bar");

  // add a event handler
  expect(
    await useScript(
      () =>
        new Promise((resolve) => {
          const onUpdate = () => {
            const span = foo.shadowRoot.querySelector("span");
            if (span.textContent === "this is a text revision") {
              span.click();
            } else {
              foo.removeEventListener("update", onUpdate);
              resolve(span.textContent);
            }
          };
          foo.addEventListener("update", onUpdate);
          foo.data[1].events = [
            [
              "click",
              () => {
                foo.data[1].text = "clicked";
              },
            ],
          ];
        })
    )
  ).toBe("clicked");

  // set properties in a method chaining way
  expect(
    await useScript(() =>
      updateFoo(
        () => {
          foo.data[1].property("foo2", { d1: "xxx" }).property("foo3", "bar3");
          foo.data[1].properties = [["foo4", [[0, 1]]]];
          foo.data[1].properties[0][1][0][1] = 2;
        },
        () => {
          const span = foo.shadowRoot.querySelector("span");
          return [span.foo2, span.foo3, span.foo4];
        }
      )
    )
  ).toEqual([{ d1: "xxx" }, "bar3", [[0, 2]]]);

  // set text by method
  expect(
    await useScript(() =>
      updateFoo(
        () => {
          foo.data[1].text("42");
        },
        () => foo.shadowRoot.querySelector("span").textContent
      )
    )
  ).toEqual("42");

  // reset elements multiple times
  expect(
    await useScript(
      () =>
        new Promise((resolve) => {
          let constructed = 0;
          let connected = 0;

          window.customElements.define(
            "my-component",
            class extends HTMLElement {
              constructor() {
                super();
                ++constructed;
              }

              connectedCallback() {
                ++connected;
              }
            }
          );

          const onUpdate = () => {
            resolve([
              foo.shadowRoot.querySelector("span").textContent,
              constructed,
              connected,
            ]);
          };

          foo.addEventListener("update", onUpdate);
          foo.data[1] = {
            tag: "my-component",
            attrs: [["class", "component"]],
          };
          foo.data[1].text("42");
          foo.data[1] = {
            tag: "my-component",
            attrs: [["class", "component"]],
          };
          foo.data[1].text("43");
          foo.data[1] = {
            tag: "span",
            attrs: [["class", "component"]],
          };
          foo.data[1].text("44");
        })
    )
  ).toEqual(["44", 2, 0]);

  // add a transition
  expect(
    await useScript(
      () =>
        new Promise((resolve) => {
          foo.data.push({
            tag: "div",
            attrs: { class: "rect component" },
            styles: {
              width: "30px",
              height: "30px",
              background: "#69b3a2",
            },
            transitions: [
              {
                duration: 1000,
                styles: { width: "400px" },
                events: {
                  end: () => {
                    resolve(foo.shadowRoot.querySelector(".rect").style.width);
                  },
                },
              },
            ],
          });
        })
    )
  ).toEqual("400px");

  // add a transition by method
  expect(
    await useScript(
      () =>
        new Promise((resolve) => {
          const t = foo.root.transition().duration(750).ease(d3.easeLinear);
          foo.data[2]
            .transition(t)
            .style("width", "30px")
            .on("end", () =>
              resolve(foo.shadowRoot.querySelector(".rect").style.width)
            );
        })
    )
  ).toEqual("30px");

  // add children
  expect(
    await useScript(
      () =>
        new Promise((resolve) => {
          foo.data.push({
            tag: "ul",
            attrs: { class: "component" },
            selector: "li",
            children: [
              { tag: "li", text: "1" },
              { tag: "li", text: "2" },
              { tag: "li", text: "3" },
              { tag: "li", text: "4" },
            ],
          });
          foo.complete.then(() => {
            const ul = foo.shadowRoot.querySelector("ul");
            resolve(ul.textContent);
          });
        })
    )
  ).toEqual("1234");

  // change children
  expect(
    await useScript(
      () =>
        new Promise((resolve) => {
          foo.data[3].children[0].text = "5";
          foo.data[3].children[1].text = "6";
          foo.data[3].children.push({ tag: "li", text: "8" });
          foo.complete.then(() => {
            const ul = foo.shadowRoot.querySelector("ul");
            resolve(ul.textContent);
          });
        })
    )
  ).toEqual("56348");

  // remove children
  expect(
    await useScript(
      () =>
        new Promise((resolve) => {
          foo.data[3].children.length = 0;
          foo.complete.then(() => {
            const ul = foo.shadowRoot.querySelector("ul");
            resolve(ul.textContent);
          });
        })
    )
  ).toEqual("");

  // set deep children
  expect(
    await useScript(
      () =>
        new Promise((resolve) => {
          const component = foo.data[3];
          component.attr("id", "deep");
          component.selector = ":scope>*";
          component.children = [
            { tag: "li", text: "1" },
            {
              tag: "li",
              text: "2",
              children: [
                {
                  tag: "ul",
                  children: [
                    {
                      tag: "li",
                      text: "(",
                    },
                    {
                      tag: "li",
                      text: "2.1,",
                    },
                    {
                      tag: "li",
                      text: "2.2,",
                    },
                    {
                      tag: "li",
                      text: ")",
                    },
                  ],
                },
              ],
            },
            { tag: "li", text: "3" },
            { tag: "li", text: "4" },
            { tag: "li", text: "5" },
          ];
          component.children[3].children = [
            {
              tag: "ul",
              styles: {
                background: "rgb(105, 179, 162)",
              },
              children: [
                {
                  tag: "li",
                  text: "(",
                },
                {
                  tag: "li",
                  text: "4.1,",
                  children: [
                    {
                      tag: "ul",
                      children: [
                        { tag: "li", text: "(" },
                        { tag: "li", text: "4.1.1" },
                        { tag: "li", text: "4.1.2" },
                        { tag: "li", text: "4.1.3" },
                        { tag: "li", text: ")" },
                      ],
                    },
                  ],
                },
                {
                  tag: "li",
                  text: "4.2,",
                  transitions: [
                    [
                      ["duration", 500],
                      [
                        "textTween",
                        function () {
                          return d3.interpolateRound(0, 100);
                        },
                      ],
                      [
                        "on",
                        "end",
                        function () {
                          component.children[3].children[0].children[2].children =
                            [
                              {
                                tag: "ul",
                                children: [
                                  { tag: "li", text: "(" },
                                  { tag: "li", text: "100.1," },
                                  { tag: "li", text: "100.2," },
                                  { tag: "li", text: ")" },
                                ],
                              },
                            ];
                          foo.complete.then(() => {
                            const ul = foo.shadowRoot.querySelector("#deep");
                            resolve(ul.textContent);
                          });
                        },
                      ],
                    ],
                  ],
                },
                {
                  tag: "li",
                  text: ")",
                },
              ],
            },
          ];
          component.children[3].children[1] = {
            tag: "ul",
            styles: {
              color: "white",
              background: "rgb(8, 48, 107)",
            },
          };
          component.children[3].children[1].children = [
            {
              tag: "li",
              text: "(",
            },
            {
              tag: "li",
              text: "4.3,",
            },
            {
              tag: "li",
              text: "4.4,",
            },
            {
              tag: "li",
              text: ")",
            },
          ];
          component.children[4].text("6");
          component.children[5] = { tag: "li", text: "7" };
        })
    )
  ).toEqual(
    "12(2.1,2.2,)34(4.1,(4.1.14.1.24.1.3)100(100.1,100.2,))(4.3,4.4,)67"
  );

  // call & each
  expect(
    await useScript(() => {
      const texts = [];
      return updateFoo(
        () => {
          foo.data[3].call(
            function (selection, a, b) {
              if (a !== 1 || b !== 2 || selection.size() !== texts.length) {
                throw new Error(`Invalid result`);
              }
            },
            1,
            2
          );
          foo.data[3].each(function () {
            if (this.childNodes.length) {
              texts.push(this.childNodes[0].textContent);
            } else {
              texts.push(this.textContent);
            }
          });
          foo.data[3].updateChildren();
        },
        () => texts.join("")
      );
    })
  ).toEqual("123467");

  // updateChildren
  expect(
    await useScript(() => {
      let n = 0;
      return updateFoo(
        () => {
          foo.call = (selection) => {
            n = selection.size();
          };

          foo.data.updateChildren();
        },
        () => n
      );
    })
  ).toEqual(4);

  // __call__ & __each__
  expect(
    await useScript(() => {
      const texts = [];
      return updateFoo(
        () => {
          foo.data[3].__call__ = [
            function (selection, a, b) {
              if (a !== 1 || b !== 2 || selection.size() !== texts.length) {
                throw new Error(`Invalid result`);
              }
            },
            1,
            2,
          ];
          foo.data[3].__each__ = function () {
            texts.push(this.childNodes[0].textContent);
          };
        },
        () => texts.join("")
      );
    })
  ).toEqual("1");
});
