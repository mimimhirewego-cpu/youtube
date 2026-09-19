// Builds the ALL-IN-ONE Appwrite function: the entire site (single-file HTML
// with the player, JS and CSS inlined) plus the YouTube data API, bundled
// into one dependency-free ESM file. One upload = the whole web app.
//
//   npm run build:function  →  appwrite/function/  (+ appwrite-function.tar.gz)
import { build } from "esbuild";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { build as viteBuild } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { execSync } from "node:child_process";

// repo root (this script lives in <root>/script)
const ROOT = path.resolve(import.meta.dirname, "..");

async function main() {
  // 1. Single-file client build — saves go to localStorage (no server state).
  console.log("building single-file client...");
  await viteBuild({
    plugins: [react(), viteSingleFile()],
    resolve: {
      alias: {
        "@": path.resolve(ROOT, "client", "src"),
        "@shared": path.resolve(ROOT, "shared"),
        "@assets": path.resolve(ROOT, "attached_assets"),
      },
    },
    root: path.resolve(ROOT, "client"),
    base: "./",
    build: {
      outDir: path.resolve(ROOT, "dist", "single"),
      emptyOutDir: true,
    },
    define: {
      "import.meta.env.VITE_SAVE_MODE": '"local"',
    },
  });

  const html = await readFile("dist/single/index.html", "utf8");
  console.log(`single-file site: ${(html.length / 1024).toFixed(0)} KB`);

  // 2. Bundle the function with the site embedded.
  await mkdir("appwrite/function/src", { recursive: true });
  await build({
    entryPoints: ["appwrite/main.ts"],
    platform: "node",
    target: "node20",
    bundle: true,
    format: "esm",
    outfile: "appwrite/function/src/main.js",
    define: {
      __SITE_HTML__: JSON.stringify(html),
    },
    minify: true,
    logLevel: "info",
  });
  await writeFile(
    "appwrite/function/package.json",
    JSON.stringify(
      { name: "vidvault", version: "1.0.0", type: "module", main: "src/main.js" },
      null,
      2,
    ) + "\n",
  );

  // 3. Ready-to-upload archive for the Appwrite console.
  execSync("tar -czf appwrite-function.tar.gz -C appwrite/function .", {
    stdio: "inherit",
  });
  console.log("appwrite function bundled → appwrite/function/ + appwrite-function.tar.gz");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
