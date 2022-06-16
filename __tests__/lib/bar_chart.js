test("A very simple bar-chart", async () => {
  const phases = {
    A: 171,
    B: 101,
    C: 20,
    D: 22,
    E: 125,
  };

  await useHtml();
  await useScript(async () => {
    const { MixinD3 } = await import("/lib/mixin_d3.js");
    window.customElements.define("bar-chart", MixinD3);
    document.body.appendChild(document.createElement("bar-chart"));
  });
  await useScript(async (phases) => {
    await import("/lib/responsive-svg.js");

    const marginTop = 20;
    const marginRight = 0;
    const marginBottom = 30;
    const marginLeft = 40;
    const width = 640;
    const height = 400;

    const xScale = d3
      .scaleBand(Object.keys(phases), [marginLeft, width - marginRight])
      .padding(0.1);

    const yScale = d3.scaleLinear(
      [0, d3.max(Object.values(phases))],
      [height - marginBottom, marginTop]
    );

    const barChart = document.querySelector("bar-chart");
    barChart.data[0] = {
      tag: "responsive-svg",
      attrs: [
        ["class", "component"],
        ["viewBox", `0,0,${width},${height}`],
      ],
      ns: "svg",
      selector: ":scope>*",
      children: [
        {
          tag: "svg",
          attrs: [["viewBox", `0,0,${width},${height}`]],
          children: [
            {
              tag: "g",
              attrs: [
                ["class", "y-axis"],
                ["transform", `translate(${marginLeft},0)`],
              ],
              __call__: d3.axisLeft(yScale),
            },
            {
              tag: "g",
              attrs: [["fill", "steelblue"]],
              children: Object.entries(phases).map((d) => ({
                tag: "rect",
                attrs: {
                  x: xScale(d[0]),
                  y: yScale(d[1]),
                  width: xScale.bandwidth(),
                  height: yScale(0) - yScale(d[1]),
                },
                children: [{ tag: "title", text: d[1] }],
              })),
            },
            {
              tag: "g",
              attrs: [
                ["class", "x-axis"],
                ["transform", `translate(0,${height - marginBottom})`],
              ],
              __call__: d3.axisBottom(xScale),
            },
          ],
        },
      ],
    };
  }, phases);
});
