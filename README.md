# Project Readme

Created: 2026-07-30

This is a multi-package TypeScript project called **filiks**. It uses Bun as the package manager and has a monorepo structure with packages in the `packages/` directory.

## Quick Start

1. Install dependencies
2. Run `bun run build:cli` to build the CLI
3. Run `bun run dev:server` for development server
4. Run `bun run verify` to run all quality checks

## Scripts

- `dev:cli` - Watch CLI for changes
- `dev:server` - Hot-reload server
- `build:cli` - Build CLI package
- `build:binary` - Build CLI as binary
- `link:cli` - Build and link CLI package
- `release` - Build binary and create GitHub release
- `typecheck` - Run TypeScript checks
- `test` - Run tests
- `lint` - Run Biome linter
- `verify` - Run full quality pipeline