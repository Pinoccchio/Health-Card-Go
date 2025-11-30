const config = {
  plugins: {
    "@tailwindcss/postcss": {},
    "@csstools/postcss-oklab-function": {
      preserve: true, // Keep modern colors for browsers that support them
    },
  },
};

export default config;
