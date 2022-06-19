import { terser } from "rollup-plugin-terser";
import pkg from "./package.json";

export default [
  {
    input: "index.js",
    output: {
      name: pkg.name,
      file: pkg.main,
      format: "umd",
    },
  },
  {
    input: "index.js",
    plugins: [terser()],
    output: {
      name: pkg.name,
      file: pkg.browser,
      indent: false,
      format: "umd",
    },
  },
];
