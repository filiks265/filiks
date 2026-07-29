import prettyMs from "pretty-ms";
import { Mode, type ModeType } from "@filiks/shared";
import type { Message } from "../../hooks/use-chat";
import { useTheme } from "../../providers/theme";
import { EmptyBorder } from "../border";
import { TextAttributes } from "@opentui/core";
import {
  parseCodeBlocks,
  highlightCode,
  langFromPath,
  type HighlightSegment,
} from "../../lib/syntax-highlight";
import { useState, useEffect, useRef } from "react";

type ClientMessagePart = Message["parts"][number];
type ToolPart = Extract<
  ClientMessagePart,
  { type: `tool-${string}` | "dynamic-tool" }
>;

type Props = {
  parts: ClientMessagePart[];
  model: string;
  mode: ModeType;
  durationMs?: number;
  streaming?: boolean;
};

function formatToolName(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase());
}

function isToolPart(part: ClientMessagePart): part is ToolPart {
  return part.type === "dynamic-tool" || part.type.startsWith("tool-");
}

// readFile => Read File
// grep => Grep
// createFile => Create File

function formatToolArgs(tc: ToolPart): string {
  if (!("input" in tc) || tc.input == null) return "";
  if (typeof tc.input !== "object") return String(tc.input);
  return Object.values(tc.input).map(String).join("");
}

// const CODE_TOOLS = new Set([
//   "createFile",
//   "writeFile",
//   "editFile",
//   "overwriteFile",
// ]);

// function getCodeFromToolCall(
//   tc: ClientToolCallPart,
// ): { code: string; lang?: string; label: string } | null {
//   if (!CODE_TOOLS.has(tc.name)) return null;
//   const args = tc.args as Record<string, string | undefined>;
//   const path = args.path;
//   const lang = path ? langFromPath(path) : undefined;
//   const content = args.content ?? args.newString;
//   if (!content || content.length < 3) return null;
//   return { code: content, lang, label: path ?? tc.name };
// }

// function getCodeLabel(tc: ClientToolCallPart): string | undefined {
//   const args = tc.args as Record<string, string | undefined>;
//   return args.path;
// }

type PartGroup = {
  type: ClientMessagePart["type"];
  parts: ClientMessagePart[];
  key: string;
};

function groupConsecutiveParts(parts: ClientMessagePart[]): PartGroup[] {
  const groups: PartGroup[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]!;
    const lastGroup = groups[groups.length - 1];

    if (lastGroup && lastGroup.type === part.type) {
      lastGroup.parts.push(part);
    } else {
      const key = isToolPart(part)
        ? `group-tc-${part.toolCallId}`
        : `group-${part.type}-${i}`;
      groups.push({ type: part.type, parts: [part], key });
    }
  }

  return groups;
}

function CodeBlock({
  code,
  lang,
  colors,
}: {
  code: string;
  lang?: string;
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  const [segments, setSegments] = useState<HighlightSegment[][] | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    highlightCode(code, lang, colors).then((result) => {
      if (mounted.current) setSegments(result);
    });
    return () => {
      mounted.current = false;
    };
  }, [code, lang, colors]);

  const resolvedLines =
    segments ?? code.split("\n").map((l) => [{ text: l } as HighlightSegment]);

  return (
    <box
      border={["left"]}
      borderColor={colors.thinkingBorder}
      customBorderChars={{ ...EmptyBorder, vertical: "|" }}
      width="100%"
      paddingX={2}
      flexDirection="column"
    >
      {lang && (
        <text fg={colors.textMuted} attributes={TextAttributes.DIM}>
          {lang}
        </text>
      )}
      {resolvedLines.map((line, i) => (
        <text key={i}>
          {line.map((seg, j) => (
            <text key={j} fg={seg.color}>{seg.text}</text>
          ))}
        </text>
      ))}
    </box>
  );
}

export function BotMessage({
  parts,
  model,
  mode,
  durationMs,
  streaming = false,
}: Props) {
  const { colors } = useTheme();

  return (
    <box width="100%" alignItems="center">
      {groupConsecutiveParts(parts).map((group, i) => (
        <box key={group.key} width="100%" paddingTop={i === 0 ? 0 : 1}>
          {group.parts.map((part, j) => {
            if (part.type === "reasoning") {
              return (
                <box
                  key={`reasoning-${j}`}
                  border={["left"]}
                  borderColor={colors.thinkingBorder}
                  customBorderChars={{
                    ...EmptyBorder,
                    vertical: " | ",
                  }}
                  width="100%"
                  paddingX={2}
                >
                  <text attributes={TextAttributes.DIM} fg={colors.textMuted}>
                    <em fg={colors.thinking}>Thinking</em> {part.text}
                  </text>
                </box>
              );
            }
            if (isToolPart(part)) {
              const toolName = 
                part.type === "dynamic-tool" ? part.toolName : part.type.slice("tool-".length);
              return (
                <box
                  key={part.toolCallId}
                  border={["left"]}
                  borderColor={colors.thinkingBorder}
                  customBorderChars={{
                    ...EmptyBorder,
                    vertical: "|",
                  }}
                  width="100%"
                  paddingX={2}
                  flexDirection="column"
                >
                  <text attributes={TextAttributes.DIM}>
                    <em fg={colors.info}>{formatToolName(toolName)}:</em>
                    {formatToolArgs(part)}
                    {part.state !== "output-available" && part.state !== "output-error"
                      ? " ..."
                      : ""}
                    {part.state === "output-error" ? `: ${part.errorText}` : ""}
                  </text>
                </box>
              );
            }

            if (part.type === "text") {
              const blocks = parseCodeBlocks(part.text);
              return (
                <box
                  key={`text-${j}`}
                  paddingX={3}
                  width="100%"
                  flexDirection="column"
                >
                  {blocks.map((block, k) =>
                    block.type === "code" ? (
                      <CodeBlock
                        key={`cb-${k}`}
                        code={block.code}
                        lang={block.lang}
                        colors={colors}
                      />
                    ) : (
                      <text key={`t-${k}`}>{block.content}</text>
                    ),
                  )}
                </box>
              );
            }
            return null;
          })}
        </box>
      ))}
      <box paddingX={3} paddingY={1} gap={1} width="100%">
        <box flexDirection="row" gap={2}>
          

          <text fg={mode === Mode.PLAN ? colors.planMode : colors.primary}>◉
</text>
          <box flexDirection="row" gap={1}>
            <text >
              {mode === Mode.PLAN ? "Plan" : "Build"}
            </text>
            <text attributes={TextAttributes.DIM} fg={colors.dimSeparator}>
              ›
            </text>
            <text attributes={TextAttributes.DIM}>{model}</text>
            {(durationMs != null) && (
              <>
                <text attributes={TextAttributes.DIM} fg={colors.dimSeparator}>
                  ›
                </text>
                <text attributes={TextAttributes.DIM}>
                  {prettyMs(durationMs)}
                </text>
              </>
            )}
          </box>
        </box>
      </box>
    </box>
  );
}
