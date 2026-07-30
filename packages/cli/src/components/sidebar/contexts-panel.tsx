import { TextAttributes } from "@opentui/core";
import { usePromptConfig } from "../../providers/prompt-config";
import { useTheme } from "../../providers/theme";
import { Panel } from "./panel";

export function ContextsPanel() {
  const { colors } = useTheme();
  const { mode, model } = usePromptConfig();

  return (
    <Panel title="Contexts">
      <box flexDirection="row" gap={1}>
        <text fg={colors.textMuted}>mode:</text>
        <text fg={mode === "PLAN" ? colors.planMode : colors.primary}>
          {mode}
        </text>
      </box>
      <box flexDirection="row" gap={1}>
        <text fg={colors.textMuted}>model:</text>
        <text>{model}</text>
      </box>
    </Panel>
  );
}
