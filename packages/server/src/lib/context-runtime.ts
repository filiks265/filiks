import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ModeType } from "@filiks/shared";
import type { UIMessage } from "ai";

const RULES_FILE_NAMES = ["AGENTS.md", "CLAUDE.md", ".filiks/rules.mdc"];
const CHARS_PER_TOKEN = 4;
const DEFAULT_MAX_CONTEXT_TOKENS = 64_000;
const TOOL_CALL_RESERVE = 4_000;

export type ContextConfig = {
  maxTokens?: number;
};

export class ContextRuntime {
  private maxTokens: number;

  constructor(config?: ContextConfig) {
    this.maxTokens =
      (config?.maxTokens ?? DEFAULT_MAX_CONTEXT_TOKENS) - TOOL_CALL_RESERVE;
  }

  async loadProjectRules(cwd: string): Promise<string> {
    const parts: string[] = [];

    for (const fileName of RULES_FILE_NAMES) {
      for (const dir of [cwd, join(cwd, ".filiks")]) {
        const fullPath = join(dir, fileName);
        if (existsSync(fullPath)) {
          try {
            const content = await readFile(fullPath, "utf8");
            const trimmed = content.trim();
            if (trimmed) {
              parts.push(
                `<project-rule file="${fileName}">\n${trimmed}\n</project-rule>`,
              );
            }
          } catch {
            // skip unreadable files
          }
        }
      }
    }

    return parts.join("\n\n");
  }

  estimateTokenCount(text: string): number {
    return Math.ceil(text.length / CHARS_PER_TOKEN);
  }

  trimMessages<T extends { id: string }>(
    messages: T[],
    systemPrompt: string,
    projectRules: string,
    toolDescriptions: string,
  ): { messages: T[]; trimmed: number } {
    const fixedOverhead =
      this.estimateTokenCount(systemPrompt) +
      this.estimateTokenCount(projectRules) +
      this.estimateTokenCount(toolDescriptions);

    let available = this.maxTokens - fixedOverhead - 1_000;
    if (available <= 0) {
      return {
        messages: messages.slice(-5),
        trimmed: Math.max(0, messages.length - 5),
      };
    }

    const kept: T[] = [];
    let trimmed = 0;

    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i]!;
      const cost = this.estimateTokenCount(JSON.stringify(msg));
      if (cost <= available) {
        kept.unshift(msg);
        available -= cost;
      } else {
        trimmed++;
      }
    }

    return { messages: kept, trimmed };
  }

  buildSystemPrompt(base: string, projectRules: string): string {
    if (!projectRules) return base;
    return `${base}\n\n## Project Rules\n\n${projectRules}`;
  }
}
