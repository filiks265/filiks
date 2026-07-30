import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  convertToModelMessages,
  streamText,
  validateUIMessages,
  type InferUITools,
  type LanguageModelUsage,
  type UIMessage,
} from "ai";
import { db } from "@filiks/database/client";
import type { Prisma } from "@filiks/database";
import {
  getToolContracts,
  modeSchema,
  type ModeType,
  type ToolContracts,
} from "@filiks/shared";
import { buildSystemPrompt } from "../system-prompt";
import { ContextRuntime } from "../lib/context-runtime";
import type { AuthenticatedEnv } from "../../middleware/require-auth";
// import {requireCreditsBalance} from "../middleware/require-credits-balance";
// import {calculatedCreditsForUsage} from "../lib/credits";
import { isSupportedChatModel, resolveChatModel } from "../lib/models";

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
    const resolvedModel = resolveChatModel(model);
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

    const modeMessages = await convertToModelMessages(
      trimmedResult.messages as unknown as FiliksUIMessage[],
      { tools },
    );
    let completedUsage: LanguageModelUsage | null = null;

    const result = streamText({
      model: resolvedModel.model,
      system: systemPrompt,
      messages: modeMessages,
      tools,
      providerOptions: resolvedModel.providerOptions,
      onFinish(event) {
        completedUsage = event.totalUsage;
      },
    });

    return result.toUIMessageStreamResponse<FiliksUIMessage>({
      originalMessages: trimmedResult.messages as unknown as FiliksUIMessage[],
      messageMetadata({part}) {
        if (part.type === "start"){
          return {mode, model};
        }

        if (part.type !== "finish") return undefined;

        return {
          mode,
          model,
          durationMs: Date.now() - startTime,
          ...(completedUsage ? {usage: completedUsage} : {}),
        };
      },
      async onFinish(event){
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
      onError(error){
        return error instanceof Error ? error.message : String(error);
      },
    });
  },
);

export default app;
