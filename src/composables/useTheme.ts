import { ref, watch } from "vue";

export type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "aireplay-theme";

const theme = ref<Theme>((localStorage.getItem(STORAGE_KEY) as Theme) ?? "system");

function applyTheme(t: Theme) {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = t === "dark" || (t === "system" && prefersDark);

  document.documentElement.classList.toggle("dark", isDark);

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", isDark ? "#09090b" : "#fafafa");
}

// React to OS preference changes when set to "system"
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  if (theme.value === "system") applyTheme("system");
});

watch(
  theme,
  (t) => {
    localStorage.setItem(STORAGE_KEY, t);
    applyTheme(t);
  },
  { immediate: true },
);

export function useTheme() {
  return { theme };
}
