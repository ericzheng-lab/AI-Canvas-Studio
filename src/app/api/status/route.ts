export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { checkMJStatus } from '@/lib/adapters/midjourney';

const BLTCY_API_KEY = process.env.BLTCY_API_KEY || '';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');
    const provider = searchParams.get('provider');
    const apiKey = searchParams.get('apiKey') || BLTCY_API_KEY;

    if (!taskId) {
      return NextResponse.json({ success: false, error: 'Missing taskId' }, { status: 400 });
    }

    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'Missing API key' }, { status: 401 });
    }

    // Midjourney polling
    if (provider === 'midjourney') {
      const result = await checkMJStatus(taskId, apiKey);
      return NextResponse.json(result);
    }

    return NextResponse.json({ success: false, error: 'Unknown provider' }, { status: 400 });
  } catch (error: any) {
    console.error('[status] Error:', error.message);
    return NextResponse.json(
      { success: false, error: error.message || 'Status check failed' },
      { status: 500 }
    );
  }
}
