import { JSDOM } from "jsdom";
import * as d3 from "d3";

beforeEach(() => {
  const dom = new JSDOM(
    `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Test Rendering</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <script src="/node_modules/d3/dist/d3.js"></script>
    <script src="/node_modules/tweakpane/dist/tweakpane.js"></script>
    <style>
      html {
        height: 100%;
        display: flex;
      }

      body {
        flex: 1;
      }
    </style>

    <!-- tweakpane theme -->
    <style>
      :root {
        --tp-base-background-color: hsla(230, 100%, 99%, 1.00);
        --tp-base-shadow-color: hsla(0, 0%, 0%, 0);
        --tp-button-background-color: hsla(230, 7%, 75%, 1.00);
        --tp-button-background-color-active: hsla(230, 7%, 60%, 1.00);
        --tp-button-background-color-focus: hsla(230, 7%, 65%, 1.00);
        --tp-button-background-color-hover: hsla(230, 7%, 70%, 1.00);
        --tp-button-foreground-color: hsla(230, 10%, 30%, 1.00);
        --tp-container-background-color: hsla(230, 15%, 30%, 0.20);
        --tp-container-background-color-active: hsla(230, 15%, 30%, 0.32);
        --tp-container-background-color-focus: hsla(230, 15%, 30%, 0.28);
        --tp-container-background-color-hover: hsla(230, 15%, 30%, 0.24);
        --tp-container-foreground-color: hsla(230, 10%, 30%, 1.00);
        --tp-groove-foreground-color: hsla(230, 15%, 30%, 0.10);
        --tp-input-background-color: hsla(230, 15%, 30%, 0.10);
        --tp-input-background-color-active: hsla(230, 15%, 30%, 0.22);
        --tp-input-background-color-focus: hsla(230, 15%, 30%, 0.18);
        --tp-input-background-color-hover: hsla(230, 15%, 30%, 0.14);
        --tp-input-foreground-color: hsla(230, 10%, 30%, 1.00);
        --tp-label-foreground-color: hsla(230, 10%, 30%, 0.70);
        --tp-monitor-background-color: hsla(230, 15%, 30%, 0.10);
        --tp-monitor-foreground-color: hsla(230, 10%, 30%, 0.50);
      }
    </style>
  </head>
  <body>
  </body>
</html>`,
    {
      pretendToBeVisual: true,
    }
  );
  global.window = dom.window;
  global.document = dom.window.document;
  global.d3 = d3;
});
