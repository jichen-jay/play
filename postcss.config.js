// postcss.config.js
module.exports = {
  plugins: [
    require("cssnano")({
      preset: "advanced", // Use default cssnano preset for additional minification
    }),
  ],
};
