import { TextAttributes } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import type { ClientMessagePart } from "../../hooks/use-chat";
import { apiClient } from "../../lib/api-client";
import { useKeyboardLayer } from "../../providers/keyboard-layer";
import { useTheme } from "../../providers/theme";
import { ContextsPanel } from "./contexts-panel";
import { LSPPanel } from "./lsp-panel";
import { MCPPanel } from "./mcp-panel";
import { Panel } from "./panel";
import { SessionInfoPanel } from "./session-info-panel";
import { TodoPanel } from "./todo-panel";

type SessionInfo = {
  title: string;
  createdAt: string;
  cwd: string | null;
};

type Props = {
  session: SessionInfo;
  parts: ClientMessagePart[];
  streaming: boolean;
};

const SIDEBAR_WIDTH = 48;

export function Sidebar({ session, parts, streaming }: Props) {
  const [visible, setVisible] = useState(true);
  const { isTopLayer } = useKeyboardLayer();
  const { colors } = useTheme();
  const navigate = useNavigate();

  const [recentSessions, setRecentSessions] = useState<
    { id: string; title: string; createdAt: string }[]
  >([]);

  useEffect(() => {
    let ignore = false;
    const fetchRecent = async () => {
      try {
        const res = await apiClient.sessions.$get();
        if (!res.ok || ignore) return;
        const data = await res.json();
        if (!ignore) setRecentSessions(data.slice(0, 3));
      } catch {
        // Silently fail for sidebar
      }
    };
    fetchRecent();
    return () => {
      ignore = true;
    };
  }, []);

  useKeyboard(
    useCallback(
      (key) => {
        if (!key.ctrl || key.name !== "b") return;
        if (!isTopLayer("base")) return;
        setVisible((v) => !v);
      },
      [isTopLayer],
    ),
  );

  if (!visible) return null;

  return (
    <box
      flexDirection="column"
      flexShrink={0}
      width={SIDEBAR_WIDTH}
      height="100%"
    >
      <box
        width="100%"
        flexGrow={1}
        flexDirection="column"
        gap={1}
        paddingX={1}
        paddingY={1}
        borderStyle="single"
        borderColor={colors.dimSeparator}
      >
        <SessionInfoPanel title={session.title} createdAt={session.createdAt} />
        {recentSessions.length > 0 && (
          <Panel title="Recent Sessions" defaultOpen={false}>
            {recentSessions.map((s) => (
              <text
                key={s.id}
                fg={colors.textMuted}
                onMouseDown={() => navigate(`/sessions/${s.id}`)}
              >
                {s.title.length > 30 ? `${s.title.slice(0, 30)}…` : s.title}
              </text>
            ))}
          </Panel>
        )}
        <ContextsPanel />
        <TodoPanel parts={parts} streaming={streaming} />
        <MCPPanel />
        <LSPPanel />
      </box>
      <box
        flexDirection="column"
        paddingX={1}
        paddingTop={1}
        paddingBottom={1}
        gap={0}
      >
        <text attributes={TextAttributes.DIM} fg={colors.dimSeparator}>
          {session.cwd ?? process.cwd()}
        </text>
        <text fg={colors.textMuted}>Filiks 1.0.0</text>
      </box>
    </box>
  );
}
