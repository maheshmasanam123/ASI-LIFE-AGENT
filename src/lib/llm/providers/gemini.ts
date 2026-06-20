import { GoogleGenerativeAI, GenerativeModel, Content, Part } from '@google/generative-ai';
import {
  LLMProvider,
  LLMProviderConfig,
  LLMCompletionOptions,
  LLMCompletion,
  LLMCompletionChunk,
  LLMMessage,
  LLMTool,
} from '../types';

export class GeminiProvider implements LLMProvider {
  name = 'gemini';
  models = [
    'gemini-1.5-pro',
    'gemini-1.5-flash',
    'gemini-1.0-pro',
  ];
  defaultModel = 'gemini-1.5-pro';

  private client: GoogleGenerativeAI;
  private config: LLMProviderConfig;
  private model: GenerativeModel | null = null;
  private currentModelName: string | null = null;

  constructor(config: LLMProviderConfig = {}) {
    this.config = {
      apiKey: config.apiKey || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY,
      baseURL: config.baseURL,
      defaultModel: config.defaultModel || this.defaultModel,
      timeout: config.timeout || 60000,
      maxRetries: config.maxRetries || 3,
    };

    this.client = new GoogleGenerativeAI(this.config.apiKey || '');
  }

  private getModel(modelName?: string): GenerativeModel {
    const model = modelName || this.config.defaultModel || this.defaultModel;
    if (!this.model || this.currentModelName !== model) {
      this.model = this.client.getGenerativeModel({
        model,
        generationConfig: {
          maxOutputTokens: 4096,
          temperature: 0.7,
          topP: 0.95,
        },
      });
      this.currentModelName = model;
    }
    return this.model;
  }

  async validateConfig(): Promise<{ valid: boolean; error?: string }> {
    if (!this.config.apiKey) {
      return { valid: false, error: 'Gemini API key not configured. Set GOOGLE_API_KEY or GEMINI_API_KEY environment variable or provide in config.' };
    }

    try {
      const model = this.getModel();
      await model.generateContent('test');
      return { valid: true };
    } catch (error) {
      return { valid: false, error: `Gemini validation failed: ${error instanceof Error ? error.message : String(error)}` };
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

  private mapMessage(msg: LLMMessage): Content {
    const role = msg.role === 'assistant' ? 'model' : msg.role === 'system' ? 'user' : 'user';
    
    if (msg.role === 'tool') {
      return {
        role: 'function',
        parts: [{
          functionResponse: {
            name: msg.tool_call_id || '',
            response: { result: msg.content },
          },
        }],
      };
    }

    if (msg.tool_calls && msg.tool_calls.length > 0) {
      return {
        role: 'model',
        parts: msg.tool_calls.map(tc => ({
          functionCall: {
            name: tc.function.name,
            args: JSON.parse(tc.function.arguments || '{}'),
          },
        })),
      };
    }

    return {
      role,
      parts: [{ text: msg.content }],
    };
  }

  private mapTools(tools?: LLMTool[]): any[] | undefined {
    if (!tools || tools.length === 0) return undefined;
    return tools.map(t => ({
      functionDeclarations: [{
        name: t.function.name,
        description: t.function.description,
        parameters: t.function.parameters,
      }],
    }));
  }

  async complete(options: LLMCompletionOptions): Promise<LLMCompletion> {
    const model = this.getModel(options.model);

    const systemMessage = options.messages.find(m => m.role === 'system');
    const messages = options.messages.filter(m => m.role !== 'system').map(m => this.mapMessage(m));

    const chat = model.startChat({
      history: messages.slice(0, -1) as any,
      tools: this.mapTools(options.tools),
    });

    const lastMessage = messages[messages.length - 1];
    const result = await chat.sendMessage(lastMessage.parts as any);

    const response = result.response;
    const content = response.text();
    
    const toolCalls = response.candidates?.[0]?.content?.parts
      ?.filter((p: any) => p.functionCall)
      .map((p: any) => ({
        id: `call-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        type: 'function' as const,
        function: {
          name: p.functionCall.name,
          arguments: JSON.stringify(p.functionCall.args),
        },
      })) || [];

    return {
      id: `gemini-${Date.now()}`,
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: content || '',
          tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
        },
        finish_reason: response.candidates?.[0]?.finishReason || 'STOP',
      }],
      usage: {
        prompt_tokens: result.response.usageMetadata?.promptTokenCount || 0,
        completion_tokens: result.response.usageMetadata?.candidatesTokenCount || 0,
        total_tokens: result.response.usageMetadata?.totalTokenCount || 0,
      },
    };
  }

  async *streamComplete(options: LLMCompletionOptions): AsyncIterable<LLMCompletionChunk> {
    const model = this.getModel(options.model);

    const systemMessage = options.messages.find(m => m.role === 'system');
    const messages = options.messages.filter(m => m.role !== 'system').map(m => this.mapMessage(m));

    const chat = model.startChat({
      history: messages.slice(0, -1) as any,
      tools: this.mapTools(options.tools),
    });

    const lastMessage = messages[messages.length - 1];
    const result = await chat.sendMessageStream(lastMessage.parts as any);

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        yield {
          id: `gemini-${Date.now()}`,
          choices: [{
            index: 0,
            delta: {
              content: text,
              role: 'assistant',
            },
            finish_reason: null,
          }],
        };
      }
    }
  }
}

export function createGeminiProvider(config?: LLMProviderConfig): GeminiProvider {
  return new GeminiProvider(config);
}