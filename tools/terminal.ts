import { Tool, ToolResult, AgentContext } from '@asi-types/index';
import { spawn, execSync } from 'child_process';
import { promises as fs } from 'fs';
import { join, resolve } from 'path';

export const TerminalTool: Tool = {
  name: 'terminal',
  description: 'Full terminal/shell access with session management, PTY support, and command execution',
  category: 'system',
  schema: {
    type: 'object',
    properties: {
      operation: { type: 'string', enum: ['execute', 'spawn', 'session_create', 'session_write', 'session_read', 'session_close', 'session_list', 'pty_spawn', 'script'] },
      command: { type: 'string' },
      args: { type: 'array', items: { type: 'string' } },
      sessionId: { type: 'string' },
      cwd: { type: 'string' },
      env: { type: 'object' },
      timeout: { type: 'number' },
      shell: { type: 'string' },
      input: { type: 'string' },
      cols: { type: 'number' },
      rows: { type: 'number' },
    },
    required: ['operation'],
  },
  requiresApproval: false,
  reversibility: 'semi_reversible',
  async execute(input: Record<string, unknown>, context: AgentContext): Promise<ToolResult> {
    const startTime = Date.now();
    const { operation, command, args = [], sessionId, cwd = context.workingDirectory, env = {}, timeout = 30000, shell = process.env.SHELL || '/bin/bash', input: stdinInput, cols = 120, rows = 40 } = input as {
      operation: string;
      command?: string;
      args?: string[];
      sessionId?: string;
      cwd?: string;
      env?: Record<string, string>;
      timeout?: number;
      shell?: string;
      input?: string;
      cols?: number;
      rows?: number;
    };

    try {
      switch (operation) {
        case 'execute': {
          const result = execSync(command as string, { cwd, env: { ...process.env, ...env }, timeout, shell, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
          return { success: true, output: result, duration: Date.now() - startTime };
        }
        case 'spawn': {
          const result = await spawnCommand(command as string, args as string[], cwd, env, timeout);
          return { success: true, output: result, duration: Date.now() - startTime };
        }
        case 'session_create': {
          const session = await createSession(cwd, env, shell, cols, rows);
          return { success: true, output: session, duration: Date.now() - startTime };
        }
        case 'session_write': {
          if (!sessionId) return { success: false, error: 'sessionId required', duration: Date.now() - startTime };
          await writeToSession(sessionId, stdinInput as string);
          return { success: true, output: 'Written to session', duration: Date.now() - startTime };
        }
        case 'session_read': {
          if (!sessionId) return { success: false, error: 'sessionId required', duration: Date.now() - startTime };
          const output = await readFromSession(sessionId);
          return { success: true, output, duration: Date.now() - startTime };
        }
        case 'session_close': {
          if (!sessionId) return { success: false, error: 'sessionId required', duration: Date.now() - startTime };
          await closeSession(sessionId);
          return { success: true, output: 'Session closed', duration: Date.now() - startTime };
        }
        case 'session_list': {
          const sessions = listSessions();
          return { success: true, output: sessions, duration: Date.now() - startTime };
        }
        case 'pty_spawn': {
          const pty = await spawnPty(command as string, args as string[], cwd, env, cols, rows);
          return { success: true, output: pty, duration: Date.now() - startTime };
        }
        case 'script': {
          const result = await runScript(command as string, cwd, env, timeout);
          return { success: true, output: result, duration: Date.now() - startTime };
        }
        default:
          return { success: false, error: `Unknown operation: ${operation}`, duration: Date.now() - startTime };
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error), duration: Date.now() - startTime };
    }
  },
};

const sessions = new Map<string, { process: any; output: string; cwd: string }>();

async function spawnCommand(command: string, args: string[], cwd: string, env: Record<string, string>, timeout: number): Promise<any> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env: { ...process.env, ...env }, shell: true, timeout });
    let stdout = '', stderr = '';
    child.stdout?.on('data', d => stdout += d.toString());
    child.stderr?.on('data', d => stderr += d.toString());
    child.on('close', code => resolve({ exitCode: code, stdout, stderr }));
    child.on('error', reject);
  });
}

async function createSession(cwd: string, env: Record<string, string>, shell: string, cols: number, rows: number): Promise<any> {
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const child = spawn(shell, [], { cwd, env: { ...process.env, ...env, COLUMNS: String(cols), LINES: String(rows) }, shell: true });
  let output = '';
  child.stdout?.on('data', d => output += d.toString());
  child.stderr?.on('data', d => output += d.toString());
  sessions.set(sessionId, { process: child, output, cwd });
  return { sessionId, pid: child.pid };
}

async function writeToSession(sessionId: string, input: string): Promise<void> {
  const session = sessions.get(sessionId);
  if (!session) throw new Error('Session not found');
  session.process.stdin?.write(input);
}

async function readFromSession(sessionId: string): Promise<string> {
  const session = sessions.get(sessionId);
  if (!session) throw new Error('Session not found');
  const output = session.output;
  session.output = '';
  return output;
}

async function closeSession(sessionId: string): Promise<void> {
  const session = sessions.get(sessionId);
  if (session) {
    session.process.kill();
    sessions.delete(sessionId);
  }
}

function listSessions(): any[] {
  return Array.from(sessions.entries()).map(([id, s]) => ({ id, pid: s.process.pid, cwd: s.cwd, alive: !s.process.killed }));
}

async function spawnPty(command: string, args: string[], cwd: string, env: Record<string, string>, cols: number, rows: number): Promise<any> {
  try {
    const pty = require('node-pty');
    const ptyProcess = pty.spawn(command, args, { cwd, env: { ...process.env, ...env }, cols, rows });
    return { pid: ptyProcess.pid, message: 'PTY spawned successfully' };
  } catch (e) {
    return { error: 'node-pty not available, install with: npm install node-pty' };
  }
}

async function runScript(scriptPath: string, cwd: string, env: Record<string, string>, timeout: number): Promise<any> {
  const fullPath = resolve(cwd, scriptPath);
  await fs.access(fullPath);
  return spawnCommand(fullPath, [], cwd, env, timeout);
}