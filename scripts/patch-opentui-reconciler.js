import { readFileSync, writeFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";

const rootDir = process.cwd();
const bunCacheDir = join(rootDir, "node_modules", ".bun");

if (!existsSync(bunCacheDir)) {
  console.error("node_modules/.bun not found. Run bun install first.");
  process.exit(1);
}

const entries = readdirSync(bunCacheDir, { withFileTypes: true });
let targetFile = null;

for (const entry of entries) {
  if (entry.isDirectory() && entry.name.startsWith("@opentui+react@")) {
    const pkgDir = join(
      bunCacheDir,
      entry.name,
      "node_modules",
      "@opentui",
      "react",
    );
    if (!existsSync(pkgDir)) continue;
    for (const file of readdirSync(pkgDir)) {
      if (file.startsWith("chunk-") && file.endsWith(".js")) {
        const maybe = join(pkgDir, file);
        const c = readFileSync(maybe, "utf-8");
        if (c.includes("Text must be created inside of a text node")) {
          targetFile = maybe;
          break;
        }
      }
    }
    if (targetFile) break;
  }
}

if (!targetFile || !existsSync(targetFile)) {
  console.error("Could not find opentui react chunk file in node_modules/.bun");
  // Fallback: search node_modules/@opentui/react
  const fallback = join(rootDir, "node_modules", "@opentui", "react");
  if (existsSync(fallback)) {
    for (const file of readdirSync(fallback)) {
      if (file.startsWith("chunk-") && file.endsWith(".js")) {
        targetFile = join(fallback, file);
        break;
      }
    }
  }
}

if (!targetFile || !existsSync(targetFile)) {
  console.error("Could not find opentui react chunk file anywhere");
  process.exit(1);
}

const content = readFileSync(targetFile, "utf-8");
let patched = content;

patched = patched.replace(
  `throw new Error("Text must be created inside of a text node")`,
  `console.warn("[filiks-patch] Bare text outside <text> context:", JSON.stringify(text).slice(0, 200))`,
);

patched = patched.replace(
  `throw new Error(\`Component of type "\${type}" must be created inside of a text node\`)`,
  `console.warn(\`[filiks-patch] Component "\${type}" outside <text> context\`)`,
);

if (patched === content) {
  console.error("No patches applied - patterns not found in", targetFile);
  process.exit(1);
}

writeFileSync(targetFile, patched, "utf-8");
console.log(`Patched: ${targetFile}`);
