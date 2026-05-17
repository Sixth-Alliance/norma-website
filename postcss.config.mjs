// Export plugin names rather than plugin function references so Next.js's
// PostCSS loader doesn't treat them as malformed (it expects string keys
// in certain environments).
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
    'autoprefixer': {},
  },
};

export default config;
