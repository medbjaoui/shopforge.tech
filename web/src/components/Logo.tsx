'use client';
import { useId } from 'react';

/** SVG flame icon — orange gradient square with white forge flame */
export function LogoIcon({ size = 36 }: { size?: number }) {
  const uid = useId().replace(/:/g, '');
  const gId = `sfg${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="ShopForge"
    >
      <defs>
        <linearGradient id={gId} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f97316" />
          <stop offset="1" stopColor="#fbbf24" />
        </linearGradient>
      </defs>
      {/* Background rounded square */}
      <rect width="40" height="40" rx="10" fill={`url(#${gId})`} />
      {/* Outer flame — white */}
      <path d="M20 7C32 13 31 27 20 32C9 27 8 13 20 7Z" fill="white" />
      {/* Inner flame — warm glow for depth */}
      <path d="M20 14C24 19 23 25 20 29C17 25 16 19 20 14Z" fill="#f97316" opacity="0.45" />
      {/* Forge base / anvil */}
      <rect x="14" y="33.5" width="12" height="2.5" rx="1.25" fill="white" opacity="0.85" />
    </svg>
  );
}

interface LogoProps {
  size?: number;
  /** Tailwind text-color class for the "ShopForge" wordmark */
  textColor?: string;
  textSize?: string;
  className?: string;
  hideText?: boolean;
}

export default function Logo({
  size = 36,
  textColor = 'text-white',
  textSize = 'text-xl',
  className = '',
  hideText = false,
}: LogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <LogoIcon size={size} />
      {!hideText && (
        <span className={`font-black tracking-tight ${textSize} ${textColor}`}>
          ShopForge
        </span>
      )}
    </div>
  );
}
