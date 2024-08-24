const path = require("path");
const webpack = require("webpack");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");

module.exports = {
  entry: "./tests/example.spec.js", // Path to your main JS file
  plugins: [
    new webpack.IgnorePlugin({
      resourceRegExp: /^(canvas)$/,
    }),
    new webpack.ContextReplacementPlugin(
      /playwright-core\/lib\/server\/registry/,
      (data) => {
        delete data.dependencies[0].critical;
        return data;
      }
    ),
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
        use: ["style-loader", "css-loader"],
      },
      {
        test: /\.scss$/,
        use: [
          "style-loader",
          {
            loader: "css-loader",
            options: {
              modules: {
                auto: true,
                localIdentName: "[local]--[hash:base64:5]",
              },
            },
          },
          "resolve-url-loader",
          "sass-loader",
        ],
      },
      {
        test: /\.svg$/,
        use: "svg-inline-loader",
      },
      {
        test: /\.(png|jpg|gif|jpeg|ico|bmp|webp)$/,
        type: "asset/resource", // Use asset modules for images
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        type: "asset/resource", // Use asset modules for fonts
      },
      {
        test: /\.node$/,
        use: "node-loader",
      },
      {
        test: /\.(png|jpe?g|gif|svg|ttf|woff2?)$/,
        type: "asset/resource",
      },
    ],
  },
  optimization: {
    minimize: true,
    minimizer: [
      "...", // This syntax extends existing minimizers (i.e., `terser-webpack-plugin`)
      new CssMinimizerPlugin(),
    ],
  },
};
