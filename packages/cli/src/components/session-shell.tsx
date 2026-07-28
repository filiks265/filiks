import { useEffect, useState, type ReactNode } from "react";
import { TextAttributes } from "@opentui/core";
import { InputBar } from "./input-bar";
import { Spinner } from "./spinner";
import { Sidebar } from "./sidebar";
import { usePromptConfig } from "../providers/prompt-config";
import { useTheme } from "../providers/theme";
import { getGitInfo, getRelativeCwd } from "../lib/git";
import type { ClientMessagePart } from "../hooks/use-chat";

type SessionInfo = {
  title: string;
  createdAt: string;
  cwd: string | null;
};

type Props = {
  children?: ReactNode;
  onSubmit: (text: string) => void;
  inputDisabled?: boolean;
  loading?: boolean;
  interruptible?: boolean;
  parts?: ClientMessagePart[];
  session?: SessionInfo | null;
};

export function SessionShell({
  children,
  onSubmit,
  inputDisabled = false,
  loading = false,
  interruptible = false,
  parts = [],
  session,
}: Props) {

  const {mode} = usePromptConfig();
  const {colors} = useTheme();

  const [gitInfo, setGitInfo] = useState<{ branch: string | null; dirty: boolean }>({ branch: null, dirty: false });

  useEffect(() => {
    setGitInfo(getGitInfo());
  }, []);

  const relativeCwd = getRelativeCwd();
  const gitDisplay = gitInfo.branch
    ? `${relativeCwd}:${gitInfo.branch}${gitInfo.dirty ? "*" : ""}`
    : relativeCwd;

  return (
    <box
      flexDirection="row"
      flexGrow={1}
      width="100%"
      height="100%"
    >
      <box
        flexDirection="column"
        flexGrow={1}
        width="100%"
        height="100%"
        paddingY={1}
        paddingX={2}
        gap={1}
      >
        <scrollbox flexGrow={1} width="100%" stickyScroll stickyStart="bottom">
          <box>{children}</box>
        </scrollbox>
        <box flexShrink={0}>
          <InputBar onSubmit={onSubmit} disabled={inputDisabled} />
          <box
            flexShrink={0}
            flexDirection="row"
            justifyContent="space-between"
            width="100%"
            height={1}
            gap={2}
            paddingLeft={1}
          >
            <box flexDirection="row" alignItems="center" gap={2}>
              {loading ? (
                <>
                  <Spinner mode={mode} />
                  {interruptible ? <text>esc to interrupt</text> : null}
                </>
              ) : null}
            </box>
            <box flexDirection="row" gap={1} flexShrink={0} marginLeft="auto">
              <text>ctrl+b</text>
              <text attributes={TextAttributes.DIM}>board</text>
              <text>tab</text>
              <text attributes={TextAttributes.DIM}>switch mode</text>
            </box>
          </box>
          <box flexDirection="row" flexShrink={0} width="100%" height={1} paddingLeft={1}>
            <text attributes={TextAttributes.DIM} fg={colors.textMuted}>
              {gitDisplay}
            </text>
          </box>
        </box>
      </box>
      {session && <Sidebar session={session} parts={parts} streaming={loading} />}
    </box>
  );
}
