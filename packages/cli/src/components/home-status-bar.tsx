import { TextAttributes } from "@opentui/core";
import { getRelativeCwd } from "../lib/git";
import { useTheme } from "../providers/theme";

export function HomeStatusBar() {
  const { colors } = useTheme();

  return (
    <box flexDirection="row" gap={1}>
      <text>tab</text>
      <text attributes={TextAttributes.DIM}>agents</text>
      <text flexGrow={1} />
      <text attributes={TextAttributes.DIM} fg={colors.textMuted}>
        {getRelativeCwd()}
      </text>
    </box>
  );
}
