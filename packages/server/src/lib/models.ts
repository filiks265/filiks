import path from "node:path";
import { anthropic } from "@ai-sdk/anthropic";
import { deepseek } from "@ai-sdk/deepseek";
import { google } from "@ai-sdk/google";
import { groq } from "@ai-sdk/groq";
import { mistral } from "@ai-sdk/mistral";
import { openai } from "@ai-sdk/openai";
import {
  type SupportedChatModel,
  type SupportedChatModelId,
  type SupportedProvider,
  findSupportedChatModel,
} from "@filiks/shared";
import type { ProviderMap } from "@opencode-ai/models";
import { providers as snapshotProviders } from "@opencode-ai/models/snapshot";
import type { LanguageModel } from "ai";
import dotenv from "dotenv";
import { createCustomOpenAIModel } from "./custom-openai";
import { openrouter } from "./openrouter";

dotenv.config({
  path: path.resolve(import.meta.dirname, "../../../../.env"),
});

// Make ProviderMap accessible for iteration
const providersMap = snapshotProviders as ProviderMap;

export type ProviderOptions = Record<string, any>;

export type ResolvedModel = {
  model: LanguageModel;
  provider: SupportedProvider;
  modelId: SupportedChatModelId;
  providerOptions?: ProviderOptions;
};

const PROVIDER_OPTIONS: Record<string, ProviderOptions | undefined> = {
  "claude-opus-4-6": {
    anthropic: {
      thinking: { type: "enabled", budgetTokens: 10000 },
    },
  },
  "claude-sonnet-4-6": {
    anthropic: {
      thinking: { type: "enabled", budgetTokens: 10000 },
    },
  },
  "deepseek-reasoner": {
    deepseek: {
      thinking: { type: "enabled" },
    },
  },
  "o3-mini": {
    openai: {
      thinking: { reasoningSummary: "detailed" },
    },
  },
  "gpt-4.1": {
    openai: {
      thinking: { reasoningSummary: "detailed" },
    },
  },
  "tencent/hy3:free": {
    openrouter: {
      reasoning_effort: "high",
    },
  },
};

// Compatibility: old env var names that can satisfy a canonical models.dev env requirement
const ENV_FALLBACKS: Record<string, string[]> = {
  OPENCODE_API_KEY: ["OPENCODE_ZEN_API_KEY"],
};

// Check canonical and fallback env var names
function resolveEnvVar(name: string): string | undefined {
  if (process.env[name]) {
    console.debug(`[models] resolved env var ${name} from process.env`);
    return process.env[name];
  }
  const fallbacks = ENV_FALLBACKS[name];
  if (fallbacks) {
    for (const fb of fallbacks) {
      if (process.env[fb]) {
        console.debug(`[models] resolved env var ${name} via fallback ${fb}`);
        return process.env[fb];
      }
    }
  }
  return undefined;
}

// npm package -> resolver function
type ModelResolver = (modelId: string, api?: string) => LanguageModel;

const npmResolvers: Record<string, ModelResolver> = {
  "@ai-sdk/anthropic": (id) => anthropic(id),
  "@ai-sdk/openai": (id) => openai(id),
  "@ai-sdk/google": (id) => google(id),
  "@ai-sdk/groq": (id) => groq(id),
  "@ai-sdk/deepseek": (id) => deepseek(id),
  "@ai-sdk/mistral": (id) => mistral(id),
  "@ai-sdk/openai-compatible": (id, api) => {
    const providerInfo = findProviderForModel(id);
    if (!providerInfo)
      throw new Error(`Cannot resolve provider for model: ${id}`);
    const apiKey = getApiKey(providerInfo.env);
    return createCustomOpenAIModel(id, {
      baseURL: api || providerInfo.api || "",
      apiKey,
      name: providerInfo.providerId,
    });
  },
};

// Special handling for openrouter which uses a custom wrapper
npmResolvers["@openrouter/ai-sdk-provider"] = (id) => openrouter.chat(id);

function getApiKey(env: string[]): string {
  for (const e of env) {
    const val = resolveEnvVar(e);
    if (val) return val;
  }
  console.warn(`[models] no API key found among: ${env.join(", ")}`);
  return "";
}

interface ProviderInfo {
  providerId: string;
  npm: string;
  api?: string;
  env: string[];
}

const providerCache = new Map<string, ProviderInfo>();

function findProviderForModel(modelId: string): ProviderInfo | undefined {
  if (providerCache.has(modelId)) return providerCache.get(modelId);

  let fallback: ProviderInfo | undefined;

  for (const providerId of Object.keys(providersMap)) {
    const provider = providersMap[providerId]!;
    if (provider.models[modelId]) {
      const info: ProviderInfo = {
        providerId,
        npm: provider.npm,
        api: provider.api,
        env: provider.env,
      };
      // Prefer a provider whose env vars we can satisfy
      if (provider.env.some((e: string) => resolveEnvVar(e))) {
        providerCache.set(modelId, info);
        return info;
      }
      // First match as fallback if no provider has keys
      if (!fallback) fallback = info;
    }
  }

  if (fallback) providerCache.set(modelId, fallback);
  return fallback;
}

function resolveModel(model: SupportedChatModel): ResolvedModel {
  const providerInfo = findProviderForModel(model.id);

  if (!providerInfo) {
    throw new Error(`Cannot find provider for model: ${model.id}`);
  }

  // Check if we have at least one of the required env vars
  const hasKey = providerInfo.env.some((e: string) => resolveEnvVar(e));
  if (!hasKey) {
    throw new Error(
      `Missing API key for model "${model.id}". Requires one of: ${providerInfo.env.join(", ")}`,
    );
  }

  const resolver = npmResolvers[providerInfo.npm];
  if (!resolver) {
    throw new Error(
      `Unsupported AI SDK package "${providerInfo.npm}" for model "${model.id}"`,
    );
  }

  const languageModel = resolver(model.id, providerInfo.api);

  return {
    model: languageModel,
    provider: providerInfo.providerId,
    modelId: model.id,
    providerOptions: PROVIDER_OPTIONS[model.id],
  };
}

export function isSupportedChatModel(
  modelId: string,
): modelId is SupportedChatModelId {
  return findSupportedChatModel(modelId) != null;
}

export function resolveChatModel(modelId: string): ResolvedModel {
  const model = findSupportedChatModel(modelId);
  if (!model) {
    throw new Error(`Unsupported model: ${modelId}`);
  }
  return resolveModel(model);
}

export function getAvailableProviders(): string[] {
  const available: string[] = [];
  for (const providerId of Object.keys(providersMap)) {
    const provider = providersMap[providerId]!;
    if (provider.env.some((e: string) => resolveEnvVar(e))) {
      available.push(providerId);
    }
  }
  return available;
}
