import { useMemo, useRef } from "react";
import { useChat as useAiChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  type InferUITools,
  lastAssistantMessageIsCompleteWithToolCalls,
  type LanguageModelUsage,
  type UIMessage,
} from "ai";
import {
  type ModeType,
  type SupportedChatModelId,
  type ToolContracts,
} from "@filiks/shared";
import { apiClient } from "../lib/api-client";
import { getAuth } from "../lib/auth";
import { ToolRuntime, ModePermissionPolicy } from "../lib/tool-runtime";
import { LocalToolAdapter } from "../lib/local-tools";

export type ChatMessageMetadata = {
  mode?: ModeType;
  model?: SupportedChatModelId | string;
  profile?: string;
  durationMs?: number;
  usage?: LanguageModelUsage;
};

type ChatTools = {
  [Name in keyof InferUITools<ToolContracts>]: {
    input: InferUITools<ToolContracts>[Name]["input"];
    output: unknown;
  };
};

export type Message = UIMessage<ChatMessageMetadata, never, ChatTools>;
export type ClientMessagePart = Message["parts"][number];

export function useChat(sessionId: string, initialMessages: Message[]) {
  const transport = useMemo(() => {
    return new DefaultChatTransport({
      api: apiClient.chat.$url().toString(),
      headers() {
        const auth = getAuth();
        return auth ? { Authorization: `Bearer ${auth.token}` } : new Headers();
      },
      prepareSendMessagesRequest({ messages }) {
        const chatMessages = messages as Message[];
        const message = chatMessages[chatMessages.length - 1];
        if (!message) throw new Error("No message to send");

        const metadata = chatMessages.findLast(
          (m): m is Message & { metadata: ChatMessageMetadata } =>
            !!m.metadata?.mode && !!m.metadata?.model,
        )?.metadata;
        const previousMessage = chatMessages[chatMessages.length - 2];
        const requestMessages =
          message.role === "assistant" && previousMessage?.role === "user"
            ? [previousMessage, message]
            : [message];

        return {
          body: {
            id: sessionId,
            messages: requestMessages,
            mode: message.metadata?.mode ?? metadata?.mode,
            model: message.metadata?.model ?? metadata?.model,
            profile: message.metadata?.profile ?? metadata?.profile,
          },
        };
      },
    });
  }, [sessionId]);

  const apiUrlRef = useRef(apiClient.chat.$url().toString());
  const runtimeRef = useRef<ToolRuntime | null>(null);

  if (!runtimeRef.current) {
    runtimeRef.current = new ToolRuntime(
      new LocalToolAdapter(),
      new ModePermissionPolicy(),
    );
  }
  const runtime = runtimeRef.current;

  const chat = useAiChat({
    id: sessionId,
    messages: initialMessages,
    transport,
    onToolCall({ toolCall }) {
      const mode = chat.messages.at(-1)?.metadata?.mode ?? "BUILD";

      void runtime.execute(toolCall.toolName, toolCall.input, mode)
        .then((result) => {
          if (result.success) {
            chat.addToolOutput({
              tool: toolCall.toolName as keyof ChatTools,
              toolCallId: toolCall.toolCallId,
              output: result.data,
            });
          } else {
            chat.addToolOutput({
              tool: toolCall.toolName as keyof ChatTools,
              toolCallId: toolCall.toolCallId,
              state: "output-error",
              errorText: result.error ?? "Unknown error",
            });
          }
        });
    },
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });
  const error = chat.error
    ? (chat.error instanceof TypeError
        ? new Error(
            `Cannot reach the server at ${apiUrlRef.current}. ` +
            "Set API_URL in a .env file next to the binary (e.g., API_URL=https://your-server.com).",
          )
        : chat.error instanceof Error
          ? chat.error
          : new Error(String(chat.error)))
    : null;

  return {
    messages: chat.messages,
    status: chat.status,
    error,
    submit: (params: {
      userText: string;
      mode: ModeType;
      model: SupportedChatModelId;
      profile?: string;
    }) => {
      return chat.sendMessage({
        text: params.userText,
        metadata: {
          mode: params.mode,
          model: params.model,
          profile: params.profile,
        },
      });
    },
    abort: chat.stop,
    interrupt: chat.stop,
  };
}


// export default useChat;