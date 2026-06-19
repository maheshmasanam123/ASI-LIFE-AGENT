import { NextRequest, NextResponse } from 'next/server';
import { createUUID } from '@asi-types/index';
import { orchestrator } from '../../../../agents/orchestrator';

export async function POST(request: NextRequest) {
  try {
    const { message, history, taskId } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 });
    }

    // If taskId provided, update task status to running
    if (taskId) {
      // Task status update would be handled by the orchestrator
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const response = await generateResponse(message, history || []);
        
        for (const chunk of response) {
          controller.enqueue(encoder.encode(chunk + '\n'));
          await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        controller.close();
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

async function generateResponse(message: string, history: any[]): Promise<string[]> {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi ')) {
    return ['Hello! I am your ASI Life Agent. How can I assist you today?'];
  }

  if (lowerMessage.includes('status') || lowerMessage.includes('how are you')) {
    return ['I am operating at full capacity. All systems nominal. Ready to handle any task you throw at me.'];
  }

  if (lowerMessage.includes('task') || lowerMessage.includes('do ')) {
    return ['I can create and execute tasks for you. What would you like me to work on? I have access to file operations, code execution, web browsing, system monitoring, and much more.'];
  }

  if (lowerMessage.includes('approve') || lowerMessage.includes('approval')) {
    return ['For irreversible actions, I will always request your approval first. You can view pending approvals in the Approvals widget.'];
  }

  if (lowerMessage.includes('tool') || lowerMessage.includes('capabilit')) {
    return ['I have 13 tool categories: File, Code, Web, Terminal, System, Communication, Analysis, Creative, Automation, Learning, Security, Deployment, and Data. Each contains multiple operations.'];
  }

  return [`I received: "${message}". As your autonomous agent, I can help with almost anything. Try asking me to create a file, run code, search the web, analyze data, or automate a workflow.`];
}