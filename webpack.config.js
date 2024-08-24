const path = require("path");
const webpack = require("webpack");
const TerserPlugin = require("terser-webpack-plugin");
const { PurgeCSSPlugin } = require("purgecss-webpack-plugin");
const glob = require("glob");

module.exports = {
  entry: "./tests/example.spec.js", // Path to your main JS file
  plugins: [
    new webpack.IgnorePlugin({
      resourceRegExp: /^(canvas|\.ttf|index-C26qYYLF\.css|index-CicNBMuh\.js)$/,
    }),
    new PurgeCSSPlugin({
      paths: glob.sync(`${path.resolve(__dirname, "src")}/**/*`, {
        nodir: true,
      }),
      safelist: {
        standard: [], // Add any classes you want to always include here
        deep: [],
        greedy: [],
      },
    }),
  ],

  output: {
    filename: "bundle.js", // Output filename
    path: path.resolve(__dirname, "dist"), // Output directory
    libraryTarget: "commonjs2", // Use CommonJS module format for Node.js
  },
  target: "node", // Specify that this is for Node.js
  mode: "production", // Set mode to production for optimizations
  resolve: {
    alias: {
      "@assets": path.resolve(__dirname, "src/assets"), // Adjust the path as needed
    },
    fallback: {
      fs: false,
      path: false,
      child_process: false,
      jsdom: false,
      canvas: false, // Disable canvas since it's not needed in the browser context
      electron: false, // Disable electron since it's not needed in the browser context
    },
  },
  module: {
    rules: [
      {
        test: /\.html$/,
        use: "html-loader",
      },
      {
        test: /\.css$/,
        use: [
          "style-loader",
          {
            loader: "css-loader",
            options: { importLoaders: 1 },
          },
          "postcss-loader", // Add postcss-loader here
        ],
      },
      {
        test: /\.scss$/,
        use: [
          "style-loader",
          {
            loader: "css-loader",
            options: { importLoaders: 2 },
          },
          "postcss-loader", // Add postcss-loader here as well
          "resolve-url-loader",
          "sass-loader",
        ],
      },
      {
        test: /\.svg$/,
        use: "svg-inline-loader",
      },
      {
        test: /\.(png|gif|jpeg|ico|bmp|webp|jpe?g|svg|ttf|woff2?|woff|eot|otf)$/,
        type: "asset/resource", // Use asset modules for images
      },
      {
        test: /\.node$/,
        use: "node-loader",
      },
    ],
  },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
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
        },
      }),
    ],
  },
};
