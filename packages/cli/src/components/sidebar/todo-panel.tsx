import { TextAttributes } from "@opentui/core";
import { getToolName, isToolUIPart } from "ai";
import type { ClientMessagePart } from "../../hooks/use-chat";
import { usePromptConfig } from "../../providers/prompt-config";
import { useTheme } from "../../providers/theme";
import { Panel } from "./panel";

type Props = {
  parts: ClientMessagePart[];
  streaming: boolean;
};

export function TodoPanel({ parts, streaming }: Props) {
  const { colors } = useTheme();
  const { mode } = usePromptConfig();
  const toolCalls = parts.filter(isToolUIPart);

  if (mode === "PLAN") return null;
  if (!streaming && toolCalls.length === 0) return null;

  return (
    <Panel title="ToDo" defaultOpen={streaming}>
      {toolCalls.length === 0 && streaming && (
        <text attributes={TextAttributes.DIM} fg={colors.textMuted}>
          waiting...
        </text>
      )}
      {toolCalls.map((tc) => (
        <box key={tc.toolCallId} flexDirection="row" gap={1}>
          <text
            fg={tc.state === "output-available" ? colors.success : colors.info}
          >
            {tc.state === "output-available" ? "✓" : "○"}
          </text>
          <text
            fg={
              tc.state === "output-available" ? colors.textMuted : colors.text
            }
          >
            {getToolName(tc)}
          </text>
        </box>
      ))}
    </Panel>
  );
}
