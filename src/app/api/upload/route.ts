export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';

// 阿里云 OSS 配置（从环境变量读取）
const ACCESS_KEY_ID = process.env.ALIYUN_OSS_ACCESS_KEY_ID || '';
const ACCESS_KEY_SECRET = process.env.ALIYUN_OSS_ACCESS_KEY_SECRET || '';
const ENDPOINT = process.env.ALIYUN_OSS_ENDPOINT || 'oss-cn-hangzhou.aliyuncs.com';
const BUCKET_NAME = process.env.ALIYUN_OSS_BUCKET || 'drs-88';

/**
 * 生成阿里云 OSS 签名
 * 参考: https://help.aliyun.com/document_detail/31951.html
 */
async function generateOSSSignature(
  method: string,
  contentMd5: string,
  contentType: string,
  date: string,
  canonicalizedResource: string
): Promise<string> {
  const stringToSign = `${method}\n${contentMd5}\n${contentType}\n${date}\n${canonicalizedResource}`;
  
  // 使用 Web Crypto API 进行 HMAC-SHA1 签名
  const encoder = new TextEncoder();
  const keyData = encoder.encode(ACCESS_KEY_SECRET);
  const messageData = encoder.encode(stringToSign);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  
  // Base64 编码
  const base64Signature = btoa(String.fromCharCode(...new Uint8Array(signature)));
  
  return base64Signature;
}



export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { success: false, error: 'Only image files are allowed' },
        { status: 400 }
      );
    }

    // 验证文件大小（最大 10MB）
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds 10MB limit' },
        { status: 400 }
      );
    }

    // 读取文件内容
    const arrayBuffer = await file.arrayBuffer();
    const contentMd5 = '';
    
    // 生成云端文件名
    const date = new Date().toUTCString();
    const datePrefix = new Date().toISOString().slice(0, 7).replace('-', '');
    const uniqueId = Math.random().toString(36).substring(2, 10);
    const objectName = `canvas-uploads/${datePrefix}/${uniqueId}_${file.name}`;
    
    // 生成签名
    const canonicalizedResource = `/${BUCKET_NAME}/${objectName}`;
    const signature = await generateOSSSignature(
      'PUT',
      contentMd5,
      file.type,
      date,
      canonicalizedResource
    );
    
    // 构建 Authorization 头
    const authorization = `OSS ${ACCESS_KEY_ID}:${signature}`;
    
    // 上传到阿里云 OSS
    const uploadUrl = `https://${ENDPOINT}/${objectName}`;
    
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type,
        'Content-MD5': contentMd5,
        'Date': date,
        'Authorization': authorization,
        'x-oss-object-acl': 'public-read', // 设置为公共读
      },
      body: arrayBuffer,
    });
    
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('[OSS Upload Error]:', errorText);
      return NextResponse.json(
        { success: false, error: `OSS upload failed: ${uploadResponse.status}` },
        { status: 500 }
      );
    }
    
    // 返回公共访问 URL
    const publicUrl = `https://${BUCKET_NAME}.${ENDPOINT}/${objectName}`;
    
    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename: file.name,
      size: file.size,
    });
    
  } catch (error: any) {
    console.error('[Upload API Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Upload failed' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'upload' });
}
