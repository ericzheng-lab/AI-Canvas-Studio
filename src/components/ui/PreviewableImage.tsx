'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';

interface PreviewableImageProps {
  src: string;
  alt?: string;
  className?: string;
  imgClassName?: string;
  onError?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
}

export function PreviewableImage({
  src,
  alt = 'Image',
  className = '',
  imgClassName = 'h-full w-full object-cover',
  onError,
}: PreviewableImageProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        className={`relative overflow-hidden cursor-pointer group ${className}`}
        onClick={() => setOpen(true)}
        title="Click to preview"
      >
        <img
          src={src}
          alt={alt}
          className={imgClassName}
          onError={onError}
        />
        {/* Magnifying glass icon */}
        <div className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
          </svg>
        </div>
      </div>

      {/* Global Lightbox via Portal */}
      {open && src && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 p-4"
          onClick={() => setOpen(false)}
        >
          <img
            src={src}
            alt={alt}
            className="max-h-[90vh] max-w-[90vw] object-contain rounded shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>,
        document.body
      )}
    </>
  );
}
