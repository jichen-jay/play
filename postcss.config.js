// postcss.config.js
module.exports = {
  plugins: [
    require("cssnano")({
      preset: [
        "advanced",
        {
          autoprefixer: true,
          discardComments: { removeAll: true },
          mergeLonghand: true,
          mergeRules: true,
          minifySelectors: true,
          normalizeWhitespace: true,
          svgo: true,
          discardUnused: true, // Remove unused at-rules
          reduceIdents: true, // Reduce identifier names
          zindex: true, // Optimize z-index values
        },
      ],
    }),
  ],
};
