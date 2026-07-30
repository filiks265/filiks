import type { ModeType } from "@filiks/shared";

export type AgentCommand = {
  name: string;
  description: string;
  value: string;
};

export type AgentProfile = {
  id: string;
  name: string;
  description: string;
  mode: ModeType;
  systemPromptSuffix?: string;
  commands?: AgentCommand[];
};

const BUILT_IN_PROFILES: AgentProfile[] = [
  {
    id: "build",
    name: "Build",
    description: "Full implementation with read, write, edit, and bash tools",
    mode: "BUILD" as ModeType,
    systemPromptSuffix: `You have access to all seven tools: readFile, writeFile, editFile, listDirectory, glob, grep, and bash.
You may create, modify, or delete files as needed to complete the task.
Always verify your changes when possible.`,
    commands: [
      {
        name: "plan",
        description: "Switch to read-only analysis mode",
        value: "/plan",
      },
    ],
  },
  {
    id: "plan",
    name: "Plan",
    description: "Read-only analysis and planning — no file modifications",
    mode: "PLAN" as ModeType,
    systemPromptSuffix: `You have access to read-only tools: readFile, listDirectory, glob, grep.
You must NOT create, modify, or delete any files.
Focus on analysis, research, and proposing solutions.`,
    commands: [
      {
        name: "build",
        description: "Switch to implementation mode",
        value: "/build",
      },
    ],
  },
];

let customProfiles: AgentProfile[] = [];

export function loadCustomProfiles(): AgentProfile[] {
  return customProfiles;
}

export function setCustomProfiles(profiles: AgentProfile[]): void {
  customProfiles = profiles;
}

export function getAllProfiles(): AgentProfile[] {
  return [...BUILT_IN_PROFILES, ...customProfiles];
}

export function getProfileById(id: string): AgentProfile | undefined {
  return getAllProfiles().find((p) => p.id === id);
}

export function getProfilesForMode(mode: ModeType): AgentProfile[] {
  return getAllProfiles().filter((p) => p.mode === mode);
}

export function buildProfileSystemPrompt(profile: AgentProfile): string {
  return profile.systemPromptSuffix ?? "";
}

export async function loadProfileFromFile(
  cwd: string,
): Promise<AgentProfile | null> {
  try {
    const { readFile, existsSync } = await import("node:fs");
    const { join } = await import("node:path");
    const yamlPath = join(cwd, ".filiks", "profile.yaml");

    if (!existsSync(yamlPath)) return null;

    const content = (await import("node:fs/promises")).readFile(
      yamlPath,
      "utf8",
    );
    const text = await content;
    const parsed = parseSimpleYaml(text) as Record<string, unknown>;

    if (!parsed.mode) return null;

    const profile: AgentProfile = {
      id: String(parsed.id ?? "custom"),
      name: String(parsed.name ?? "Custom"),
      description: String(parsed.description ?? ""),
      mode: parsed.mode as ModeType,
      systemPromptSuffix: parsed.instructions as string | undefined,
      commands: parsed.commands
        ? (parsed.commands as Array<{
            name: string;
            description: string;
            value: string;
          }>)
        : undefined,
    };

    return profile;
  } catch {
    return null;
  }
}

function parseSimpleYaml(text: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  let currentKey: string | null = null;
  let currentList: unknown[] = [];

  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;

    const colonIndex = trimmed.indexOf(":");
    if (colonIndex === -1) continue;

    const key = trimmed.slice(0, colonIndex).trim();
    const rest = trimmed.slice(colonIndex + 1).trim();

    if (rest === "" || rest.startsWith("|")) {
      if (currentKey === "commands" && currentList.length > 0) {
        result[currentKey] = currentList;
        currentList = [];
      }
      currentKey = key;
      continue;
    }

    if (currentKey === null) {
      result[key] = rest;
    } else if (currentKey === "commands") {
      if (key === "-" && rest) {
        const parts = rest.split(/\s{2,}/);
        currentList.push({
          name: parts[0] ?? rest,
          description: parts[1] ?? "",
          value: `/${(parts[0] ?? rest).toLowerCase()}`,
        });
      }
    }
  }

  if (currentKey === "commands" && currentList.length > 0) {
    result[currentKey] = currentList;
  }

  return result;
}
