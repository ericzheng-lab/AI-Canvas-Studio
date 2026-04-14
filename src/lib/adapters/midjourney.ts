const MJ_BASE_URL = "https://api.bltcy.ai/mj-relax";

export async function mjImagine(params: { prompt: string; aspect?: string; images?: string[] }, apiKey: string) {
  const { prompt, aspect = "1:1", images = [] } = params;
  const endpoint = `${MJ_BASE_URL}/mj/submit/imagine`;

  const body: any = { prompt, aspect_ratio: aspect };

  if (images.length > 0) {
    const base64Array: string[] = [];
    for (const img of images.slice(0, 4)) {
      if (img.startsWith('data:image')) {
        base64Array.push(img);
      } else {
        try {
          const res = await fetch(img);
          const buf = await res.arrayBuffer();
          const bytes = new Uint8Array(buf);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
          const b64 = btoa(binary);
          const mime = img.includes('.png') ? 'image/png' : 'image/jpeg';
          base64Array.push(`data:${mime};base64,${b64}`);
        } catch (e) {
          console.error('[MJ] Failed to download ref image:', img);
        }
      }
    }
    if (base64Array.length > 0) body.base64Array = base64Array;
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  if (data.code !== 1) {
    throw new Error(`MJ Imagine failed: ${data.description || JSON.stringify(data)}`);
  }

  return {
    success: true,
    taskId: String(data.result),
    status: "submitted",
    provider: "midjourney",
  };
}

export async function checkMJStatus(taskId: string, apiKey: string) {
  const endpoint = `${MJ_BASE_URL}/mj/task/${taskId}/fetch`;
  const response = await fetch(endpoint, { headers: { "Authorization": `Bearer ${apiKey}` } });
  const data = await response.json();

  const task = data.id ? data : data.result;
  if (!task) throw new Error("Invalid MJ status response");

  const status = task.status;
  if (status === "SUCCESS") {
    return {
      success: true,
      status: "completed",
      imageUrl: task.imageUrl,
      buttons: task.buttons,
    };
  }

  return { success: true, status: status.toLowerCase(), message: `Task ${status}` };
}
