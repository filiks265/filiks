import { platform, arch, tmpdir } from "os";
import { join, basename } from "path";
import {
  existsSync,
  renameSync,
  unlinkSync,
  chmodSync,
  writeFileSync,
  readFileSync,
  mkdirSync,
  readdirSync,
} from "fs";
import { execSync } from "child_process";

export const VERSION = "v0.2.5";

const REPO = "filiks265/filiks";

function getTarget(): string {
  const p = platform();
  const a = arch();
  if (p === "linux" && a === "x64") return "linux-x64";
  if (p === "darwin" && a === "arm64") return "darwin-arm64";
  if (p === "win32" && a === "x64") return "windows-x64";
  throw new Error(
    `Unsupported platform: ${p} ${a}. ` +
      `filiks builds are available for linux-x64, darwin-arm64, and windows-x64.`,
  );
}

function findFile(root: string, filename: string): string | null {
  const entries = readdirSync(root, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(root, entry.name);
    if (entry.isDirectory()) {
      const found = findFile(fullPath, filename);
      if (found) return found;
    } else if (entry.name === filename) {
      return fullPath;
    }
  }
  return null;
}

export async function update() {
  const target = getTarget();
  const binaryPath = process.execPath;
  const isWin = platform() === "win32";
  const binaryName = isWin ? "filiks.exe" : "filiks";

  console.log(`\n  Current version: ${VERSION}`);
  console.log(`  Checking for updates...`);

  const res = await fetch(
    `https://api.github.com/repos/${REPO}/releases/latest`,
    { headers: { Accept: "application/vnd.github.v3+json" } },
  );
  if (!res.ok)
    throw new Error(
      `Failed to check for updates (${res.status}). Check your internet connection.`,
    );

  const release: any = await res.json();
  const tag: string = release.tag_name;

  if (tag === VERSION) {
    console.log(`  You're up to date (${VERSION}).`);
    return;
  }

  const assetName = `filiks-${target}.tar.gz`;
  const asset = release.assets.find((a: any) => a.name === assetName);
  if (!asset) throw new Error(`${tag} has no build for ${target}.`);

  console.log(`  Downloading ${tag}...`);

  const tmpDir = tmpdir();
  const tarballPath = join(tmpDir, `filiks-${target}.tar.gz`);
  const tarballRes = await fetch(asset.browser_download_url);
  if (!tarballRes.ok)
    throw new Error(`Download failed (${tarballRes.status}).`);

  const buffer = Buffer.from(await tarballRes.arrayBuffer());
  writeFileSync(tarballPath, buffer);

  const extractDir = join(tmpDir, `filiks-extract-${Date.now()}`);
  mkdirSync(extractDir, { recursive: true });
  execSync(`tar -xzf "${tarballPath}" -C "${extractDir}"`, { stdio: "pipe" });

  const newBinaryPath = findFile(extractDir, binaryName);
  if (!newBinaryPath || !existsSync(newBinaryPath))
    throw new Error(`Extracted binary not found inside tarball.`);

  const backupPath = binaryPath + ".bak";
  if (existsSync(backupPath)) {
    try {
      unlinkSync(backupPath);
    } catch {}
  }

  try {
    renameSync(binaryPath, backupPath);
  } catch (err: any) {
    throw new Error(
      `Cannot update: unable to rename ${binaryPath}. ` +
        `Try running: curl -fsSL https://raw.githubusercontent.com/${REPO}/main/install.sh | sh`,
    );
  }

  const newData = readFileSync(newBinaryPath);
  writeFileSync(binaryPath, newData);

  if (!isWin) chmodSync(binaryPath, 0o755);

  try {
    execSync(`rm -rf "${extractDir}" "${tarballPath}"`);
  } catch {}

  if (!isWin) {
    try {
      unlinkSync(backupPath);
    } catch {}
  }

  console.log(`  Updated to ${tag}!`);
  if (isWin)
    console.log(`  Backup saved as ${basename(backupPath)} (deleted next startup).`);
  console.log(`  Restart filiks to use the new version.`);
}
