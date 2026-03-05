'use client';
import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { imageUrl } from '@/lib/imageUrl';

interface Props { images: string[]; name: string }

export default function ImageGallery({ images, name }: Props) {
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  const prev = useCallback(() => setActive((i) => (i - 1 + images.length) % images.length), [images.length]);
  const next = useCallback(() => setActive((i) => (i + 1) % images.length), [images.length]);

  // Keyboard nav
  useEffect(() => {
    if (!lightbox) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(false);
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [lightbox, prev, next]);

  if (images.length === 0) {
    return (
      <div className="aspect-square bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100">
        <div className="text-gray-200 text-8xl">◈</div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {/* Main image — click to open lightbox */}
        <button
          onClick={() => setLightbox(true)}
          className="w-full aspect-square bg-gray-50 rounded-2xl overflow-hidden border border-gray-100 cursor-zoom-in relative group"
          aria-label="Agrandir l'image"
        >
          <Image
            src={imageUrl(images[active])}
            alt={name}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
          {/* Zoom hint */}
          <div className="absolute bottom-3 right-3 bg-black/40 text-white text-xs px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            🔍 Agrandir
          </div>
          {/* Image counter */}
          {images.length > 1 && (
            <div className="absolute top-3 right-3 bg-black/40 text-white text-xs px-2 py-1 rounded-full">
              {active + 1} / {images.length}
            </div>
          )}
        </button>

        {/* Thumbnails */}
        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {images.map((src, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                  i === active ? 'border-gray-900 ring-1 ring-gray-900' : 'border-gray-200 hover:border-gray-400'
                }`}
                aria-label={`Image ${i + 1}`}
              >
                <Image src={imageUrl(src)} alt={`${name} — vue ${i + 1}`} width={64} height={64} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(false)}
        >
          {/* Image container */}
          <div className="relative max-w-4xl max-h-full" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[active]}
              alt={name}
              className="max-h-[85vh] max-w-full object-contain rounded-lg select-none"
              draggable={false}
            />

            {/* Close */}
            <button
              onClick={() => setLightbox(false)}
              aria-label="Fermer"
              className="absolute top-3 right-3 w-9 h-9 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Prev */}
            {images.length > 1 && (
              <button
                onClick={prev}
                aria-label="Image précédente"
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}

            {/* Next */}
            {images.length > 1 && (
              <button
                onClick={next}
                aria-label="Image suivante"
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}

            {/* Counter */}
            {images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActive(i)}
                    aria-label={`Aller à l'image ${i + 1}`}
                    className={`w-2 h-2 rounded-full transition-all ${i === active ? 'bg-white w-4' : 'bg-white/50'}`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Click outside to close hint */}
          <p className="absolute bottom-4 right-4 text-white/30 text-xs">Cliquer en dehors pour fermer</p>
        </div>
      )}
    </>
  );
}
