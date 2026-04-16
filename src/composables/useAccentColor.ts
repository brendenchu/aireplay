import { ref, watch } from "vue";

export type AccentColor = "indigo" | "violet" | "blue" | "amber" | "rose" | "emerald" | "cyan";

export interface AccentPalette {
  label: string;
  light: string;
  lightForeground: string;
  dark: string;
  darkForeground: string;
}

export const accentPalettes: Record<AccentColor, AccentPalette> = {
  indigo: { label: "Indigo", light: "#4f46e5", lightForeground: "#ffffff", dark: "#818cf8", darkForeground: "#1e1b4b" },
  violet: { label: "Violet", light: "#7c3aed", lightForeground: "#ffffff", dark: "#a78bfa", darkForeground: "#1e1b4b" },
  blue: { label: "Blue", light: "#2563eb", lightForeground: "#ffffff", dark: "#60a5fa", darkForeground: "#172554" },
  amber: { label: "Amber", light: "#d97706", lightForeground: "#ffffff", dark: "#fbbf24", darkForeground: "#451a03" },
  rose: { label: "Rose", light: "#e11d48", lightForeground: "#ffffff", dark: "#fb7185", darkForeground: "#1c1917" },
  emerald: { label: "Emerald", light: "#059669", lightForeground: "#ffffff", dark: "#34d399", darkForeground: "#022c22" },
  cyan: { label: "Cyan", light: "#0891b2", lightForeground: "#ffffff", dark: "#22d3ee", darkForeground: "#083344" },
};

const STORAGE_KEY = "aireplay-accent";
const accentColor = ref<AccentColor>((localStorage.getItem(STORAGE_KEY) as AccentColor) ?? "indigo");

function applyAccent(color: AccentColor) {
  const palette = accentPalettes[color];
  if (!palette) return;

  const root = document.documentElement;
  const isDark = root.classList.contains("dark");
  const primary = isDark ? palette.dark : palette.light;
  const foreground = isDark ? palette.darkForeground : palette.lightForeground;

  root.style.setProperty("--primary", primary);
  root.style.setProperty("--primary-foreground", foreground);
  root.style.setProperty("--ring", primary);
  root.style.setProperty("--chart-1", primary);
  root.style.setProperty("--sidebar-primary", primary);
  root.style.setProperty("--sidebar-primary-foreground", foreground);
  root.style.setProperty("--sidebar-ring", primary);
}

// Re-apply when dark mode toggles
const observer = new MutationObserver(() => applyAccent(accentColor.value));
observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

watch(
  accentColor,
  (c) => {
    localStorage.setItem(STORAGE_KEY, c);
    applyAccent(c);
  },
  { immediate: true },
);

export function useAccentColor() {
  return { accentColor };
}
