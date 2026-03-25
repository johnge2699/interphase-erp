import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig(async () => ({
  base: process.env.VITE_BASE_PATH || "/",

  plugins: [
    react(),
    tailwindcss(),

    ...(process.env.NODE_ENV !== "production" && process.env.REPL_ID
      ? [
          (await import("@replit/vite-plugin-cartographer")).cartographer({
            root: path.resolve(import.meta.dirname, ".."),
          }),
          (await import("@replit/vite-plugin-dev-banner")).devBanner(),
        ]
      : []),
  ],

  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),

      // ✅ CRITICAL FIXES (workspace packages)
      "@workspace/api-client-react": path.resolve(
        import.meta.dirname,
        "../lib/api-client-react/src"
      ),
      "@workspace/db": path.resolve(
        import.meta.dirname,
        "../lib/db/src"
      ),
      "@workspace/api-zod": path.resolve(
        import.meta.dirname,
        "../lib/api-zod/src"
      ),
    },

    dedupe: ["react", "react-dom"],
  },

  root: path.resolve(import.meta.dirname),

  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
  },

  server: {
    port: 5173,
    host: "0.0.0.0",
  },

  preview: {
    port: 5173,
    host: "0.0.0.0",
  },
}));