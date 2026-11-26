module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        teal: "var(--teal)",
        paper: "var(--paper)",
        ink: "var(--ink)",
        brand: "var(--teal)",
        deep: "#0B4F4B",
        lav: "#E4EFED",
        bg: "var(--paper)",
        ok: "var(--teal)",
        yellow: {
          DEFAULT: "var(--yellow)",
          50: "#FEF9EC",
          100: "#FDF0CD",
          200: "#FBE09B",
          400: "#F4B73F",
          800: "#5C4108",
        },
        red: {
          DEFAULT: "var(--red)",
          50: "#FDF2F1",
          100: "#FAE1DF",
          200: "#F4C2BE",
          600: "#C23B2E",
          700: "#A52E23",
          800: "#85231A",
        },
      },
      fontFamily: {
        sans: ["var(--font-mukta)", "Mukta", "system-ui", "sans-serif"],
        heading: ["var(--font-bricolage)", "Bricolage Grotesque", "var(--font-mukta)", "system-ui", "sans-serif"],
      },
    },
  },
};
