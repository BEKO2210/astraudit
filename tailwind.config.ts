import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#05070d",
          900: "#0a0e1a",
          800: "#0f1424",
          700: "#171c30",
          600: "#222842",
          500: "#2e3454",
        },
        aurora: {
          violet: "#7a5cff",
          blue: "#3a7bff",
          cyan: "#3ad6ff",
          mint: "#42e8c8",
          coral: "#ff7a90",
          amber: "#ffb547",
        },
        risk: {
          critical: "#ff4d6d",
          high: "#ff7a48",
          medium: "#ffb547",
          low: "#7ad0ff",
          info: "#9aa3c2",
          good: "#42e8c8",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(122,92,255,0.25), 0 20px 80px -20px rgba(58,123,255,0.35)",
        card: "0 1px 0 rgba(255,255,255,0.04) inset, 0 30px 60px -30px rgba(0,0,0,0.6)",
      },
      backgroundImage: {
        aurora:
          "radial-gradient(60% 60% at 20% 0%, rgba(122,92,255,0.25), transparent 60%), radial-gradient(50% 50% at 80% 10%, rgba(58,214,255,0.18), transparent 60%), radial-gradient(40% 40% at 50% 80%, rgba(66,232,200,0.15), transparent 60%)",
        grid: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
      },
      backgroundSize: {
        grid: "32px 32px",
      },
      keyframes: {
        pulseRing: {
          "0%, 100%": { opacity: "0.6", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.03)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        floaty: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
        "toast-in": {
          "0%": { opacity: "0", transform: "translateY(8px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        // View transitions (Phase 2.8.6). `view-enter` handles the
        // motion-safe path (slide up + fade); `fade-in` is the
        // motion-reduce fallback (fade only, no translate). Tailwind's
        // motion-safe / motion-reduce variants pick the right one
        // based on the user's prefers-reduced-motion setting.
        "view-enter": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        pulseRing: "pulseRing 3s ease-in-out infinite",
        shimmer: "shimmer 2.4s linear infinite",
        floaty: "floaty 6s ease-in-out infinite",
        "toast-in": "toast-in 180ms ease-out",
        "view-enter": "view-enter 220ms ease-out both",
        "fade-in": "fade-in 180ms ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
