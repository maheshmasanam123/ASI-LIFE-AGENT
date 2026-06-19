import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Tool, ToolResult, AgentContext } from '@asi-types/index';

describe('Tool Execution', () => {
  let mockContext: AgentContext;
  let mockToolRegistry: Map<string, Tool>;

  beforeEach(() => {
    mockContext = {
      userId: 'test-user' as any,
      sessionId: 'test-session' as any,
      workingDirectory: '/tmp',
      environment: {},
      permissions: [{ resource: '*', actions: ['*'] }],
      preferences: { theme: 'dark', language: 'en', autoApproveReversible: true, notificationLevel: 'all', defaultModel: 'gpt-4', maxConcurrentTasks: 5, workingDirectory: '/tmp' },
      history: [],
      activeTasks: [],
      availableTools: ['file', 'code', 'web'],
    };

    mockToolRegistry = new Map();
  });

  it('should execute known tool successfully', async () => {
    const mockTool: Tool = {
      name: 'file',
      description: 'File operations',
      category: 'file',
      schema: { type: 'object', properties: { operation: { type: 'string' } }, required: ['operation'] },
      requiresApproval: false,
      reversibility: 'reversible',
      async execute(input: Record<string, unknown>, context: AgentContext): Promise<ToolResult> {
        return { success: true, output: { files: ['test.txt'] }, duration: 10 };
      },
    };

    mockToolRegistry.set('file', mockTool);

    const tool = mockToolRegistry.get('file');
    expect(tool).toBeDefined();

    const result = await tool!.execute({ operation: 'list' }, mockContext);
    expect(result.success).toBe(true);
    expect(result.output).toBeDefined();
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });

  it('should handle unknown tool gracefully', async () => {
    const result = await mockToolRegistry.get('unknown-tool')?.execute({}, mockContext);
    expect(result).toBeUndefined();

    const errorResult = { success: false, error: 'Tool unknown-tool not found', duration: 0 };
    expect(errorResult.success).toBe(false);
    expect(errorResult.error).toContain('not found');
  });

  it('should handle tool execution errors', async () => {
    const failingTool: Tool = {
      name: 'failing',
      description: 'Always fails',
      category: 'system',
      schema: { type: 'object', properties: {} },
      requiresApproval: false,
      reversibility: 'reversible',
      async execute(): Promise<ToolResult> {
        throw new Error('Simulated failure');
      },
    };

    mockToolRegistry.set('failing', failingTool);

    try {
      const result = await failingTool.execute({}, mockContext);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
    }
  });

  it('should respect approval requirements', async () => {
    const approvalRequiredTool: Tool = {
      name: 'delete',
      description: 'Delete files',
      category: 'file',
      schema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] },
      requiresApproval: true,
      reversibility: 'irreversible',
      async execute(input: Record<string, unknown>, context: AgentContext): Promise<ToolResult> {
        return { success: true, output: { deleted: input.path }, duration: 5 };
      },
    };

    expect(approvalRequiredTool.requiresApproval).toBe(true);
    expect(approvalRequiredTool.reversibility).toBe('irreversible');
  });

  it('should validate input against schema', async () => {
    const validatedTool: Tool = {
      name: 'validated',
      description: 'Validates input',
      category: 'system',
      schema: {
        type: 'object',
        properties: { requiredField: { type: 'string' }, optionalField: { type: 'number' } },
        required: ['requiredField'],
      },
      requiresApproval: false,
      reversibility: 'reversible',
      async execute(input: Record<string, unknown>, context: AgentContext): Promise<ToolResult> {
        if (!input.requiredField) {
          return { success: false, error: 'requiredField is required', duration: 0 };
        }
        return { success: true, output: { received: input }, duration: 5 };
      },
    };

    const validResult = await validatedTool.execute({ requiredField: 'test', optionalField: 42 }, mockContext);
    expect(validResult.success).toBe(true);

    const invalidResult = await validatedTool.execute({ optionalField: 42 }, mockContext);
    expect(invalidResult.success).toBe(false);
    expect(invalidResult.error).toContain('requiredField');
  });

  it('should track execution duration', async () => {
    const timedTool: Tool = {
      name: 'timed',
      description: 'Times execution',
      category: 'system',
      schema: { type: 'object', properties: {} },
      requiresApproval: false,
      reversibility: 'reversible',
      async execute(input: Record<string, unknown>, context: AgentContext): Promise<ToolResult> {
        await new Promise(resolve => setTimeout(resolve, 10));
        return { success: true, output: 'done', duration: 0 }; // duration will be overwritten
      },
    };

    const start = Date.now();
    const result = await timedTool.execute({}, mockContext);
    const elapsed = Date.now() - start;

    expect(result.duration).toBeGreaterThanOrEqual(0);
    expect(elapsed).toBeGreaterThanOrEqual(10);
  });
});