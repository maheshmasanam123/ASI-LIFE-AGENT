import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface HealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  details?: any;
  error?: string;
}

async function checkCommand(command: string): Promise<HealthCheck> {
  try {
    const { stdout } = await execAsync(command, { timeout: 5000 });
    return { name: command, status: 'healthy', details: stdout.trim() };
  } catch (error) {
    return { name: command, status: 'unhealthy', error: error instanceof Error ? error.message : String(error) };
  }
}

async function checkEnvVar(name: string): Promise<HealthCheck> {
  const value = process.env[name];
  return {
    name,
    status: value ? 'healthy' : 'unhealthy',
    details: value ? 'set' : 'missing',
  };
}

async function checkModule(moduleName: string): Promise<HealthCheck> {
  try {
    const mod = await import(moduleName);
    return { name: moduleName, status: 'healthy', details: { version: mod.version || mod.default?.version || 'unknown' } };
  } catch (error) {
    return { name: moduleName, status: 'degraded', error: error instanceof Error ? error.message : String(error) };
  }
}

export async function GET() {
  const startTime = Date.now();
  
  const checks = await Promise.all([
    // Core system checks
    checkCommand('node --version'),
    checkCommand('npm --version'),
    
    // Optional dependency checks
    checkModule('canvas'),
    checkModule('fluent-ffmpeg'),
    checkModule('natural'),
    checkModule('compromise'),
    checkModule('sentiment'),
    checkModule('nodemailer'),
    checkModule('@slack/web-api'),
    checkModule('twilio'),
    checkModule('pdf-parse'),
    checkModule('mammoth'),
    checkModule('xlsx'),
    checkModule('systeminformation'),
    checkModule('cheerio'),
    checkModule('node-pty'),
    
    // Environment variable checks
    checkEnvVar('OPENAI_API_KEY'),
    checkEnvVar('ANTHROPIC_API_KEY'),
    checkEnvVar('OLLAMA_HOST'),
    checkEnvVar('SMTP_HOST'),
    checkEnvVar('SMTP_PORT'),
    checkEnvVar('SMTP_USER'),
    checkEnvVar('SMTP_PASS'),
    checkEnvVar('SMTP_FROM'),
    checkEnvVar('SLACK_BOT_TOKEN'),
    checkEnvVar('DISCORD_WEBHOOK_URL'),
    checkEnvVar('TWILIO_SID'),
    checkEnvVar('TWILIO_TOKEN'),
    checkEnvVar('TWILIO_FROM'),
    checkEnvVar('WS_PORT'),
    checkEnvVar('NEXT_PUBLIC_WS_URL'),
    checkEnvVar('NEXT_PUBLIC_APP_URL'),
  ]);

  const healthy = checks.filter(c => c.status === 'healthy').length;
  const degraded = checks.filter(c => c.status === 'degraded').length;
  const unhealthy = checks.filter(c => c.status === 'unhealthy').length;
  
  const overallStatus = unhealthy > 0 ? 'unhealthy' : degraded > 0 ? 'degraded' : 'healthy';
  
  return NextResponse.json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.version,
    platform: process.platform,
    duration: Date.now() - startTime,
    checks: {
      total: checks.length,
      healthy,
      degraded,
      unhealthy,
      details: checks,
    },
  });
}