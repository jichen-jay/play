import { defineConfig } from "@rsbuild/core";
import { PurgeCSSPlugin } from "purgecss-webpack-plugin";
import TerserPlugin from "terser-webpack-plugin";
import path from "path";
import glob from "glob";

export default defineConfig({
  source: {
    entry: {
      main: "./tests/example.spec.js",
    },
  },
  tools: {
    rspack: {
      plugins: [
        new PurgeCSSPlugin({
          paths: glob.sync(`${path.resolve(__dirname, "src")}/**/*`, {
            nodir: true,
          }),
          safelist: {
            standard: [],
            deep: [],
            greedy: [],
          },
        }),
        new TerserPlugin({
          terserOptions: {
            compress: {
              drop_console: true,
              drop_debugger: true,
              dead_code: true,
              conditionals: true,
              unused: true,
            },
            output: {
              comments: false,
            },
            mangle: {
              properties: false,
            },
          },
        }),
      ],
    },
  },
});
