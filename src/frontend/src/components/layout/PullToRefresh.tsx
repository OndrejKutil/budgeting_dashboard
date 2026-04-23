import { useState, useRef, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { useIsStandalone } from '@/hooks/use-mobile';

const PULL_THRESHOLD = 80;
const MAX_PULL = 120;

interface PullToRefreshProps {
  children: React.ReactNode;
}

/**
 * Pull-to-refresh wrapper that activates only in PWA standalone mode.
 * Detects pull-down gesture when the page is scrolled to the very top,
 * then invalidates all React Query caches to refetch data.
 */
export function PullToRefresh({ children }: PullToRefreshProps) {
  const isStandalone = useIsStandalone();
  const queryClient = useQueryClient();

  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const isPulling = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    // Only start pulling if scrolled to the very top
    if (window.scrollY <= 0 && !isRefreshing) {
      touchStartY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  }, [isRefreshing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPulling.current || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartY.current;

    if (diff > 0 && window.scrollY <= 0) {
      // Apply resistance curve for natural feel
      const distance = Math.min(diff * 0.5, MAX_PULL);
      setPullDistance(distance);

      // Prevent default scroll when pulling
      if (distance > 10) {
        e.preventDefault();
      }
    } else {
      isPulling.current = false;
      setPullDistance(0);
    }
  }, [isRefreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current) return;
    isPulling.current = false;

    if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(PULL_THRESHOLD * 0.6); // Snap to loading position

      // Invalidate all queries to refetch data
      await queryClient.invalidateQueries();

      // Small delay for visual feedback
      await new Promise(resolve => setTimeout(resolve, 600));

      setIsRefreshing(false);
      setPullDistance(0);
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, isRefreshing, queryClient]);

  useEffect(() => {
    if (!isStandalone) return;

    const container = document.documentElement;
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isStandalone, handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Don't render the indicator on desktop / non-standalone
  if (!isStandalone) return <>{children}</>;

  const progress = Math.min(pullDistance / PULL_THRESHOLD, 1);
  const showIndicator = pullDistance > 10 || isRefreshing;

  return (
    <div ref={containerRef} className="relative">
      {/* Pull indicator */}
      <AnimatePresence>
        {showIndicator && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{
              opacity: 1,
              height: isRefreshing ? 48 : pullDistance * 0.6,
            }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 400 }}
            className="flex items-center justify-center overflow-hidden"
          >
            <motion.div
              animate={{
                rotate: isRefreshing ? 360 : progress * 270,
                scale: isRefreshing ? 1 : 0.5 + progress * 0.5,
              }}
              transition={
                isRefreshing
                  ? { repeat: Infinity, duration: 0.8, ease: 'linear' }
                  : { type: 'spring', damping: 20 }
              }
            >
              <RefreshCw
                className={`h-5 w-5 ${
                  progress >= 1 || isRefreshing
                    ? 'text-primary'
                    : 'text-muted-foreground'
                }`}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {children}
    </div>
  );
}
