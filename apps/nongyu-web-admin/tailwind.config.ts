import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: "#10B981",
        sunlight: "#FBBF24",
        canvas: "#F8FAFC",
        ink: "#1E293B",
        muted: "#64748B",
      },
      boxShadow: {
        card: "0 20px 40px -24px rgb(15 23 42 / 0.12)",
      },
    },
  },
  plugins: [],
} satisfies Config;
