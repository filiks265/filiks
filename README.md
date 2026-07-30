# filiks

Agentic coding CLI with a hosted server backend.

## Install

### Linux / macOS
```bash
curl -fsSL https://raw.githubusercontent.com/filiks265/filiks/main/scripts/install.sh | bash
```

### Windows
1. Download `filiks-windows-x64.tar.gz` from the [latest release](https://github.com/filiks265/filiks/releases/latest)
2. Extract `filiks.exe` and place it in a directory in your `PATH`
3. Create a `.env` file next to `filiks.exe` with:
   ```env
   API_URL=https://filiksserver-production.up.railway.app
   ```

### Manual
```bash
# Download the archive for your platform
curl -fsSL https://github.com/filiks265/filiks/releases/download/v0.2.12/filiks-linux-x64.tar.gz | sudo tar xz -C /usr/local/bin
# Make sure /usr/local/bin is in your PATH
```

## Quick Start (development)

```bash
bun install
bun run dev:server   # start the server
bun run dev:cli      # start the CLI (another terminal)
```

## Scripts

| Script | Description |
|--------|-------------|
| `dev:cli` | Watch CLI for changes |
| `dev:server` | Hot-reload server |
| `build:cli` | Build CLI package |
| `build:binary` | Build CLI as standalone binary |
| `release` | Build binary and create GitHub release |
| `typecheck` | Run TypeScript checks across all packages |
| `test` | Run tests |
| `lint` | Run Biome linter |
| `verify` | Run full quality pipeline |
