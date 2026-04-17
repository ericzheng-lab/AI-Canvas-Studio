'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ImageLightboxProps {
  images: string[];
  initialIndex: number;
  onClose: () => void;
}

export function ImageLightbox({ images, initialIndex, onClose }: ImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') {
        setCurrentIndex((i) => (i > 0 ? i - 1 : images.length - 1));
      }
      if (e.key === 'ArrowRight') {
        setCurrentIndex((i) => (i < images.length - 1 ? i + 1 : 0));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [images.length, onClose]);

  if (images.length === 0) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85"
      onClick={onClose}
    >
      {/* Left arrow */}
      {images.length > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setCurrentIndex((i) => (i > 0 ? i - 1 : images.length - 1));
          }}
          className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white hover:bg-black/70 transition-colors"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Main image */}
      <img
        src={images[currentIndex]}
        alt={`Image ${currentIndex + 1}`}
        className="max-h-[85vh] max-w-[90vw] object-contain rounded shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />

      {/* Right arrow */}
      {images.length > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setCurrentIndex((i) => (i < images.length - 1 ? i + 1 : 0));
          }}
          className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white hover:bg-black/70 transition-colors"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Counter */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-4 py-1.5 text-sm text-white">
        第 {currentIndex + 1} 张 / 共 {images.length} 张
      </div>

      {/* Close hint */}
      <div className="absolute top-4 right-4 text-white/70 text-xs">
        按 ESC 或点击空白处关闭
      </div>
    </div>,
    document.body
  );
}
