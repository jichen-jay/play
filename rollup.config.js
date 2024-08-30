const path = require("path"); // Ensure the path module is imported
const terser = require("@rollup/plugin-terser");
const purgecss = require("rollup-plugin-purgecss");
const resolve = require("@rollup/plugin-node-resolve");
const commonjs = require("@rollup/plugin-commonjs");
const json = require("@rollup/plugin-json");
const alias = require("@rollup/plugin-alias");
const replace = require("@rollup/plugin-replace");
const postcss = require("rollup-plugin-postcss");
const html = require("rollup-plugin-html");
const url = require("rollup-plugin-url");
const glob = require("glob");
const dynamicImportVars = require("@rollup/plugin-dynamic-import-vars");

module.exports = {
  input: "./tests/example.spec.js", // Path to your main JS file
  output: {
    file: path.resolve(__dirname, "dist/bundle.js"), // Output filename and directory
    format: "cjs", // Use CommonJS module format for Node.js
  },
  plugins: [
    resolve({
      preferBuiltins: true, // Prefer Node.js built-in modules
    }),
    commonjs(), // Convert CommonJS modules to ES6
    json(), // Handle JSON files
    alias({
      entries: [
        { find: "@assets", replacement: path.resolve(__dirname, "src/assets") },
      ],
    }),
    replace({
      preventAssignment: true,
      "process.env.NODE_ENV": JSON.stringify("production"),
      canvas: "undefined", // Disable canvas
      electron: "undefined", // Disable electron
    }),
    purgecss({
      content: glob.sync(`${path.resolve(__dirname, "src")}/**/*`, {
        nodir: true,
      }),
      safelist: {
        standard: [], // Add any classes you want to always include here
        deep: [],
        greedy: [],
      },
    }),
    postcss({
      extract: true, // Extract CSS into a separate file
      minimize: true, // Minimize the CSS
    }),
    html({
      include: "**/*.html", // Handle HTML files
    }),
    url({
      include: [
        "**/*.png",
        "**/*.gif",
        "**/*.jpeg",
        "**/*.ico",
        "**/*.bmp",
        "**/*.webp",
        "**/*.jpg",
        "**/*.svg",
        "**/*.ttf",
        "**/*.woff",
        "**/*.woff2",
        "**/*.eot",
        "**/*.otf",
      ],
      limit: 8192, // Inline files smaller than 8kb
      emitFiles: true, // Emit files larger than the limit
    }),
    terser({
      compress: {
        drop_console: true,
        drop_debugger: true, // Remove debugger statements
        dead_code: true, // Remove unreachable code
        conditionals: true, // Optimize if-s and conditional expressions
        unused: true, // Drop unreferenced functions and variables
      },
      output: {
        comments: false,
      },
      mangle: {
        properties: false, // Mangle property names (can be risky)
      },
    }),
    dynamicImportVars(),
  ],
  external: ["playwright-core", "canvas"], // Exclude Playwright and Canvas from the bundle
};
