import { useCallback } from "react";
import { useNavigate } from "react-router";
import { Header } from "../components/header";
import { HomeStatusBar } from "../components/home-status-bar";
import { InputBar } from "../components/input-bar";
import { usePromptConfig } from "../providers/prompt-config";

export function Home() {
  const navigate = useNavigate();
  const { mode, model } = usePromptConfig();

  const handleSubmit = useCallback(
    (text: string) => {
      navigate("/sessions/new", { state: { message: text, mode, model } });
    },
    [navigate, mode, model],
  );

  return (
    <box flexDirection="column" width="100%" height="100%">
      <box flexGrow={1} />
      <box alignItems="center" flexDirection="column" gap={2}>
        <Header />
        <box width="100%" maxWidth={78} paddingX={2}>
          <InputBar onSubmit={handleSubmit} />
        </box>
      </box>
      <box flexGrow={1} />
      <box paddingX={2} paddingBottom={1} width="100%" flexShrink={0}>
        <HomeStatusBar />
      </box>
    </box>
  );
}
