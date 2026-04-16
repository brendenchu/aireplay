<template>
  <div id="aireplay">
    <nav>
      <RouterLink to="/">Dashboard</RouterLink>
      <RouterLink to="/conversations">Conversations</RouterLink>
      <RouterLink to="/projects">Projects</RouterLink>
      <RouterLink to="/memory">Memory</RouterLink>
      <RouterLink to="/search">Search</RouterLink>
      <RouterLink to="/settings">Settings</RouterLink>
    </nav>
    <main>
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
</script>

<style>
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:root {
  --color-bg: #0f1117;
  --color-surface: #1a1d27;
  --color-border: #2a2d3a;
  --color-text: #e1e4ed;
  --color-text-muted: #8b8fa3;
  --color-accent: #7c6df0;
  --color-accent-hover: #9486f7;
  --font-sans: system-ui, -apple-system, sans-serif;
  --font-mono: 'SF Mono', 'Fira Code', monospace;
}

body {
  font-family: var(--font-sans);
  background: var(--color-bg);
  color: var(--color-text);
  line-height: 1.6;
}

#aireplay {
  display: flex;
  min-height: 100vh;
}

nav {
  width: 200px;
  padding: 1.5rem 1rem;
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex-shrink: 0;
}

nav a {
  color: var(--color-text-muted);
  text-decoration: none;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  font-size: 0.875rem;
  transition: background 0.15s, color 0.15s;
}

nav a:hover {
  background: var(--color-surface);
  color: var(--color-text);
}

nav a.router-link-active {
  background: var(--color-surface);
  color: var(--color-accent);
}

main {
  flex: 1;
  padding: 2rem;
  max-width: 960px;
}
</style>
