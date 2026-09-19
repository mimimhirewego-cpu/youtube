// Bundles the Appwrite function (appwrite/main.ts) into a single
// dependency-free CommonJS file the Appwrite runtime can execute.
import { build } from "esbuild";
import { mkdir, writeFile } from "node:fs/promises";

async function main() {
  await mkdir("appwrite/function/src", { recursive: true });
  await build({
    entryPoints: ["appwrite/main.ts"],
    platform: "node",
    target: "node20",
    bundle: true,
    format: "esm",
    outfile: "appwrite/function/src/main.js",
    minify: true,
    logLevel: "info",
  });
  await writeFile(
    "appwrite/function/package.json",
    JSON.stringify(
      { name: "vidvault-api", version: "1.0.0", type: "module", "main": "src/main.js" },
      null,
      2,
    ) + "\n",
  );
  console.log("appwrite function bundled → appwrite/function/");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
