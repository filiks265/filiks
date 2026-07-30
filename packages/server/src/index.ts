import { db } from "@filiks/database/client";
import { sentry } from "@sentry/hono/bun";
import * as Sentry from "@sentry/hono/bun";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { requireAuth } from "../middleware/require-auth";
import auth from "./routes/auth";
import chat from "./routes/chat";
import sessions from "./routes/sessions";

const app = new Hono();

// Validate critical env vars at startup
const CRITICAL_ENV_VARS = [
  "CLERK_SECRET_KEY",
  "CLERK_PUBLISHABLE_KEY",
  "DATABASE_URL",
] as const;

const MODEL_ENV_VARS = [
  "OPENCODE_ZEN_API_KEY",
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "GOOGLE_GENERATIVE_AI_API_KEY",
  "GROQ_API_KEY",
  "NVIDIA_API_KEY",
  "OPENROUTER_API_KEY",
] as const;

for (const name of CRITICAL_ENV_VARS) {
  if (!process.env[name]) {
    console.error(`[startup] MISSING CRITICAL ENV: ${name}`);
    process.exit(1);
  }
}

const availableModels = MODEL_ENV_VARS.filter((v) => process.env[v]);
if (availableModels.length > 0) {
  console.log(
    `[startup] Model API keys available: ${availableModels.join(", ")}`,
  );
} else {
  console.warn("[startup] No model API keys found — all AI features will fail");
}
// Warm up the database connection to absorb Neon cold-start delay
db.$queryRaw`SELECT 1`
  .then(() => {
    Sentry.logger.info("Database connection established");
  })
  .catch((err: unknown) => {
    Sentry.logger.warn("Database warm-up failed", {
      message: err instanceof Error ? err.message : String(err),
    });
  });

app.use(
  sentry(app, {
    dsn: "https://b88d287e2de7922fd73b57e0ce0968be@o4511441717559296.ingest.de.sentry.io/4511667015254096",
    tracesSampleRate: 1.0,
    enableLogs: true,
    dataCollection: {
      userInfo: false,
      httpBodies: [],
    },
  }),
);

app.get("/debug-sentry", (c) => {
  if (process.env.NODE_ENV === "production") {
    return c.json({ error: "Not found" }, 404);
  }
  // Send a log before throwing the error
  Sentry.logger.info("User triggered test error", {
    action: "test_error_endpoint",
  });
  // Send a test metric before throwing the error
  Sentry.metrics.count("test_counter", 1);
  throw new Error("My first Sentry error!");
});

app.onError((error, c) => {
  if (error instanceof HTTPException) {
    Sentry.logger.warn("handled HTTP error", {
      status: error.status,
      message: error.message || "Request failed",
      path: c.req.path,
      method: c.req.method,
    });
    return c.json(
      {
        error: error.message || "Request failed",
      },
      error.status,
    );
  }

  console.error("[onError]", error instanceof Error ? error.message : error);
  Sentry.logger.error("Unhandled server error", {
    path: c.req.path,
    method: c.req.method,
    message: error instanceof Error ? error.message : "Unknown error",
  });
  return c.json({ error: "Internal server error" }, 500);
});

app.use("/sessions/*", requireAuth);
app.use("/chat/*", requireAuth);

const routes = app
  .route("/auth", auth)
  .route("/sessions", sessions)
  .route("/chat", chat);

export type AppType = typeof routes;

// idleTimeout must be high, otherwise LLM tool calls might not complete
export default { port: 3000, fetch: app.fetch, idleTimeout: 255 };
