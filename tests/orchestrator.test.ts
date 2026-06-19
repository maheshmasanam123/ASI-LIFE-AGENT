import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createUUID } from '@asi-types/index';
import { AgentTask, TaskStatus, TaskPriority, AgentStatus, AgentConfig, AgentState } from '@asi-types/index';

describe('Orchestrator Task Lifecycle', () => {
  let mockAgents: Map<string, AgentState>;
  let taskQueue: AgentTask[];
  let currentTask: AgentTask | null;

  beforeEach(() => {
    mockAgents = new Map();
    taskQueue = [];
    currentTask = null;
  });

  it('should enqueue tasks with correct priority ordering', () => {
    const tasks: AgentTask[] = [
      {
        id: createUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
        title: 'Low priority task',
        description: '',
        status: 'pending',
        priority: 'low',
        capabilities: ['test'],
        input: {},
        approvalRequired: false,
        subtasks: [],
        progress: 0,
        metadata: {},
      },
      {
        id: createUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
        title: 'Critical task',
        description: '',
        status: 'pending',
        priority: 'critical',
        capabilities: ['test'],
        input: {},
        approvalRequired: false,
        subtasks: [],
        progress: 0,
        metadata: {},
      },
      {
        id: createUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
        title: 'High priority task',
        description: '',
        status: 'pending',
        priority: 'high',
        capabilities: ['test'],
        input: {},
        approvalRequired: false,
        subtasks: [],
        progress: 0,
        metadata: {},
      },
    ];

    const priorityOrder = { critical: 5, high: 4, medium: 3, low: 2, background: 1 };
    tasks.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);

    expect(tasks[0].priority).toBe('critical');
    expect(tasks[1].priority).toBe('high');
    expect(tasks[2].priority).toBe('low');
  });

  it('should track task status transitions', () => {
    const task: AgentTask = {
      id: createUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
      title: 'Test task',
      description: '',
      status: 'pending',
      priority: 'medium',
      capabilities: ['test'],
      input: {},
      approvalRequired: false,
      subtasks: [],
      progress: 0,
      metadata: {},
    };

    expect(task.status).toBe('pending');

    task.status = 'running';
    task.startedAt = new Date();
    expect(task.status).toBe('running');

    task.status = 'completed';
    task.completedAt = new Date();
    task.progress = 100;
    expect(task.status).toBe('completed');
    expect(task.progress).toBe(100);

    task.status = 'failed';
    task.error = 'Test error';
    expect(task.status).toBe('failed');
    expect(task.error).toBeDefined();
  });

  it('should handle approval-required tasks', () => {
    const task: AgentTask = {
      id: createUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
      title: 'Needs approval',
      description: '',
      status: 'waiting_approval',
      priority: 'high',
      capabilities: ['test'],
      input: {},
      approvalRequired: true,
      approvalId: createUUID(),
      subtasks: [],
      progress: 0,
      metadata: {},
    };

    expect(task.status).toBe('waiting_approval');
    expect(task.approvalRequired).toBe(true);
    expect(task.approvalId).toBeDefined();
  });

  it('should manage agent states', () => {
    const agentConfig: AgentConfig = {
      id: createUUID(),
      name: 'Test Agent',
      description: 'Test agent',
      version: '1.0.0',
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 4000,
      systemPrompt: 'Test',
      capabilities: [],
      tools: [],
      memory: { type: 'hybrid', maxMessages: 100, maxTokens: 8000, persistence: true },
      behavior: { autonomous: true, proactive: true, verbosity: 'normal', reasoning: 'balanced', creativity: 0.7, riskTolerance: 'balanced' },
    };

    const agentState: AgentState = {
      id: agentConfig.id,
      config: agentConfig,
      status: 'idle',
      context: {
        userId: createUUID(),
        sessionId: createUUID(),
        workingDirectory: '/tmp',
        environment: {},
        permissions: [],
        preferences: { theme: 'dark', language: 'en', autoApproveReversible: true, notificationLevel: 'all', defaultModel: 'gpt-4', maxConcurrentTasks: 5, workingDirectory: '/tmp' },
        history: [],
        activeTasks: [],
        availableTools: [],
      },
      metrics: { cpu: 0, memory: 0, disk: 0, network: { up: 0, down: 0 }, processes: 0, uptime: 0 },
      lastActivity: new Date(),
      errorCount: 0,
      taskCount: 0,
    };

    expect(agentState.status).toBe('idle');

    agentState.status = 'working';
    agentState.currentTask = createUUID();
    expect(agentState.status).toBe('working');
    expect(agentState.currentTask).toBeDefined();

    agentState.status = 'waiting_approval';
    expect(agentState.status).toBe('waiting_approval');

    agentState.status = 'completed';
    agentState.taskCount++;
    expect(agentState.status).toBe('completed');
    expect(agentState.taskCount).toBe(1);

    agentState.status = 'error';
    agentState.errorCount++;
    expect(agentState.status).toBe('error');
    expect(agentState.errorCount).toBe(1);
  });
});