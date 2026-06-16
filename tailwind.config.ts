import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1.5rem", screens: { "2xl": "1280px" } },
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        popover: { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        fw: {
          page: "#FFFFFF",
          card: "#FFFFFF",
          purple: "#9381FF",
          purpleDark: "#7B6BE8",
          purpleSoft: "#F4F2FF",
          turquoise: "#18E4C9",
          yellow: "#F4DB3A",
          orange: "#FB922F",
          black: "#303031",
          text: "#2D2D33",
          darkGray: "#6B7280",
          lightGray: "#B8BCC5",
          lighterGray: "#E3E5EB",
          border: "#EBECF0",
          disabled: "#F3F4F6",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 8px)",
        pill: "9999px",
      },
      fontFamily: {
        sans: ["Palanquin", "system-ui", "sans-serif"],
        display: ["Fraunces", "Palanquin", "Georgia", "serif"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
