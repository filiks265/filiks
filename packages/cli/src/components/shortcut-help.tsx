import { TextAttributes } from "@opentui/core";
import { useTheme } from "../providers/theme";

const SHORTCUTS = [
  { key: "Ctrl+B", description: "Toggle sidebar" },
  { key: "Tab", description: "Toggle Build/Plan mode" },
  { key: "/", description: "Open command menu" },
  { key: "Esc", description: "Close dialog / cancel" },
  { key: "Ctrl+C", description: "Clear input / exit" },
  { key: "?", description: "Show this help" },
];

export function ShortcutHelpContent() {
  const { colors } = useTheme();

  return (
    <box flexDirection="column" gap={1}>
      {SHORTCUTS.map(({ key, description }) => (
        <box key={key} flexDirection="row" gap={2}>
          <text width={10} attributes={TextAttributes.BOLD} fg={colors.primary}>
            {key}
          </text>
          <text fg={colors.textMuted}>{description}</text>
        </box>
      ))}
    </box>
  );
}
