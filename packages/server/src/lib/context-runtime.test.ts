import { describe, expect, test } from "bun:test";
import { ContextRuntime } from "./context-runtime";

const call = (i: number) => ({
  id: `call${i}`,
  role: "assistant" as const,
  parts: [{ type: "tool-invocation" as const }],
});

const result = (i: number) => ({
  id: `result${i}`,
  role: "user" as const,
  parts: [{ type: "tool-result" as const }],
});

const text = (t: string) => ({
  id: t,
  role: "user" as const,
  parts: [{ type: "text" as const, text: t }],
});

describe("ContextRuntime.trimToolHistory", () => {
  test("keeps newest 15 tool pairs and drops orphaned results", () => {
    const messages = [
      ...Array.from({ length: 20 }, (_, i) => i).flatMap((i) => [
        call(i),
        result(i),
      ]),
      text("hello"),
    ];

    const { messages: kept, trimmed } =
      new ContextRuntime().trimToolHistory(messages);

    expect(trimmed).toBe(10);
    expect(kept).toHaveLength(31);
    expect(kept[0]!.id).toBe("call5");
    expect(kept.at(-1)!.id).toBe("hello");
    expect(kept.filter((m) => m.id.startsWith("call"))).toHaveLength(15);
    expect(kept.filter((m) => m.id.startsWith("result"))).toHaveLength(15);
  });

  test("returns messages unchanged when under the limit", () => {
    const messages = [call(0), result(0), text("hi")];

    const { messages: kept, trimmed } =
      new ContextRuntime().trimToolHistory(messages);

    expect(trimmed).toBe(0);
    expect(kept).toHaveLength(3);
  });

  test("handles empty input", () => {
    const { messages, trimmed } = new ContextRuntime().trimToolHistory([]);

    expect(trimmed).toBe(0);
    expect(messages).toHaveLength(0);
  });

  test("does not count plain text turns as tool pairs", () => {
    const messages = [text("a"), text("b")];

    const { trimmed } = new ContextRuntime().trimToolHistory(messages);

    expect(trimmed).toBe(0);
  });
});
