import { CohereClient } from 'cohere-ai';
import {
  LLMProvider,
  LLMProviderConfig,
  LLMCompletionOptions,
  LLMCompletion,
  LLMCompletionChunk,
  LLMMessage,
  LLMTool,
} from '../types';

export class CohereProvider implements LLMProvider {
  name = 'cohere';
  models = [
    'command-r-plus',
    'command-r',
    'command-light',
    'command-nightly',
  ];
  defaultModel = 'command-r-plus';

  private client: CohereClient;
  private config: LLMProviderConfig;

  constructor(config: LLMProviderConfig = {}) {
    this.config = {
      apiKey: config.apiKey || process.env.COHERE_API_KEY,
      baseURL: config.baseURL,
      defaultModel: config.defaultModel || this.defaultModel,
      timeout: config.timeout || 60000,
      maxRetries: config.maxRetries || 3,
    };

    this.client = new CohereClient({ token: this.config.apiKey || '' });
  }

  async validateConfig(): Promise<{ valid: boolean; error?: string }> {
    if (!this.config.apiKey) { return { valid: false, error: 'Cohere API key not configured. Set COHERE_API_KEY.' }; }
    try { await this.client.chat({ model: this.defaultModel, message: 'test', maxTokens: 1 }); return { valid: true }; }
    catch (error) { return { valid: false, error: `Cohere validation failed: ${error instanceof Error ? error.message : String(error)}` }; }
  }

  estimateTokens(messages: LLMMessage[]): number { let total = 0; for (const msg of messages) { total += Math.ceil(msg.content.length / 4); if (msg.tool_calls) for (const tc of msg.tool_calls) { total += Math.ceil(tc.function.name.length / 4); total += Math.ceil(tc.function.arguments.length / 4); } } return total; }

  private mapMessages(messages: LLMMessage[]): { role: 'USER' | 'CHATBOT' | 'SYSTEM'; message: string }[] {
    return messages.map(m => {
      if (m.role === 'system') return { role: 'SYSTEM', message: m.content };
      if (m.role === 'assistant') return { role: 'CHATBOT', message: m.content };
      return { role: 'USER', message: m.content };
    });
  }

  async complete(options: LLMCompletionOptions): Promise<LLMCompletion> {
    const model = options.model || this.config.defaultModel || this.defaultModel;
    const chatHistory = this.mapMessages(options.messages.slice(0, -1));
    const message = options.messages[options.messages.length - 1]?.content || '';

    const response = await this.client.chat({
      model,
      message,
      chatHistory,
      temperature: options.temperature ?? 0.7,
      maxTokens: options.max_tokens,
      p: options.top_p,
      stopSequences: options.stop,
    });

    return {
      id: response.generationId || `cohere-${Date.now()}`,
      choices: [{ index: 0, message: { role: 'assistant', content: response.text || '', tool_calls: undefined }, finish_reason: response.finishReason || 'COMPLETE' }],
      usage: { prompt_tokens: response.meta?.tokens?.inputTokens || 0, completion_tokens: response.meta?.tokens?.outputTokens || 0, total_tokens: (response.meta?.tokens?.inputTokens || 0) + (response.meta?.tokens?.outputTokens || 0) },
    };
  }

  async *streamComplete(options: LLMCompletionOptions): AsyncIterable<LLMCompletionChunk> {
    // Cohere streaming API has different interface, fall back to non-streaming
    const completion = await this.complete({ ...options, stream: false });
    yield {
      id: completion.id,
      choices: [{
        index: 0,
        delta: { content: completion.choices[0].message.content, role: 'assistant' },
        finish_reason: completion.choices[0].finish_reason,
      }],
    };
  }
}

export function createCohereProvider(config?: LLMProviderConfig): CohereProvider { return new CohereProvider(config); }