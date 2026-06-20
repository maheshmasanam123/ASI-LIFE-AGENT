import { NextRequest, NextResponse } from 'next/server';
import { getProviderRegistry } from '../../../../lib/llm';

export async function POST(request: NextRequest) {
  try {
    const { provider, apiKey } = await request.json();

    if (!provider || !apiKey) {
      return NextResponse.json({ valid: false, error: 'Provider and API key required' }, { status: 400 });
    }

    const registry = getProviderRegistry({
      [provider]: { apiKey },
    });

    const providerInstance = registry.getProvider(provider as any);
    if (!providerInstance) {
      return NextResponse.json({ valid: false, error: `Unknown provider: ${provider}` }, { status: 400 });
    }

    const result = await providerInstance.validateConfig();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ valid: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}