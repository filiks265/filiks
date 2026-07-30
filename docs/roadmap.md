# Roadmap

## ✅ What's Built

### Server
- [x] Hono server with Sentry error tracking
- [x] Session CRUD (list, get, create)
- [x] Chat SSE endpoint — POST /chat/ (with validated messages, mode, model)
- [x] Provider abstraction for 8 providers (Anthropic, OpenAI, Google, Groq, DeepSeek, Mistral, OpenRouter, custom OpenAI-compatible)
- [x] Message persistence with merge + validate pattern
- [x] Client disconnect detection and abort
- [x] Tool contracts passed to `streamText`
- [x] Mode-specific system prompts (BUILD / PLAN)
- [x] Provider tool-call normalization with JSON parsing
- [x] Workspace-aware session fields (cwd, model, mode)

### CLI
- [x] React + OpenTUI terminal UI
- [x] Screen routing (Home, NewSession, Session)
- [x] Input bar with command menu, keyboard layers
- [x] Message rendering (user, bot, error, tool-call display)
- [x] 20 color themes with context provider
- [x] Dialog system, toast notifications
- [x] Hono RPC client for typed API calls
- [x] Client-side tool execution via `onToolCall`
- [x] `useChat` hook with `@ai-sdk/react` + `DefaultChatTransport`
- [x] Streaming bot message rendering
- [x] ToolRuntime module with permission policy, adapter pattern, audit log
- [x] Auth flow with Clerk

### Shared
- [x] SSE event schemas (text-delta, reasoning-delta, tool-call, done, error)
- [x] Message part schemas (reasoning, text, tool-call)
- [x] Model registry via `@opencode-ai/models` (8 providers)
- [x] Tool input schemas and contracts (7 tools: readFile, listDirectory, glob, grep, writeFile, editFile, bash)
- [x] Zod-based tool definition for read-only (PLAN) and full (BUILD) modes

### Database
- [x] Prisma schema with Session model (includes cwd, model, mode)
- [x] Neon PostgreSQL connection with pg adapter
- [x] Messages stored as JSON

### Build & Quality
- [x] Root tsconfig.json with project references for `tsc -b`
- [x] `typecheck`, `test`, `lint`, `verify` scripts in root package.json

## 🔨 In Progress

- [ ] **ContextRuntime**: Token budget, message trimming/summarization, project instruction loading (AGENTS.md)
- [ ] **VerificationRuntime**: Standard verify command, result formatting, feedback loop

## 📋 Up Next

- [ ] **Interruption flow**: Save ASSISTANT messages as `INTERRUPTED` on abort (currently the server returns early without saving)
- [ ] **Permission & approval model**: Approval workflows for writes, bash, sensitive operations
- [ ] **Tool-call audit log**: Persistent record of tool calls with timestamps, results, durations
- [ ] **AgentProfile / extensions**: Rename BUILD/PLAN to mode, reserve "agent" for rich profiles with skills, hooks, subagents
- [ ] **MCP integration**: Real MCP server connections (currently placeholder UI)
- [ ] **LSP integration**: Real LSP diagnostics panel (currently placeholder UI)
- [ ] **History limits**: Conversation history truncation (last ~10 turns or token budget)
- [ ] **User identity**: Replace mock-user with real user identification
- [ ] **Ollama support**: Add free local models via OpenAI-compatible endpoint
- [ ] **Error recovery**: Better UX when the stream fails mid-way — retry button, partial message handling

## 💡 Future Ideas

- **Session search**: Full-text search across sessions and messages
- **Multi-session tabs**: Switch between active sessions
- **Export**: Share chat logs, generate PR descriptions from session context
- **Project instructions**: Load AGENTS.md / CLAUDE.md as system prompt extensions
- **Pre/post tool hooks**: Middleware-style hooks before and after tool execution
- **Subagents**: Delegation to specialized sub-agents for complex tasks
- **Checkpoints**: Save and restore session state including workspace state

## Known Issues

- No API key validation at startup — missing keys cause runtime errors on first LLM call
- `.env.example` has incomplete variable list (missing `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`)
