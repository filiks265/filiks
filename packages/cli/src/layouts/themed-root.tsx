import { useKeyboard } from "@opentui/react";
import type { ReactNode } from "react";
import { ShortcutHelpContent } from "../components/shortcut-help";
import { useDialog } from "../providers/dialog";
import { useKeyboardLayer } from "../providers/keyboard-layer";
import { useTheme } from "../providers/theme";

type Props = {
  children: ReactNode;
};

export function ThemedRoot({ children }: Props) {
  const { colors } = useTheme();
  const { isTopLayer } = useKeyboardLayer();
  const dialog = useDialog();

  useKeyboard((key) => {
    if (!isTopLayer("base")) return;
    if (key.ctrl && key.name === "/") {
      key.preventDefault();
      dialog.open({
        title: "Keyboard Shortcuts",
        children: <ShortcutHelpContent />,
      });
    }
  });

  return (
    <box
      backgroundColor={colors.background}
      width="100%"
      height="100%"
      flexGrow={1}
    >
      {children}
    </box>
  );
}
