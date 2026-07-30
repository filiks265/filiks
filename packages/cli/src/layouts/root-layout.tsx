import { Outlet } from "react-router";
import { VersionCheck } from "../components/version-check";
import { DialogProvider } from "../providers/dialog";
import { KeyboardLayerProvider } from "../providers/keyboard-layer";
import { PromptConfigProvider } from "../providers/prompt-config";
import { ThemeProvider } from "../providers/theme";
import { ToastProvider } from "../providers/toast";
import { ThemedRoot } from "./themed-root";

export function RootLayout() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <VersionCheck />
        <KeyboardLayerProvider>
          <DialogProvider>
            <PromptConfigProvider>
              <ThemedRoot>
                <Outlet />
              </ThemedRoot>
            </PromptConfigProvider>
          </DialogProvider>
        </KeyboardLayerProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
