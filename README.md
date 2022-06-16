[![NPM](https://img.shields.io/badge/npm-CB3837?style=for-the-badge&logo=npm&logoColor=white)](https://www.npmjs.com/package/mixin_d3)
[![GH](https://img.shields.io/badge/GitHub%20Pages-222222?style=for-the-badge&logo=GitHub%20Pages&logoColor=white)](https://vegertar.github.io/mixin_d3/)


# Mixin D3

Although the component-based frameworks, e.g. vue, react, angular, are used everywhere, [D3js](https://d3js.org/) is still the industry standard for data visualization. Lots seem not to be big fans of how D3 handles updating DOM, especially at the moment that [You-Don't-Need-jQuery](https://github.com/nefe/You-Dont-Need-jQuery). Then some things become interesting and annoying, libraries go back and forth between abstraction and flexibility, from the most talented DSL to low-level vanilla js, many awesome projects appear every year, as well as the totally awesome browser.

Modern browser comes with a suite of different technologies called [Web Components](https://developer.mozilla.org/en-US/docs/Web/Web_Components), the heavily used development way in our vanilla js projects, with loads of dependent of D3, I write the [mixin_d3.js](/lib/mixin_d3.js), to approach a little bit of more friendly data-driven programming, which just works as below. [_Edit in here_](https://stackblitz.com/edit/js-c6aqfb?file=index.js), or if you [_prefer typescript_](https://codesandbox.io/s/long-violet-7d9ehm?file=/src/index.ts).

![repeat circle](media/repeat-circle.gif "repeat circle")

```js
document.body.innerHTML = '<my-app viewBox="0,0,960,500"></my-app>';
const myApp = document.querySelector("my-app");
myApp.data = [
  {
    tag: "circle",
    attrs: {
      class: "component",
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
            // repeat the circle
            myApp.data[0].transitions = myApp.data[0].transitions;
          },
        },
      },
    ],
  },
];
```

The corresponding D3 example is [here](https://bl.ocks.org/d3noob/bf44061b1d443f455b3f857f82721372):

```js
var svg = d3
  .select("body")
  .append("svg")
  .attr("width", 960)
  .attr("height", 500);

function circleTransition() {
  var timeCircle = svg.append("circle").attr("fill", "steelblue").attr("r", 20);
  repeat();

  function repeat() {
    timeCircle
      .attr("cx", 40) // position the circle at 40 on the x axis
      .attr("cy", 250) // position the circle at 250 on the y axis
      .transition() // apply a transition
      .duration(2000) // apply it over 2000 milliseconds
      .attr("cx", 920) // move the circle to 920 on the x axis
      .transition() // apply a transition
      .duration(2000) // apply it over 2000 milliseconds
      .attr("cx", 40) // return the circle to 40 on the x axis
      .on("end", repeat); // when the transition finishes start again
  }
}

circleTransition();
```

It seems yet another JSON-style coding library? 😒, um...Yes, a sort of. If you're interested in, don't be hesitated to run/test the code, just `yarn && yarn tw` and open [http://localhost:3000](http://localhost:3000) to see more examples, such as a very simple [bar chart](/__tests__/lib/bar_chart.js), [Tic Tac Toe](/__tests__/lib/tic_tac_toe.js) against [react tutorial](https://reactjs.org/tutorial/tutorial.html#completing-the-game). All codes are MIT licenced, please feel free to copy or prune to anywhere you like.

Happy coding.

---
