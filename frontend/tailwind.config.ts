/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      "./app/**/*.{js,ts,jsx,tsx}",
      "./components/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        colors: {
          primary: "#0f172a", // Dark slate for buttons and accents
          secondary: "#16a34a", // Green for success states
          neutral: "#64748b", // Neutral gray for text
        },
        animation: {
          fadeIn: "fadeIn 0.5s ease-in-out",
          slideIn: "slideIn 0.5s ease-in-out",
          shake: "shake 0.3s ease-in-out",
        },
        keyframes: {
          fadeIn: {
            "0%": { opacity: "0", transform: "translateY(20px)" },
            "100%": { opacity: "1", transform: "translateY(0)" },
          },
          slideIn: {
            "0%": { opacity: "0", transform: "translateX(50px)" },
            "100%": { opacity: "1", transform: "translateX(0)" },
          },
          shake: {
            "0%, 100%": { transform: "translateX(0)" },
            "25%": { transform: "translateX(-5px)" },
            "75%": { transform: "translateX(5px)" },
          },
        },
      },
    },
    plugins: [],
  };