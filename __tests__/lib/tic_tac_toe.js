beforeEach(async () => {
  await useHtml();
  await useScript(async () => {
    const { mixinD3 } = await import("/lib/mixin_d3.js");
    const { ShadowElement } = await import("/lib/shadow_element.js");
    window.BaseComponent = mixinD3(ShadowElement);
    window.customElements.define("my-game", BaseComponent);
    document.body.appendChild(document.createElement("my-game"));
  });
});

async function passingDataThroughProps() {
  const myGame = document.querySelector("my-game");
  myGame.data = [
    {
      tag: "div",
      attrs: [["class", "game"]],
      data: [
        {
          tag: "style",
          text: `
            :host {
              font: 14px "Century Gothic", Futura, sans-serif;
              margin: 20px;
            }

            ol, ul {
              padding-left: 30px;
            }

            .board-row:after {
              clear: both;
              content: "";
              display: table;
            }

            .status {
              margin-bottom: 10px;
            }

            .square {
              background: #fff;
              border: 1px solid #999;
              float: left;
              font-size: 24px;
              font-weight: bold;
              line-height: 34px;
              height: 34px;
              margin-right: -1px;
              margin-top: -1px;
              padding: 0;
              text-align: center;
              width: 34px;
            }

            .square:focus {
              outline: none;
            }
            
            .kbd-navigation .square:focus {
              background: #ddd;
            }

            .game {
              display: flex;
              flex-direction: row;
            }

            .game-info {
              margin-left: 20px;
            }
          `,
        },
        {
          tag: "div",
          attrs: [["class", "game-board"]],
          data: [
            {
              tag: "div",
              attrs: [["class", "status"]],
              text: "Next player: X",
            },
            ...d3.range(3).map((row) => ({
              tag: "div",
              attrs: [["class", "board-row"]],
              data: d3.range(3).map((col) => ({
                tag: "button",
                attrs: [["class", "square"]],
                text: 3 * row + col,
              })),
            })),
          ],
        },
        {
          tag: "div",
          attrs: [["class", "game-info"]],
          data: [{ tag: "div" }, { tag: "ol" }],
        },
      ],
    },
  ];

  await myGame.complete;
}

async function makingAnInteractiveComponent() {
  const myGame = document.querySelector("my-game");
  myGame.root
    .selectAll(".square")
    .text("")
    .on("click", function () {
      this.textContent = "X";
    });
}

async function takingTurns() {
  const state = {
    squares: Array(9).fill(null),
    xIsNext: true,
  };
  const myGame = document.querySelector("my-game");
  const status = myGame.root.select(".status");
  myGame.root
    .selectAll(".square")
    .text("")
    .on("click", function (_d, i) {
      this.textContent = state.squares[i] = state.xIsNext ? "X" : "O";
      state.xIsNext = !state.xIsNext;
      status.text("Next player: " + (state.xIsNext ? "X" : "O"));
    });
}

async function finalResult() {
  function calculateWinner(squares) {
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ];
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (
        squares[a] &&
        squares[a] === squares[b] &&
        squares[a] === squares[c]
      ) {
        return squares[a];
      }
    }
    return null;
  }

  const myGame = document.querySelector("my-game");
  const state = {
    history: [{ squares: Array(9).fill(null) }],
    xIsNext: true,
    stepNumber: 0,
    get current() {
      const history = state.history;
      return history[state.stepNumber];
    },
    get next() {
      return state.xIsNext ? "X" : "O";
    },
    async jumpTo(step) {
      await myGame.complete;
      state.stepNumber = step;
      state.xIsNext = step % 2 === 0;
      state.update();
    },
    update() {
      const gameInfo = myGame.data[0].data[2];
      const gameHistory = gameInfo.data[1];
      const j = gameHistory.data.length;
      gameHistory.data.length = state.history.length;
      for (let i = j; i < state.history.length; ++i) {
        gameHistory.data[i] = {
          tag: "li",
          data: [
            {
              tag: "button",
              text: "Go to move #" + i,
              events: [["click", () => state.jumpTo(i)]],
            },
          ],
        };
      }

      const squares = state.current.squares;
      myGame.root.selectAll(".square").each(function (_d, i) {
        const v = squares[i];
        if (this.textContent !== v) {
          this.textContent = v;
        }
      });
    },
  };

  myGame.data = [
    {
      tag: "div",
      attrs: [["class", "game"]],
      selector: ":scope>*",
      data: [
        {
          tag: "style",
          text: `
            :host {
              font: 14px "Century Gothic", Futura, sans-serif;
              margin: 20px;
            }

            ol, ul {
              padding-left: 30px;
            }

            .board-row:after {
              clear: both;
              content: "";
              display: table;
            }

            .status {
              margin-bottom: 10px;
            }

            .square {
              background: #fff;
              border: 1px solid #999;
              float: left;
              font-size: 24px;
              font-weight: bold;
              line-height: 34px;
              height: 34px;
              margin-right: -1px;
              margin-top: -1px;
              padding: 0;
              text-align: center;
              width: 34px;
            }

            .square:focus {
              outline: none;
            }
            
            .kbd-navigation .square:focus {
              background: #ddd;
            }

            .game {
              display: flex;
              flex-direction: row;
            }

            .game-info {
              margin-left: 20px;
            }
          `,
        },
        {
          tag: "div",
          attrs: [["class", "game-board"]],
          data: d3.range(3).map((row) => ({
            tag: "div",
            attrs: [["class", "board-row"]],
            data: d3.range(3).map((col) => ({
              tag: "button",
              attrs: [["class", "square"]],
              events: {
                click() {
                  const history = state.history.slice(0, state.stepNumber + 1);
                  const current = history[history.length - 1];
                  const squares = current.squares.slice();
                  const i = row * 3 + col;
                  if (calculateWinner(squares) || squares[i]) {
                    return;
                  }
                  squares[i] = state.next;
                  state.history = history.concat([{ squares }]);
                  state.stepNumber = history.length;
                  state.xIsNext = !state.xIsNext;
                  state.update();
                },
              },
            })),
          })),
        },
        {
          tag: "div",
          attrs: [["class", "game-info"]],
          data: [
            {
              tag: "div",
              $each() {
                const squares = state.current.squares;
                const winner = calculateWinner(squares);
                this.textContent = winner
                  ? "Winner: " + winner
                  : "Next player: " + state.next;
              },
            },
            {
              tag: "ol",
              data: [
                {
                  tag: "li",
                  data: [
                    {
                      tag: "button",
                      text: "Go to game start",
                      events: [["click", () => state.jumpTo(0)]],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ];
}

describe("Tic Tac Toe:", () => {
  test("Passing Data Through Props", async () => {
    await useScript(passingDataThroughProps);
  });
  test("Making an Interactive Component", async () => {
    await useScript(passingDataThroughProps);
    await useScript(makingAnInteractiveComponent);
  });
  test("Taking Turns", async () => {
    await useScript(passingDataThroughProps);
    await useScript(takingTurns);
  });
  test("Final Result", async () => {
    await useScript(finalResult);
  });
});
