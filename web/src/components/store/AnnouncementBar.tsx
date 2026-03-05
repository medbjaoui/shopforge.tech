'use client';
import { useState } from 'react';

interface Props {
  text: string;
  bgColor?: string | null;
  textColor?: string | null;
}

export default function AnnouncementBar({ text, bgColor, textColor }: Props) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div
      className="relative flex items-center justify-center px-10 py-2 text-xs sm:text-sm font-medium"
      style={{
        backgroundColor: bgColor || '#111827',
        color: textColor || '#ffffff',
      }}
    >
      <span className="text-center">{text}</span>
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Fermer"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
