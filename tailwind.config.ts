import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["Cinzel", "var(--font-cinzel)", "Georgia", "serif"],
        cinzel: ["Cinzel", "var(--font-cinzel)", "Georgia", "serif"],
        mono: ["'JetBrains Mono'", "var(--font-mono)", "monospace"],
        missions: ["var(--font-missions)", "serif"],
      },
      colors: {
        "barber-red": "#942121",
        "barber-gold": "#c89d49",
        "barber-dark": "#141210",
        "barber-paper": "#f5f2eb",
        guild: {
          void: "#0b0908",
          stone: "#141210",
          oak: "#1c1815",
          "oak-highlight": "#27221e",
          border: "#3b322b",
          "border-light": "#54463c",
        },
        brass: {
          light: "#f1d899",
          base: "#c89d49",
          dark: "#7e5f24",
        },
        crimson: {
          base: "#942121",
          hover: "#7a1919",
          dark: "#5c1313",
        },
        parchment: {
          100: "#f5f2eb",
          300: "#cdc5b4",
          500: "#8c8270",
        },
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
