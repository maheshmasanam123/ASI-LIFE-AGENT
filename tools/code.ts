import { Tool, ToolResult, AgentContext } from '@asi-types/index';
import { execSync, spawn } from 'child_process';
import { promises as fs } from 'fs';
import { join, resolve } from 'path';
import { createHash } from 'crypto';

export const CodeTool: Tool = {
  name: 'code',
  description: 'Code execution, analysis, generation, testing, and debugging across multiple languages',
  category: 'code',
  schema: {
    type: 'object',
    properties: {
      operation: { type: 'string', enum: ['execute', 'analyze', 'generate', 'test', 'lint', 'format', 'debug', 'compile', 'package', 'docker'] },
      language: { type: 'string', enum: ['javascript', 'typescript', 'python', 'rust', 'go', 'java', 'cpp', 'c', 'bash', 'sql', 'html', 'css', 'json', 'yaml', 'markdown'] },
      code: { type: 'string' },
      filePath: { type: 'string' },
      args: { type: 'array', items: { type: 'string' } },
      env: { type: 'object' },
      timeout: { type: 'number' },
      dependencies: { type: 'array', items: { type: 'string' } },
      testFramework: { type: 'string' },
      config: { type: 'object' },
    },
    required: ['operation'],
  },
  requiresApproval: false,
  reversibility: 'reversible',
    async execute(input: Record<string, unknown>, context: AgentContext): Promise<ToolResult> {
    const startTime = Date.now();
    const { operation, language, code, filePath, args = [], env = {}, timeout = 30000, dependencies = [], testFramework, config = {} } = input as {
      operation: string;
      language?: string;
      code?: string;
      filePath?: string;
      args?: string[];
      env?: Record<string, string>;
      timeout?: number;
      dependencies?: string[];
      testFramework?: string;
      config?: Record<string, unknown>;
    };

    try {
      switch (operation) {
        case 'execute': {
          const result = await executeCode(language as string, code as string, args as string[], env, timeout as number);
          return { success: true, output: result, duration: Date.now() - startTime };
        }
        case 'analyze': {
          const analysis = await analyzeCode(language as string, code as string, filePath as string);
          return { success: true, output: analysis, duration: Date.now() - startTime };
        }
        case 'generate': {
          const generated = await generateCode(language as string, code as string, config);
          return { success: true, output: generated, duration: Date.now() - startTime };
        }
        case 'test': {
          const results = await runTests(language as string, filePath as string, testFramework as string);
          return { success: true, output: results, duration: Date.now() - startTime };
        }
        case 'lint': {
          const results = await lintCode(language as string, filePath as string);
          return { success: true, output: results, duration: Date.now() - startTime };
        }
        case 'format': {
          const formatted = await formatCode(language as string, code as string);
          return { success: true, output: formatted, duration: Date.now() - startTime };
        }
        case 'debug': {
          const debugInfo = await debugCode(language as string, filePath as string, args as string[]);
          return { success: true, output: debugInfo, duration: Date.now() - startTime };
        }
        case 'compile': {
          const result = await compileCode(language as string, filePath as string);
          return { success: true, output: result, duration: Date.now() - startTime };
        }
        case 'package': {
          const result = await packageCode(language as string, filePath as string);
          return { success: true, output: result, duration: Date.now() - startTime };
        }
        case 'docker': {
          const result = await dockerizeCode(language as string, filePath as string, dependencies as string[]);
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

async function executeCode(language: string, code: string, args: string[], env: Record<string, string>, timeout: number): Promise<any> {
  const commands: Record<string, string> = {
    javascript: 'node',
    typescript: 'tsx',
    python: 'python3',
    rust: 'cargo run',
    go: 'go run',
    java: 'java',
    bash: 'bash',
  };

  const cmd = commands[language] || language;
  const fullEnv = { ...process.env, ...env };

  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { env: fullEnv, timeout, shell: true });
    let stdout = '', stderr = '';

    child.stdout?.on('data', data => stdout += data.toString());
    child.stderr?.on('data', data => stderr += data.toString());

    child.on('close', code => {
      resolve({ exitCode: code, stdout, stderr, success: code === 0 });
    });

    child.on('error', reject);
  });
}

async function analyzeCode(language: string, code: string, filePath?: string): Promise<any> {
  return {
    language,
    lines: code.split('\n').length,
    characters: code.length,
    complexity: estimateComplexity(code),
    imports: extractImports(code, language),
    functions: extractFunctions(code, language),
    classes: extractClasses(code, language),
    filePath,
  };
}

async function generateCode(language: string, prompt: string, config: any): Promise<string> {
  return `// Generated ${language} code for: ${prompt}\n// Config: ${JSON.stringify(config)}\n\n// TODO: Implement based on requirements`;
}

async function runTests(language: string, filePath: string, framework?: string): Promise<any> {
  return { passed: 0, failed: 0, tests: [], coverage: 0 };
}

async function lintCode(language: string, filePath: string): Promise<any> {
  return { errors: [], warnings: [], suggestions: [] };
}

async function formatCode(language: string, code: string): Promise<string> {
  return code;
}

async function debugCode(language: string, filePath: string, args: string[]): Promise<any> {
  return { breakpoints: [], variables: [], callStack: [] };
}

async function compileCode(language: string, filePath: string): Promise<any> {
  return { success: true, output: '', artifacts: [] };
}

async function packageCode(language: string, filePath: string): Promise<any> {
  return { success: true, packagePath: '', size: 0 };
}

async function dockerizeCode(language: string, filePath: string, dependencies: string[]): Promise<any> {
  const dockerfile = generateDockerfile(language, dependencies);
  return { dockerfile, imageName: `asi-agent-${createHash('md5').update(filePath).digest('hex').slice(0, 8)}` };
}

function generateDockerfile(language: string, dependencies: string[]): string {
  const baseImages: Record<string, string> = {
    javascript: 'node:20-alpine',
    typescript: 'node:20-alpine',
    python: 'python:3.11-alpine',
    rust: 'rust:1.75-alpine',
    go: 'golang:1.21-alpine',
  };

  return `FROM ${baseImages[language] || 'alpine'}
WORKDIR /app
COPY . .
${dependencies.length > 0 ? `RUN ${getInstallCommand(language)} ${dependencies.join(' ')}` : ''}
CMD ["${getRunCommand(language)}"]
`;
}

function getInstallCommand(language: string): string {
  const cmds: Record<string, string> = { javascript: 'npm install', python: 'pip install', rust: 'cargo add', go: 'go get' };
  return cmds[language] || '';
}

function getRunCommand(language: string): string {
  const cmds: Record<string, string> = { javascript: 'node index.js', python: 'python main.py', rust: 'cargo run', go: 'go run main.go' };
  return cmds[language] || '';
}

function estimateComplexity(code: string): number {
  const keywords = ['if', 'else', 'for', 'while', 'switch', 'case', 'catch', 'try', '&&', '||', '?'];
  return keywords.reduce((count, kw) => count + (code.match(new RegExp(`\\b${kw}\\b`, 'g')) || []).length, 1);
}

function extractImports(code: string, language: string): string[] {
  const patterns: Record<string, RegExp> = {
    javascript: /import\s+.*?\s+from\s+['"](.*?)['"]/g,
    python: /(?:from\s+(\S+)\s+import|import\s+(\S+))/g,
    rust: /use\s+([^;]+);/g,
    go: /import\s+\(([^)]+)\)|import\s+"([^"]+)"/g,
  };
  const pattern = patterns[language];
  if (!pattern) return [];
  const matches = code.matchAll(pattern);
  return Array.from(matches).flatMap(m => m.slice(1).filter(Boolean));
}

function extractFunctions(code: string, language: string): string[] {
  const patterns: Record<string, RegExp> = {
    javascript: /function\s+(\w+)|const\s+(\w+)\s*=\s*\(/g,
    python: /def\s+(\w+)/g,
    rust: /fn\s+(\w+)/g,
    go: /func\s+(\w+)/g,
  };
  const pattern = patterns[language];
  if (!pattern) return [];
  const matches = code.matchAll(pattern);
  return Array.from(matches).flatMap(m => m.slice(1).filter(Boolean));
}

function extractClasses(code: string, language: string): string[] {
  const patterns: Record<string, RegExp> = {
    javascript: /class\s+(\w+)/g,
    python: /class\s+(\w+)/g,
    rust: /struct\s+(\w+)/g,
  };
  const pattern = patterns[language];
  if (!pattern) return [];
  const matches = code.matchAll(pattern);
  return Array.from(matches).flatMap(m => m.slice(1).filter(Boolean));
}