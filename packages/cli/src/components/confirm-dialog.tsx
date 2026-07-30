import { useKeyboard } from "@opentui/react";
import { useCallback } from "react";
import { useDialog } from "../providers/dialog";
import { useTheme } from "../providers/theme";

type ConfirmDialogProps = {
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
};

export function ConfirmDialog({
  message,
  confirmLabel = "Yes",
  onConfirm,
}: ConfirmDialogProps) {
  const { close } = useDialog();
  const { colors } = useTheme();

  const handleConfirm = useCallback(() => {
    onConfirm();
    close();
  }, [onConfirm, close]);

  useKeyboard((key) => {
    if (key.name === "return" || key.name === "enter") {
      key.preventDefault();
      handleConfirm();
    }
  });

  return (
    <box flexDirection="column" gap={1}>
      <text fg={colors.text}>{message}</text>
      <box flexDirection="row" gap={2} justifyContent="flex-end">
        <text fg={colors.textMuted}>Esc to cancel</text>
        <text fg={colors.primary} onMouseDown={handleConfirm}>
          Enter to {confirmLabel.toLowerCase()}
        </text>
      </box>
    </box>
  );
}
