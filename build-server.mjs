import { build } from "vite";

await build({
  build: {
    ssr: "./server/serve.ts",
    outDir: "dist/server",
    rollupOptions: {
      output: {
        entryFileNames: "serve.mjs",
      },
    },
  },
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
    },
  },
});
