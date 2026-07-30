# API Reference

Server runs on `http://localhost:3000`. All routes return JSON unless noted.

## Sessions

### `GET /sessions`

List all sessions (summary only).

**Response `200`:**
```json
[
  { "id": "cuid...", "title": "Fix the login bug", "createdAt": "..." },
  { "id": "cuid...", "title": "Refactor auth", "createdAt": "..." }
]
```

### `GET /sessions/:id`

Get session with full message history and workspace metadata.

**Response `200`:**
```json
{
  "id": "cuid...",
  "title": "Fix the login bug",
  "cwd": "/home/user/project",
  "model": "claude-opus-4-6",
  "mode": "BUILD",
  "createdAt": "...",
  "updatedAt": "...",
  "messages": [
    { "id": "...", "role": "USER", "content": "Fix this bug", "metadata": { "mode": "BUILD", "model": "claude-opus-4-6" } },
    { "id": "...", "role": "ASSISTANT", "content": "Here's the fix...", "metadata": { "mode": "BUILD", "model": "claude-opus-4-6", "durationMs": 15000 } }
  ]
}
```

**Response `404`:**
```json
{ "error": "Session not found" }
```

### `POST /sessions`

Create a new session.

**Request body:**
```json
{
  "title": "Fix the login bug",
  "cwd": "/home/user/project"
}
```

**Response `201`:** Full session object.

## Chat (SSE)

### `POST /chat`

Send a message and stream the AI response via SSE.

**Request body:**
```json
{
  "id": "session-id",
  "messages": [
    {
      "id": "msg-id",
      "role": "user",
      "parts": [{ "type": "text", "text": "Fix this bug" }],
      "metadata": { "mode": "BUILD", "model": "claude-opus-4-6" }
    }
  ],
  "mode": "BUILD",
  "model": "claude-opus-4-6"
}
```

**Response: SSE stream** — see [Streaming docs](../server/streaming.md) for event format.

## Sentry

### `GET /debug-sentry`

Trigger a test error to verify Sentry integration. Always throws.

## Error Handling

All errors follow this shape:

```json
{ "error": "Human-readable error message" }
```

HTTP status codes:
- `400` — Validation error
- `404` — Session not found
- `409` — Conflict
- `500` — Internal server error
