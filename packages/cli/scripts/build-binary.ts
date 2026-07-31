import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import path from "node:path";

const PROTECTED_DIRS = [
  path.join(homedir(), ".bun"),
  path.join(homedir(), ".local", "bin"),
  path.join(homedir(), ".filiks"),
  "/usr/bin",
  "/usr/local/bin",
  "/bin",
  "/sbin",
  "/usr/sbin",
  "/opt/lampp/bin",
];

// Compile-time defines injected into the binary. Value format: JS string
// literal, e.g. FILIKS_VERSION='"v0.2.16"'.
const DEFINE_ENV_VARS = [
  "FILIKS_VERSION",
  "FILIKS_CLERK_FRONTEND_API",
  "FILIKS_CLERK_OAUTH_CLIENT_ID",
] as const;

function toJsStringLiteral(value: string): string {
  return JSON.stringify(value);
}

const cliRoot = path.resolve(import.meta.dir, "..");
const outfileArg = process.argv[2];
const isWin = process.platform === "win32";
let outfile = path.resolve(cliRoot, outfileArg ?? "dist/filiks");
if (isWin && !outfile.endsWith(".exe")) outfile += ".exe";

const protectedDir = PROTECTED_DIRS.find((dir) => {
  const absDir = path.resolve(dir);
  return outfile === absDir || outfile.startsWith(absDir + path.sep);
});

if (protectedDir) {
  console.error(
    `[build-binary] Refusing to write binary to protected directory: ${outfile}`,
  );
  console.error(
    `[build-binary] This would overwrite a system binary inside ${protectedDir}.`,
  );
  console.error(
    "[build-binary] Run with a safe output path, e.g. --outfile dist/filiks",
  );
  process.exit(1);
}

const defineFlags: string[] = [];
for (const name of DEFINE_ENV_VARS) {
  const value = process.env[name];
  if (value) {
    defineFlags.push("--define", `${name}=${toJsStringLiteral(value)}`);
  }
}

const bunBinary = process.env.BUN_BINARY ?? "bun";
const result = spawnSync(
  bunBinary,
  ["build", "--compile", ...defineFlags, "src/index.tsx", "--outfile", outfile],
  { cwd: cliRoot, stdio: "inherit" },
);

process.exit(result.status ?? 1);
