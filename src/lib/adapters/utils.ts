/**
 * Edge Runtime Utilities
 * Replacements for Node.js Buffer
 */

// Convert ArrayBuffer to base64 string (Edge-compatible)
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Convert base64 to data URL
export function base64ToDataUrl(base64: string, mimeType: string = 'image/png'): string {
  if (base64.startsWith('data:')) return base64;
  return `data:${mimeType};base64,${base64}`;
}

// Download image and convert to base64 data URL
export async function downloadImageToBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const base64 = arrayBufferToBase64(arrayBuffer);
  
  // Detect MIME type from URL or default to image/png
  let mimeType = 'image/png';
  if (url.includes('.jpg') || url.includes('.jpeg')) mimeType = 'image/jpeg';
  if (url.includes('.png')) mimeType = 'image/png';
  if (url.includes('.webp')) mimeType = 'image/webp';
  
  return `data:${mimeType};base64,${base64}`;
}
