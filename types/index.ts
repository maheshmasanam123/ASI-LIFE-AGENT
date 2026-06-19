export type UUID = string & { readonly __brand: unique symbol };
export const createUUID = (): UUID => crypto.randomUUID() as UUID;

export interface BaseEntity {
  id: UUID;
  createdAt: Date;
  updatedAt: Date;
}

export type AgentStatus = 'idle' | 'thinking' | 'working' | 'waiting_approval' | 'completed' | 'error' | 'paused';
export type TaskPriority = 'critical' | 'high' | 'medium' | 'low' | 'background';
export type TaskStatus = 'pending' | 'running' | 'waiting_approval' | 'completed' | 'failed' | 'cancelled';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired';
export type Reversibility = 'reversible' | 'irreversible' | 'semi_reversible';

export interface AgentCapability {
  name: string;
  description: string;
  category: CapabilityCategory;
  inputSchema: ZodSchema;
  outputSchema: ZodSchema;
  requiresApproval: boolean;
  reversibility: Reversibility;
  estimatedDuration?: number;
  tags: string[];
}

export type CapabilityCategory =
  | 'system'
  | 'file'
  | 'code'
  | 'web'
  | 'communication'
  | 'analysis'
  | 'creative'
  | 'automation'
  | 'learning'
  | 'security'
  | 'deployment'
  | 'data';

export interface ZodSchema {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null' | 'any';
  properties?: Record<string, ZodSchema>;
  items?: ZodSchema;
  required?: string[];
  enum?: unknown[];
  description?: string;
}

export interface AgentTask extends BaseEntity {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedAgentId?: UUID;
  parentTaskId?: UUID;
  subtasks: UUID[];
  capabilities: string[];
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  progress: number;
  approvalRequired: boolean;
  approvalId?: UUID;
  startedAt?: Date;
  completedAt?: Date;
  metadata: Record<string, unknown>;
}

export interface ApprovalRequest extends BaseEntity {
  taskId: UUID;
  agentId: UUID;
  title: string;
  description: string;
  action: string;
  reversibility: Reversibility;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  preview: Record<string, unknown>;
  consequences: string[];
  rollbackPlan?: string;
  status: ApprovalStatus;
  requestedAt: Date;
  respondedAt?: Date;
  response?: string;
  metadata: Record<string, unknown>;
}

export interface AgentMessage extends BaseEntity {
  agentId: UUID;
  taskId?: UUID;
  role: 'system' | 'user' | 'assistant' | 'tool' | 'approval';
  content: string;
  type: 'text' | 'code' | 'json' | 'markdown' | 'image' | 'file' | 'progress' | 'thought';
  metadata: Record<string, unknown>;
  attachments?: Attachment[];
}

export interface Attachment {
  id: UUID;
  name: string;
  type: string;
  size: number;
  url: string;
  preview?: string;
}

export interface AgentContext {
  userId: UUID;
  sessionId: UUID;
  workingDirectory: string;
  environment: Record<string, string>;
  permissions: Permission[];
  preferences: UserPreferences;
  history: AgentMessage[];
  activeTasks: UUID[];
  availableTools: string[];
}

export interface Permission {
  resource: string;
  actions: string[];
  conditions?: Record<string, unknown>;
}

export interface UserPreferences {
  theme: 'dark' | 'light' | 'system';
  language: string;
  autoApproveReversible: boolean;
  notificationLevel: 'all' | 'important' | 'critical' | 'none';
  defaultModel: string;
  maxConcurrentTasks: number;
  workingDirectory: string;
}

export interface ToolResult {
  success: boolean;
  output?: unknown;
  error?: string;
  duration: number;
  metadata?: Record<string, unknown>;
}

export interface Tool {
  name: string;
  description: string;
  category: CapabilityCategory;
  schema: ZodSchema;
  execute: (input: Record<string, unknown>, context: AgentContext) => Promise<ToolResult>;
  requiresApproval: boolean;
  reversibility: Reversibility;
}

export interface AgentConfig {
  id: UUID;
  name: string;
  description: string;
  version: string;
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  capabilities: AgentCapability[];
  tools: string[];
  memory: MemoryConfig;
  behavior: BehaviorConfig;
}

export interface MemoryConfig {
  type: 'short' | 'long' | 'hybrid' | 'vector';
  maxMessages: number;
  maxTokens: number;
  persistence: boolean;
  vectorStore?: string;
}

export interface BehaviorConfig {
  autonomous: boolean;
  proactive: boolean;
  verbosity: 'minimal' | 'normal' | 'verbose';
  reasoning: 'fast' | 'balanced' | 'deep';
  creativity: number;
  riskTolerance: 'conservative' | 'balanced' | 'aggressive';
}

export interface SystemMetrics {
  cpu: number;
  memory: number;
  disk: number;
  network: { up: number; down: number };
  processes: number;
  uptime: number;
}

export interface AgentState {
  id: UUID;
  config: AgentConfig;
  status: AgentStatus;
  currentTask?: UUID;
  context: AgentContext;
  metrics: SystemMetrics;
  lastActivity: Date;
  errorCount: number;
  taskCount: number;
}

export interface DashboardWidget {
  id: UUID;
  type: WidgetType;
  title: string;
  position: { x: number; y: number; w: number; h: number };
  config: Record<string, unknown>;
  visible: boolean;
}

export type WidgetType =
  | 'agent_status'
  | 'task_queue'
  | 'system_metrics'
  | 'chat'
  | 'code_editor'
  | 'file_tree'
  | 'terminal'
  | 'approval_queue'
  | 'memory_visualizer'
  | 'capability_graph'
  | 'performance_charts'
  | 'log_stream'
  | 'custom';

export interface WebSocketEvent {
  type: string;
  payload: unknown;
  timestamp: Date;
  correlationId?: UUID;
}

export interface AgentEvent extends WebSocketEvent {
  type: 'agent.status' | 'agent.task.start' | 'agent.task.progress' | 'agent.task.complete' | 'agent.task.error' | 'agent.approval.request' | 'agent.approval.response' | 'agent.message' | 'agent.thought';
}

export interface ToolEvent extends WebSocketEvent {
  type: 'tool.invoke' | 'tool.result' | 'tool.error';
}

export interface SystemEvent extends WebSocketEvent {
  type: 'system.metrics' | 'system.alert' | 'system.log';
}