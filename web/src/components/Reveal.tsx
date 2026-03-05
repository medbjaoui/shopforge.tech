'use client';
import { useEffect, useRef, useState, ReactNode } from 'react';

type From = 'bottom' | 'left' | 'right' | 'scale';

/**
 * Reveal — fade + slide animation.
 * - instant=true  → triggers on mount (for above-the-fold hero elements)
 * - instant=false → triggers when element enters viewport (IntersectionObserver)
 * - delay         → instant mode: setTimeout delay; scroll mode: CSS transition-delay (stagger)
 */
export function Reveal({
  children,
  delay = 0,
  from = 'bottom',
  instant = false,
  className = '',
}: {
  children: ReactNode;
  delay?: number;
  from?: From;
  instant?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (instant) {
      const t = setTimeout(() => setVisible(true), delay);
      return () => clearTimeout(t);
    }

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -55px 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hidden: Record<From, string> = {
    bottom: 'translateY(30px)',
    left:   'translateX(-26px)',
    right:  'translateX(26px)',
    scale:  'translateY(22px) scale(0.94)',
  };

  const cssDelay = instant ? 0 : delay;

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity:    visible ? 1 : 0,
        transform:  visible ? 'none' : hidden[from],
        transition: `opacity 0.65s cubic-bezier(0.16,1,0.3,1) ${cssDelay}ms, transform 0.65s cubic-bezier(0.16,1,0.3,1) ${cssDelay}ms`,
        willChange: 'opacity, transform',
      }}
    >
      {children}
    </div>
  );
}
