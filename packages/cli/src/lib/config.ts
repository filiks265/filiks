// FILIKS_CLERK_FRONTEND_API and FILIKS_CLERK_OAUTH_CLIENT_ID are injected at
// compile time via bun --define (see release.yml and scripts/build-binary.ts).
// During development they're undefined, so we fall back to process.env.
declare const FILIKS_CLERK_FRONTEND_API: string | undefined;
declare const FILIKS_CLERK_OAUTH_CLIENT_ID: string | undefined;

export const CLERK_FRONTEND_API =
  typeof FILIKS_CLERK_FRONTEND_API !== "undefined"
    ? FILIKS_CLERK_FRONTEND_API
    : process.env.CLERK_FRONTEND_API;

export const CLERK_OAUTH_CLIENT_ID =
  typeof FILIKS_CLERK_OAUTH_CLIENT_ID !== "undefined"
    ? FILIKS_CLERK_OAUTH_CLIENT_ID
    : process.env.CLERK_OAUTH_CLIENT_ID;
