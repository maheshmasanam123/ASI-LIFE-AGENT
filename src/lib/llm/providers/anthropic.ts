import Anthropic from '@anthropic-ai/sdk';
import {
  LLMProvider,
  LLMProviderConfig,
  LLMCompletionOptions,
  LLMCompletion,
  LLMCompletionChunk,
  LLMMessage,
  LLMTool,
} from '../types';

export class AnthropicProvider implements LLMProvider {
  name = 'anthropic';
  models = [
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
    'claude-3-opus-20240229',
    'claude-3-sonnet-20240229',
    'claude-3-haiku-20240307',
  ];
  defaultModel = 'claude-3-5-sonnet-20241022';

  private client: Anthropic;
  private config: LLMProviderConfig;

  constructor(config: LLMProviderConfig = {}) {
    this.config = {
      apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY,
      baseURL: config.baseURL || process.env.ANTHROPIC_BASE_URL,
      defaultModel: config.defaultModel || this.defaultModel,
      timeout: config.timeout || 60000,
      maxRetries: config.maxRetries || 3,
    };

    this.client = new Anthropic({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      maxRetries: this.config.maxRetries,
    });
  }

  async validateConfig(): Promise<{ valid: boolean; error?: string }> {
    if (!this.config.apiKey) {
      return { valid: false, error: 'Anthropic API key not configured. Set ANTHROPIC_API_KEY environment variable or provide in config.' };
    }

    try {
      await this.client.messages.create({
        model: this.defaultModel,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'test' }],
      });
      return { valid: true };
    } catch (error) {
      return { valid: false, error: `Anthropic validation failed: ${error instanceof Error ? error.message : String(error)}` };
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

  private mapMessage(msg: LLMMessage): Anthropic.Messages.MessageParam {
    if (msg.role === 'tool') {
      return {
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: msg.tool_call_id || '',
            content: msg.content,
          },
        ],
      };
    }

    if (msg.tool_calls && msg.tool_calls.length > 0) {
      return {
        role: 'assistant',
        content: msg.tool_calls.map(tc => ({
          type: 'tool_use' as const,
          id: tc.id,
          name: tc.function.name,
          input: JSON.parse(tc.function.arguments || '{}'),
        })),
      };
    }

    return {
      role: msg.role === 'system' ? 'user' : msg.role,
      content: msg.content,
    };
  }

  private mapTools(tools?: LLMTool[]): Anthropic.Messages.Tool[] | undefined {
    if (!tools || tools.length === 0) return undefined;
    return tools.map(t => ({
      name: t.function.name,
      description: t.function.description,
      input_schema: t.function.parameters as Anthropic.Messages.Tool.InputSchema,
    }));
  }

  async complete(options: LLMCompletionOptions): Promise<LLMCompletion> {
    const model = options.model || this.config.defaultModel || this.defaultModel;

    const systemMessage = options.messages.find(m => m.role === 'system');
    const messages = options.messages.filter(m => m.role !== 'system').map(m => this.mapMessage(m));

    const response = await this.client.messages.create({
      model,
      system: systemMessage?.content,
      messages,
      tools: this.mapTools(options.tools),
      tool_choice: options.tool_choice ? { type: 'auto' } : undefined,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens || 4096,
      top_p: options.top_p,
      stop_sequences: options.stop,
      stream: false,
    });

    const toolCalls = response.content
      .filter((c): c is Anthropic.Messages.ToolUseBlock => c.type === 'tool_use')
      .map(tc => ({
        id: tc.id,
        type: 'function' as const,
        function: {
          name: tc.name,
          arguments: JSON.stringify(tc.input),
        },
      }));

    return {
      id: response.id,
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: response.content
            .filter((c): c is Anthropic.Messages.TextBlock => c.type === 'text')
            .map(c => c.text)
            .join('') || '',
          tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
        },
        finish_reason: response.stop_reason || 'end_turn',
      }],
      usage: {
        prompt_tokens: response.usage?.input_tokens || 0,
        completion_tokens: response.usage?.output_tokens || 0,
        total_tokens: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0),
      },
    };
  }

  async *streamComplete(options: LLMCompletionOptions): AsyncIterable<LLMCompletionChunk> {
    const model = options.model || this.config.defaultModel || this.defaultModel;

    const systemMessage = options.messages.find(m => m.role === 'system');
    const messages = options.messages.filter(m => m.role !== 'system').map(m => this.mapMessage(m));

    const stream = await this.client.messages.create({
      model,
      system: systemMessage?.content,
      messages,
      tools: this.mapTools(options.tools),
      tool_choice: options.tool_choice ? { type: 'auto' } : undefined,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens || 4096,
      top_p: options.top_p,
      stop_sequences: options.stop,
      stream: true,
    });

    let accumulatedContent = '';
    const toolCalls: LLMCompletionChunk['choices'][0]['delta']['tool_calls'] = [];

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_start' && chunk.content_block.type === 'tool_use') {
        const tc = chunk.content_block as Anthropic.Messages.ToolUseBlock;
        toolCalls.push({
          id: tc.id,
          type: 'function',
          function: {
            name: tc.name,
            arguments: JSON.stringify(tc.input),
          },
        });
      }

      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        accumulatedContent += chunk.delta.text;
        yield {
          id: `chunk-${Date.now()}`,
          choices: [{
            index: 0,
            delta: {
              content: chunk.delta.text,
              role: 'assistant',
            },
            finish_reason: null,
          }],
        };
      }

      if (chunk.type === 'message_delta' && chunk.delta.stop_reason) {
        yield {
          id: `chunk-${Date.now()}`,
          choices: [{
            index: 0,
            delta: {
              tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
            },
            finish_reason: chunk.delta.stop_reason,
          }],
        };
      }
    }
  }
}

export function createAnthropicProvider(config?: LLMProviderConfig): AnthropicProvider {
  return new AnthropicProvider(config);
}