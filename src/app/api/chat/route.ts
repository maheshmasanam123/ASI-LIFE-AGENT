import { NextRequest, NextResponse } from 'next/server';
import { createUUID } from '@asi-types';
import { getProviderRegistry } from '@/lib/llm';
import { toolRegistry } from '@tools/registry';

const SYSTEM_PROMPT = `You are ASI Life Agent, an autonomous AI agent with access to comprehensive tools for system operations, file management, code execution, web access, communication, and analysis.

Your task is to help the user by:
1. Understanding their request
2. Planning the steps needed
3. Executing tools to accomplish the task
4. Observing results and adjusting if needed
5. Providing a final result

Available tools:
{{TOOLS}}

For each step, you can call tools. When you need to use a tool, respond with a tool call.
When you have completed the task, provide a final summary.

Be thorough, precise, and communicate your reasoning.`;

async function getToolsDescription(): Promise<string> {
  const manifest = toolRegistry.getManifest();
  let desc = '';
  for (const [name, tool] of Object.entries(manifest)) {
    desc += `- ${name}: ${tool.description}\n`;
    desc += `  Parameters: ${JSON.stringify(tool.schema.properties || {})}\n`;
    desc += `  Requires approval: ${tool.requiresApproval}, Reversibility: ${tool.reversibility}\n\n`;
  }
  return desc;
}

export async function POST(request: NextRequest) {
  try {
    const { message, history, taskId, provider, model } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 });
    }

    const registry = getProviderRegistry();
    const toolsDesc = await getToolsDescription();
    
    // Build message history for LLM
    const messages = [
      { role: 'system' as const, content: SYSTEM_PROMPT.replace('{{TOOLS}}', toolsDesc) },
      ...(history || []).slice(-10).map((h: any) => ({
        role: h.role === 'user' ? 'user' as const : h.role === 'assistant' ? 'assistant' as const : 'user' as const,
        content: h.content,
      })),
      { role: 'user' as const, content: message },
    ];

    // Get available tools for function calling
    const manifest = toolRegistry.getManifest();
    const llmTools = Object.entries(manifest).map(([name, tool]) => ({
      type: 'function' as const,
      function: {
        name,
        description: tool.description,
        parameters: tool.schema,
      },
    }));

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const llmProvider = registry.getProvider(provider as any) || registry.getDefaultProvider();
          
          if (!llmProvider) {
            controller.enqueue(encoder.encode('Error: No LLM provider configured. Please configure an API key in Settings.\n'));
            controller.close();
            return;
          }

          let fullResponse = '';
          
          for await (const chunk of llmProvider.streamComplete({
            model: model || llmProvider.defaultModel,
            messages,
            tools: llmTools,
            tool_choice: 'auto',
            temperature: 0.7,
            max_tokens: 4096,
            stream: true,
          })) {
            const delta = chunk.choices[0]?.delta;
            if (delta?.content) {
              fullResponse += delta.content;
              controller.enqueue(encoder.encode(delta.content));
            }
            
            // Handle tool calls
            if (delta?.tool_calls) {
              for (const toolCall of delta.tool_calls) {
                if (toolCall.function?.name) {
                  controller.enqueue(encoder.encode(`\n[TOOL CALL: ${toolCall.function.name}]\n`));
                  
                  // Execute tool
                  const args = JSON.parse(toolCall.function.arguments || '{}');
                  const context = {
                    userId: 'user-1',
                    sessionId: 'session-1',
                    workingDirectory: process.cwd(),
                    environment: { ...process.env } as Record<string, string>,
                    permissions: [{ resource: '*', actions: ['*'] }],
                    preferences: {
                      theme: 'dark',
                      language: 'en',
                      autoApproveReversible: true,
                      notificationLevel: 'all',
                      defaultModel: 'gpt-4',
                      maxConcurrentTasks: 10,
                      workingDirectory: process.cwd(),
                    },
                    history: [],
                    activeTasks: [],
                    availableTools: toolRegistry.getAll().map(t => t.name),
                  };
                  
                  const result = await toolRegistry.execute(toolCall.function.name, args, context);
                  
                  if (result.success) {
                    controller.enqueue(encoder.encode(`[TOOL RESULT: ${JSON.stringify(result.output).slice(0, 500)}]\n`));
                  } else {
                    controller.enqueue(encoder.encode(`[TOOL ERROR: ${result.error}]\n`));
                  }
                }
              }
            }
          }

          controller.enqueue(encoder.encode('\n\n[Task completed]\n'));
          controller.close();
        } catch (error) {
          controller.enqueue(encoder.encode(`\nError: ${error instanceof Error ? error.message : String(error)}\n`));
          controller.close();
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}