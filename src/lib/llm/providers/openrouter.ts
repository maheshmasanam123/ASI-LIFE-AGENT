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

export class OpenRouterProvider implements LLMProvider {
  name = 'openrouter';
  models = [
    'openai/gpt-4o',
    'openai/gpt-4o-mini',
    'openai/gpt-4-turbo',
    'anthropic/claude-3.5-sonnet',
    'anthropic/claude-3.5-haiku',
    'google/gemini-pro-1.5',
    'meta-llama/llama-3.1-405b-instruct',
    'mistral/mistral-large',
    'qwen/qwen-2.5-72b-instruct',
  ];
  defaultModel = 'openai/gpt-4o';

  private client: OpenAI;
  private config: LLMProviderConfig;

  constructor(config: LLMProviderConfig = {}) {
    this.config = {
      apiKey: config.apiKey || process.env.OPENROUTER_API_KEY,
      baseURL: config.baseURL || 'https://openrouter.ai/api/v1',
      defaultModel: config.defaultModel || this.defaultModel,
      timeout: config.timeout || 120000,
      maxRetries: config.maxRetries || 3,
    };

    this.client = new OpenAI({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      maxRetries: this.config.maxRetries,
      defaultHeaders: {
        'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'http://localhost:3000',
        'X-Title': process.env.OPENROUTER_APP_NAME || 'ASI Life Agent',
      },
    });
  }

  async validateConfig(): Promise<{ valid: boolean; error?: string }> {
    if (!this.config.apiKey) {
      return { valid: false, error: 'OpenRouter API key not configured. Set OPENROUTER_API_KEY environment variable or provide in config.' };
    }

    try {
      await this.client.models.list();
      return { valid: true };
    } catch (error) {
      return { valid: false, error: `OpenRouter validation failed: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  estimateTokens(messages: LLMMessage[]): number {
    let total = 0;
    for (const msg of messages) {
      total += Math.ceil(msg.content.length / 4);
      if (msg.tool_calls) {
        for (const tc of msg.tool_calls) {
          total += Math.ceil(tc.function.name.length / 4);
          total += Math.ceil(tc.function.arguments.length / 4);
        }
      }
    }
    return total;
  }

  private mapMessage(msg: LLMMessage): OpenAI.Chat.Completions.ChatCompletionMessageParam {
    if (msg.role === 'tool') {
      return {
        role: 'tool',
        content: msg.content,
        tool_call_id: msg.tool_call_id || '',
      };
    }

    if (msg.tool_calls && msg.tool_calls.length > 0) {
      return {
        role: 'assistant',
        content: msg.content || null,
        tool_calls: msg.tool_calls.map(tc => ({
          id: tc.id,
          type: 'function' as const,
          function: {
            name: tc.function.name,
            arguments: tc.function.arguments,
          },
        })),
      };
    }

    return {
      role: msg.role,
      content: msg.content,
      name: msg.name,
    };
  }

  private mapTools(tools?: LLMTool[]): OpenAI.Chat.Completions.ChatCompletionTool[] | undefined {
    if (!tools || tools.length === 0) return undefined;
    return tools.map(t => ({
      type: 'function' as const,
      function: {
        name: t.function.name,
        description: t.function.description,
        parameters: t.function.parameters,
      },
    }));
  }

  async complete(options: LLMCompletionOptions): Promise<LLMCompletion> {
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
    const toolCalls = choice.message.tool_calls?.map(tc => ({
      id: tc.id,
      type: 'function' as const,
      function: {
        name: tc.function.name,
        arguments: tc.function.arguments,
      },
    }));

    return {
      id: response.id,
      choices: [{
        index: 0,
        message: {
          role: choice.message.role,
          content: choice.message.content || '',
          tool_calls: toolCalls,
        },
        finish_reason: choice.finish_reason || 'stop',
      }],
      usage: {
        prompt_tokens: response.usage?.prompt_tokens || 0,
        completion_tokens: response.usage?.completion_tokens || 0,
        total_tokens: response.usage?.total_tokens || 0,
      },
    };
  }

  async *streamComplete(options: LLMCompletionOptions): AsyncIterable<LLMCompletionChunk> {
    const model = options.model || this.config.defaultModel || this.defaultModel;

    const stream = await this.client.chat.completions.create({
      model,
      messages: options.messages.map(m => this.mapMessage(m)),
      tools: this.mapTools(options.tools),
      tool_choice: options.tool_choice as any,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens,
      top_p: options.top_p,
      stop: options.stop,
      stream: true,
    });

    for await (const chunk of stream) {
      const choice = chunk.choices[0];
      if (!choice) continue;

      const delta: LLMCompletionChunk['choices'][0]['delta'] = {};
      if (choice.delta.content) delta.content = choice.delta.content;
      if (choice.delta.role) delta.role = choice.delta.role;
      if (choice.delta.tool_calls) {
        delta.tool_calls = choice.delta.tool_calls.map(tc => ({
          id: tc.id || '',
          type: 'function' as const,
          function: {
            name: tc.function?.name || '',
            arguments: tc.function?.arguments || '',
          },
        }));
      }

      yield {
        id: chunk.id,
        choices: [{
          index: 0,
          delta,
          finish_reason: choice.finish_reason,
        }],
      };
    }
  }
}

export function createOpenRouterProvider(config?: LLMProviderConfig): OpenRouterProvider {
  return new OpenRouterProvider(config);
}