export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { mjImagine } from '@/lib/adapters/midjourney';
import { generateCheapImage } from '@/lib/adapters/cheap-image';

const BLTCY_API_KEY = process.env.BLTCY_API_KEY || '';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { model, prompt, images = [], aspect = '1:1' } = body;
    const apiKey = body.apiKey || BLTCY_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'Missing API key' }, { status: 401 });
    }

    if (!model || !prompt) {
      return NextResponse.json({ success: false, error: 'Missing model or prompt' }, { status: 400 });
    }

    // Midjourney
    if (model === 'midjourney' || model.startsWith('mj')) {
      const result = await mjImagine({ prompt, aspect, images }, apiKey);
      return NextResponse.json(result);
    }

    // All other image models (NanoBanana, Seedream, GPT-Image, Flux, DALL-E)
    const result = await generateCheapImage({ prompt, model, images }, apiKey);
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('[generate] Error:', error.message);
    return NextResponse.json(
      { success: false, error: error.message || 'Generation failed' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'ai-canvas-studio-generate',
    status: 'ok',
    models: ['midjourney', 'nano-banana', 'seedream-5', 'gpt-image-1.5', 'flux', 'dall-e-3'],
  });
}
