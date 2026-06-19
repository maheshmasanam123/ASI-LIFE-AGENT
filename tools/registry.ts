import { Tool } from '@asi-types/index';
import { FileTool } from './file';
import { CodeTool } from './code';
import { WebTool } from './web';
import { TerminalTool } from './terminal';
import { SystemTool } from './system';
import { CommunicationTool } from './communication';
import { AnalysisTool } from './analysis';
import { CreativeTool } from './creative';
import { AutomationTool } from './automation';
import { LearningTool } from './learning';
import { SecurityTool } from './security';
import { DeploymentTool } from './deployment';
import { DataTool } from './data';

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();
  private categories: Map<string, Tool[]> = new Map();

  constructor() {
    this.registerBuiltinTools();
  }

  private registerBuiltinTools(): void {
    const builtinTools = [
      FileTool,
      CodeTool,
      WebTool,
      TerminalTool,
      SystemTool,
      CommunicationTool,
      AnalysisTool,
      CreativeTool,
      AutomationTool,
      LearningTool,
      SecurityTool,
      DeploymentTool,
      DataTool,
    ];

    for (const tool of builtinTools) {
      this.register(tool);
    }
  }

  public register(tool: Tool): void {
    this.tools.set(tool.name, tool);
    
    if (!this.categories.has(tool.category)) {
      this.categories.set(tool.category, []);
    }
    this.categories.get(tool.category)!.push(tool);
  }

  public unregister(name: string): boolean {
    const tool = this.tools.get(name);
    if (!tool) return false;
    
    this.tools.delete(name);
    const categoryTools = this.categories.get(tool.category);
    if (categoryTools) {
      const index = categoryTools.findIndex(t => t.name === name);
      if (index !== -1) categoryTools.splice(index, 1);
    }
    return true;
  }

  public get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  public getAll(): Tool[] {
    return Array.from(this.tools.values());
  }

  public getByCategory(category: string): Tool[] {
    return this.categories.get(category) || [];
  }

  public getCategories(): string[] {
    return Array.from(this.categories.keys());
  }

  public has(name: string): boolean {
    return this.tools.has(name);
  }

  public async execute(name: string, input: Record<string, unknown>, context: any): Promise<any> {
    const tool = this.tools.get(name);
    if (!tool) {
      return { success: false, error: `Tool ${name} not found`, duration: 0 };
    }
    return tool.execute(input, context);
  }

  public getManifest(): any {
    const manifest: any = {};
    for (const [name, tool] of this.tools) {
      manifest[name] = {
        name: tool.name,
        description: tool.description,
        category: tool.category,
        schema: tool.schema,
        requiresApproval: tool.requiresApproval,
        reversibility: tool.reversibility,
      };
    }
    return manifest;
  }
}

export const toolRegistry = new ToolRegistry();
export default toolRegistry;