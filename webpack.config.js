const path = require("path");

module.exports = {
  entry: "./tests/example.spec.js", // Path to your main JS file
  output: {
    filename: "bundle.js", // Output filename
    path: path.resolve(__dirname, "dist"), // Output directory
    libraryTarget: "commonjs2", // Use CommonJS module format for Node.js
  },
  target: "node", // Specify that this is for Node.js
  mode: "production", // Set mode to production for optimizations
  resolve: {
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
    ],
  },
};
