import { EventEmitter } from 'events';
import { createUUID, UUID, AgentConfig, AgentState, AgentStatus, AgentTask, TaskStatus, TaskPriority, AgentContext, AgentMessage, ApprovalRequest, ApprovalStatus, Reversibility, Tool, ToolResult, SystemMetrics, CapabilityCategory, ZodSchema, AgentCapability, MemoryConfig, BehaviorConfig } from '@asi-types/index';
import { BaseAgent, createAgentConfig } from '@core/agent';

export interface OrchestratorConfig {
  maxConcurrentAgents: number;
  defaultAgentConfig: Partial<AgentConfig>;
  globalTools: Tool[];
  approvalRequiredFor: Reversibility[];
  autoStart: boolean;
  persistence: boolean;
}

export class AgentOrchestrator extends EventEmitter {
  private agents: Map<UUID, BaseAgent> = new Map();
  private config: OrchestratorConfig;
  private running: boolean = false;
  private taskQueue: AgentTask[] = [];
  private globalContext: AgentContext;
  private approvalQueue: ApprovalRequest[] = [];
  private metricsInterval: NodeJS.Timeout | null = null;
  private websocketServer: any = null;

  constructor(config: Partial<OrchestratorConfig> = {}) {
    super();
    this.config = {
      maxConcurrentAgents: 10,
      defaultAgentConfig: {},
      globalTools: [],
      approvalRequiredFor: ['irreversible', 'semi_reversible'],
      autoStart: true,
      persistence: true,
      ...config,
    };
    this.globalContext = this.createGlobalContext();
  }

  private createGlobalContext(): AgentContext {
    return {
      userId: createUUID(),
      sessionId: createUUID(),
      workingDirectory: process.cwd(),
      environment: { ...process.env } as Record<string, string>,
      permissions: [{ resource: '*', actions: ['*'] }],
      preferences: {
        theme: 'dark',
        language: 'en',
        autoApproveReversible: true,
        notificationLevel: 'all',
        defaultModel: 'gpt-4',
        maxConcurrentTasks: 10,
        workingDirectory: process.cwd(),
      },
      history: [],
      activeTasks: [],
      availableTools: [],
    };
  }

  public async initialize(): Promise<void> {
    await this.loadGlobalTools();
    if (this.config.autoStart) {
      await this.start();
    }
    
    // Create default Life AI agent if none exists
    if (this.agents.size === 0) {
      await this.createDefaultLifeAgent();
    }
  }
  
  private async createDefaultLifeAgent(): Promise<void> {
    const lifeAgentConfig = createAgentConfig({
      name: 'Life AI',
      description: 'Autonomous life management agent with full system access',
      capabilities: [
        { name: 'file', description: 'File system operations', category: 'file', inputSchema: { type: 'object', properties: {} }, outputSchema: { type: 'object', properties: {} }, requiresApproval: false, reversibility: 'reversible', tags: ['file'] },
        { name: 'code', description: 'Code execution and analysis', category: 'code', inputSchema: { type: 'object', properties: {} }, outputSchema: { type: 'object', properties: {} }, requiresApproval: false, reversibility: 'reversible', tags: ['code'] },
        { name: 'web', description: 'Web browsing and search', category: 'web', inputSchema: { type: 'object', properties: {} }, outputSchema: { type: 'object', properties: {} }, requiresApproval: false, reversibility: 'reversible', tags: ['web'] },
        { name: 'terminal', description: 'Terminal/shell access', category: 'system', inputSchema: { type: 'object', properties: {} }, outputSchema: { type: 'object', properties: {} }, requiresApproval: true, reversibility: 'semi_reversible', tags: ['terminal'] },
        { name: 'system', description: 'System monitoring', category: 'system', inputSchema: { type: 'object', properties: {} }, outputSchema: { type: 'object', properties: {} }, requiresApproval: false, reversibility: 'reversible', tags: ['system'] },
        { name: 'web', description: 'Web access', category: 'web', inputSchema: { type: 'object', properties: {} }, outputSchema: { type: 'object', properties: {} }, requiresApproval: false, reversibility: 'reversible', tags: ['web'] },
      ],
      behavior: {
        autonomous: true,
        proactive: true,
        verbosity: 'verbose',
        reasoning: 'deep',
        creativity: 0.8,
        riskTolerance: 'conservative',
      },
    });
    
    const lifeAgent = await this.createAgent(lifeAgentConfig);
    console.log(`[Life AI] Default agent created: ${lifeAgent.getConfig().name} (${lifeAgent.getConfig().id})`);
  }

  private async loadGlobalTools(): Promise<void> {
    for (const tool of this.config.globalTools) {
      this.registerGlobalTool(tool);
    }
  }

  public registerGlobalTool(tool: Tool): void {
    for (const agent of this.agents.values()) {
      agent.registerTool(tool);
    }
    this.globalContext.availableTools.push(tool.name);
  }

  public async createAgent(config: Partial<AgentConfig> = {}): Promise<BaseAgent> {
    if (this.agents.size >= this.config.maxConcurrentAgents) {
      throw new Error('Maximum concurrent agents reached');
    }

    const agentConfig = createAgentConfig({
      ...this.config.defaultAgentConfig,
      ...config,
    });

    const agent = new AutonomousAgent(agentConfig);
    
    for (const tool of this.config.globalTools) {
      agent.registerTool(tool);
    }

    this.setupAgentListeners(agent);
    this.agents.set(agentConfig.id, agent);
    
    this.emit('agent.created', agent.getState());
    return agent;
  }

  private setupAgentListeners(agent: BaseAgent): void {
    agent.on('status.change', (status: AgentStatus) => {
      this.emit('agent.status', { agentId: agent.getConfig().id, status });
    });

    agent.on('task.queued', (task: AgentTask) => {
      this.emit('task.queued', { agentId: agent.getConfig().id, task });
    });

    agent.on('task.complete', (task: AgentTask) => {
      this.emit('task.complete', { agentId: agent.getConfig().id, task });
      this.globalContext.activeTasks = this.globalContext.activeTasks.filter(t => t !== task.id);
    });

    agent.on('task.error', ({ task, error }: { task: AgentTask; error: Error }) => {
      this.emit('task.error', { agentId: agent.getConfig().id, task, error });
    });

    agent.on('approval.request', (approval: ApprovalRequest) => {
      this.approvalQueue.push(approval);
      this.emit('approval.request', approval);
    });
  }

  public async start(): Promise<void> {
    if (this.running) return;
    this.running = true;
    
    for (const agent of this.agents.values()) {
      await agent.start();
    }

    this.startMetricsCollection();
    this.emit('started');
  }

  public async stop(): Promise<void> {
    this.running = false;
    
    for (const agent of this.agents.values()) {
      await agent.stop();
    }

    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }

    this.emit('stopped');
  }

  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(async () => {
      const metrics = await this.collectGlobalMetrics();
      this.emit('metrics', metrics);
    }, 5000);
  }

  private async collectGlobalMetrics(): Promise<SystemMetrics> {
    const agentMetrics = Array.from(this.agents.values()).map(a => a.getState().metrics);
    return {
      cpu: agentMetrics.reduce((sum, m) => sum + m.cpu, 0) / Math.max(agentMetrics.length, 1),
      memory: agentMetrics.reduce((sum, m) => sum + m.memory, 0) / Math.max(agentMetrics.length, 1),
      disk: agentMetrics.reduce((sum, m) => sum + m.disk, 0) / Math.max(agentMetrics.length, 1),
      network: { up: 0, down: 0 },
      processes: this.agents.size,
      uptime: process.uptime(),
    };
  }

  public async submitTask(task: Omit<AgentTask, 'id' | 'createdAt' | 'updatedAt' | 'subtasks' | 'progress' | 'metadata'>): Promise<AgentTask> {
    const availableAgents = Array.from(this.agents.values()).filter(a => a.getState().status === 'idle' || a.getState().status === 'thinking');
    
    if (availableAgents.length === 0) {
      const newAgent = await this.createAgent();
      availableAgents.push(newAgent);
    }

    const targetAgent = availableAgents[0];
    return targetAgent.addTask(task);
  }

  public async respondToApproval(approvalId: UUID, status: ApprovalStatus, response?: string): Promise<void> {
    const approval = this.approvalQueue.find(a => a.id === approvalId);
    if (!approval) throw new Error('Approval not found');

    approval.status = status;
    approval.respondedAt = new Date();
    approval.response = response;
    this.approvalQueue = this.approvalQueue.filter(a => a.id !== approvalId);

    this.emit('approval.response', approval);
  }

  public getAgent(agentId: UUID): BaseAgent | undefined {
    return this.agents.get(agentId);
  }

  public getAllAgents(): BaseAgent[] {
    return Array.from(this.agents.values());
  }

  public getAgentStates(): AgentState[] {
    return Array.from(this.agents.values()).map(a => a.getState());
  }

  public getPendingApprovals(): ApprovalRequest[] {
    return [...this.approvalQueue];
  }

  public getGlobalContext(): AgentContext {
    return { ...this.globalContext };
  }

  public async broadcastMessage(message: Omit<AgentMessage, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    const fullMessage: AgentMessage = {
      ...message,
      id: createUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.globalContext.history.push(fullMessage);
    this.emit('message.broadcast', fullMessage);
  }

  public isRunning(): boolean {
    return this.running;
  }
}

class AutonomousAgent extends BaseAgent {
  protected async executeTask(task: AgentTask): Promise<void> {
    this.setStatus('thinking');
    
    const plan = await this.planTask(task);
    this.setStatus('working');

    for (let i = 0; i < plan.length; i++) {
      const step = plan[i];
      task.progress = Math.round((i / plan.length) * 100);
      this.emit('task.progress', { task, progress: task.progress, step });
      
      await this.executeStep(step, task);
    }

    task.progress = 100;
  }

  private async planTask(task: AgentTask): Promise<Array<{ action: string; tool?: string; input?: Record<string, unknown> }>> {
    return [
      { action: 'analyze', tool: 'analysis', input: { task: task.description } },
      { action: 'execute', tool: task.capabilities[0], input: task.input },
      { action: 'verify', tool: 'validation', input: { result: 'output' } },
    ];
  }

  private async executeStep(step: { action: string; tool?: string; input?: Record<string, unknown> }, task: AgentTask): Promise<void> {
    if (step.tool) {
      const result = await this.executeTool(step.tool, step.input || {});
      if (!result.success) {
        throw new Error(`Step failed: ${result.error}`);
      }
      task.output = { ...task.output, [step.action]: result.output };
    }
  }
}

const orchestrator = new AgentOrchestrator({
  maxConcurrentAgents: 5,
  autoStart: true,
});

orchestrator.initialize().catch(console.error);

process.on('SIGINT', async () => {
  await orchestrator.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await orchestrator.stop();
  process.exit(0);
});

export { orchestrator };