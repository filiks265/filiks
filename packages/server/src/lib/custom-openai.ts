import type {
  LanguageModelV4,
  LanguageModelV4CallOptions,
  LanguageModelV4FinishReason,
  LanguageModelV4FunctionTool,
  LanguageModelV4GenerateResult,
  LanguageModelV4Prompt,
  LanguageModelV4StreamPart,
  LanguageModelV4StreamResult,
} from "@ai-sdk/provider";

export type CustomOpenAIConfig = {
  baseURL: string;
  apiKey: string;
  name: string;
};

type OpenAIMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | Array<{ type: "text"; text: string }> | null;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
};

function extractToolResultContent(output: {
  type: string;
  value?: unknown;
  reason?: string;
}): string {
  if (output.type === "text" || output.type === "error-text") {
    return (output as { value: string }).value;
  }
  if (output.type === "json" || output.type === "error-json") {
    return JSON.stringify((output as { value: unknown }).value);
  }
  if (output.type === "execution-denied") {
    return (output as { reason?: string }).reason || "Execution denied";
  }
  if (output.type === "content") {
    const parts = (output as { value: Array<{ type: string; text?: string }> })
      .value;
    return parts
      .filter((p) => p.type === "text")
      .map((p) => p.text)
      .join("");
  }
  return "";
}

function convertPrompt(prompt: LanguageModelV4Prompt): OpenAIMessage[] {
  const messages: OpenAIMessage[] = [];
  for (const msg of prompt) {
    switch (msg.role) {
      case "system": {
        messages.push({ role: "system", content: msg.content as string });
        break;
      }
      case "user": {
        const parts = msg.content as Array<{ type: string; text?: string }>;
        const textContent = parts
          .filter((p): p is { type: "text"; text: string } => p.type === "text")
          .map((p) => p.text)
          .join("");
        messages.push({ role: "user", content: textContent || "" });
        break;
      }
      case "assistant": {
        const parts = msg.content as Array<{
          type: string;
          text?: string;
          toolCallId?: string;
          toolName?: string;
          args?: object;
          input?: unknown;
        }>;
        const text = parts
          .filter((p) => p.type === "text")
          .map((p) => (p as { text: string }).text)
          .join("");
        const toolCalls = parts
          .filter((p) => p.type === "tool-call")
          .map((p) => {
            const tc = p as {
              toolCallId: string;
              toolName: string;
              input: unknown;
            };
            return {
              id: tc.toolCallId,
              type: "function" as const,
              function: {
                name: tc.toolName,
                arguments:
                  tc.input != null && tc.input !== ""
                    ? typeof tc.input === "string"
                      ? tc.input
                      : JSON.stringify(tc.input)
                    : "{}",
              },
            };
          });
        if (!text && toolCalls.length === 0) break;
        messages.push({
          role: "assistant",
          content: toolCalls.length > 0 ? null : text || "",
          ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
        });
        break;
      }
      case "tool": {
        const parts = msg.content as Array<{
          type: string;
          toolCallId?: string;
          output?: { type: string; value?: unknown; reason?: string };
        }>;
        const toolResult = parts[0] as
          | {
              type: "tool-result";
              toolCallId: string;
              output: { type: string; value?: unknown; reason?: string };
            }
          | undefined;

        messages.push({
          role: "tool",
          tool_call_id: toolResult?.toolCallId ?? "",
          content: toolResult?.output
            ? extractToolResultContent(toolResult.output)
            : "",
        });
        break;
      }
    }
  }

  // Safety: ensure tool results match tool calls. If the SDK's internal
  // validation misses a case, pad missing results so the upstream doesn't 400.
  const toolResultMap = new Map<string, OpenAIMessage>();
  for (const msg of messages) {
    if (msg.role === "tool" && msg.tool_call_id) {
      toolResultMap.set(msg.tool_call_id, msg);
    }
  }

  const result: OpenAIMessage[] = [];
  let pendingToolCallIds: string[] = [];
  for (const msg of messages) {
    if (msg.tool_calls) {
      // Flush any orphaned tool calls from the previous batch before overwriting
      for (const id of pendingToolCallIds) {
        const existing = toolResultMap.get(id);
        if (existing && existing.role === "tool") {
          result.push(existing);
        } else {
          result.push({ role: "tool", tool_call_id: id, content: "" });
        }
      }
      pendingToolCallIds = msg.tool_calls.map((tc) => tc.id);
    }
    result.push(msg);
    if (msg.role === "tool" && msg.tool_call_id) {
      pendingToolCallIds = pendingToolCallIds.filter(
        (id) => id !== msg.tool_call_id,
      );
    }
  }

  // Flush remaining orphaned tool calls
  for (const id of pendingToolCallIds) {
    const existing = toolResultMap.get(id);
    if (existing && existing.role === "tool") {
      result.push(existing);
    } else {
      result.push({ role: "tool", tool_call_id: id, content: "" });
    }
  }

  return result;
}

function convertTools(tools: Array<LanguageModelV4FunctionTool>): Array<{
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters: Record<string, unknown>;
    strict?: boolean;
  };
}> {
  return tools.map((t) => {
    const params = { ...(t.inputSchema as Record<string, unknown>) };
    params.$schema = undefined;
    params.additionalProperties = undefined;
    params.definitions = undefined;
    return {
      type: "function" as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: params,
      },
    };
  });
}

function mapFinishReason(
  reason: string | null | undefined,
): LanguageModelV4FinishReason {
  switch (reason) {
    case "stop":
      return { unified: "stop", raw: reason };
    case "length":
      return { unified: "length", raw: reason };
    case "content_filter":
      return { unified: "content-filter", raw: reason };
    case "tool_calls":
      return { unified: "tool-calls", raw: reason };
    case "error":
      return { unified: "error", raw: reason };
    default:
      return { unified: reason ? "other" : "stop", raw: reason ?? "stop" };
  }
}

function parseSSELine(line: string): Record<string, unknown> | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("data: ")) return null;
  const data = trimmed.slice(6);
  if (data === "[DONE]") return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function createCustomOpenAIModel(
  modelId: string,
  config: CustomOpenAIConfig,
): LanguageModelV4 {
  return {
    specificationVersion: "v4",
    provider: config.name,
    modelId,
    supportedUrls: {},

    async doStream(
      options: LanguageModelV4CallOptions,
    ): Promise<LanguageModelV4StreamResult> {
      const {
        prompt,
        tools,
        toolChoice,
        abortSignal,
        includeRawChunks,
        ...rest
      } = options;
      const messages = convertPrompt(prompt);

      if (!config.apiKey) {
        throw new Error(`${config.name}: API key is not configured`);
      }

      const bodyObj: Record<string, unknown> = {
        model: modelId,
        messages,
        stream: true,
      };

      if (rest.maxOutputTokens != null)
        bodyObj.max_tokens = rest.maxOutputTokens;
      if (rest.temperature != null) bodyObj.temperature = rest.temperature;
      if (rest.topP != null) bodyObj.top_p = rest.topP;
      if (rest.stopSequences != null && rest.stopSequences.length > 0)
        bodyObj.stop = rest.stopSequences;
      if (rest.presencePenalty != null)
        bodyObj.presence_penalty = rest.presencePenalty;
      if (rest.frequencyPenalty != null)
        bodyObj.frequency_penalty = rest.frequencyPenalty;
      if (rest.seed != null) bodyObj.seed = rest.seed;
      if (rest.responseFormat?.type === "json")
        bodyObj.response_format = { type: "json_object" };

      if (tools && tools.length > 0) {
        bodyObj.tools = convertTools(
          tools.filter(
            (t): t is LanguageModelV4FunctionTool => t.type === "function",
          ),
        );
        if (toolChoice?.type === "tool") {
          bodyObj.tool_choice = {
            type: "function",
            function: { name: toolChoice.toolName },
          };
        } else if (toolChoice?.type === "required") {
          bodyObj.tool_choice = "required";
        } else if (toolChoice?.type === "none") {
          bodyObj.tool_choice = "none";
        }
      }

      const body = JSON.stringify(bodyObj);
      let response: Response;
      try {
        response = await fetch(`${config.baseURL}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.apiKey}`,
            Accept: "text/event-stream",
            "User-Agent": "filiks/1.0",
          },
          body,
          signal: abortSignal,
        });
      } catch (err) {
        throw new Error(
          `${config.name}: connection failed — ${err instanceof Error ? err.message : String(err)}`,
        );
      }

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        let errorDetail: string;
        try {
          const parsed = JSON.parse(errorBody);
          errorDetail = parsed?.error?.message || errorBody;
        } catch {
          errorDetail = errorBody || response.statusText;
        }
        console.error(
          `[${config.name}] doStream body on ${response.status}:`,
          body,
        );
        throw new Error(
          `${config.name} API error (${response.status}): ${errorDetail}`,
        );
      }

      const reader = response.body!.getReader();
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((v, k) => {
        responseHeaders[k] = v;
      });

      const stream = new ReadableStream<LanguageModelV4StreamPart>({
        async start(controller) {
          const decoder = new TextDecoder();
          let buffer = "";
          const textId = "0";
          const reasoningId = "1";
          let hasStartedText = false;
          let hasEndedText = false;
          let hasStartedReasoning = false;
          let hasEndedReasoning = false;
          let finishReason: string | null = null;

          const toolCallAccumulators = new Map<
            number,
            { id: string; name: string; args: string; hasCalled: boolean }
          >();

          try {
            while (true) {
              let result;
              try {
                result = await reader.read();
              } catch (err) {
                if (abortSignal?.aborted) break;
                controller.error(err);
                return;
              }
              if (result.done) break;
              if (abortSignal?.aborted) break;

              buffer += decoder.decode(result.value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                const chunk = parseSSELine(line);
                if (!chunk) continue;

                if (chunk.error) {
                  const errMsg =
                    ((chunk.error as Record<string, unknown>)
                      ?.message as string) || String(chunk.error);
                  controller.error(new Error(errMsg));
                  return;
                }

                const choice = (
                  chunk.choices as Array<Record<string, unknown>> | undefined
                )?.[0];
                if (!choice) continue;

                if (choice.finish_reason) {
                  finishReason = choice.finish_reason as string;
                }

                const delta = (choice?.delta as Record<string, unknown>) || {};

                if (delta.reasoning_content != null) {
                  const text = String(delta.reasoning_content);
                  if (!hasStartedReasoning) {
                    controller.enqueue({
                      type: "reasoning-start",
                      id: reasoningId,
                    });
                    hasStartedReasoning = true;
                  }
                  controller.enqueue({
                    type: "reasoning-delta",
                    id: reasoningId,
                    delta: text,
                  });
                }

                if (delta.content != null) {
                  const text = String(delta.content);
                  if (!hasStartedText) {
                    controller.enqueue({ type: "text-start", id: textId });
                    hasStartedText = true;
                  }
                  controller.enqueue({
                    type: "text-delta",
                    id: textId,
                    delta: text,
                  });
                }

                if (delta.tool_calls) {
                  const rawToolCalls = delta.tool_calls as Array<{
                    index: number;
                    id?: string;
                    function?: { name?: string; arguments?: string };
                  }>;
                  for (const tc of rawToolCalls) {
                    const existing = toolCallAccumulators.get(tc.index) || {
                      id: "",
                      name: "",
                      args: "",
                      hasCalled: false,
                    };
                    if (tc.id) existing.id = tc.id;
                    if (tc.function?.name) existing.name += tc.function.name;
                    if (tc.function?.arguments)
                      existing.args += tc.function.arguments;
                    toolCallAccumulators.set(tc.index, existing);
                  }
                }

                if (finishReason && chunk.usage) {
                  if (hasStartedText && !hasEndedText) {
                    controller.enqueue({ type: "text-end", id: textId });
                    hasEndedText = true;
                  }
                  if (hasStartedReasoning && !hasEndedReasoning) {
                    controller.enqueue({
                      type: "reasoning-end",
                      id: reasoningId,
                    });
                    hasEndedReasoning = true;
                  }

                  for (const [, tc] of toolCallAccumulators) {
                    if (!tc.hasCalled) {
                      controller.enqueue({
                        type: "tool-call",
                        toolCallId: tc.id,
                        toolName: tc.name,
                        input: tc.args,
                      });
                      tc.hasCalled = true;
                    }
                  }

                  const usage = chunk.usage as
                    | Record<string, unknown>
                    | undefined;
                  controller.enqueue({
                    type: "finish",
                    finishReason: mapFinishReason(finishReason),
                    usage: {
                      inputTokens: {
                        total: (usage?.prompt_tokens as number) ?? undefined,
                        noCache: undefined,
                        cacheRead: undefined,
                        cacheWrite: undefined,
                      },
                      outputTokens: {
                        total:
                          (usage?.completion_tokens as number) ?? undefined,
                        text: undefined,
                        reasoning: undefined,
                      },
                    },
                    providerMetadata: undefined,
                  });
                  controller.close();
                  return;
                }
              }
            }

            if (hasStartedText && !hasEndedText) {
              controller.enqueue({ type: "text-end", id: textId });
            }
            if (hasStartedReasoning && !hasEndedReasoning) {
              controller.enqueue({ type: "reasoning-end", id: reasoningId });
            }

            for (const [, tc] of toolCallAccumulators) {
              if (!tc.hasCalled) {
                controller.enqueue({
                  type: "tool-call",
                  toolCallId: tc.id,
                  toolName: tc.name,
                  input: tc.args,
                });
                tc.hasCalled = true;
              }
            }

            controller.enqueue({
              type: "finish",
              finishReason: mapFinishReason(finishReason),
              usage: {
                inputTokens: {
                  total: undefined,
                  noCache: undefined,
                  cacheRead: undefined,
                  cacheWrite: undefined,
                },
                outputTokens: {
                  total: undefined,
                  text: undefined,
                  reasoning: undefined,
                },
              },
              providerMetadata: undefined,
            });
            controller.close();
          } catch (err) {
            controller.error(err);
          } finally {
            try {
              reader.releaseLock();
            } catch {}
          }
        },
      });

      return {
        stream,
        request: { body },
        response: { headers: responseHeaders },
      };
    },

    async doGenerate(
      options: LanguageModelV4CallOptions,
    ): Promise<LanguageModelV4GenerateResult> {
      const { prompt, tools, toolChoice, abortSignal, ...rest } = options;
      const messages = convertPrompt(prompt);

      if (!config.apiKey) {
        throw new Error(`${config.name}: API key is not configured`);
      }

      const bodyObj: Record<string, unknown> = {
        model: modelId,
        messages,
        stream: false,
      };

      if (rest.maxOutputTokens != null)
        bodyObj.max_tokens = rest.maxOutputTokens;
      if (rest.temperature != null) bodyObj.temperature = rest.temperature;
      if (rest.topP != null) bodyObj.top_p = rest.topP;
      if (rest.seed != null) bodyObj.seed = rest.seed;

      if (tools && tools.length > 0) {
        bodyObj.tools = convertTools(
          tools.filter(
            (t): t is LanguageModelV4FunctionTool => t.type === "function",
          ),
        );
        if (toolChoice?.type === "tool") {
          bodyObj.tool_choice = {
            type: "function",
            function: { name: toolChoice.toolName },
          };
        } else if (toolChoice?.type === "required") {
          bodyObj.tool_choice = "required";
        } else if (toolChoice?.type === "none") {
          bodyObj.tool_choice = "none";
        }
      }

      const body = JSON.stringify(bodyObj);
      let response: Response;
      try {
        response = await fetch(`${config.baseURL}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.apiKey}`,
            Accept: "application/json",
            "User-Agent": "filiks/1.0",
          },
          body,
          signal: abortSignal,
        });
      } catch (err) {
        throw new Error(
          `${config.name}: connection failed — ${err instanceof Error ? err.message : String(err)}`,
        );
      }

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        let errorDetail: string;
        try {
          const parsed = JSON.parse(errorBody);
          errorDetail = parsed?.error?.message || errorBody;
        } catch {
          errorDetail = errorBody || response.statusText;
        }
        console.error(
          `[${config.name}] doGenerate body on ${response.status}:`,
          body,
        );
        throw new Error(
          `${config.name} API error (${response.status}): ${errorDetail}`,
        );
      }

      const data = (await response.json()) as Record<string, unknown>;
      const choice = (
        data.choices as Array<Record<string, unknown>> | undefined
      )?.[0];
      const message = (choice?.message as Record<string, unknown>) || {};
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((v, k) => {
        responseHeaders[k] = v;
      });

      const content = (message.content as string | undefined) || "";
      const finishReason = mapFinishReason(
        (data.choices as Array<Record<string, unknown>> | undefined)?.[0]
          ?.finish_reason as string | null,
      );
      const usage = data.usage as Record<string, unknown> | undefined;

      const outputContent: Array<
        | { type: "text"; text: string }
        | {
            type: "tool-call";
            toolCallId: string;
            toolName: string;
            input: string;
          }
      > = [];
      outputContent.push({ type: "text" as const, text: content });

      const rawToolCalls = message.tool_calls as
        | Array<{ id: string; function: { name: string; arguments: string } }>
        | undefined;
      if (rawToolCalls) {
        for (const tc of rawToolCalls) {
          let parsed: Record<string, unknown> = {};
          try {
            parsed = JSON.parse(tc.function.arguments);
          } catch {}
          outputContent.push({
            type: "tool-call",
            toolCallId: tc.id,
            toolName: tc.function.name,
            input: tc.function.arguments,
          });
        }
      }

      return {
        content: outputContent,
        finishReason,
        usage: {
          inputTokens: {
            total: (usage?.prompt_tokens as number) ?? undefined,
            noCache: undefined,
            cacheRead: undefined,
            cacheWrite: undefined,
          },
          outputTokens: {
            total: (usage?.completion_tokens as number) ?? undefined,
            text: undefined,
            reasoning: undefined,
          },
        },
        response: {
          id: data.id as string | undefined,
          timestamp: data.created
            ? new Date((data.created as number) * 1000)
            : undefined,
          modelId: data.model as string | undefined,
          headers: responseHeaders,
          body: data,
        },
        warnings: [],
      };
    },
  };
}
