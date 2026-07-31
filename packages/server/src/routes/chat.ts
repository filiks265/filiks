import type { Prisma } from "@filiks/database";
import { db } from "@filiks/database/client";
import {
  FREE_MODEL_PRIORITY,
  type ModeType,
  type ToolContracts,
  getToolContracts,
  modeSchema,
} from "@filiks/shared";
import { zValidator } from "@hono/zod-validator";
import {
  type InferUITools,
  type LanguageModelUsage,
  type TextStreamPart,
  type UIMessage,
  UI_MESSAGE_STREAM_HEADERS,
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  validateUIMessages,
} from "ai";
import { Hono } from "hono";
import { z } from "zod";
import type { AuthenticatedEnv } from "../../middleware/require-auth";
import { ContextRuntime } from "../lib/context-runtime";
// import {requireCreditsBalance} from "../middleware/require-credits-balance";
// import {calculatedCreditsForUsage} from "../lib/credits";
import { isSupportedChatModel, resolveChatModel } from "../lib/models";
import { buildSystemPrompt } from "../system-prompt";

type ChatMessageMetadata = {
  mode?: ModeType;
  model?: string;
  profile?: string;
  durationMs?: number;
  usage?: LanguageModelUsage;
};

type FiliksUIMessage = UIMessage<
  ChatMessageMetadata,
  never,
  InferUITools<ToolContracts>
>;

const submitSchema = z.object({
  id: z.string(),
  messages: z
    .array(
      z.custom<FiliksUIMessage>((value) => {
        return (
          value != null &&
          typeof value === "object" &&
          "id" in value &&
          "parts" in value
        );
      }),
    )
    .min(1),
  mode: modeSchema,
  model: z.string().refine(isSupportedChatModel, "Unsupported model"),
  profile: z.string().optional(),
});

const submitValidator = zValidator("json", submitSchema, (result, c) => {
  if (!result.success) {
    return c.json({ error: "Invalid request" }, 400);
  }
});

function hasPendingToolCalls(message: FiliksUIMessage) {
  return message.parts.some((part) => {
    if (part.type === "dynamic-tool" || part.type.startsWith("tool-")) {
      const state = (part as { state?: string }).state;
      return state !== "output-available" && state !== "output-error";
    }

    return false;
  });
}

const app = new Hono<AuthenticatedEnv>().post(
  "/",
  // requireCreditBalance,
  submitValidator,
  async (c) => {
    const userId = c.get("userId");
    const { id, messages, mode, model, profile } = c.req.valid("json");

    const session = await db.session.findUnique({
      where: { id, userId },
    });

    if (!session) {
      return c.json({ error: "Session not found" }, 404);
    }

    const startTime = Date.now();
    const tools = getToolContracts(mode);
    const previousMessages = Array.isArray(session.messages)
      ? (session.messages as unknown as FiliksUIMessage[])
      : [];
    const mergedMessages = [...previousMessages];

    for (const message of messages) {
      const incomingMessage = {
        ...message,
        metadata: { ...message.metadata, mode, model },
      } satisfies FiliksUIMessage;

      const existingMessageIndex = mergedMessages.findIndex(
        (m) => m.id === incomingMessage.id,
      );

      if (existingMessageIndex === -1) {
        mergedMessages.push(incomingMessage);
      } else {
        mergedMessages[existingMessageIndex] = incomingMessage;
      }
    }
    const nextMessages = await validateUIMessages<FiliksUIMessage>({
      messages: mergedMessages,
      tools,
    });

    const contextRuntime = new ContextRuntime();
    const cwd = session.cwd ?? process.cwd();
    const projectRules = await contextRuntime.loadProjectRules(cwd);
    const systemPrompt = contextRuntime.buildSystemPrompt(
      buildSystemPrompt({
        mode,
        profileSuffix: profile
          ? `You are using the "${profile}" profile.`
          : undefined,
      }),
      projectRules,
    );

    const trimmedResult = contextRuntime.trimMessages(
      nextMessages,
      systemPrompt,
      projectRules,
      Object.keys(tools).join(", "),
    );
    const toolTrimmedResult = contextRuntime.trimToolHistory(
      trimmedResult.messages,
    );
    const trimmedMessages = toolTrimmedResult.messages;

    const modeMessages = await convertToModelMessages(
      trimmedMessages as unknown as FiliksUIMessage[],
      { tools },
    );
    let completedUsage: LanguageModelUsage | null = null;

    const fallbackChain = [
      model,
      ...FREE_MODEL_PRIORITY.filter((candidate) => candidate !== model),
    ];
    let lastError: unknown = null;

    for (const candidateModelId of fallbackChain) {
      const candidate = resolveChatModel(candidateModelId);
      const result = streamText({
        model: candidate.model,
        system: systemPrompt,
        messages: modeMessages,
        tools,
        providerOptions: candidate.providerOptions,
        onFinish(event) {
          completedUsage = event.totalUsage;
        },
      });

      const reader = result.stream.getReader();
      type StreamReadResult = Awaited<ReturnType<typeof reader.read>>;
      type StreamElement = Extract<StreamReadResult, { done: false }>["value"];
      let firstChunk: StreamReadResult;
      try {
        firstChunk = await reader.read();
      } catch (error) {
        lastError = error;
        continue;
      }

      if (firstChunk.done || !firstChunk.value) {
        lastError = new Error("Model returned an empty response");
        continue;
      }

      if (firstChunk.value.type === "error") {
        lastError = firstChunk.value.error;
        continue;
      }

      const firstValue = firstChunk.value;
      const stream = new ReadableStream<StreamElement>({
        start(controller) {
          controller.enqueue(firstValue);
        },
        async pull(controller) {
          try {
            const { done, value } = await reader.read();
            if (done) {
              controller.close();
            } else {
              controller.enqueue(value);
            }
          } catch (error) {
            controller.error(error);
          }
        },
        cancel() {
          void reader.cancel();
        },
      });

      const responseModel = candidate.modelId;
      return createUIMessageStreamResponse({
        headers: UI_MESSAGE_STREAM_HEADERS,
        stream: toUIMessageStream({
          stream,
          tools,
          originalMessages: trimmedMessages as unknown as FiliksUIMessage[],
          messageMetadata({ part }) {
            if (part.type === "start") {
              return { mode, model: responseModel };
            }

            if (part.type !== "finish") return undefined;

            return {
              mode,
              model: responseModel,
              durationMs: Date.now() - startTime,
              ...(completedUsage ? { usage: completedUsage } : {}),
            };
          },
          async onFinish(event) {
            if (event.isAborted) return;

            if (hasPendingToolCalls(event.responseMessage)) return;

            await db.session.update({
              where: { id, userId },
              data: {
                messages: event.messages as unknown as Prisma.InputJsonValue,
              },
            });

            // Billing commented out — implement later
            // if (!completedUsage) return;

            // try {
            //   const billableUsage = calculateCreditsForUsage({
            //     provider: resolvedModel.provider,
            //     model: resolvedModel.modelId,
            //     usage: completedUsage,
            //   });

            //   await ingestAiUsage({
            //     externalCustomerId: userId,
            //     eventId: `chat-message:${event.responseMessage.id}`,
            //     credits: billableUsage.credits,
            //   });
            // } catch (error) {
            //   console.error("Failed to ingest Polar Ai Usage for chat message", {
            //     error,
            //     sessionId: id,
            //     messageId: event.responseMessage.id,
            //     userId,
            //   });
            // }
          },
          onError(error) {
            return error instanceof Error ? error.message : String(error);
          },
        }),
      });
    }

    console.error("[chat] all models failed", {
      model,
      fallbackChain,
      lastError,
    });
    return c.json(
      {
        error: `Model request failed: ${
          lastError instanceof Error ? lastError.message : String(lastError)
        }`,
      },
      502,
    );
  },
);

export default app;
