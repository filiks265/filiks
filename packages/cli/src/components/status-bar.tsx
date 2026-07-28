import { TextAttributes } from "@opentui/core";
import { useTheme } from "../providers/theme";
import { usePromptConfig } from "../providers/prompt-config";
import { useAuth } from "../hooks/use-auth";
import { Mode } from "@filiks/shared";

export function StatusBar() {
    const {mode, model} = usePromptConfig();
    const {colors} = useTheme();
    const {user} = useAuth();
    const userName = user?.name ?? user?.email;
    return (
        <box flexDirection="row" gap={1}>
            <text fg={mode === Mode.PLAN ? colors.planMode : colors.primary}>
                {mode === Mode.PLAN ? "Plan" : "Build"}
            </text>
            <text attributes={TextAttributes.DIM} fg={colors.dimSeparator}>›</text>
            <text>{model}</text>
            <text flexGrow={1} />
            {userName && <text attributes={TextAttributes.DIM} fg={colors.textMuted}>{userName}</text>}
        </box>
    );
}

