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
          50: "#EEF2FF",
          100: "#E0E7FF",
          200: "#C7D2FE",
          300: "#A5B4FC",
          400: "#818CF8",
          500: "#6C63FF",
          600: "#4F46E5",
          700: "#4338CA",
          800: "#3730A3",
          900: "#1E1B4B",
        },
        accent: {
          50: "#FDF2F8",
          100: "#FCE7F3",
          300: "#F9A8D4",
          500: "#EC4899",
          600: "#DB2777",
          700: "#BE185D",
        },
        brand: {
          dark: "#0F0F1A",
          card: "#1A1A2E",
          bg: "#F8F9FF",
        },
        gold: "#F59E0B",
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
        brand: "0 4px 20px rgba(108,99,255,0.15)",
        "brand-lg": "0 8px 40px rgba(108,99,255,0.22)",
        card: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)",
        float: "0 20px 60px rgba(108,99,255,0.22)",
      },
      backgroundImage: {
        "gradient-brand":
          "linear-gradient(135deg, #6C63FF 0%, #4F46E5 50%, #EC4899 100%)",
        "gradient-hero":
          "linear-gradient(135deg, #0F0F1A 0%, #1a1040 40%, #1E1B4B 100%)",
        "gradient-card":
          "linear-gradient(180deg, transparent 0%, rgba(15,15,26,0.9) 100%)",
      },
    },
  },
  plugins: [],
};
