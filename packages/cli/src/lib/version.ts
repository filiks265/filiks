// FILIKS_VERSION is injected at compile time via bun --define.
// During development it's undefined, so we fall back to "dev".
declare const FILIKS_VERSION: string | undefined;
export const VERSION =
  typeof FILIKS_VERSION !== "undefined" ? FILIKS_VERSION : "dev";
