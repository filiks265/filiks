export type ModelPricing = {
  inputUsdPerMillionTokens: number;
  outputUsdPerMillionTokens: number;
};

export type SupportedProvider = string;

export interface SupportedChatModel {
  id: string;
  name: string;
  provider: SupportedProvider;
  providerName: string;
  pricing: ModelPricing;
  context: number;
  toolCall: boolean;
  reasoning: boolean;
  env: string[];
  npm: string;
  api?: string;
}

import { providers as snapshotProviders, models as snapshotModels } from "@opencode-ai/models/snapshot";

function buildFreeModelList(
  providerKey: string,
  cache: SupportedChatModel[],
): SupportedChatModel[] {
  if (cache.length > 0) return cache;

  const provider = (snapshotProviders as Record<string, typeof snapshotProviders.opencode>)[providerKey];
  if (!provider) return [];

  for (const [modelId, model] of Object.entries(provider.models)) {
    const cost = model.cost;
    if (!cost || cost.input !== 0 || cost.output !== 0) continue;
    if (!model.tool_call) continue;

    cache.push({
      id: modelId,
      name: model.name,
      provider: providerKey,
      providerName: provider.name,
      pricing: {
        inputUsdPerMillionTokens: 0,
        outputUsdPerMillionTokens: 0,
      },
      context: model.limit.context,
      toolCall: true,
      reasoning: model.reasoning,
      env: provider.env,
      npm: provider.npm,
      api: provider.api,
    });
  }

  return cache;
}

const ZEN_FREE_MODELS: SupportedChatModel[] = [];
const NVIDIA_FREE_MODELS: SupportedChatModel[] = [];

function buildZenModelList(): SupportedChatModel[] {
  return buildFreeModelList("opencode", ZEN_FREE_MODELS);
}

function buildNvidiaModelList(): SupportedChatModel[] {
  return buildFreeModelList("nvidia", NVIDIA_FREE_MODELS);
}

const ZEN_MODELS_INTERNAL = buildZenModelList();
const NVIDIA_MODELS_INTERNAL = buildNvidiaModelList();

const SUPPORTED_CHAT_MODELS_INTERNAL = [...ZEN_MODELS_INTERNAL, ...NVIDIA_MODELS_INTERNAL];

export type SupportedChatModelId = string;

export const ZEN_MODELS: readonly SupportedChatModel[] = ZEN_MODELS_INTERNAL;
export const NVIDIA_MODELS: readonly SupportedChatModel[] = NVIDIA_MODELS_INTERNAL;

const CONSOLE_MODEL_IDS = new Set<string>();

export function findSupportedChatModel(modelId: string): SupportedChatModel | undefined {
  if (!CONSOLE_MODEL_IDS.has(modelId)) return undefined;
  return SUPPORTED_CHAT_MODELS_INTERNAL.find((model) => model.id === modelId);
}

export function getSupportedChatModels(): readonly SupportedChatModel[] {
  return SUPPORTED_CHAT_MODELS_INTERNAL.filter((m) => CONSOLE_MODEL_IDS.has(m.id));
}

export function getModelsForEnv(availableEnv: string[]): SupportedChatModel[] {
  return SUPPORTED_CHAT_MODELS_INTERNAL.filter((model) =>
    CONSOLE_MODEL_IDS.has(model.id) &&
    model.env.every((envVar) => availableEnv.includes(envVar)),
  );
}

export const DEFAULT_CHAT_MODEL_ID = "nemotron-3-ultra-free";

const ZEN_CONSOLE_MODEL_IDS = new Set([
  "nemotron-3-ultra-free",
  "deepseek-v4-flash-free",
  "north-mini-code-free",
  "big-pickle",
]);

const NVIDIA_CONSOLE_MODEL_IDS = new Set([
  "google/gemma-2-2b-it",
  "google/gemma-3n-e2b-it",
  "google/gemma-3n-e4b-it",
  "google/gemma-4-31b-it",
  "meta/llama-3.1-8b-instruct",
  "meta/llama-3.1-70b-instruct",
  "meta/llama-3.2-11b-vision-instruct",
  "meta/llama-3.3-70b-instruct",
  "meta/llama-4-maverick-17b-128e-instruct",
  "minimaxai/minimax-m3",
  "mistralai/mistral-nemotron",
  "mistralai/mistral-small-4-119b-2603",
  "nvidia/nemotron-3-nano-30b-a3b",
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
  "nvidia/nemotron-mini-4b-instruct",
  "nvidia/nvidia-nemotron-nano-9b-v2",
  "openai/gpt-oss-20b",
  "sarvamai/sarvam-m",
  "stepfun-ai/step-3.5-flash",
  "stepfun-ai/step-3.7-flash",
]);

export const ZEN_MODEL_PRIORITY: string[] = [...ZEN_MODELS_INTERNAL]
  .filter((m) => ZEN_CONSOLE_MODEL_IDS.has(m.id))
  .sort((a, b) => b.context - a.context)
  .map((m) => m.id);

export const NVIDIA_MODEL_PRIORITY: string[] = [...NVIDIA_MODELS_INTERNAL]
  .filter((m) => NVIDIA_CONSOLE_MODEL_IDS.has(m.id))
  .sort((a, b) => b.context - a.context)
  .map((m) => m.id);

export const FREE_MODEL_PRIORITY: string[] = [...ZEN_MODEL_PRIORITY, ...NVIDIA_MODEL_PRIORITY];

for (const id of [...ZEN_CONSOLE_MODEL_IDS, ...NVIDIA_CONSOLE_MODEL_IDS]) {
  CONSOLE_MODEL_IDS.add(id);
}

export const SUPPORTED_CHAT_MODELS: readonly SupportedChatModel[] = SUPPORTED_CHAT_MODELS_INTERNAL
  .filter((m) => CONSOLE_MODEL_IDS.has(m.id));
