import { createMiddleware } from "hono/factory";
import { authenticateOauthRequest } from "../src/lib/auth";

export type AuthenticatedEnv = {
  Variables: {
    userId: string;
  };
};

export const requireAuth = createMiddleware<AuthenticatedEnv>(
  async (c, next) => {
    try {
      const auth = await authenticateOauthRequest(c.req.raw);
      if (!auth) {
        return c.json({ error: "Unauthorized. Run /login to continue" }, 401);
      }

      c.set("userId", auth.userId);
      await next();
    } catch (err) {
      console.error("Auth middleware error:", err);
      return c.json({ error: "Internal server error" }, 500);
    }
  },
);
