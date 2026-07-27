import { Hono } from "hono";
// import { HTTPException } from "hono/http-exception";
import { zValidator } from "@hono/zod-validator";
import * as Sentry from "@sentry/hono/bun";
import { z } from "zod";
import { db } from "@filiks/database/client";
import type { AuthenticatedEnv } from "../../middleware/require-auth";

const createSessionSchema = z.object({
  title: z.string(),
});

const createSessionValidator = zValidator(
  "json",
  createSessionSchema,
  (result, c) => {
    if (!result.success) {
      Sentry.logger.warn("Session creation validation failed", {
        path: c.req.path,
        issues: result.error.issues.length,
      })
      return c.json({ error: "Invalid request body" }, 400);
    }
  },
);

const app = new Hono<AuthenticatedEnv>()
  .get("/", async (c) => {

    const userId = c.get("userId");
    const sessions = await db.session.findMany({
      where: { userId:userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        createdAt: true,
      },
    });

    Sentry.logger.info("Listed sessions", {
      count: sessions.length,
    });

    return c.json(sessions);
  })

  .get("/:id", async (c) => {
    // MOCK: Uncomment to simulate slow session loading
    // await new Promise((r) => setTimeout(r, 5000))

    // MOCK: Uncomment to simulate session loading error
    // throw new HTTPException(500, {message: "Mock error: session loading failed"})

    const id = c.req.param("id");
    const userId = c.get("userId");

    const session = await db.session.findUnique({
      where: { id, userId: userId },
    });

    if (!session) {
      Sentry.logger.warn("Session not found", {
        sessionId: id.slice(0, 8),
        userId: userId.slice(0, 8),
      });
      return c.json({ error: "Session not found" }, 404);
    }
    Sentry.logger.info("Loaded session", {
      sessionId: session.id.slice(0, 8),
    });
    return c.json(session);
  })
  .post("/", createSessionValidator, async (c) => {
    // MOCK: Uncomment to simulate slow session loading
    // await new Promise((r) => setTimeout(r, 5000))

    // MOCK: Uncomment to simulate session loading error
    // throw new HTTPException(500, {message: "Mock error: session loading failed"})

    const userId = c.get("userId");
    const { ...data } = c.req.valid("json");

    const session = await db.session.create({
      data: {
        ...data,
        userId: userId,
        
      },
    });

    Sentry.logger.info("Created session", {
      sessionId: session.id.slice(0, 8),
      titleLength: session.title.length,
    });
    return c.json(session, 201);
  });

export default app;
