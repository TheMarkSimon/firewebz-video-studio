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
        // "purple" is legacy naming — it now holds Spinr Lime (#D7FC47), THE
        // single brand accent on an otherwise monochrome palette. Lime is too
        // light for text on white: use it for FILLS (buttons with black text,
        // chips, marker highlights), Ramp-yellow style. Read "purple" as "brand".
        fw: {
          page: "#FFFFFF",
          card: "#FFFFFF",
          purple: "#D7FC47",
          purpleDark: "#C2EC28",
          purpleSoft: "#F7FEDC",
          turquoise: "#18E4C9",
          yellow: "#F4DB3A",
          orange: "#D7FC47",
          black: "#0A0A0B",
          text: "#101012",
          darkGray: "#5F6470",
          lightGray: "#AEB3BD",
          lighterGray: "#E3E5EB",
          border: "#EAEBEF",
          disabled: "#F4F5F7",
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
