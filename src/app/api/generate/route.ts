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
      sketchUrl,
      referenceUrl,
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
    } else if (apiModelId === 'GPT-Image 1.5' || apiModelId.toLowerCase().includes('gpt-image-1')) {
      apiModelId = 'gpt-image-1.5';
    } else if (apiModelId === 'GPT-Image 2' || apiModelId === 'GPT-Image-2' || apiModelId === 'gpt-image-2') {
      apiModelId = 'gpt-image-2';
    } else if (apiModelId === 'Flux' || apiModelId === 'flux') {
      apiModelId = 'flux';
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

      // 第一步：提交任务
      const submitRes = await fetch('https://api.bltcy.ai/bfl/v1/flux-2-max', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          image_size: { width, height },
          output_format: 'jpeg',
          safety_tolerance: 2,
        }),
      });

      if (!submitRes.ok) {
        const errorDetail = await submitRes.text();
        console.error('[Flux-2-Max Submit Error]:', {
          status: submitRes.status,
          statusText: submitRes.statusText,
          errorDetail,
        });
        throw new Error(`Flux-2-Max submit error ${submitRes.status}: ${errorDetail || submitRes.statusText}`);
      }

      const submitData = await submitRes.json();
      const taskId = submitData.id;

      if (!taskId) {
        throw new Error('Flux-2-Max submit returned no task id: ' + JSON.stringify(submitData));
      }

      // 第二步：轮询获取结果
      let imageUrl: string | null = null;
      let pollError: string | null = null;
      const maxPolls = 60; // 最多轮询 60 次，每次 2 秒，共 120 秒

      for (let i = 0; i < maxPolls; i++) {
        await new Promise((r) => setTimeout(r, 2000));

        const resultRes = await fetch(
          `https://api.bltcy.ai/bfl/v1/get_result?id=${taskId}`,
          { headers: { Authorization: `Bearer ${key}` } }
        );

        if (!resultRes.ok) {
          const errorDetail = await resultRes.text();
          console.error('[Flux-2-Max Poll Error]:', {
            status: resultRes.status,
            statusText: resultRes.statusText,
            errorDetail,
            taskId,
          });
          pollError = `Poll error ${resultRes.status}: ${errorDetail || resultRes.statusText}`;
          break;
        }

        const resultData = await resultRes.json();

        if (resultData.status === 'Ready') {
          imageUrl = resultData.result?.sample || null;
          break;
        }

        if (resultData.status === 'Error' || resultData.status === 'Failed') {
          pollError = resultData.error || 'Task failed during generation';
          break;
        }
      }

      if (pollError) {
        throw new Error(`Flux-2-Max generation failed: ${pollError}`);
      }

      if (!imageUrl) {
        throw new Error('Flux-2-Max polling timeout: image not ready after 120s');
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
          if (!result.success) {
            return NextResponse.json(
              { success: false, error: result.error, details: result.details },
              { status: result.status || 500 }
            );
          }
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
            if (!result.success) {
              return NextResponse.json(
                { success: false, error: result.error, details: result.details },
                { status: result.status || 500 }
              );
            }
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
        if (!result.success) {
          return NextResponse.json(
            { success: false, error: result.error, details: result.details },
            { status: result.status || 500 }
          );
        }
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
        if (!result.success) {
          return NextResponse.json(
            { success: false, error: result.error, details: result.details },
            { status: result.status || 500 }
          );
        }
        return NextResponse.json({
          success: true,
          resultUrl: result.resultUrl,
          provider: result.provider,
          model: result.model,
        });
      }

      // GPT-Image 2: 支持 images.edit（有参考图）或 images.generations（无参考图）
      if (apiModelId === 'gpt-image-2') {
        const allRefImages = [
          ...(referenceImage ? [referenceImage] : []),
          ...(sketchUrl ? [sketchUrl] : []),
          ...(referenceUrl ? [referenceUrl] : []),
          ...(images || []),
        ];
        const hasRef = allRefImages.length > 0;
        const allImages = allRefImages;

        if (hasRef) {
          // 有参考图 → 使用 images.edit
          const formData = new FormData();
          formData.append('model', 'gpt-image-2');
          formData.append('prompt', prompt);
          if (resolvedSize) formData.append('size', resolvedSize);
          if (body.quality) formData.append('quality', body.quality);
          formData.append('n', '1');

          for (const imgUrl of allImages) {
            try {
              const imgRes = await fetch(imgUrl);
              if (!imgRes.ok) throw new Error(`Failed to fetch image: ${imgUrl}`);
              const blob = await imgRes.blob();
              const file = new File([blob], 'image.png', { type: blob.type || 'image/png' });
              formData.append('image[]', file);
            } catch (fetchErr: any) {
              console.warn('[gpt-image-2] Failed to fetch reference image:', imgUrl, fetchErr.message);
            }
          }

          const editRes = await fetch('https://api.bltcy.ai/v1/images/edits', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${key}`,
            },
            body: formData,
          });

          if (!editRes.ok) {
            const errText = await editRes.text();
            throw new Error(`GPT-Image-2 edit error ${editRes.status}: ${errText}`);
          }

          const editData = await editRes.json();
          const imageUrl = editData.data?.[0]?.url;
          if (!imageUrl) throw new Error('GPT-Image-2 edit returned no image URL');

          return NextResponse.json({
            success: true,
            resultUrl: imageUrl,
            provider: 'bltcy',
            model: 'gpt-image-2',
          });
        }

        // 无参考图 → 使用 images.generations
        const genBody: any = {
          model: 'gpt-image-2',
          prompt,
          size: resolvedSize,
          n: 1,
          response_format: 'url',
        };
        if (body.quality) genBody.quality = body.quality;

        const genRes = await fetch('https://api.bltcy.ai/v1/images/generations', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(genBody),
        });

        if (!genRes.ok) {
          const errText = await genRes.text();
          throw new Error(`GPT-Image-2 generation error ${genRes.status}: ${errText}`);
        }

        const genData = await genRes.json();
        const imageUrl = genData.data?.[0]?.url;
        if (!imageUrl) throw new Error('GPT-Image-2 generation returned no image URL');

        return NextResponse.json({
          success: true,
          resultUrl: imageUrl,
          provider: 'bltcy',
          model: 'gpt-image-2',
        });
      }

      // 兜底：明确不支持
      throw new Error(
        `${apiModelId} currently does not support image-to-image in this channel.`
      );
    }

    // ========== 纯文生图分支 ==========
    // Flux 基础款：直接调用 cheap-image 适配器
    if (apiModelId === 'flux') {
      const result = await generateCheapImage(
        { prompt, model: apiModelId, size: resolvedSize, images },
        key
      );
      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error, details: result.details },
          { status: result.status || 500 }
        );
      }
      return NextResponse.json({
        success: true,
        resultUrl: result.resultUrl,
        provider: result.provider,
        model: result.model,
      });
    }

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
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error, details: result.details },
        { status: result.status || 500 }
      );
    }
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
