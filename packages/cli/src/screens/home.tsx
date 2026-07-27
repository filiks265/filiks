import { useCallback } from "react";
import { useNavigate } from "react-router";
import { Header } from "../components/header";
import { InputBar } from "../components/input-bar";
import { usePromptConfig } from "../providers/prompt-config";
import { useTheme } from "../providers/theme";
import { useAuth } from "../hooks/use-auth";
import { TextAttributes } from "@opentui/core";

export function Home() {
  const navigate = useNavigate();
  const { mode, model } = usePromptConfig();
  const { colors } = useTheme();
  const { user } = useAuth();

  const handleSubmit = useCallback(
    (text: string) => {
      navigate("/sessions/new", { state: { message: text, mode, model } });
    },
    [navigate, mode, model],
  );

  return (
    <box
        alignItems="center"
        justifyContent="center"
        flexGrow={1}
        gap={2}
        position="relative"
        width="100%"
        height="100%"
    >
        <Header/>
        <box width="100%" maxWidth={78} paddingX={2} flexDirection="column" gap={1}>
            <InputBar onSubmit={handleSubmit} />
            <box flexDirection="row" gap={1} flexShrink={0} marginLeft="auto">
              <text>tab</text>
              <text attributes={TextAttributes.DIM}>agents</text>
            </box>
            <box flexDirection="row" gap={1} flexShrink={0} marginLeft="auto">
              <text attributes={TextAttributes.DIM} fg={colors.textMuted}>
                {user ? (user.name ?? user.email ?? "Signed in") : "Not signed in"}
              </text>
              <text attributes={TextAttributes.DIM} fg={colors.textMuted}>·</text>
              <text attributes={TextAttributes.DIM} fg={colors.textMuted}>{process.cwd()}</text>
            </box>
        </box>
    </box>
  );
};
