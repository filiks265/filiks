import type { ModeType } from "@filiks/shared";

export type ToolResult = {
  success: boolean;
  data?: unknown;
  error?: string;
  truncated?: boolean;
  meta?: Record<string, unknown>;
};

export type PermissionDecision = {
  allowed: boolean;
  reason?: string;
};

export interface PermissionPolicy {
  check(
    toolName: string,
    input: unknown,
    mode: ModeType,
  ): Promise<PermissionDecision>;
}

export interface ToolAdapter {
  execute(toolName: string, input: unknown): Promise<ToolResult>;
}

export type ToolCallEntry = {
  id: string;
  toolName: string;
  input: unknown;
  result: ToolResult;
  durationMs: number;
  timestamp: Date;
};

export class ToolRuntime {
  private adapter: ToolAdapter;
  private policy: PermissionPolicy;
  private auditLog: ToolCallEntry[] = [];

  constructor(adapter: ToolAdapter, policy: PermissionPolicy) {
    this.adapter = adapter;
    this.policy = policy;
  }

  async execute(
    toolName: string,
    input: unknown,
    mode: ModeType,
  ): Promise<ToolResult> {
    const start = Date.now();

    const permission = await this.policy.check(toolName, input, mode);
    if (!permission.allowed) {
      const result: ToolResult = {
        success: false,
        error:
          permission.reason ??
          `Tool ${toolName} is not allowed in ${mode} mode`,
      };
      this.record({ toolName, input, result, durationMs: Date.now() - start });
      return result;
    }

    try {
      const result = await this.adapter.execute(toolName, input);
      this.record({ toolName, input, result, durationMs: Date.now() - start });
      return result;
    } catch (err) {
      const result: ToolResult = {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
      this.record({ toolName, input, result, durationMs: Date.now() - start });
      return result;
    }
  }

  getAuditLog(): ToolCallEntry[] {
    return [...this.auditLog];
  }

  clearAuditLog(): void {
    this.auditLog = [];
  }

  private record(entry: Omit<ToolCallEntry, "id" | "timestamp">): void {
    this.auditLog.push({
      ...entry,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    });
  }
}

export class ModePermissionPolicy implements PermissionPolicy {
  private allowedInPlan: Set<string>;

  constructor(allowedInPlan?: string[]) {
    this.allowedInPlan = new Set(
      allowedInPlan ?? ["readFile", "listDirectory", "glob", "grep"],
    );
  }

  async check(
    toolName: string,
    _input: unknown,
    mode: ModeType,
  ): Promise<PermissionDecision> {
    if (mode === "PLAN" && !this.allowedInPlan.has(toolName)) {
      return {
        allowed: false,
        reason: `Tool ${toolName} is not available in PLAN mode`,
      };
    }
    return { allowed: true };
  }
}
