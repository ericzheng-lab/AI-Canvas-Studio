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

  // Flux
  "flux": "flux",
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

export async function generateCheapImage(params: GenerateParams, apiKey: string) {
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
  const body: any = {
    model: mappedModel,
    prompt,
    size,
    n: 1,
    response_format: "url",
    ...(extraPayload || {}),
  };

  if (images && images.length > 0) {
    body.image = images.slice(0, 4);
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Image API error: ${response.status} - ${error}`);
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
    throw new Error("No image in response");
  }

  // Synchronous return - no taskId
  return {
    success: true,
    resultUrl: imageUrl,
    provider: "cheap-image",
    model: mappedModel,
  };
}
