'use client';

import { memo, useState, useRef, useCallback } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { NodeResizer } from '@reactflow/node-resizer';
import '@reactflow/node-resizer/dist/style.css';
import { useCanvasStore } from '@/store/useCanvasStore';

function ImageRefNode({ id, data, selected }: NodeProps) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const [url, setUrl] = useState(data.url || '');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setUrl(newUrl);
    updateNodeData(id, { url: newUrl });
  };

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件');
      return;
    }

    // 验证文件大小（10MB）
    if (file.size > 10 * 1024 * 1024) {
      alert('文件大小不能超过 10MB');
      return;
    }

    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      // 更新节点 URL
      setUrl(result.url);
      updateNodeData(id, { url: result.url });
      
    } catch (error: any) {
      console.error('Upload error:', error);
      alert(`上传失败: ${error.message}`);
    } finally {
      setIsUploading(false);
      // 清空 input 以便可以再次选择同一文件
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [id, updateNodeData]);

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="min-w-[150px] h-full w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <NodeResizer
        minWidth={150}
        minHeight={100}
        isVisible={selected}
        lineClassName="border-green-400"
        handleClassName="h-3 w-3 bg-white border-2 border-green-400 rounded"
      />
      <div className="flex h-10 items-center gap-2 rounded-t-lg bg-green-50 px-3 dark:bg-green-900/30">
        <span className="flex h-5 w-5 items-center justify-center rounded bg-green-600 text-[10px] font-bold text-white">
          🖼️
        </span>
        <span className="text-sm font-semibold text-green-700 dark:text-green-300">
          Reference Image
        </span>
      </div>
      <div className="flex flex-1 flex-col p-3">
        <input
          type="text"
          className="w-full rounded border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-800 outline-none focus:border-green-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          placeholder="Paste image URL..."
          value={url}
          onChange={handleUrlChange}
          disabled={isUploading}
        />
        
        {/* 上传本地图片按钮 */}
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={handleFileSelect}
        />
        <button
          type="button"
          onClick={triggerFileSelect}
          disabled={isUploading}
          className="mt-2 flex items-center justify-center gap-2 rounded border border-dashed border-green-400 bg-green-50 px-3 py-2 text-sm font-medium text-green-700 hover:bg-green-100 disabled:opacity-50 dark:border-green-600 dark:bg-green-900/20 dark:text-green-300 dark:hover:bg-green-900/30"
        >
          {isUploading ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              上传中...
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              📁 上传本地图
            </>
          )}
        </button>

        {url ? (
          <img
            src={url}
            alt="Reference"
            className="mt-2 w-full flex-1 rounded border border-gray-200 object-contain dark:border-gray-700"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="mt-2 flex w-full flex-1 items-center justify-center rounded border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-500 dark:border-gray-600 dark:bg-gray-800">
            No Image
          </div>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        id="image-out"
        className="!h-3 !w-3 !bg-green-500"
      />
    </div>
  );
}

export default memo(ImageRefNode);
