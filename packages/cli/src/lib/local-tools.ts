import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { toolInputSchemas } from "@filiks/shared";
import type { ToolAdapter, ToolResult } from "./tool-runtime";

const MAX_FILE_SIZE = 10_000;
const MAX_RESULTS = 200;
const MAX_MATCHES = 50;
const MAX_OUTPUT = 20_000;
const DEFAULT_TIMEOUT = 30_000;

function resolveInsideCwd(path: string) {
  const cwd = process.cwd();
  const resolved = resolve(cwd, path);
  const rel = relative(cwd, resolved);

  if (rel.startsWith("..") || isAbsolute(rel)) {
    throw new Error("Path is outside the project root");
  }

  return { cwd, resolved };
}

function truncate(value: string, limit: number) {
  return value.length > limit
    ? `${value.slice(0, limit)}\n... (truncated, ${value.length} total chars)`
    : value;
}

function tryParseJsonObject(input: string): unknown {
  try {
    return JSON.parse(input);
  } catch {
    return input;
  }
}

export class LocalToolAdapter implements ToolAdapter {
  async execute(toolName: string, input: unknown): Promise<ToolResult> {
    try {
      const parsedInput =
        typeof input === "string" ? tryParseJsonObject(input) : input;

      switch (toolName) {
        case "readFile":
          return await this.readFile(parsedInput);
        case "listDirectory":
          return await this.listDirectory(parsedInput);
        case "glob":
          return await this.glob(parsedInput);
        case "grep":
          return await this.grep(parsedInput);
        case "writeFile":
          return await this.writeFile(parsedInput);
        case "editFile":
          return await this.editFile(parsedInput);
        case "bash":
          return await this.bash(parsedInput);
        default:
          return { success: false, error: `Unknown tool: ${toolName}` };
      }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  private async readFile(input: unknown): Promise<ToolResult> {
    const { path } = toolInputSchemas.readFile.parse(input);
    const { resolved } = resolveInsideCwd(path);
    const content = await readFile(resolved, "utf8");

    if (content.length > MAX_FILE_SIZE) {
      return {
        success: true,
        data: {
          content: content.slice(0, MAX_FILE_SIZE),
          truncated: true,
          totalLength: content.length,
        },
      };
    }
    return { success: true, data: { content } };
  }

  private async listDirectory(input: unknown): Promise<ToolResult> {
    const { path } = toolInputSchemas.listDirectory.parse(input);
    const { cwd, resolved } = resolveInsideCwd(path);
    const entries = await readdir(resolved);
    const results: { name: string; type: "file" | "directory" }[] = [];

    for (const entry of entries) {
      if (entry.startsWith(".") || entry === "node_modules") continue;
      const info = await stat(join(resolved, entry));
      results.push({
        name: entry,
        type: info.isDirectory() ? "directory" : "file",
      });
    }

    results.sort((a, b) =>
      a.type !== b.type
        ? a.type === "directory"
          ? -1
          : 1
        : a.name.localeCompare(b.name),
    );

    return {
      success: true,
      data: { path: relative(cwd, resolved) || ".", entries: results },
    };
  }

  private async glob(input: unknown): Promise<ToolResult> {
    const { pattern, path } = toolInputSchemas.glob.parse(input);
    const { cwd, resolved } = resolveInsideCwd(path);
    const glob = new Bun.Glob(pattern);
    const files: string[] = [];
    let truncated = false;

    for await (const match of glob.scan({
      cwd: resolved,
      dot: false,
      onlyFiles: true,
    })) {
      if (match.includes("node_modules")) continue;
      if (files.length >= MAX_RESULTS) {
        truncated = true;
        break;
      }
      files.push(relative(cwd, resolve(resolved, match)));
    }

    files.sort();
    return {
      success: true,
      data: {
        files,
        ...(truncated ? { truncated: true } : {}),
      },
    };
  }

  private async grep(input: unknown): Promise<ToolResult> {
    const { pattern, path, include } = toolInputSchemas.grep.parse(input);
    const { cwd, resolved } = resolveInsideCwd(path);
    const args = [
      "-rn",
      "--color=never",
      "--exclude-dir=node_modules",
      "--exclude-dir=.git",
      "-E",
    ];
    if (include) args.push(`--include=${include}`);
    args.push(pattern, resolved);

    const proc = Bun.spawn(["grep", ...args], {
      cwd,
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);
    const exitCode = await proc.exited;

    if (exitCode !== 0 && exitCode !== 1) {
      return { success: false, error: `grep failed: ${stderr.trim()}` };
    }
    if (!stdout.trim()) {
      return {
        success: true,
        data: { matches: [], message: "No matches found" },
      };
    }

    const lines = stdout.trim().split("\n");
    const matches: { file: string; line: number; content: string }[] = [];
    let truncated = false;

    for (const line of lines) {
      if (matches.length >= MAX_MATCHES) {
        truncated = true;
        break;
      }
      const match = line.match(/^(.+?):(\d+):(.*)$/);
      if (match) {
        matches.push({
          file: relative(cwd, match[1]!),
          line: Number(match[2]),
          content: match[3]!,
        });
      }
    }

    return {
      success: true,
      data: {
        matches,
        ...(truncated ? { truncated: true, totalMatches: lines.length } : {}),
      },
    };
  }

  private async writeFile(input: unknown): Promise<ToolResult> {
    const { path, content } = toolInputSchemas.writeFile.parse(input);
    const { cwd, resolved } = resolveInsideCwd(path);
    await mkdir(dirname(resolved), { recursive: true });
    await writeFile(resolved, content, "utf8");
    return {
      success: true,
      data: {
        success: true,
        path: relative(cwd, resolved),
        bytesWritten: Buffer.byteLength(content, "utf8"),
      },
    };
  }

  private async editFile(input: unknown): Promise<ToolResult> {
    const { path, oldString, newString } =
      toolInputSchemas.editFile.parse(input);
    const { cwd, resolved } = resolveInsideCwd(path);
    const content = await readFile(resolved, "utf8");
    const occurrences = content.split(oldString).length - 1;

    if (occurrences === 0) {
      return { success: false, error: "oldString not found in file" };
    }
    if (occurrences > 1) {
      return {
        success: false,
        error: `oldString is ambiguous; found ${occurrences} matches`,
      };
    }

    await writeFile(resolved, content.replace(oldString, newString), "utf8");
    return {
      success: true,
      data: { success: true, path: relative(cwd, resolved) },
    };
  }

  private async bash(input: unknown): Promise<ToolResult> {
    const { command, timeout = DEFAULT_TIMEOUT } =
      toolInputSchemas.bash.parse(input);
    const proc = Bun.spawn(["bash", "-c", command], {
      cwd: resolveInsideCwd(".").resolved,
      stdout: "pipe",
      stderr: "pipe",
      env: { ...process.env, TERM: "dumb" },
    });
    const timer = setTimeout(() => proc.kill(), timeout);
    const [stdout, stderr] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);
    const exitCode = await proc.exited;
    clearTimeout(timer);

    return {
      success: true,
      data: {
        stdout: truncate(stdout, MAX_OUTPUT),
        stderr: truncate(stderr, MAX_OUTPUT),
        exitCode,
      },
    };
  }
}
