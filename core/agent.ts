import { EventEmitter } from 'events';
import {
  UUID,
  createUUID,
  AgentConfig,
  AgentState,
  AgentStatus,
  AgentTask,
  TaskStatus,
  TaskPriority,
  AgentContext,
  AgentMessage,
  AgentCapability,
  Tool,
  ToolResult,
  ApprovalRequest,
  ApprovalStatus,
  Reversibility,
  ZodSchema,
  CapabilityCategory,
  MemoryConfig,
  BehaviorConfig,
  SystemMetrics,
} from '@asi-types/index';

export abstract class BaseAgent extends EventEmitter {
  protected config: AgentConfig;
  protected state: AgentState;
  protected tools: Map<string, Tool> = new Map();
  protected capabilities: Map<string, AgentCapability> = new Map();
  protected memory: AgentMessage[] = [];
  protected running: boolean = false;
  protected taskQueue: AgentTask[] = [];
  protected currentTask: AgentTask | null = null;

  constructor(config: AgentConfig) {
    super();
    this.config = config;
    this.state = this.initializeState();
    this.registerCapabilities(config.capabilities);
  }

  protected initializeState(): AgentState {
    return {
      id: this.config.id,
      config: this.config,
      status: 'idle',
      context: this.createDefaultContext(),
      metrics: this.getInitialMetrics(),
      lastActivity: new Date(),
      errorCount: 0,
      taskCount: 0,
    };
  }

  protected createDefaultContext(): AgentContext {
    return {
      userId: createUUID(),
      sessionId: createUUID(),
      workingDirectory: process.cwd(),
      environment: { ...process.env } as Record<string, string>,
      permissions: [],
      preferences: {
        theme: 'dark',
        language: 'en',
        autoApproveReversible: true,
        notificationLevel: 'important',
        defaultModel: this.config.model,
        maxConcurrentTasks: 5,
        workingDirectory: process.cwd(),
      },
      history: [],
      activeTasks: [],
      availableTools: Array.from(this.tools.keys()),
    };
  }

  protected getInitialMetrics(): SystemMetrics {
    return {
      cpu: 0,
      memory: 0,
      disk: 0,
      network: { up: 0, down: 0 },
      processes: 0,
      uptime: 0,
    };
  }

  protected registerCapabilities(capabilities: AgentCapability[]): void {
    for (const cap of capabilities) {
      this.capabilities.set(cap.name, cap);
    }
  }

  public registerTool(tool: Tool): void {
    this.tools.set(tool.name, tool);
    this.state.context.availableTools = Array.from(this.tools.keys());
  }

  public async start(): Promise<void> {
    if (this.running) return;
    this.running = true;
    this.setStatus('idle');
    this.emit('started', this.state);
    await this.runLoop();
  }

  public async stop(): Promise<void> {
    this.running = false;
    this.setStatus('paused');
    this.emit('stopped', this.state);
  }

  protected async runLoop(): Promise<void> {
    while (this.running) {
      await this.processQueue();
      await this.updateMetrics();
      await this.sleep(100);
    }
  }

  protected async processQueue(): Promise<void> {
    if (this.currentTask || this.taskQueue.length === 0) return;

    this.currentTask = this.taskQueue.shift()!;
    this.state.currentTask = this.currentTask.id;
    this.setStatus('working');
    this.state.context.activeTasks.push(this.currentTask.id);

    try {
      await this.executeTask(this.currentTask);
      this.currentTask.status = 'completed';
      this.currentTask.completedAt = new Date();
      this.currentTask.progress = 100;
      this.emit('task.complete', this.currentTask);
    } catch (error) {
      this.currentTask.status = 'failed';
      this.currentTask.error = error instanceof Error ? error.message : String(error);
      this.state.errorCount++;
      this.emit('task.error', { task: this.currentTask, error });
    } finally {
      this.state.context.activeTasks = this.state.context.activeTasks.filter(
        (id) => id !== this.currentTask!.id
      );
      this.currentTask = null;
      this.state.currentTask = undefined;
      this.setStatus(this.taskQueue.length > 0 ? 'working' : 'idle');
    }
  }

  protected abstract executeTask(task: AgentTask): Promise<void>;

  public async addTask(task: Omit<AgentTask, 'id' | 'createdAt' | 'updatedAt' | 'subtasks' | 'progress' | 'metadata'>): Promise<AgentTask> {
    const newTask: AgentTask = {
      ...task,
      id: createUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
      subtasks: [],
      progress: 0,
      metadata: {},
    };
    this.taskQueue.push(newTask);
    this.taskQueue.sort((a, b) => this.priorityWeight(b.priority) - this.priorityWeight(a.priority));
    this.emit('task.queued', newTask);
    return newTask;
  }

  protected priorityWeight(priority: TaskPriority): number {
    const weights = { critical: 5, high: 4, medium: 3, low: 2, background: 1 };
    return weights[priority];
  }

  protected setStatus(status: AgentStatus): void {
    this.state.status = status;
    this.state.lastActivity = new Date();
    this.emit('status.change', status);
  }

  protected async updateMetrics(): Promise<void> {
    this.state.metrics = await this.collectMetrics();
  }

  protected async collectMetrics(): Promise<SystemMetrics> {
    return this.getInitialMetrics();
  }

  protected async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  public getState(): AgentState {
    return { ...this.state };
  }

  public getConfig(): AgentConfig {
    return { ...this.config };
  }

  public getCapabilities(): AgentCapability[] {
    return Array.from(this.capabilities.values());
  }

  public getTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  protected addToMemory(message: AgentMessage): void {
    this.memory.push(message);
    if (this.memory.length > this.config.memory.maxMessages) {
      this.memory = this.memory.slice(-this.config.memory.maxMessages);
    }
  }

  protected getMemory(): AgentMessage[] {
    return [...this.memory];
  }

  protected async requestApproval(request: Omit<ApprovalRequest, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'requestedAt'>): Promise<ApprovalRequest> {
    const approval: ApprovalRequest = {
      ...request,
      id: createUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'pending',
      requestedAt: new Date(),
    };
    this.setStatus('waiting_approval');
    this.emit('approval.request', approval);
    return approval;
  }

  protected async executeTool(name: string, input: Record<string, unknown>): Promise<ToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return { success: false, error: `Tool ${name} not found`, duration: 0 };
    }

    const startTime = Date.now();
    try {
      const result = await tool.execute(input, this.state.context);
      return { ...result, duration: Date.now() - startTime };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      };
    }
  }
}

export function createAgentConfig(overrides: Partial<AgentConfig> = {}): AgentConfig {
  const defaultMemory: MemoryConfig = {
    type: 'hybrid',
    maxMessages: 100,
    maxTokens: 8000,
    persistence: true,
  };

  const defaultBehavior: BehaviorConfig = {
    autonomous: true,
    proactive: true,
    verbosity: 'normal',
    reasoning: 'balanced',
    creativity: 0.7,
    riskTolerance: 'balanced',
  };

  return {
    id: createUUID(),
    name: 'ASI Life Agent',
    description: 'Autonomous AI agent for life management',
    version: '1.0.0',
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 4000,
    systemPrompt: `You are an advanced autonomous AI agent capable of handling 99.99% of human needs. 
You have access to comprehensive tools for system operations, file management, code execution, web access, communication, and analysis.
For the 0.01% of irreversible actions, you must request user approval with clear consequences and rollback plans.
Operate continuously, proactively, and with maximum capability.`,
    capabilities: [],
    tools: [],
    memory: defaultMemory,
    behavior: defaultBehavior,
    ...overrides,
  };
}