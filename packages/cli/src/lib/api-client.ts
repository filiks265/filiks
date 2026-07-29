import { hc } from "hono/client";
import type { AppType } from "@filiks/server";
import { clearAuth, getAuth } from "./auth";

function getFetchUrl(input: Parameters<typeof fetch>[0]): string {
  if (typeof input === "string") return input;
  if (input instanceof Request) return input.url;
  if (input instanceof URL) return input.toString();
  return "unknown";
}

export const apiClient = hc<AppType>(
  process.env.API_URL ?? "http://localhost:3000",
  {
    fetch: async (
      input: Parameters<typeof fetch>[0],
      init?: Parameters<typeof fetch>[1],
    ) => {
      const headers = new Headers(init?.headers);
      const auth = getAuth();

      if (auth) {
        headers.set("Authorization", `Bearer ${auth.token}`);
      }

      try {
        const response = await fetch(input, { ...init, headers, signal: init?.signal ?? AbortSignal.timeout(30_000) });
        if (response.status === 401) {
          clearAuth();
        }
        return response;
      } catch (err) {
        const url = getFetchUrl(input);
        throw new Error(
          `Cannot reach the server at ${url}. ` +
          "Make sure your API server is running. " +
          "Set API_URL in a .env file next to the binary (e.g., API_URL=https://your-server.com). " +
          `Original error: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    },
  },
);
