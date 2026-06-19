import { NextRequest, NextResponse } from 'next/server';
import { createUUID } from '@asi-types/index';

const approvals = new Map();

export async function GET() {
  return NextResponse.json(Array.from(approvals.values()));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const approval = {
      id: createUUID(),
      ...body,
      status: 'pending',
      requestedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    approvals.set(approval.id, approval);
    return NextResponse.json(approval, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const body = await request.json();

    if (!id || !approvals.has(id)) {
      return NextResponse.json({ error: 'Approval not found' }, { status: 404 });
    }

    const approval = approvals.get(id);
    const updated = { ...approval, ...body, updatedAt: new Date(), respondedAt: new Date() };
    approvals.set(id, updated);
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}