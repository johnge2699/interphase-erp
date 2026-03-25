import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";
import { rm } from "node:fs/promises";

// Enable require in ESM
globalThis.require = createRequire(import.meta.url);

const artifactDir = path.dirname(fileURLToPath(import.meta.url));

async function buildAll() {
  const distDir = path.resolve(artifactDir, "dist");

  // Clean dist folder
  await rm(distDir, { recursive: true, force: true });

  await esbuild({
    entryPoints: [path.resolve(artifactDir, "src/index.ts")],
    platform: "node",
    bundle: true,
    format: "esm",
    outdir: distDir,
    outExtension: { ".js": ".mjs" },
    sourcemap: "linked",
    logLevel: "info",

    // ✅ FIX: resolve monorepo packages manually
    alias: {
      "@workspace/db": path.resolve(artifactDir, "../lib/db/src"),
      "@workspace/db/schema": path.resolve(artifactDir, "../lib/db/src/schema"),
      "@workspace/api-zod": path.resolve(artifactDir, "../lib/api-zod/src")
    },

    // Only externalize native/runtime deps
    external: [
      "*.node",
      "pino-pretty",
      "thread-stream"
    ],

    // Fix CJS compatibility inside ESM bundle
    banner: {
      js: `
import { createRequire as __bannerCrReq } from 'node:module';
import __bannerPath from 'node:path';
import __bannerUrl from 'node:url';

globalThis.require = __bannerCrReq(import.meta.url);
globalThis.__filename = __bannerUrl.fileURLToPath(import.meta.url);
globalThis.__dirname = __bannerPath.dirname(globalThis.__filename);
      `,
    },
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});