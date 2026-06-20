export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface LLMTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}

export interface LLMCompletionOptions {
  model: string;
  messages: LLMMessage[];
  tools?: LLMTool[];
  tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stream?: boolean;
  stop?: string[];
}

export interface LLMCompletionChunk {
  id: string;
  choices: {
    delta: {
      content?: string;
      tool_calls?: ToolCall[];
      role?: string;
    };
    index: number;
    finish_reason: string | null;
  }[];
}

export interface LLMCompletion {
  id: string;
  choices: {
    message: LLMMessage;
    finish_reason: string;
    index: number;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface LLMProvider {
  name: string;
  models: string[];
  defaultModel: string;
  complete(options: LLMCompletionOptions): Promise<LLMCompletion>;
  streamComplete(options: LLMCompletionOptions): AsyncIterable<LLMCompletionChunk>;
  validateConfig(): Promise<{ valid: boolean; error?: string }>;
  estimateTokens(messages: LLMMessage[]): number;
}

export interface LLMProviderConfig {
  apiKey?: string;
  baseURL?: string;
  organization?: string;
  defaultModel?: string;
  timeout?: number;
  maxRetries?: number;
}

export interface ProviderRegistry {
  providers: Map<string, LLMProvider>;
  register(provider: LLMProvider): void;
  get(name: string): LLMProvider | undefined;
  list(): LLMProvider[];
  getDefault(): LLMProvider | undefined;
  setDefault(name: string): boolean;
}