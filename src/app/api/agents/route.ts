import { NextRequest, NextResponse } from 'next/server';
import { createUUID } from '@asi-types/index';

const agents = new Map();

export async function GET() {
  return NextResponse.json(Array.from(agents.values()));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const agent = {
      id: createUUID(),
      name: body.name || 'ASI Agent',
      status: 'idle',
      config: body.config || {},
      createdAt: new Date(),
      metrics: { cpu: 0, memory: 0, disk: 0, network: { up: 0, down: 0 }, processes: 0, uptime: 0 },
      taskCount: 0,
      errorCount: 0,
    };
    agents.set(agent.id, agent);
    return NextResponse.json(agent, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}