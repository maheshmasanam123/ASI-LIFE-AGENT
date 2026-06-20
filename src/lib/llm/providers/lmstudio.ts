import OpenAI from 'openai';
import {
  LLMProvider,
  LLMProviderConfig,
  LLMCompletionOptions,
  LLMCompletion,
  LLMCompletionChunk,
  LLMMessage,
  LLMTool,
} from '../types';

export class LMStudioProvider implements LLMProvider {
  name = 'lmstudio';
  models: string[] = [];
  defaultModel = 'local-model';

  private client: OpenAI;
  private config: LLMProviderConfig;
  private modelsFetched = false;

  constructor(config: LLMProviderConfig = {}) {
    this.config = {
      apiKey: config.apiKey || 'lm-studio',
      baseURL: config.baseURL || 'http://localhost:1234/v1',
      defaultModel: config.defaultModel || this.defaultModel,
      timeout: config.timeout || 120000,
      maxRetries: config.maxRetries || 3,
    };

    this.client = new OpenAI({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      maxRetries: this.config.maxRetries,
    });
  }

  private async fetchModels(): Promise<void> {
    if (this.modelsFetched) return;
    try {
      const modelsList = await this.client.models.list();
      this.models = modelsList.data.map(m => m.id);
      if (this.models.length === 0) this.models = ['local-model'];
      this.modelsFetched = true;
    } catch {
      this.models = ['local-model'];
      this.modelsFetched = true;
    }
  }

  async validateConfig(): Promise<{ valid: boolean; error?: string }> {
    try {
      await this.fetchModels();
      const model = this.models[0] || this.defaultModel;
      await this.client.chat.completions.create({ model, messages: [{ role: 'user', content: 'test' }], max_tokens: 1 });
      return { valid: true };
    } catch (error) {
      return { valid: false, error: `LM Studio validation failed: ${error instanceof Error ? error.message : String(error)}. Is LM Studio running at ${this.config.baseURL}?` };
    }
  }

  estimateTokens(messages: LLMMessage[]): number { let total = 0; for (const msg of messages) { total += Math.ceil(msg.content.length / 4); if (msg.tool_calls) for (const tc of msg.tool_calls) { total += Math.ceil(tc.function.name.length / 4); total += Math.ceil(tc.function.arguments.length / 4); } } return total; }

  private mapMessage(msg: LLMMessage): OpenAI.Chat.Completions.ChatCompletionMessageParam {
    if (msg.role === 'tool') return { role: 'tool', content: msg.content, tool_call_id: msg.tool_call_id || '' };
    if (msg.tool_calls?.length) return { role: 'assistant', content: msg.content || null, tool_calls: msg.tool_calls.map(tc => ({ id: tc.id, type: 'function' as const, function: { name: tc.function.name, arguments: tc.function.arguments } })) };
    return { role: msg.role, content: msg.content, name: msg.name };
  }

  private mapTools(tools?: LLMTool[]): OpenAI.Chat.Completions.ChatCompletionTool[] | undefined { if (!tools?.length) return undefined; return tools.map(t => ({ type: 'function' as const, function: { name: t.function.name, description: t.function.description, parameters: t.function.parameters } })); }

  async complete(options: LLMCompletionOptions): Promise<LLMCompletion> {
    await this.fetchModels();
    const model = options.model || this.config.defaultModel || this.defaultModel;
    const response = await this.client.chat.completions.create({
      model,
      messages: options.messages.map(m => this.mapMessage(m)),
      tools: this.mapTools(options.tools),
      tool_choice: options.tool_choice as any,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens,
      top_p: options.top_p,
      stop: options.stop,
      stream: false,
    });
    const choice = response.choices[0];
    const toolCalls = choice.message.tool_calls?.map(tc => ({ id: tc.id, type: 'function' as const, function: { name: tc.function.name, arguments: tc.function.arguments } }));
    return { id: response.id, choices: [{ index: 0, message: { role: choice.message.role, content: choice.message.content || '', tool_calls: toolCalls }, finish_reason: choice.finish_reason || 'stop' }], usage: { prompt_tokens: response.usage?.prompt_tokens || 0, completion_tokens: response.usage?.completion_tokens || 0, total_tokens: response.usage?.total_tokens || 0 } };
  }

  async *streamComplete(options: LLMCompletionOptions): AsyncIterable<LLMCompletionChunk> {
    await this.fetchModels();
    const stream = await this.client.chat.completions.create({
      model: options.model || this.config.defaultModel || this.defaultModel,
      messages: options.messages.map(m => this.mapMessage(m)),
      tools: this.mapTools(options.tools),
      tool_choice: options.tool_choice as any,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens,
      top_p: options.top_p,
      stop: options.stop,
      stream: true,
    });
    for await (const chunk of stream) { const choice = chunk.choices[0]; if (!choice) continue; const delta: LLMCompletionChunk['choices'][0]['delta'] = {}; if (choice.delta.content) delta.content = choice.delta.content; if (choice.delta.role) delta.role = choice.delta.role; if (choice.delta.tool_calls) delta.tool_calls = choice.delta.tool_calls.map(tc => ({ id: tc.id || '', type: 'function' as const, function: { name: tc.function?.name || '', arguments: tc.function?.arguments || '' } })); yield { id: chunk.id, choices: [{ index: 0, delta, finish_reason: choice.finish_reason }] }; }
  }
}

export function createLMStudioProvider(config?: LLMProviderConfig): LMStudioProvider { return new LMStudioProvider(config); }