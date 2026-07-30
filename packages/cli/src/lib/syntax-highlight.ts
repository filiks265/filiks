import {
  type BundledLanguage,
  type SpecialLanguage,
  type ThemedToken,
  codeToTokensBase,
} from "shiki";
import type { ThemeColors } from "../theme";

export type HighlightSegment = {
  text: string;
  color?: string;
  bold?: boolean;
  italic?: boolean;
};

function mapTokenColor(
  token: ThemedToken,
  colors: ThemeColors,
): string | undefined {
  if (token.type === 1) return colors.textMuted;
  if (token.type === 2) return colors.success;
  if (token.type === 3) return colors.thinking;
  if (token.color) {
    const hex = token.color.toLowerCase();
    if (
      hex.startsWith("#569cd6") ||
      hex.startsWith("#4fc1ff") ||
      hex.startsWith("#9cdcfe")
    )
      return colors.primary;
    if (
      hex.startsWith("#ce9178") ||
      hex.startsWith("#d16969") ||
      hex.startsWith("#c586c0")
    )
      return colors.planMode;
    if (hex.startsWith("#6a9955") || hex.startsWith("#499cd5"))
      return colors.textMuted;
    if (hex.startsWith("#dcdcaa") || hex.startsWith("#ffd700"))
      return colors.info;
    if (hex.startsWith("#b5cea8") || hex.startsWith("#4ec9b0"))
      return colors.success;
    if (hex.startsWith("#c586c0") || hex.startsWith("#646695"))
      return colors.thinking;
  }
  return undefined;
}

const LANG_ALIASES: Record<string, string> = {
  js: "javascript",
  ts: "typescript",
  py: "python",
  rb: "ruby",
  rs: "rust",
  go: "go",
  sh: "shellscript",
  bash: "shellscript",
  zsh: "shellscript",
  yml: "yaml",
  md: "markdown",
  diff: "diff",
};

const EXT_TO_LANG: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  py: "python",
  rb: "ruby",
  rs: "rust",
  go: "go",
  java: "java",
  kt: "kotlin",
  cs: "csharp",
  fs: "fsharp",
  swift: "swift",
  c: "c",
  h: "c",
  cpp: "cpp",
  hpp: "cpp",
  cc: "cpp",
  css: "css",
  scss: "scss",
  sass: "scss",
  less: "less",
  html: "html",
  htm: "html",
  xml: "xml",
  json: "json",
  yaml: "yaml",
  yml: "yaml",
  toml: "toml",
  md: "markdown",
  mdx: "markdown",
  sql: "sql",
  sh: "shellscript",
  bash: "shellscript",
  zsh: "shellscript",
  fish: "shellscript",
  ps1: "powershell",
  psd1: "powershell",
  psm1: "powershell",
  dockerfile: "dockerfile",
  tf: "terraform",
  dart: "dart",
  lua: "lua",
  r: "r",
  scala: "scala",
  pl: "perl",
  pm: "perl",
  php: "php",
  vue: "vue",
  svelte: "svelte",
  graphql: "graphql",
  gql: "graphql",
  proto: "protobuf",
  cmake: "cmake",
  makefile: "makefile",
  mk: "makefile",
};

export function langFromPath(path: string): string | undefined {
  const ext = path.split(".").pop()?.toLowerCase();
  if (ext && EXT_TO_LANG[ext]) return EXT_TO_LANG[ext];
  const base = path.split("/").pop()?.toLowerCase();
  if (base && EXT_TO_LANG[base]) return EXT_TO_LANG[base];
  return undefined;
}

export async function highlightCode(
  code: string,
  lang: string | undefined,
  colors: ThemeColors,
): Promise<HighlightSegment[][]> {
  const resolvedLang = lang ? (LANG_ALIASES[lang] ?? lang) : undefined;

  try {
    const tokens = await codeToTokensBase(code, {
      lang: (resolvedLang ?? "text") as BundledLanguage | SpecialLanguage,
      theme: "dark-plus",
    });

    return tokens.map((line) =>
      line.map((token) => ({
        text: token.content,
        color: mapTokenColor(token, colors),
      })),
    );
  } catch {
    return code.split("\n").map((line) => [{ text: line }]);
  }
}

export function parseCodeBlocks(
  text: string,
): Array<
  | { type: "text"; content: string }
  | { type: "code"; lang: string | undefined; code: string }
> {
  const blocks: Array<
    | { type: "text"; content: string }
    | { type: "code"; lang: string | undefined; code: string }
  > = [];
  const regex = /```(\w*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      blocks.push({
        type: "text",
        content: text.slice(lastIndex, match.index),
      });
    }
    blocks.push({ type: "code", lang: match[1] || undefined, code: match[2]! });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    blocks.push({ type: "text", content: text.slice(lastIndex) });
  }

  return blocks;
}
