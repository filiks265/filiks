import { execSync } from "child_process";
import { homedir } from "os";

export function getGitInfo(): { branch: string | null; dirty: boolean } {
  try {
    const branch = execSync("git rev-parse --abbrev-ref HEAD", {
      encoding: "utf-8",
    }).trim();
    if (!branch) return { branch: null, dirty: false };
    const status = execSync("git status --porcelain", {
      encoding: "utf-8",
    });
    return { branch, dirty: status.trim().length > 0 };
  } catch {
    return { branch: null, dirty: false };
  }
}

export function getRelativeCwd(): string {
  const cwd = process.cwd();
  const home = homedir();
  return cwd.startsWith(home) ? `~${cwd.slice(home.length)}` : cwd;
}
