import {
  LLMProvider,
  LLMProviderConfig,
  LLMCompletionOptions,
  LLMCompletion,
  LLMCompletionChunk,
} from './types';
import { OpenAIProvider, createOpenAIProvider } from './providers/openai';
import { AnthropicProvider, createAnthropicProvider } from './providers/anthropic';
import { GeminiProvider, createGeminiProvider } from './providers/gemini';
import { OpenRouterProvider, createOpenRouterProvider } from './providers/openrouter';
import { GroqProvider, createGroqProvider } from './providers/groq';
import { MistralProvider, createMistralProvider } from './providers/mistral';
import { TogetherProvider, createTogetherProvider } from './providers/together';
import { PerplexityProvider, createPerplexityProvider } from './providers/perplexity';
import { CohereProvider, createCohereProvider } from './providers/cohere';
import { OllamaProvider, createOllamaProvider } from './providers/ollama';
import { LMStudioProvider, createLMStudioProvider } from './providers/lmstudio';

export type ProviderName = 'openai' | 'anthropic' | 'gemini' | 'openrouter' | 'groq' | 'mistral' | 'together' | 'perplexity' | 'cohere' | 'ollama' | 'lmstudio';

export interface ProviderRegistryConfig {
  openai?: LLMProviderConfig;
  anthropic?: LLMProviderConfig;
  gemini?: LLMProviderConfig;
  openrouter?: LLMProviderConfig;
  groq?: LLMProviderConfig;
  mistral?: LLMProviderConfig;
  together?: LLMProviderConfig;
  perplexity?: LLMProviderConfig;
  cohere?: LLMProviderConfig;
  ollama?: LLMProviderConfig;
  lmstudio?: LLMProviderConfig;
  defaultProvider?: ProviderName;
}

export class ProviderRegistry {
  private providers: Map<ProviderName, LLMProvider> = new Map();
  private defaultProvider: ProviderName = 'openai';
  private configs: ProviderRegistryConfig;

  constructor(config: ProviderRegistryConfig = {}) {
    this.configs = config;
    this.defaultProvider = config.defaultProvider || 'openai';
    this.initializeProviders();
  }

  private initializeProviders(): void {
    // OpenAI
    if (this.configs.openai?.apiKey || process.env.OPENAI_API_KEY) {
      this.providers.set('openai', createOpenAIProvider(this.configs.openai));
    }

    // Anthropic
    if (this.configs.anthropic?.apiKey || process.env.ANTHROPIC_API_KEY) {
      this.providers.set('anthropic', createAnthropicProvider(this.configs.anthropic));
    }

    // Gemini
    if (this.configs.gemini?.apiKey || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY) {
      this.providers.set('gemini', createGeminiProvider(this.configs.gemini));
    }

    // OpenRouter
    if (this.configs.openrouter?.apiKey || process.env.OPENROUTER_API_KEY) {
      this.providers.set('openrouter', createOpenRouterProvider(this.configs.openrouter));
    }

    // Groq
    if (this.configs.groq?.apiKey || process.env.GROQ_API_KEY) {
      this.providers.set('groq', createGroqProvider(this.configs.groq));
    }

    // Mistral
    if (this.configs.mistral?.apiKey || process.env.MISTRAL_API_KEY) {
      this.providers.set('mistral', createMistralProvider(this.configs.mistral));
    }

    // Together AI
    if (this.configs.together?.apiKey || process.env.TOGETHER_API_KEY) {
      this.providers.set('together', createTogetherProvider(this.configs.together));
    }

    // Perplexity
    if (this.configs.perplexity?.apiKey || process.env.PERPLEXITY_API_KEY) {
      this.providers.set('perplexity', createPerplexityProvider(this.configs.perplexity));
    }

    // Cohere
    if (this.configs.cohere?.apiKey || process.env.COHERE_API_KEY) {
      this.providers.set('cohere', createCohereProvider(this.configs.cohere));
    }

    // Ollama
    if (this.configs.ollama?.apiKey || process.env.OLLAMA_HOST) {
      this.providers.set('ollama', createOllamaProvider(this.configs.ollama));
    }

    // LM Studio
    if (this.configs.lmstudio?.apiKey || process.env.LMSTUDIO_HOST) {
      this.providers.set('lmstudio', createLMStudioProvider(this.configs.lmstudio));
    }

    // Ensure default provider exists
    if (!this.providers.has(this.defaultProvider)) {
      const available = this.getAvailableProviders();
      if (available.length > 0) {
        this.defaultProvider = available[0];
      }
    }
  }

  getAvailableProviders(): ProviderName[] {
    return Array.from(this.providers.keys());
  }

  getProvider(name: ProviderName): LLMProvider | undefined {
    return this.providers.get(name);
  }

  getDefaultProvider(): LLMProvider | undefined {
    return this.providers.get(this.defaultProvider);
  }

  setDefaultProvider(name: ProviderName): boolean {
    if (this.providers.has(name)) {
      this.defaultProvider = name;
      return true;
    }
    return false;
  }

  getDefaultProviderName(): ProviderName {
    return this.defaultProvider;
  }

  async complete(options: LLMCompletionOptions & { provider?: ProviderName }): Promise<LLMCompletion> {
    const providerName = options.provider || this.defaultProvider;
    const provider = this.providers.get(providerName);

    if (!provider) {
      const available = this.getAvailableProviders();
      if (available.length === 0) {
        throw new Error('No LLM providers configured. Please configure at least one provider.');
      }
      throw new Error(`Provider "${providerName}" not available. Available: ${available.join(', ')}`);
    }

    return provider.complete(options);
  }

  async *streamComplete(options: LLMCompletionOptions & { provider?: ProviderName }): AsyncIterable<LLMCompletionChunk> {
    const providerName = options.provider || this.defaultProvider;
    const provider = this.providers.get(providerName);

    if (!provider) {
      const available = this.getAvailableProviders();
      if (available.length === 0) {
        throw new Error('No LLM providers configured. Please configure at least one provider.');
      }
      throw new Error(`Provider "${providerName}" not available. Available: ${available.join(', ')}`);
    }

    yield* provider.streamComplete(options);
  }

  async validateAll(): Promise<Record<ProviderName, { valid: boolean; error?: string }>> {
    const results: Record<string, { valid: boolean; error?: string }> = {};
    for (const [name, provider] of Array.from(this.providers.entries())) {
      results[name] = await provider.validateConfig();
    }
    return results as Record<ProviderName, { valid: boolean; error?: string }>;
  }

  listModels(providerName?: ProviderName): string[] {
    if (providerName) {
      const provider = this.providers.get(providerName);
      return provider?.models || [];
    }
    // Return all models from all providers
    const allModels: string[] = [];
    for (const provider of Array.from(this.providers.values())) {
      allModels.push(...provider.models);
    }
    return allModels;
  }

  getProviderInfo(): Array<{ name: ProviderName; models: string[]; defaultModel: string; configured: boolean }> {
    const info: Array<{ name: ProviderName; models: string[]; defaultModel: string; configured: boolean }> = [];
    for (const [name, provider] of Array.from(this.providers.entries())) {
      info.push({
        name,
        models: provider.models,
        defaultModel: provider.defaultModel,
        configured: true,
      });
    }
    // Add unconfigured providers
    const allProviders: ProviderName[] = ['openai', 'anthropic', 'gemini', 'openrouter', 'groq', 'mistral', 'together', 'perplexity', 'cohere', 'ollama', 'lmstudio'];
    for (const name of allProviders) {
      if (!this.providers.has(name)) {
        let provider: LLMProvider;
        switch (name) {
          case 'openai': provider = new OpenAIProvider(); break;
          case 'anthropic': provider = new AnthropicProvider(); break;
          case 'gemini': provider = new GeminiProvider(); break;
          case 'openrouter': provider = new OpenRouterProvider(); break;
          case 'groq': provider = new GroqProvider(); break;
          case 'mistral': provider = new MistralProvider(); break;
          case 'together': provider = new TogetherProvider(); break;
          case 'perplexity': provider = new PerplexityProvider(); break;
          case 'cohere': provider = new CohereProvider(); break;
          case 'ollama': provider = new OllamaProvider(); break;
          case 'lmstudio': provider = new LMStudioProvider(); break;
        }
        info.push({
          name,
          models: provider.models,
          defaultModel: provider.defaultModel,
          configured: false,
        });
      }
    }
    return info;
  }
}

let globalRegistry: ProviderRegistry | null = null;

export function getProviderRegistry(config?: ProviderRegistryConfig): ProviderRegistry {
  if (!globalRegistry) {
    globalRegistry = new ProviderRegistry(config);
  }
  return globalRegistry;
}

export function setProviderRegistry(registry: ProviderRegistry): void {
  globalRegistry = registry;
}