import { readFile } from 'fs/promises';
import {z} from "zod";
import { tool } from "ai";

export const Mode = {
  BUILD: "BUILD",
  PLAN: "PLAN",
} as const;

export const modeSchema = z.enum([Mode.BUILD, Mode.PLAN]);

export type ModeType = (typeof Mode) [keyof typeof Mode];

export const toolInputSchemas = {
  readFile: z.object({
    path: z.string().describe("Relative path to the file to read"),
  }),
  listDirectory: z.object({
    path: z.string().default(".").describe("Relative path to the directory to list"),
  }),
  glob: z.object({
    pattern: z.string().default(".").describe("Glob pattern to match files against"),
    path: z.string().default(".").describe("Relative path to the directory to search in"),
  }),
  grep: z.object({
    pattern: z.string().describe("Regex pattern to search for"),
    path: z.string().default(".").describe("Relative path to the directory to search in"),
    include: z.string().optional().describe("Glob pattern to filter files (e.g. 'x.ts', '*.tsx')"),
  }),
  writeFile: z.object({
    path: z.string().describe("Relative path to the file to write"),
    content: z.string().describe("The full content to write to the file"),
  }),
  editFile: z.object({
    path: z.string().describe("Relative path to the file to edit"),
    oldString: z
      .string()
      .describe("The exact text to find and replace (must be unique in the file)"),
      newString: z.string().describe("The text to replace the oldString with"),
  }),
  bash: z.object({
    command: z.string().describe("The Shell command to run"),
    description: z.string().optional().describe("A description of what the command does"),
    timeout: z.number().optional().default(30000).describe("The timeout in milliseconds"),
  }),
} as const;

export const readOnlyToolContracts = {
  readFile: tool({
    description: "Read a file from the current project directory.",
    inputSchema: toolInputSchemas.readFile,
  }),

  listDirectory: tool({
    description: "List files and directories in a project directory.",
    inputSchema: toolInputSchemas.listDirectory,
  }),

  glob: tool({
    description: "Find files matching a glob pattern under the project directory.",
    inputSchema: toolInputSchemas.glob,
  }),

  grep: tool({
    description: "Search file contents for a regex pattern.",
    inputSchema: toolInputSchemas.grep,
  }),
} as const;

export const buildToolContracts = {
  ...readOnlyToolContracts,
  writeFile: tool({
    description: "Create or overwrite a file under the current project directory.",
    inputSchema: toolInputSchemas.writeFile,
  }),
  editFile: tool({
    description: "Replace exact text in a file under the current project directory.",
    inputSchema: toolInputSchemas.editFile,
  }),
  bash: tool({
    description: "Execute a shell command in the current project directory.",
    inputSchema: toolInputSchemas.bash,
  }),

} as const;

export type ToolContracts = typeof buildToolContracts;

export function getToolContracts(mode: ModeType) {
  return mode === Mode.PLAN ? readOnlyToolContracts : buildToolContracts;
};

