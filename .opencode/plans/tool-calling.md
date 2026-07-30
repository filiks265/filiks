# Spec: Tool Calling, Message Parts & System Prompt

## Status: IMPLEMENTED

All elements of this spec are now implemented:

| Feature | Status | Details |
|---------|--------|---------|
| SSE event schemas | ✅ DONE | text-delta, reasoning-delta, tool-call, done, error |
| Message.parts JSON field | ✅ DONE | Populated by `toUIMessageStreamResponse` |
| Tool definitions passed to streamText | ✅ DONE | `getToolContracts(mode)` → `streamText({ tools })` |
| Tool execution | ✅ DONE | Client-side via `onToolCall` → `ToolRuntime` |
| System prompt sent to model | ✅ DONE | `buildSystemPrompt({ mode })` |
| Parts saved to DB | ✅ DONE | Merged in `onFinish` callback |

## Current Implementation

### Tool Contracts (shared)

`packages/shared/src/schemas.ts` defines:
- 7 tools: `readFile`, `listDirectory`, `glob`, `grep`, `writeFile`, `editFile`, `bash`
- Two contract sets: `readOnlyToolContracts` (PLAN mode) and `buildToolContracts` (BUILD mode)
- Zod input schemas for every tool

### Tool Runtime (CLI)

`packages/cli/src/lib/tool-runtime.ts` provides:
- `ToolRuntime` class with adapter pattern, permission policy, and audit log
- `ModePermissionPolicy` — gating by mode (PLAN blocks writes)
- Normalized `ToolResult` return type

`packages/cli/src/lib/local-tools.ts` provides:
- `LocalToolAdapter` — executes tools locally via filesystem, grep, bash

### Chat Loop (server)

`packages/server/src/routes/chat.ts`:
- Accepts validated UI messages
- Merges with previous session messages
- Calls `streamText` with tools and system prompt
- Persists completed messages on finish

### Chat Hook (CLI)

`packages/cli/src/hooks/use-chat.ts`:
- Uses `@ai-sdk/react` `useChat` with `DefaultChatTransport`
- `onToolCall` handler delegating to `ToolRuntime`
- Auto-advances when `lastAssistantMessageIsCompleteWithToolCalls`

### System Prompt

`packages/server/src/system-prompt.ts`:
- BUILD mode: read, write, edit, bash tools
- PLAN mode: read-only tools only
- Instructions for decisive, batched tool usage
