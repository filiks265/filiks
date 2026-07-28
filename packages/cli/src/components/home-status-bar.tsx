import { TextAttributes } from "@opentui/core";
import { useTheme } from "../providers/theme";
import { getRelativeCwd } from "../lib/git";

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
