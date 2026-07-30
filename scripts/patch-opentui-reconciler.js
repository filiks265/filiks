import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const rootDir = process.cwd();
const bunCacheDir = join(rootDir, "node_modules", ".bun");

if (!existsSync(bunCacheDir)) {
  console.error("node_modules/.bun not found. Run bun install first.");
  process.exit(1);
}

function findReconcilerFile() {
  const entries = readdirSync(bunCacheDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.startsWith("@opentui+react@"))
      continue;
    const pkgDir = join(
      bunCacheDir,
      entry.name,
      "node_modules",
      "@opentui",
      "react",
    );
    if (!existsSync(pkgDir)) continue;
    for (const file of readdirSync(pkgDir)) {
      if (!file.startsWith("chunk-") || !file.endsWith(".js")) continue;
      const fp = join(pkgDir, file);
      const c = readFileSync(fp, "utf-8");
      if (
        c.includes(
          "createTextInstance(text, rootContainerInstance, hostContext)",
        )
      )
        return fp;
    }
  }
  return null;
}

const targetFile = findReconcilerFile();
if (!targetFile || !existsSync(targetFile)) {
  console.error("Could not find opentui reconciler chunk file");
  process.exit(1);
}

const content = readFileSync(targetFile, "utf-8");

if (content.includes("[filiks-patch]")) {
  console.log("Already patched:", targetFile);
  process.exit(0);
}

const patched = content;

const textInstanceBlock = `    if (!hostContext.isInsideText) {
      throw new Error("Text must be created inside of a text node");
    }
    return TextNodeRenderable2.fromString(text);`;

const textInstanceReplacement = `    if (!hostContext.isInsideText) {
      console.warn("[filiks-patch] Bare text outside <text> context:", JSON.stringify(text).slice(0, 200));
    }
    return TextNodeRenderable2.fromString(text);`;

const instanceBlock = `    if (textNodeKeys.includes(type) && !hostContext.isInsideText) {
      throw new Error(\`Component of type "\${type}" must be created inside of a text node\`);
    }`;

const instanceReplacement = `    if (textNodeKeys.includes(type) && !hostContext.isInsideText) {
      console.warn(\`[filiks-patch] Component "\${type}" outside <text> context\`);
    }`;

const unknownTypeBlock = `    if (!components[type]) {
      throw new Error(\`Unknown component type: \${type}\`);
    }`;

const unknownTypeReplacement = `    if (!components[type]) {
      console.warn(\`[filiks-patch] Unknown component type: \${type}\`);
      return new BoxRenderable(rootContainerInstance.ctx, { id, children: [] });
    }`;

const replaced1 = patched.replace(textInstanceBlock, textInstanceReplacement);
const replaced2 = replaced1.replace(instanceBlock, instanceReplacement);
const replaced3 = replaced2.replace(unknownTypeBlock, unknownTypeReplacement);

if (replaced3 === content) {
  console.error("No patches applied — patterns not found");
  process.exit(1);
}

writeFileSync(targetFile, replaced3, "utf-8");
console.log("Patched:", targetFile);
