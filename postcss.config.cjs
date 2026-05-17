// Next.js prefers PostCSS config where plugins are provided as names/strings
// This avoids Next/Vite complaining about function shapes when using ESM imports.
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},
    'autoprefixer': {},
  },
};
