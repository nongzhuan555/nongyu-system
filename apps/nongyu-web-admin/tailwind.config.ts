import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#0A7C59",
          muted: "#D4E9DF",
          deep: "#042116",
          soft: "#2E7D6E",
          mist: "#8FBF9B",
        },
        canvas: "#FAFBFA",
        surface: "#FFFFFF",
        elev: "#F3F6F4",
        ink: "#1F2937",
        muted: "#424945",
        line: "#CFE3DA",
        "line-soft": "#DEE5E1",
      },
      fontFamily: {
        sans: ['"Source Sans 3"', '"PingFang SC"', '"Microsoft YaHei"', "system-ui", "sans-serif"],
      },
      boxShadow: {
        panel: "0 1px 2px rgb(17 24 39 / 0.04), 0 8px 24px -12px rgb(17 24 39 / 0.08)",
        card: "0 1px 2px rgb(17 24 39 / 0.04), 0 8px 24px -12px rgb(17 24 39 / 0.08)",
      },
      borderRadius: {
        panel: "16px",
      },
    },
  },
  plugins: [],
} satisfies Config;
