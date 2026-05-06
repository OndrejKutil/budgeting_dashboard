import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

interface DeferredRenderProps {
  children: ReactNode;
  className?: string;
  fallback?: ReactNode;
  rootMargin?: string;
}

export function DeferredRender({
  children,
  className,
  fallback = null,
  rootMargin = '300px 0px',
}: DeferredRenderProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (shouldRender) return;

    if (!('IntersectionObserver' in window)) {
      setShouldRender(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldRender(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    const element = containerRef.current;
    if (element) {
      observer.observe(element);
    }

    return () => observer.disconnect();
  }, [rootMargin, shouldRender]);

  return (
    <div ref={containerRef} className={className}>
      {shouldRender ? children : fallback}
    </div>
  );
}
