import { NextRequest, NextResponse } from 'next/server';

interface LLMSettings {
  provider: 'openai' | 'anthropic' | 'gemini' | 'openrouter';
  model: string;
  apiKeys: {
    openai?: string;
    anthropic?: string;
    gemini?: string;
    openrouter?: string;
  };
  baseUrls?: {
    openai?: string;
    anthropic?: string;
    gemini?: string;
    openrouter?: string;
  };
  temperature: number;
  maxTokens: number;
}

interface ToolPermissions {
  file: { read: boolean; write: boolean; delete: boolean; execute: boolean };
  terminal: { execute: boolean; spawn: boolean; session: boolean; script: boolean };
  web: { search: boolean; fetch: boolean; scrape: boolean; api: boolean; download: boolean };
  code: { execute: boolean; analyze: boolean; lint: boolean; test: boolean };
  system: { metrics: boolean; processes: boolean; services: boolean };
  deployment: { deploy: boolean; rollback: boolean; scale: boolean };
  security: { scan: boolean; audit: boolean; encrypt: boolean };
  data: { query: boolean; transform: boolean; export: boolean };
}

interface AutonomySettings {
  mode: 'manual' | 'semi_auto' | 'full_auto';
  autoApproveReversible: boolean;
  requireApprovalFor: ('irreversible' | 'semi_reversible' | 'destructive' | 'secrets' | 'money' | 'medical' | 'legal' | 'privacy')[];
  maxConcurrentTasks: number;
  maxIterations: number;
  timeoutMs: number;
  proactiveActions: boolean;
}

interface AppSettings {
  llm: LLMSettings;
  tools: ToolPermissions;
  autonomy: AutonomySettings;
  general: {
    theme: 'dark' | 'light' | 'system';
    language: string;
    workingDirectory: string;
    notifications: 'all' | 'important' | 'critical' | 'none';
    telemetry: boolean;
  };
}

const DEFAULT_SETTINGS: AppSettings = {
  llm: {
    provider: 'openai',
    model: 'gpt-4o',
    apiKeys: {},
    temperature: 0.7,
    maxTokens: 4096,
  },
  tools: {
    file: { read: true, write: true, delete: false, execute: false },
    terminal: { execute: false, spawn: false, session: false, script: false },
    web: { search: true, fetch: true, scrape: true, api: true, download: false },
    code: { execute: true, analyze: true, lint: true, test: true },
    system: { metrics: true, processes: true, services: false },
    deployment: { deploy: false, rollback: false, scale: false },
    security: { scan: true, audit: true, encrypt: false },
    data: { query: true, transform: true, export: false },
  },
  autonomy: {
    mode: 'semi_auto',
    autoApproveReversible: true,
    requireApprovalFor: ['irreversible', 'destructive', 'secrets', 'money', 'medical', 'legal', 'privacy'],
    maxConcurrentTasks: 5,
    maxIterations: 10,
    timeoutMs: 300000,
    proactiveActions: true,
  },
  general: {
    theme: 'dark',
    language: 'en',
    workingDirectory: process.cwd(),
    notifications: 'important',
    telemetry: false,
  },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // In server context, we can't use localStorage, so we just return the merged settings
    // The client will handle persistence
    const settings: AppSettings = {
      ...DEFAULT_SETTINGS,
      ...body,
      llm: { ...DEFAULT_SETTINGS.llm, ...body.llm },
      tools: { ...DEFAULT_SETTINGS.tools, ...body.tools },
      autonomy: { ...DEFAULT_SETTINGS.autonomy, ...body.autonomy },
      general: { ...DEFAULT_SETTINGS.general, ...body.general },
    };
    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json({ error: 'Invalid settings' }, { status: 400 });
  }
}