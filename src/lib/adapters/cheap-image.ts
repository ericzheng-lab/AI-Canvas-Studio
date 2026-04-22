const BASE_URL = "https://api.bltcy.ai/v1";

const MODEL_MAP: Record<string, string> = {
  // NanoBanana
  "nano-banana-pro": "nano-banana-pro",
  "nano-banana": "nano-banana-pro",
  "nanobanana": "nano-banana-pro",
  "nano-banana-pro-2k": "nano-banana-pro-2k",

  // Seedream
  "seedream-5": "doubao-seedream-5-0-260128",
  "seedream-5.0": "doubao-seedream-5-0-260128",
  "doubao-seedream-5": "doubao-seedream-5-0-260128",
  "seedream-3": "seedream-3.0",
  "seedream-3.0": "seedream-3.0",
  "doubao-seedream": "doubao-seedream-3-0-t2i-250415",

  // GPT Image
  "gpt-image": "gpt-image-1.5",
  "gpt-image-1": "gpt-image-1",
  "gpt-image-1.5": "gpt-image-1.5",
  "gpt-image-2": "gpt-image-2",

  // Flux
  "flux": "flux",
  "Flux": "flux",
  "flux-dev": "flux-dev",
  "flux-schnell": "flux-schnell",

  // DALL-E
  "dall-e": "dall-e-3",
  "dall-e-3": "dall-e-3",
};

export interface GenerateParams {
  prompt: string;
  model?: string;
  size?: string;
  images?: string[];
  extraPayload?: Record<string, any>;
  mode?: "generations" | "edits";
}

export interface GenerateResult {
  success: boolean;
  resultUrl?: string;
  provider?: string;
  model?: string;
  error?: string;
  details?: string;
  status?: number;
  response?: any;
}

export async function generateCheapImage(params: GenerateParams, apiKey: string): Promise<GenerateResult> {
  const {
    prompt,
    model = "flux",
    size = "1024x1024",
    images = [],
    extraPayload,
    mode = "generations",
  } = params;
  const mappedModel = MODEL_MAP[model] || model;

  const endpoint = `${BASE_URL}/images/${mode}`;

  // NanoBanana 特殊处理：aspect_ratio 嵌套结构
  if (mappedModel === 'nano-banana-pro-2k') {
    // 从 size 映射 aspect_ratio
    const sizeToAspectRatio: Record<string, string> = {
      '1024x1024': '1:1',
      '1792x1024': '16:9',
      '1024x1792': '9:16',
      '2048x874': '21:9',
    };
    const aspectRatio = sizeToAspectRatio[size] || extraPayload?.aspect_ratio || '1:1';
    
    // 只保留必要字段，严格清理
    const finalBody: any = {
      model: mappedModel,
      prompt,
      n: 1,
      response_format: "url",
      generation_config: {
        image_config: {
          aspect_ratio: aspectRatio,
        },
      },
    };
    
    // 添加 images（如果有）
    if (images && images.length > 0) {
      finalBody.image = images.slice(0, 4);
    }
    
    // 调试日志
    console.log('[cheap-image] NanoBanana finalBody:', JSON.stringify(finalBody, null, 2));
    
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(finalBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[cheap-image] API error: ${response.status} - ${errorText}`);
      return {
        success: false,
        error: "API_ERROR",
        details: `Image API error: ${response.status} - ${errorText}`,
        status: response.status,
      };
    }

    const data = await response.json();

    // Extract URL from response
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
      console.error('[cheap-image] No image in response:', JSON.stringify(data));
      return {
        success: false,
        error: "NO_IMAGE",
        details: "No image URL in API response",
        response: data,
      };
    }

    return {
      success: true,
      resultUrl: imageUrl,
      provider: "cheap-image",
      model: mappedModel,
    };
  }
  
  // 其他模型的处理逻辑
  const body: any = {
    model: mappedModel,
    prompt,
    n: 1,
    response_format: "url",
  };
  
  // 其他模型使用标准 size 参数
  body.size = size;
  if (extraPayload?.aspect_ratio) {
    body.aspect_ratio = extraPayload.aspect_ratio;
  }

  // 合并其他 extraPayload（排除已处理的 aspect_ratio）
  if (extraPayload) {
    const { aspect_ratio, ...rest } = extraPayload;
    Object.assign(body, rest);
  }

  if (images && images.length > 0) {
    body.image = images.slice(0, 4);
  }

  // 调试日志
  console.log('[cheap-image] Payload:', JSON.stringify(body, null, 2));

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[cheap-image] API error: ${response.status} - ${errorText}`);
    return {
      success: false,
      error: "API_ERROR",
      details: `Image API error: ${response.status} - ${errorText}`,
      status: response.status,
    };
  }

  const data = await response.json();

  // Extract URL from response
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
    console.error('[cheap-image] No image in response:', JSON.stringify(data));
    return {
      success: false,
      error: "NO_IMAGE",
      details: "No image URL in API response",
      response: data,
    };
  }

  // Synchronous return - no taskId
  return {
    success: true,
    resultUrl: imageUrl,
    provider: "cheap-image",
    model: mappedModel,
  };
}
