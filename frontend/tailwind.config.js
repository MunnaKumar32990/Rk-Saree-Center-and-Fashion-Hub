/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        outfit: ["Outfit", "sans-serif"],
        inter: ["Inter", "sans-serif"],
      },
      colors: {
        primary: {
          50: "#ECFDF5",
          100: "#D1FAE5",
          200: "#A7F3D0",
          300: "#6EE7B7",
          400: "#34D399",
          500: "#0F766E",
          600: "#065F46",
          700: "#064E3B",
          800: "#022C22",
          900: "#011912",
        },
        accent: {
          50: "#FEFCE8",
          100: "#FEF9C3",
          300: "#F5E6CC",
          500: "#EAB308",
          600: "#CA8A04",
          700: "#A16207",
        },
        brand: {
          dark: "#052E1C",
          card: "#064E3B",
          bg: "#F0FDF4",
        },
        gold: "#EAB308",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease forwards",
        "slide-down": "slideDown 0.35s ease forwards",
        "scale-in": "scaleIn 0.35s ease forwards",
        "slide-up": "slideUp 0.4s ease forwards",
        marquee: "marquee 25s linear infinite",
        shimmer: "shimmer 1.4s ease-in-out infinite",
        heartbeat: "heartBeat 0.5s ease",
        pulse2: "pulse 2s cubic-bezier(0.4,0,0.6,1) infinite",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        slideDown: {
          from: { opacity: "0", transform: "translateY(-12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          from: { opacity: "0", transform: "scale(0.92)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        marquee: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-50%)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        heartBeat: {
          "0%": { transform: "scale(1)" },
          "14%": { transform: "scale(1.3)" },
          "28%": { transform: "scale(1)" },
          "42%": { transform: "scale(1.3)" },
          "70%": { transform: "scale(1)" },
        },
      },
      boxShadow: {
        brand: "0 4px 20px rgba(6,95,70,0.18)",
        "brand-lg": "0 8px 40px rgba(6,78,59,0.25)",
        card: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)",
        float: "0 20px 60px rgba(6,78,59,0.25)",
      },
      backgroundImage: {
        "gradient-brand":
          "linear-gradient(135deg, #0F766E 0%, #064E3B 50%, #EAB308 100%)",
        "gradient-hero":
          "linear-gradient(135deg, #052E1C 0%, #064E3B 40%, #0F766E 100%)",
        "gradient-card":
          "linear-gradient(180deg, transparent 0%, rgba(5,46,28,0.92) 100%)",
      },
    },
  },
  plugins: [],
};
