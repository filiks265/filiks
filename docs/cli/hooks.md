# useChat Hook

The `useChat` hook is the core state machine for the chat experience, built on `@ai-sdk/react`'s `useChat` and `DefaultChatTransport`.

## Signature

```ts
function useChat(sessionId: string, initialMessages: Message[]): UseChatReturn
```

## Returns

| Property | Type | Description |
|---|---|---|
| `messages` | `Message[]` | All messages (loaded + streaming-in-progress) |
| `status` | `"idle" \| "submitted" \| "streaming" \| "error"` | Current stream status |
| `error` | `Error \| null` | Connection or runtime error |
| `submit` | `(params: { userText, mode, model }) => Promise<void>` | Submit a user message |
| `abort` | `() => void` | Stop the stream (alias for `stop`) |
| `interrupt` | `() => void` | Same as `abort` |

## Types

```ts
type Message = UIMessage<
  ChatMessageMetadata,
  never,
  ChatTools
>

type ChatMessageMetadata = {
  mode?: ModeType;
  model?: SupportedChatModelId | string;
  durationMs?: number;
  usage?: LanguageModelUsage;
};

type ChatTools = {
  [Name in keyof InferUITools<ToolContracts>]: {
    input: InferUITools<ToolContracts>[Name]["input"];
    output: unknown;
  };
};
```

## Architecture

```
useChat(sessionId, initialMessages)
  │
  ├── DefaultChatTransport
  │     └── Translates UI messages → POST /chat request body
  │
  ├── @ai-sdk/react useChat()
  │     ├── Streams SSE from server via transport
  │     ├── Manages message state
  │     └── Calls onToolCall when model requests a tool
  │
  └── ToolRuntime (singleton via useRef)
        ├── ToolAdapter (LocalToolAdapter) — executes tools
        ├── PermissionPolicy (ModePermissionPolicy) — PLAN vs BUILD gating
        └── AuditLog — records every tool call
```

## Tool Execution Flow

When the model requests a tool:

1. `onToolCall` fires in `@ai-sdk/react`'s `useChat`
2. `ToolRuntime.execute(toolName, input, mode)` is called
3. `ModePermissionPolicy` checks if the tool is allowed in the current mode
4. `LocalToolAdapter` executes the tool (read file, bash, etc.)
5. Result is returned as a normalized `ToolResult` object
6. On success: `chat.addToolOutput({ output: result.data })`
7. On permission deny or execution error: `chat.addToolOutput({ state: "output-error", errorText })`
8. The assistant message auto-sends when `lastAssistantMessageIsCompleteWithToolCalls`

## Design Decisions

- **`ToolRuntime` in a ref**: Singleton per component mount. Avoids re-creating the adapter and policy on every render.
- **`DefaultChatTransport`**: Handles POST requests with auth headers. Translates message arrays into the server's expected format.
- **`prepareSendMessagesRequest`**: Extracts mode/model from message metadata to include in every request body.
- **Normalized tool results**: All tool responses use `ToolResult` shape (`{ success, data?, error?, truncated?, meta? }`) instead of ad-hoc per-tool shapes.
- **Error recovery**: Connection errors get a friendly message with the server URL. Tool errors go to the model as structured output rather than crashing.

## SSE Handling

The `@ai-sdk/react` `useChat` hook handles SSE parsing internally via `DefaultChatTransport`. The server emits events via `streamText().toUIMessageStreamResponse()`.

Previously, the hook used `eventsource-parser` with a manual state machine. The current implementation delegates SSE parsing to the AI SDK.
