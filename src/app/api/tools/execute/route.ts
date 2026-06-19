import { NextRequest, NextResponse } from 'next/server';
import { toolRegistry } from '@tools/registry';

export async function POST(request: NextRequest) {
  try {
    const { tool, input } = await request.json();

    if (!tool || typeof tool !== 'string') {
      return NextResponse.json({ error: 'Tool name required' }, { status: 400 });
    }

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

    const result = await toolRegistry.execute(tool, input || {}, context);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error', duration: 0 },
      { status: 500 }
    );
  }
}

export async function GET() {
  const manifest = toolRegistry.getManifest();
  return NextResponse.json({ tools: manifest });
}