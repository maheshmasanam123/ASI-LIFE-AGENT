import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

interface ProviderConfig {
  id: string;
  name: string;
  apiKey: string;
  baseURL?: string;
  model?: string;
  enabled: boolean;
}

interface Settings {
  providers: Record<string, ProviderConfig>;
  activeProvider: string;
  activeModel: string;
  toolPermissions: Record<string, Record<string, boolean>>;
  autonomyMode: string;
  approvalRules: string[];
}

const ENV_PATH = path.join(process.cwd(), '.env.local');
const SETTINGS_PATH = path.join(process.cwd(), '.asi-settings.json');

function readEnvFile(): Record<string, string> {
  const env: Record<string, string> = {};
  try {
    const content = fs.readFileSync(ENV_PATH, 'utf-8');
    content.split('\n').forEach(line => {
      const [key, ...rest] = line.split('=');
      if (key && !key.startsWith('#')) {
        env[key.trim()] = rest.join('=').trim();
      }
    });
  } catch {}
  return env;
}

function writeEnvFile(env: Record<string, string>): void {
  const lines = Object.entries(env).map(([k, v]) => `${k}=${v}`);
  fs.writeFileSync(ENV_PATH, lines.join('\n') + '\n');
}

function readSettings(): Settings {
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'));
  } catch {
    return {
      providers: {},
      activeProvider: 'openai',
      activeModel: 'gpt-4o',
      toolPermissions: {},
      autonomyMode: 'safe',
      approvalRules: ['irreversible', 'destructive', 'secrets', 'money', 'medical', 'legal', 'privacy'],
    };
  }
}

function writeSettings(settings: Settings): void {
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
  // Also update .env.local with API keys
  const env = readEnvFile();
  Object.entries(settings.providers).forEach(([id, p]) => {
    if (p.apiKey) {
      const envKey = id.toUpperCase() + '_API_KEY';
      env[envKey] = p.apiKey;
      if (p.baseURL) env[id.toUpperCase() + '_BASE_URL'] = p.baseURL;
    }
  });
  writeEnvFile(env);
}

export async function GET() {
  const settings = readSettings();
  // Mask API keys for response
  const masked = { ...settings };
  masked.providers = Object.fromEntries(
    Object.entries(settings.providers).map(([id, p]) => [
      id,
      { ...p, apiKey: p.apiKey ? '••••••••' + p.apiKey.slice(-4) : '' }
    ])
  );
  return NextResponse.json(masked);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const settings = readSettings();
    
    if (body.provider) {
      const id = body.provider.id || body.provider.name?.toLowerCase().replace(/\s+/g, '-');
      settings.providers[id] = {
        id,
        name: body.provider.name || id,
        apiKey: body.provider.apiKey || settings.providers[id]?.apiKey || '',
        baseURL: body.provider.baseURL || settings.providers[id]?.baseURL,
        model: body.provider.model || settings.providers[id]?.model,
        enabled: body.provider.enabled ?? true,
      };
      if (body.provider.apiKey && body.provider.apiKey.startsWith('••••••••')) {
        settings.providers[id].apiKey = settings.providers[id]?.apiKey || '';
      }
    }
    
    if (body.activeProvider) settings.activeProvider = body.activeProvider;
    if (body.activeModel) settings.activeModel = body.activeModel;
    if (body.toolPermissions) settings.toolPermissions = body.toolPermissions;
    if (body.autonomyMode) settings.autonomyMode = body.autonomyMode;
    if (body.approvalRules) settings.approvalRules = body.approvalRules;
    
    writeSettings(settings);
    
    const masked = { ...settings };
    masked.providers = Object.fromEntries(
      Object.entries(settings.providers).map(([id, p]) => [
        id, { ...p, apiKey: p.apiKey ? '••••••••' + p.apiKey.slice(-4) : '' }
      ])
    );
    return NextResponse.json(masked);
  } catch (error) {
    return NextResponse.json({ error: 'Invalid settings' }, { status: 400 });
  }
}