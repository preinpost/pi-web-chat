#!/usr/bin/env node
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const server = join(root, "dist", "index.js");

if (!existsSync(server)) {
  console.error("pi-web-chat: missing dist/index.js");
  console.error("  Dev:    npm run build && npm start");
  console.error("  Package consumers: reinstall/update the package (dist should be included).");
  process.exit(1);
}

await import(pathToFileURL(server).href);
