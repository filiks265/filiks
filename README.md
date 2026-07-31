# filiks

Agentic coding CLI with a hosted server backend.

## Install

### Linux / macOS
```bash
curl -fsSL https://raw.githubusercontent.com/filiks265/filiks/main/scripts/install.sh | bash
```

### Windows
```powershell
irm https://raw.githubusercontent.com/filiks265/filiks/main/install.ps1 | iex
```

### Manual
```bash
# Download the archive for your platform
curl -fsSL https://github.com/filiks265/filiks/releases/latest/download/filiks-linux-x64.tar.gz | sudo tar xz -C /usr/local/bin
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
