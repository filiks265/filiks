export type AuthenticatedEnv = {
  Variables: {
    userId: string;
  };
};
export declare const requireAuth: import("hono").MiddlewareHandler<
  AuthenticatedEnv,
  string,
  {},
  Response
>;
