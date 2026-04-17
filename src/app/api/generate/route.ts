export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { mjImagine, mjAction } from '@/lib/adapters/midjourney';
import { generateCheapImage } from '@/lib/adapters/cheap-image';

const BLTCY_API_KEY = process.env.BLTCY_API_KEY || '';

const ASPECT_SIZE_MAP: Record<string, string> = {
  '1:1': '1024x1024',
  '16:9': '1792x1024',
  '9:16': '1024x1792',
  '21:9': '2048x874',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      prompt,
      model: rawModel = 'flux',
      size: rawSize,
      images = [],
      apiKey,
      aspect_ratio,
      aspectRatio,
      referenceImage,
      action,
      taskId: actionTaskId,
      customId,
    } = body;

    if (!prompt && !(action && actionTaskId && customId)) {
      return NextResponse.json(
        { success: false, error: 'Missing prompt or action parameters' },
        { status: 400 }
      );
    }

    const key = apiKey || BLTCY_API_KEY;
    if (!key) {
      return NextResponse.json(
        { success: false, error: 'Missing API key' },
        { status: 401 }
      );
    }

    // Midjourney action branch (Upscale, Variation, Zoom, Pan, etc.)
    if (action && actionTaskId && customId) {
      const result = await mjAction({ taskId: actionTaskId, customId }, key);
      return NextResponse.json({
        success: true,
        taskId: result.taskId,
        status: 'submitted',
        provider: 'midjourney',
        pollUrl: `/api/status?taskId=${result.taskId}&provider=midjourney`,
      });
    }

    let apiModelId = rawModel;

    // 1. 模型名称精准映射
    if (apiModelId === 'Midjourney') {
      apiModelId = 'midjourney';
    } else if (apiModelId === 'Seedream 5') {
      apiModelId = 'doubao-seedream-5-0-260128';
    } else if (apiModelId && apiModelId.toLowerCase().includes('banana')) {
      apiModelId = 'nano-banana-pro-2k';
    } else if (apiModelId === 'GPT-Image 1.5' || apiModelId.toLowerCase().includes('gpt')) {
      apiModelId = 'gpt-image-1.5';
    } else if (apiModelId === 'bfl/flux-2-max') {
      apiModelId = 'bfl/flux-2-max';
    }

    // Resolve size from aspectRatio or aspect_ratio
    const incomingAspect = aspectRatio || aspect_ratio;
    const resolvedSize = rawSize || (incomingAspect ? ASPECT_SIZE_MAP[incomingAspect] : undefined) || '1024x1024';

    // ========== bfl/flux-2-max 专属分支 ==========
    if (apiModelId === 'bfl/flux-2-max') {
      // 解析 size 为 width/height
      const [width, height] = resolvedSize.split('x').map(Number);
      
      const apiPayload: any = {
        model: 'bfl/flux-2-max',
        prompt,
        size: resolvedSize,
        width,
        height,
        n: 1,
        response_format: 'url',
      };
      if (images && images.length > 0) {
        apiPayload.image = images.slice(0, 4);
      }

      const response = await fetch('https://api.bltcy.ai/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify(apiPayload),
      });

      if (!response.ok) {
        const errorDetail = await response.text();
        console.error('[Flux-2-Max API Error]:', {
          status: response.status,
          statusText: response.statusText,
          errorDetail,
          payload: apiPayload,
        });
        throw new Error(`Flux-2-Max API error ${response.status}: ${errorDetail || response.statusText}`);
      }

      const data = await response.json();
      let imageUrl: string | undefined;
      if (data.data?.[0]?.url) {
        imageUrl = data.data[0].url;
      } else if (data.data?.[0]?.b64_json) {
        imageUrl = `data:image/png;base64,${data.data[0].b64_json}`;
      } else if (data.url) {
        imageUrl = data.url;
      } else if (data.result?.url) {
        imageUrl = data.result.url;
      }

      if (!imageUrl) {
        throw new Error('No image in Flux-2-Max response: ' + JSON.stringify(data));
      }

      return NextResponse.json({
        success: true,
        resultUrl: imageUrl,
        provider: 'bltcy',
        model: 'bfl/flux-2-max',
      });
    }

    // ========== 图生图分支 (Adapter Pattern) ==========
    if (referenceImage) {
      // Midjourney: URL 前置拼接到 Prompt
      if (apiModelId === 'midjourney' || apiModelId === 'mj') {
        const result = await mjImagine(
          { prompt: `${referenceImage} ${prompt}`, images },
          key
        );
        return NextResponse.json({
          success: true,
          taskId: result.taskId,
          status: 'submitted',
          provider: 'midjourney',
          pollUrl: `/api/status?taskId=${result.taskId}&provider=midjourney`,
        });
      }

      // Nano Banana 2K: 先尝试 /edits，失败则 fallback 到 /generations
      if (apiModelId === 'nano-banana-pro-2k') {
        try {
          const result = await generateCheapImage(
            {
              prompt,
              model: apiModelId,
              size: resolvedSize,
              images: [referenceImage],
              mode: 'edits',
              extraPayload: { image_size: '2K' },
            },
            key
          );
          return NextResponse.json({
            success: true,
            resultUrl: result.resultUrl,
            provider: result.provider,
            model: result.model,
          });
        } catch (editsErr: any) {
          console.warn('[generate] Banana /edits failed, falling back to /generations:', editsErr.message);
          try {
            const result = await generateCheapImage(
              {
                prompt,
                model: apiModelId,
                size: resolvedSize,
                images: [referenceImage],
                mode: 'generations',
                extraPayload: { image_size: '2K' },
              },
              key
            );
            return NextResponse.json({
              success: true,
              resultUrl: result.resultUrl,
              provider: result.provider,
              model: result.model,
            });
          } catch (fallbackErr: any) {
            throw new Error(`Banana image-to-image failed: ${fallbackErr.message}`);
          }
        }
      }

      // Seedream 5: generations 端点注入 image 数组
      if (apiModelId === 'doubao-seedream-5-0-260128') {
        const result = await generateCheapImage(
          { prompt, model: apiModelId, size: resolvedSize, images: [referenceImage] },
          key
        );
        return NextResponse.json({
          success: true,
          resultUrl: result.resultUrl,
          provider: result.provider,
          model: result.model,
        });
      }

      // GPT-Image 1.5: generations 端点注入 image 数组
      if (apiModelId === 'gpt-image-1.5') {
        const result = await generateCheapImage(
          { prompt, model: apiModelId, size: resolvedSize, images: [referenceImage] },
          key
        );
        return NextResponse.json({
          success: true,
          resultUrl: result.resultUrl,
          provider: result.provider,
          model: result.model,
        });
      }

      // 兜底：明确不支持
      throw new Error(
        `${apiModelId} currently does not support image-to-image in this channel.`
      );
    }

    // ========== 纯文生图分支 ==========
    if (apiModelId === 'midjourney' || apiModelId === 'mj') {
      const result = await mjImagine({ prompt, images }, key);
      return NextResponse.json({
        success: true,
        taskId: result.taskId,
        status: 'submitted',
        provider: 'midjourney',
        pollUrl: `/api/status?taskId=${result.taskId}&provider=midjourney`,
      });
    }

    const apiPayload: any = {
      model: apiModelId,
      prompt,
      size: resolvedSize,
      n: 1,
      response_format: 'url',
    };

    if (apiModelId === 'nano-banana-pro-2k') {
      apiPayload.image_size = '2K';
    }

    if (aspect_ratio) {
      apiPayload.aspect_ratio = aspect_ratio;
    }

    if (images && images.length > 0) {
      apiPayload.image = images.slice(0, 4);
    }

    const result = await generateCheapImage(
      { prompt, model: apiModelId, size: resolvedSize, images, extraPayload: apiPayload },
      key
    );
    return NextResponse.json({
      success: true,
      resultUrl: result.resultUrl,
      provider: result.provider,
      model: result.model,
    });
  } catch (error: any) {
    console.error('[generate] Error:', error.message);
    return NextResponse.json(
      { success: false, error: error.message || 'Generation failed', detail: error.detail || undefined },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'ai-canvas-studio-generate' });
}
