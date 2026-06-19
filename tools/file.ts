import { Tool, ToolResult, AgentContext, ZodSchema, CapabilityCategory } from '@asi-types/index';
import { promises as fs } from 'fs';
import { join, resolve, dirname, basename, extname } from 'path';
import { glob } from 'glob';
import { createHash } from 'crypto';

export const FileTool: Tool = {
  name: 'file',
  description: 'Comprehensive file system operations - read, write, list, search, copy, move, delete, archive',
  category: 'file',
  schema: {
    type: 'object',
    properties: {
      operation: { type: 'string', enum: ['read', 'write', 'append', 'delete', 'copy', 'move', 'list', 'search', 'exists', 'stat', 'mkdir', 'rmdir', 'watch', 'hash', 'compress', 'extract'] },
      path: { type: 'string' },
      content: { type: 'string' },
      destination: { type: 'string' },
      pattern: { type: 'string' },
      recursive: { type: 'boolean' },
      encoding: { type: 'string', enum: ['utf-8', 'base64', 'hex', 'binary'] },
      options: { type: 'object' },
    },
    required: ['operation', 'path'],
  },
  requiresApproval: false,
  reversibility: 'reversible',
  async execute(input: Record<string, unknown>, context: AgentContext): Promise<ToolResult> {
    const startTime = Date.now();
    const { operation, path, content, destination, pattern, recursive, encoding = 'utf-8', options = {} } = input;
    const fullPath = resolve(context.workingDirectory, path as string);

    try {
      switch (operation) {
        case 'read': {
          const data = await fs.readFile(fullPath, encoding as BufferEncoding);
          return { success: true, output: data, duration: Date.now() - startTime };
        }
        case 'write': {
          await fs.mkdir(dirname(fullPath), { recursive: true });
          await fs.writeFile(fullPath, content as string, encoding as BufferEncoding);
          return { success: true, output: `Written to ${path}`, duration: Date.now() - startTime };
        }
        case 'append': {
          await fs.appendFile(fullPath, content as string, encoding as BufferEncoding);
          return { success: true, output: `Appended to ${path}`, duration: Date.now() - startTime };
        }
        case 'delete': {
          await fs.unlink(fullPath);
          return { success: true, output: `Deleted ${path}`, duration: Date.now() - startTime };
        }
        case 'copy': {
          await fs.copyFile(fullPath, resolve(context.workingDirectory, destination as string));
          return { success: true, output: `Copied ${path} to ${destination}`, duration: Date.now() - startTime };
        }
        case 'move': {
          await fs.rename(fullPath, resolve(context.workingDirectory, destination as string));
          return { success: true, output: `Moved ${path} to ${destination}`, duration: Date.now() - startTime };
        }
        case 'list': {
          const entries = await fs.readdir(fullPath, { withFileTypes: true });
          const files = entries.map(e => ({
            name: e.name,
            type: e.isDirectory() ? 'directory' : e.isFile() ? 'file' : 'other',
            path: join(path as string, e.name),
          }));
          return { success: true, output: files, duration: Date.now() - startTime };
        }
        case 'search': {
          const matches = await glob(pattern as string, { cwd: context.workingDirectory, absolute: false });
          return { success: true, output: matches, duration: Date.now() - startTime };
        }
        case 'exists': {
          try {
            await fs.access(fullPath);
            return { success: true, output: true, duration: Date.now() - startTime };
          } catch {
            return { success: true, output: false, duration: Date.now() - startTime };
          }
        }
        case 'stat': {
          const stats = await fs.stat(fullPath);
          return { success: true, output: { size: stats.size, isDirectory: stats.isDirectory(), isFile: stats.isFile(), mtime: stats.mtime, ctime: stats.ctime }, duration: Date.now() - startTime };
        }
        case 'mkdir': {
          await fs.mkdir(fullPath, { recursive: recursive ?? true } as any);
          return { success: true, output: `Created directory ${path}`, duration: Date.now() - startTime };
        }
        case 'rmdir': {
          await fs.rmdir(fullPath, { recursive: recursive ?? false } as any);
          return { success: true, output: `Removed directory ${path}`, duration: Date.now() - startTime };
        }
        case 'hash': {
          const data = await fs.readFile(fullPath);
          const hash = createHash('sha256').update(data).digest('hex');
          return { success: true, output: hash, duration: Date.now() - startTime };
        }
        default:
          return { success: false, error: `Unknown operation: ${operation}`, duration: Date.now() - startTime };
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error), duration: Date.now() - startTime };
    }
  },
};