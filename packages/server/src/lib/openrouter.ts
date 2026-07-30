import path from "node:path";
import dotenv from "dotenv";
import { createCustomOpenAIModel } from "./custom-openai";

dotenv.config({
  path: path.resolve(import.meta.dirname, "../../../../.env"),
});

const apiKey = process.env.OPENROUTER_API_KEY ?? "";

export const openrouter = {
  chat: (modelId: string) =>
    createCustomOpenAIModel(modelId, {
      baseURL: "https://openrouter.ai/api/v1",
      apiKey,
      name: "openrouter",
    }),
};
